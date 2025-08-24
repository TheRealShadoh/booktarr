"""
Amazon/Kindle/Audible integration API routes
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import secrets
import logging
from datetime import datetime

from clients.amazon import AmazonClient, AmazonIntegrationService
from database import get_session
from sqlmodel import Session

logger = logging.getLogger(__name__)

router = APIRouter()

# Global client instances (in production, these should be properly managed)
amazon_client = AmazonClient()
integration_service = AmazonIntegrationService()

@router.get("/status")
async def get_amazon_status():
    """Get Amazon integration status"""
    return {
        "status": "available",
        "kindle_connected": False,
        "audible_connected": False,
        "last_sync": None
    }

class AuthUrlRequest(BaseModel):
    redirect_uri: str

class AuthCallbackRequest(BaseModel):
    code: str
    state: str
    redirect_uri: str

class SyncRequest(BaseModel):
    user_id: int = 1  # Default user for now
    library_type: str = "both"  # "kindle", "audible", or "both"

@router.get("/auth/url")
async def get_auth_url(redirect_uri: str = Query(..., description="Redirect URI for OAuth callback")):
    """
    Generate Amazon OAuth authentication URL.
    """
    try:
        # Generate a secure state parameter
        state = secrets.token_urlsafe(32)
        
        # Store state in session/cache for validation (simplified for demo)
        # In production, store this securely
        
        auth_url = amazon_client.generate_auth_url(redirect_uri, state)
        
        return {
            "auth_url": auth_url,
            "state": state,
            "redirect_uri": redirect_uri
        }
    
    except Exception as e:
        logger.error(f"Failed to generate auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/callback")
async def handle_auth_callback(request: AuthCallbackRequest):
    """
    Handle OAuth callback from Amazon.
    """
    try:
        # In production, validate the state parameter here
        
        result = await amazon_client.exchange_code_for_token(
            request.code, 
            request.redirect_uri
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        # In production, store tokens securely for the user
        # For now, return success status
        
        return {
            "success": True,
            "message": "Successfully authenticated with Amazon",
            "expires_at": result.get("expires_at")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth callback failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/auth/status")
async def get_auth_status():
    """
    Check if user is authenticated with Amazon.
    """
    try:
        is_authenticated = await amazon_client.ensure_valid_token()
        
        if is_authenticated:
            # Get user profile to confirm authentication
            profile_result = await amazon_client.get_user_profile()
            
            if profile_result.get("success"):
                return {
                    "authenticated": True,
                    "profile": profile_result.get("profile"),
                    "expires_at": amazon_client.token_expires_at.isoformat() if amazon_client.token_expires_at else None
                }
        
        return {
            "authenticated": False,
            "message": "Not authenticated with Amazon"
        }
    
    except Exception as e:
        logger.error(f"Auth status check failed: {e}")
        return {
            "authenticated": False,
            "error": str(e)
        }

@router.post("/auth/logout")
async def logout():
    """
    Logout from Amazon (clear tokens).
    """
    try:
        # Clear tokens
        amazon_client.access_token = None
        amazon_client.refresh_token = None
        amazon_client.token_expires_at = None
        
        return {
            "success": True,
            "message": "Successfully logged out from Amazon"
        }
    
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/kindle/library")
async def get_kindle_library():
    """
    Get user's Kindle library.
    """
    try:
        result = await amazon_client.get_kindle_library()
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get Kindle library: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audible/library")
async def get_audible_library():
    """
    Get user's Audible library.
    """
    try:
        result = await amazon_client.get_audible_library()
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get Audible library: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_libraries(request: SyncRequest, session: Session = Depends(get_session)):
    """
    Sync Kindle and/or Audible libraries with local database.
    """
    try:
        sync_results = {}
        
        if request.library_type in ["kindle", "both"]:
            kindle_result = await integration_service.sync_kindle_library(request.user_id)
            sync_results["kindle"] = kindle_result
        
        if request.library_type in ["audible", "both"]:
            audible_result = await integration_service.sync_audible_library(request.user_id)
            sync_results["audible"] = audible_result
        
        return {
            "success": True,
            "sync_results": sync_results,
            "sync_timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Library sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sync/status")
async def get_sync_status():
    """
    Get status of library synchronization.
    """
    try:
        # In a real implementation, this would check database for sync status
        # For now, return mock status
        
        return {
            "last_sync": {
                "kindle": "2025-01-20T10:30:00Z",
                "audible": "2025-01-20T10:35:00Z"
            },
            "sync_counts": {
                "kindle": {
                    "total_books": 24,
                    "synced_books": 22,
                    "new_books": 2,
                    "errors": 0
                },
                "audible": {
                    "total_books": 15,
                    "synced_books": 15,
                    "new_books": 0,
                    "errors": 0
                }
            },
            "is_syncing": False
        }
    
    except Exception as e:
        logger.error(f"Failed to get sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/supported-formats")
async def get_supported_formats():
    """
    Get supported book formats for Amazon integration.
    """
    return {
        "kindle_formats": [
            "Kindle Edition",
            "Kindle Unlimited",
            "Prime Reading"
        ],
        "audible_formats": [
            "Audible Audiobook",
            "Audible Original",
            "Audible Plus"
        ],
        "matching_fields": [
            "isbn_13",
            "isbn_10",
            "asin",
            "title",
            "author"
        ]
    }

@router.get("/integration/info")
async def get_integration_info():
    """
    Get information about Amazon integration capabilities.
    """
    return {
        "features": {
            "kindle_sync": {
                "available": True,
                "description": "Import Kindle library and reading progress",
                "requires_auth": True,
                "mock_implementation": True
            },
            "audible_sync": {
                "available": True,
                "description": "Import Audible library and listening progress",
                "requires_auth": True,
                "mock_implementation": True
            },
            "purchase_tracking": {
                "available": False,
                "description": "Track purchase history and spending",
                "requires_auth": True,
                "note": "Requires additional API access"
            },
            "wishlist_sync": {
                "available": False,
                "description": "Sync Amazon wishlist with want-to-read list",
                "requires_auth": True,
                "note": "Requires additional API access"
            }
        },
        "requirements": {
            "environment_variables": [
                "AMAZON_CLIENT_ID",
                "AMAZON_CLIENT_SECRET"
            ],
            "oauth_scopes": [
                "profile",
                "postal_code"
            ],
            "notes": [
                "Amazon Digital Content API access is not publicly available",
                "Audible API access is limited",
                "Current implementation uses mock data for demonstration",
                "Real implementation requires special Amazon partnership"
            ]
        }
    }

# Cleanup on shutdown
@router.on_event("shutdown")
async def shutdown_event():
    await amazon_client.close()
    await integration_service.close()