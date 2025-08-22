"""
Security utilities for authentication and authorization
"""
import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from fastapi import HTTPException, status
import os
from email_validator import validate_email, EmailNotValidError

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30


class SecurityManager:
    """Security manager for authentication operations"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """Validate password strength"""
        errors = []
        score = 0
        
        # Length check
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        else:
            score += 1
            
        if len(password) >= 12:
            score += 1
            
        # Character variety checks
        if not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        else:
            score += 1
            
        if not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        else:
            score += 1
            
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        else:
            score += 1
            
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")
        else:
            score += 1
            
        # Common password checks
        common_passwords = ["password", "123456", "qwerty", "admin", "letmein"]
        if password.lower() in common_passwords:
            errors.append("Password is too common")
            score = max(0, score - 2)
            
        # Determine strength
        if score >= 6:
            strength = "strong"
        elif score >= 4:
            strength = "medium"
        elif score >= 2:
            strength = "weak"
        else:
            strength = "very_weak"
            
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "score": score,
            "strength": strength
        }
    
    @staticmethod
    def validate_email_format(email: str) -> bool:
        """Validate email format"""
        try:
            validate_email(email)
            return True
        except EmailNotValidError:
            return False
    
    @staticmethod
    def validate_username(username: str) -> Dict[str, Any]:
        """Validate username"""
        errors = []
        
        # Length check
        if len(username) < 3:
            errors.append("Username must be at least 3 characters long")
        elif len(username) > 30:
            errors.append("Username must be no more than 30 characters long")
            
        # Character check
        if not username.replace("_", "").replace("-", "").isalnum():
            errors.append("Username can only contain letters, numbers, hyphens, and underscores")
            
        # Reserved usernames
        reserved = ["admin", "api", "www", "mail", "ftp", "root", "support", "help"]
        if username.lower() in reserved:
            errors.append("Username is reserved")
            
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }


class JWTManager:
    """JWT token management"""
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        })
        
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """Create refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        })
        
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def verify_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
        """Verify and decode token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            # Check token type
            if payload.get("type") != expected_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    @staticmethod
    def get_token_expiry(token: str) -> Optional[datetime]:
        """Get token expiry time without verification"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
            exp = payload.get("exp")
            if exp:
                return datetime.fromtimestamp(exp)
        except:
            pass
        return None


class APIKeyManager:
    """API key management"""
    
    @staticmethod
    def generate_api_key() -> tuple[str, str, str]:
        """Generate API key and return (full_key, hash, prefix)"""
        # Generate random key: bt_ + 32 characters
        full_key = "bt_" + secrets.token_urlsafe(32)[:32]
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        prefix = full_key[:8]
        return full_key, key_hash, prefix
    
    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """Hash an API key"""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    @staticmethod
    def verify_api_key(api_key: str, key_hash: str) -> bool:
        """Verify an API key against its hash"""
        return hashlib.sha256(api_key.encode()).hexdigest() == key_hash


class SecurityHeaders:
    """Security headers management"""
    
    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        """Get security headers for responses"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }


class RateLimiter:
    """Rate limiting utilities"""
    
    def __init__(self):
        self.requests = {}  # In production, use Redis
    
    def is_allowed(self, identifier: str, limit: int, window_seconds: int = 3600) -> bool:
        """Check if request is allowed under rate limit"""
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window_seconds)
        
        # Clean old entries
        if identifier in self.requests:
            self.requests[identifier] = [
                req_time for req_time in self.requests[identifier]
                if req_time > window_start
            ]
        else:
            self.requests[identifier] = []
        
        # Check limit
        if len(self.requests[identifier]) >= limit:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True
    
    def get_remaining_requests(self, identifier: str, limit: int, window_seconds: int = 3600) -> int:
        """Get remaining requests in current window"""
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window_seconds)
        
        if identifier not in self.requests:
            return limit
        
        # Count requests in current window
        current_requests = len([
            req_time for req_time in self.requests[identifier]
            if req_time > window_start
        ])
        
        return max(0, limit - current_requests)
    
    def reset_limit(self, identifier: str):
        """Reset rate limit for identifier"""
        if identifier in self.requests:
            del self.requests[identifier]


# Global instances
security_manager = SecurityManager()
jwt_manager = JWTManager()
api_key_manager = APIKeyManager()
rate_limiter = RateLimiter()