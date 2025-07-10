"""
Settings API endpoints for configuration management
"""
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, Optional
from pydantic import BaseModel, validator
import logging

from ..models import Settings, SettingsResponse
from ..services.settings_service import (
    settings_service,
    SettingsValidationError,
    SettingsStorageError
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["settings"])

class SettingsUpdateRequest(BaseModel):
    skoolib_url: Optional[str] = None
    google_books_api_key: Optional[str] = None
    open_library_api_key: Optional[str] = None
    cache_ttl: Optional[int] = None
    enable_price_lookup: Optional[bool] = None
    default_language: Optional[str] = None
    
    @validator('cache_ttl')
    def validate_cache_ttl(cls, v):
        if v is not None and (v < 60 or v > 86400):
            raise ValueError('Cache TTL must be between 60 and 86400 seconds')
        return v
    
    @validator('default_language')
    def validate_language(cls, v):
        if v is not None and len(v) != 2:
            raise ValueError('Language code must be 2 characters')
        return v

class UrlValidationRequest(BaseModel):
    url: str

class BackupRequest(BaseModel):
    create_backup: bool = True

class RestoreRequest(BaseModel):
    backup_file: str

@router.get("/settings", response_model=Settings)
async def get_settings():
    """Get current application settings"""
    try:
        settings = await settings_service.get_settings()
        return settings
    except Exception as e:
        logger.error(f"Error retrieving settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve settings"
        )

@router.put("/settings", response_model=SettingsResponse)
async def update_settings(request: SettingsUpdateRequest):
    """Update application settings"""
    try:
        # Convert request to dict, excluding None values
        update_data = request.dict(exclude_none=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No settings provided to update"
            )
        
        updated_settings = await settings_service.update_settings(update_data)
        
        return SettingsResponse(
            message="Settings updated successfully",
            settings=updated_settings
        )
        
    except SettingsValidationError as e:
        logger.warning(f"Settings validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except SettingsStorageError as e:
        logger.error(f"Settings storage error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save settings"
        )
    except Exception as e:
        logger.error(f"Unexpected error updating settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings"
        )

@router.post("/settings/validate-url")
async def validate_skoolib_url(request: UrlValidationRequest):
    """Validate a Skoolib URL"""
    try:
        result = await settings_service.validate_skoolib_url(request.url)
        return result
    except Exception as e:
        logger.error(f"Error validating URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate URL: {str(e)}"
        )

@router.post("/settings/reset", response_model=SettingsResponse)
async def reset_settings():
    """Reset settings to default values"""
    try:
        default_settings = await settings_service.reset_settings()
        return SettingsResponse(
            message="Settings reset to defaults",
            settings=default_settings
        )
    except Exception as e:
        logger.error(f"Error resetting settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset settings"
        )

@router.post("/settings/backup")
async def backup_settings():
    """Create a backup of current settings"""
    try:
        backup_file = await settings_service.backup_settings()
        return {
            "message": "Settings backed up successfully",
            "backup_file": backup_file
        }
    except SettingsStorageError as e:
        logger.error(f"Error backing up settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error backing up settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to backup settings"
        )

@router.post("/settings/restore", response_model=SettingsResponse)
async def restore_settings(request: RestoreRequest):
    """Restore settings from backup file"""
    try:
        restored_settings = await settings_service.restore_settings(request.backup_file)
        return SettingsResponse(
            message="Settings restored successfully",
            settings=restored_settings
        )
    except SettingsStorageError as e:
        logger.error(f"Error restoring settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error restoring settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore settings"
        )

@router.get("/settings/info")
async def get_settings_info():
    """Get information about settings file and configuration"""
    try:
        file_info = settings_service.get_settings_info()
        return {
            "settings_file": file_info,
            "supported_languages": ["en", "fr", "es", "de", "it", "pt", "ja", "ko", "zh"],
            "cache_ttl_range": {
                "min": 60,
                "max": 86400,
                "default": 3600
            }
        }
    except Exception as e:
        logger.error(f"Error getting settings info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get settings information"
        )

@router.get("/settings/health")
async def settings_health_check():
    """Health check for settings service"""
    try:
        settings = await settings_service.get_settings()
        file_info = settings_service.get_settings_info()
        
        return {
            "status": "healthy",
            "settings_loaded": True,
            "file_exists": file_info["exists"],
            "file_path": file_info["file_path"]
        }
    except Exception as e:
        logger.error(f"Settings health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }