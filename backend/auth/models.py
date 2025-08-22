"""
Authentication models for user management
"""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from enum import Enum
import hashlib
import secrets


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"


class User(SQLModel, table=True):
    """User model for authentication"""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.USER
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    # Profile settings
    profile_image_url: Optional[str] = None
    timezone: str = "UTC"
    language: str = "en"
    
    # Privacy settings
    profile_public: bool = False
    share_reading_progress: bool = False
    
    # Relationships
    api_keys: List["APIKey"] = Relationship(back_populates="user")
    refresh_tokens: List["RefreshToken"] = Relationship(back_populates="user")
    user_sessions: List["UserSession"] = Relationship(back_populates="user")


class APIKey(SQLModel, table=True):
    """API key model for external access"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    name: str  # User-friendly name for the API key
    key_hash: str = Field(unique=True, index=True)  # Hashed version of the key
    key_prefix: str  # First 8 characters for identification
    
    # Permissions and access control
    scopes: str = "read"  # JSON string of allowed scopes
    rate_limit: int = 1000  # Requests per hour
    
    # Status and lifecycle
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Usage tracking
    total_requests: int = 0
    last_request_ip: Optional[str] = None
    
    # Relationships
    user: User = Relationship(back_populates="api_keys")
    
    @classmethod
    def generate_key(cls) -> tuple[str, str, str]:
        """Generate a new API key and return (full_key, hash, prefix)"""
        # Generate random key: bt_ + 32 characters
        full_key = "bt_" + secrets.token_urlsafe(32)[:32]
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        prefix = full_key[:8]
        return full_key, key_hash, prefix


class RefreshToken(SQLModel, table=True):
    """Refresh token model for JWT token refresh"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    token_hash: str = Field(unique=True, index=True)
    
    # Token lifecycle
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    revoked_at: Optional[datetime] = None
    is_revoked: bool = False
    
    # Security tracking
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Relationships
    user: User = Relationship(back_populates="refresh_tokens")


class UserSession(SQLModel, table=True):
    """User session tracking"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    session_id: str = Field(unique=True, index=True)
    
    # Session data
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    is_active: bool = True
    
    # Device and location info
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = None  # mobile, desktop, tablet
    location: Optional[str] = None
    
    # Relationships
    user: User = Relationship(back_populates="user_sessions")


class PasswordResetToken(SQLModel, table=True):
    """Password reset token model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    token_hash: str = Field(unique=True, index=True)
    
    # Token lifecycle
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    used_at: Optional[datetime] = None
    is_used: bool = False
    
    # Security
    ip_address: Optional[str] = None


class EmailVerificationToken(SQLModel, table=True):
    """Email verification token model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    token_hash: str = Field(unique=True, index=True)
    
    # Token lifecycle
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    verified_at: Optional[datetime] = None
    is_verified: bool = False
    
    # Security
    ip_address: Optional[str] = None


# Pydantic models for API responses (without sensitive data)
class UserPublic(SQLModel):
    """Public user information"""
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    profile_image_url: Optional[str] = None
    profile_public: bool


class UserCreate(SQLModel):
    """User creation model"""
    email: str
    username: str
    password: str
    full_name: Optional[str] = None


class UserUpdate(SQLModel):
    """User update model"""
    email: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    profile_public: Optional[bool] = None
    share_reading_progress: Optional[bool] = None


class PasswordChange(SQLModel):
    """Password change model"""
    current_password: str
    new_password: str


class APIKeyCreate(SQLModel):
    """API key creation model"""
    name: str
    scopes: str = "read"
    expires_in_days: Optional[int] = None  # None = no expiration


class APIKeyPublic(SQLModel):
    """Public API key information (without the actual key)"""
    id: int
    name: str
    key_prefix: str
    scopes: str
    is_active: bool
    created_at: datetime
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    total_requests: int