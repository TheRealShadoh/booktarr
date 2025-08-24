"""
Authentication API routes - Basic implementation for testing
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int

@router.get("/status")
async def get_auth_status():
    """Get authentication status"""
    return {
        "authenticated": False,
        "user": None,
        "features": ["registration", "login", "password_reset"]
    }

@router.post("/register")
async def register_user(request: RegisterRequest):
    """User registration endpoint"""
    # Basic validation - in production, implement proper user registration
    if not request.email or "@" not in request.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    if not request.password or len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    return {
        "message": "User registered successfully",
        "user_id": 1,
        "email": request.email
    }

@router.post("/login")
async def login_user(request: LoginRequest):
    """User login endpoint"""
    # Basic validation - in production, implement proper authentication
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    # Mock successful login for testing
    return AuthResponse(
        access_token="mock_jwt_token_for_testing",
        token_type="bearer",
        user_id=1
    )

@router.post("/logout")
async def logout_user():
    """User logout endpoint"""
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
async def forgot_password(email: str):
    """Forgot password endpoint"""
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    return {"message": "Password reset email sent"}