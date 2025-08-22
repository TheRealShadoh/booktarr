"""
Authentication service with user management
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlmodel import Session, select
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import secrets

from .models import (
    User, UserCreate, UserUpdate, UserPublic, PasswordChange,
    APIKey, APIKeyCreate, APIKeyPublic, RefreshToken, UserSession,
    PasswordResetToken, EmailVerificationToken, UserRole
)
from .security import (
    security_manager, jwt_manager, api_key_manager, rate_limiter
)

try:
    from backend.database import get_db_session
except ImportError:
    from database import get_db_session


class AuthenticationError(HTTPException):
    """Custom authentication error"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class AuthorizationError(HTTPException):
    """Custom authorization error"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class AuthService:
    """Authentication and authorization service"""
    
    def __init__(self, session: Session):
        self.session = session
    
    async def create_user(self, user_data: UserCreate) -> UserPublic:
        """Create a new user"""
        # Validate email
        if not security_manager.validate_email_format(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Validate username
        username_validation = security_manager.validate_username(user_data.username)
        if not username_validation["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"field": "username", "errors": username_validation["errors"]}
            )
        
        # Validate password
        password_validation = security_manager.validate_password_strength(user_data.password)
        if not password_validation["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"field": "password", "errors": password_validation["errors"]}
            )
        
        # Check if user exists
        existing_user = self.session.exec(
            select(User).where(
                (User.email == user_data.email) | 
                (User.username == user_data.username)
            )
        ).first()
        
        if existing_user:
            if existing_user.email == user_data.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        # Create user
        hashed_password = security_manager.hash_password(user_data.password)
        user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            role=UserRole.USER
        )
        
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        
        return UserPublic.model_validate(user)
    
    async def authenticate_user(self, username_or_email: str, password: str) -> Optional[User]:
        """Authenticate user with username/email and password"""
        user = self.session.exec(
            select(User).where(
                (User.email == username_or_email) | 
                (User.username == username_or_email)
            )
        ).first()
        
        if not user or not security_manager.verify_password(password, user.hashed_password):
            return None
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is disabled"
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        self.session.add(user)
        self.session.commit()
        
        return user
    
    async def create_user_session(self, user: User, request: Request) -> UserSession:
        """Create a new user session"""
        session_id = secrets.token_urlsafe(32)
        
        # Get client info
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        
        # Determine device type
        device_type = "desktop"
        if user_agent:
            user_agent_lower = user_agent.lower()
            if any(mobile in user_agent_lower for mobile in ["mobile", "android", "iphone"]):
                device_type = "mobile"
            elif any(tablet in user_agent_lower for tablet in ["ipad", "tablet"]):
                device_type = "tablet"
        
        session = UserSession(
            user_id=user.id,
            session_id=session_id,
            ip_address=client_ip,
            user_agent=user_agent,
            device_type=device_type,
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        
        self.session.add(session)
        self.session.commit()
        
        return session
    
    async def create_tokens(self, user: User) -> Dict[str, Any]:
        """Create access and refresh tokens"""
        access_token = jwt_manager.create_access_token(
            data={"sub": str(user.id), "username": user.username, "role": user.role}
        )
        
        refresh_token_str = jwt_manager.create_refresh_token(
            data={"sub": str(user.id)}
        )
        
        # Store refresh token in database
        refresh_token = RefreshToken(
            user_id=user.id,
            token_hash=api_key_manager.hash_api_key(refresh_token_str),
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        
        self.session.add(refresh_token)
        self.session.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "token_type": "bearer",
            "expires_in": 30 * 60  # 30 minutes
        }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        # Verify refresh token
        try:
            payload = jwt_manager.verify_token(refresh_token, "refresh")
            user_id = int(payload.get("sub"))
        except:
            raise AuthenticationError("Invalid refresh token")
        
        # Check if refresh token exists in database
        token_hash = api_key_manager.hash_api_key(refresh_token)
        db_token = self.session.exec(
            select(RefreshToken).where(
                (RefreshToken.token_hash == token_hash) &
                (RefreshToken.is_revoked == False) &
                (RefreshToken.expires_at > datetime.utcnow())
            )
        ).first()
        
        if not db_token:
            raise AuthenticationError("Refresh token not found or expired")
        
        # Get user
        user = self.session.get(User, user_id)
        if not user or not user.is_active:
            raise AuthenticationError("User not found or inactive")
        
        # Create new access token
        access_token = jwt_manager.create_access_token(
            data={"sub": str(user.id), "username": user.username, "role": user.role}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 30 * 60  # 30 minutes
        }
    
    async def revoke_refresh_token(self, refresh_token: str) -> bool:
        """Revoke a refresh token"""
        token_hash = api_key_manager.hash_api_key(refresh_token)
        db_token = self.session.exec(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        ).first()
        
        if db_token:
            db_token.is_revoked = True
            db_token.revoked_at = datetime.utcnow()
            self.session.add(db_token)
            self.session.commit()
            return True
        
        return False
    
    async def get_user_by_token(self, token: str) -> User:
        """Get user from access token"""
        payload = jwt_manager.verify_token(token, "access")
        user_id = int(payload.get("sub"))
        
        user = self.session.get(User, user_id)
        if not user or not user.is_active:
            raise AuthenticationError("User not found or inactive")
        
        return user
    
    async def get_user_by_api_key(self, api_key: str) -> tuple[User, APIKey]:
        """Get user from API key"""
        if not api_key.startswith("bt_"):
            raise AuthenticationError("Invalid API key format")
        
        key_hash = api_key_manager.hash_api_key(api_key)
        db_key = self.session.exec(
            select(APIKey).where(
                (APIKey.key_hash == key_hash) &
                (APIKey.is_active == True)
            )
        ).first()
        
        if not db_key:
            raise AuthenticationError("Invalid API key")
        
        # Check expiration
        if db_key.expires_at and db_key.expires_at < datetime.utcnow():
            raise AuthenticationError("API key expired")
        
        # Get user
        user = self.session.get(User, db_key.user_id)
        if not user or not user.is_active:
            raise AuthenticationError("User not found or inactive")
        
        # Update usage statistics
        db_key.last_used = datetime.utcnow()
        db_key.total_requests += 1
        self.session.add(db_key)
        self.session.commit()
        
        return user, db_key
    
    async def create_api_key(self, user: User, key_data: APIKeyCreate) -> Dict[str, Any]:
        """Create a new API key"""
        full_key, key_hash, prefix = api_key_manager.generate_api_key()
        
        # Calculate expiration
        expires_at = None
        if key_data.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=key_data.expires_in_days)
        
        api_key = APIKey(
            user_id=user.id,
            name=key_data.name,
            key_hash=key_hash,
            key_prefix=prefix,
            scopes=key_data.scopes,
            expires_at=expires_at
        )
        
        self.session.add(api_key)
        self.session.commit()
        self.session.refresh(api_key)
        
        return {
            "api_key": full_key,
            "key_info": APIKeyPublic.model_validate(api_key)
        }
    
    async def list_user_api_keys(self, user: User) -> List[APIKeyPublic]:
        """List user's API keys"""
        keys = self.session.exec(
            select(APIKey).where(APIKey.user_id == user.id)
        ).all()
        
        return [APIKeyPublic.model_validate(key) for key in keys]
    
    async def revoke_api_key(self, user: User, key_id: int) -> bool:
        """Revoke an API key"""
        api_key = self.session.exec(
            select(APIKey).where(
                (APIKey.id == key_id) & 
                (APIKey.user_id == user.id)
            )
        ).first()
        
        if api_key:
            api_key.is_active = False
            self.session.add(api_key)
            self.session.commit()
            return True
        
        return False
    
    async def update_user(self, user: User, user_data: UserUpdate) -> UserPublic:
        """Update user information"""
        # Validate email if provided
        if user_data.email and not security_manager.validate_email_format(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Validate username if provided
        if user_data.username:
            username_validation = security_manager.validate_username(user_data.username)
            if not username_validation["is_valid"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"field": "username", "errors": username_validation["errors"]}
                )
        
        # Check for existing email/username
        if user_data.email or user_data.username:
            existing_user = self.session.exec(
                select(User).where(
                    ((User.email == user_data.email) if user_data.email else False) |
                    ((User.username == user_data.username) if user_data.username else False)
                ).where(User.id != user.id)
            ).first()
            
            if existing_user:
                if existing_user.email == user_data.email:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already in use"
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already taken"
                    )
        
        # Update user
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        
        return UserPublic.model_validate(user)
    
    async def change_password(self, user: User, password_data: PasswordChange) -> bool:
        """Change user password"""
        # Verify current password
        if not security_manager.verify_password(password_data.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Validate new password
        password_validation = security_manager.validate_password_strength(password_data.new_password)
        if not password_validation["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"field": "new_password", "errors": password_validation["errors"]}
            )
        
        # Update password
        user.hashed_password = security_manager.hash_password(password_data.new_password)
        self.session.add(user)
        self.session.commit()
        
        # Revoke all refresh tokens for security
        refresh_tokens = self.session.exec(
            select(RefreshToken).where(
                (RefreshToken.user_id == user.id) &
                (RefreshToken.is_revoked == False)
            )
        ).all()
        
        for token in refresh_tokens:
            token.is_revoked = True
            token.revoked_at = datetime.utcnow()
            self.session.add(token)
        
        self.session.commit()
        
        return True


# Security dependency
security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    api_key: Optional[str] = None,
    session: Session = Depends(get_db_session)
) -> User:
    """Get current authenticated user"""
    auth_service = AuthService(session)
    
    # Try API key authentication first
    if api_key:
        user, _ = await auth_service.get_user_by_api_key(api_key)
        return user
    
    # Try JWT token authentication
    if credentials:
        user = await auth_service.get_user_by_token(credentials.credentials)
        return user
    
    raise AuthenticationError("Authentication required")

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

def require_role(required_role: UserRole):
    """Dependency to require specific user role"""
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role != required_role and current_user.role != UserRole.ADMIN:
            raise AuthorizationError(f"Requires {required_role} role")
        return current_user
    return role_checker

def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Dependency to require admin role"""
    if current_user.role != UserRole.ADMIN:
        raise AuthorizationError("Admin access required")
    return current_user