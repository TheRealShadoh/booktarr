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
from ..services.database_service import DatabaseIntegrationService
from ..services.cache_service import cache_service

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
    """Get current application settings from database"""
    try:
        settings = await DatabaseIntegrationService.get_settings()
        return settings
    except Exception as e:
        logger.error(f"Error retrieving settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve settings"
        )

@router.put("/settings", response_model=SettingsResponse)
async def update_settings(request: SettingsUpdateRequest):
    """Update application settings in database"""
    try:
        # Convert request to dict, excluding None values
        update_data = request.dict(exclude_none=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No settings provided to update"
            )
        
        updated_settings = await DatabaseIntegrationService.update_settings(update_data)
        
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

@router.post("/settings/sync-skoolib")
async def manual_skoolib_sync():
    """Trigger manual Skoolib synchronization"""
    try:
        # Get current settings to retrieve Skoolib URL
        settings = await DatabaseIntegrationService.get_settings()
        
        if not settings.skoolib_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Skoolib URL is not configured. Please set it in settings first."
            )
        
        # Import here to avoid circular imports
        from ..services.skoolib_playwright_parser import SkoolibPlaywrightParser
        from ..services import google_books_service, open_library_service
        from ..models import Book, MetadataSource
        from datetime import datetime
        
        logger.info(f"🔄 Starting manual Skoolib sync for URL: {settings.skoolib_url}")
        
        # Parse ISBNs from Skoolib
        parser = SkoolibPlaywrightParser()
        isbn_list = await parser.extract_isbns(settings.skoolib_url)
        
        if not isbn_list:
            return {
                "success": False,
                "message": "No books found in Skoolib library",
                "books_processed": 0,
                "books_added": 0,
                "errors": []
            }
        
        logger.info(f"📚 Found {len(isbn_list)} ISBNs from Skoolib")
        
        books_added = 0
        errors = []
        
        for isbn in isbn_list:
            try:
                # Check if book already exists
                existing_book = await DatabaseIntegrationService.get_book_by_isbn(isbn)
                if existing_book:
                    logger.debug(f"📖 Book {isbn} already exists, skipping")
                    continue
                
                # Enrich with metadata
                metadata = None
                
                # Try Google Books first
                metadata = await google_books_service.fetch_book_metadata(isbn)
                
                # Fallback to Open Library
                if not metadata:
                    metadata = await open_library_service.fetch_book_metadata_fallback(isbn)
                
                # Create Book object
                current_time = datetime.now()
                book = Book(
                    isbn=isbn,
                    title=metadata.get("title") if metadata else "Unknown Title",
                    authors=metadata.get("authors", []) if metadata else ["Unknown Author"],
                    series=metadata.get("series") if metadata else None,
                    series_position=metadata.get("series_position") if metadata else None,
                    publisher=metadata.get("publisher") if metadata else None,
                    published_date=metadata.get("published_date") if metadata else None,
                    page_count=metadata.get("page_count") if metadata else None,
                    thumbnail_url=metadata.get("thumbnail_url") if metadata else None,
                    description=metadata.get("description") if metadata else None,
                    categories=metadata.get("categories", []) if metadata else [],
                    pricing=metadata.get("pricing", []) if metadata else [],
                    metadata_source=MetadataSource.SKOOLIB,
                    added_date=current_time,
                    last_updated=current_time
                )
                
                # Save to database
                await DatabaseIntegrationService.create_book(book)
                books_added += 1
                logger.info(f"✅ Added book: {book.title} ({isbn})")
                
            except Exception as e:
                error_msg = f"Failed to process ISBN {isbn}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
        
        # Create sync history record
        await DatabaseIntegrationService.create_sync_history(
            source="skoolib",
            url=settings.skoolib_url,
            books_found=len(isbn_list),
            books_processed=books_added,
            success=True,
            error_details=errors if errors else None
        )
        
        logger.info(f"🎉 Manual sync completed: {books_added}/{len(isbn_list)} books added")
        
        return {
            "success": True,
            "message": f"Sync completed successfully. Added {books_added} new books.",
            "books_processed": len(isbn_list),
            "books_added": books_added,
            "errors": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Manual sync failed: {e}")
        
        # Try to create sync history record for failed sync
        try:
            settings = await DatabaseIntegrationService.get_settings()
            if settings.skoolib_url:
                await DatabaseIntegrationService.create_sync_history(
                    source="skoolib",
                    url=settings.skoolib_url,
                    books_found=0,
                    books_processed=0,
                    success=False,
                    error_details=[str(e)]
                )
        except:
            pass  # Don't fail the response if sync history fails
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}"
        )

@router.get("/settings/sync-history")
async def get_sync_history():
    """Get recent sync history"""
    try:
        history = await DatabaseIntegrationService.get_sync_history(limit=10)
        return {
            "history": [
                {
                    "id": record.id,
                    "source": record.source,
                    "url": record.url,
                    "timestamp": record.timestamp.isoformat(),
                    "books_found": record.books_found,
                    "books_processed": record.books_processed,
                    "success": record.success,
                    "error_details": record.error_details
                }
                for record in history
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching sync history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch sync history"
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

@router.get("/settings/cache/stats")
async def get_cache_stats():
    """Get cache statistics for all caches"""
    try:
        book_stats = cache_service.book_cache.get_stats()
        api_stats = cache_service.api_cache.get_stats()
        page_stats = cache_service.page_cache.get_stats()
        
        return {
            "book_cache": book_stats,
            "api_cache": api_stats,
            "page_cache": page_stats,
            "total_items": book_stats["size"] + api_stats["size"] + page_stats["size"],
            "total_hits": book_stats["hits"] + api_stats["hits"] + page_stats["hits"],
            "total_misses": book_stats["misses"] + api_stats["misses"] + page_stats["misses"]
        }
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get cache statistics"
        )

@router.delete("/settings/cache/clear")
async def clear_cache(cache_type: Optional[str] = None):
    """Clear cache (all or specific type)"""
    try:
        if cache_type:
            if cache_type == "book":
                cache_service.book_cache.clear()
                message = "Book cache cleared"
            elif cache_type == "api":
                cache_service.api_cache.clear()
                message = "API cache cleared"
            elif cache_type == "page":
                cache_service.page_cache.clear()
                message = "Page cache cleared"
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid cache type: {cache_type}. Valid types are: book, api, page"
                )
        else:
            # Clear all caches
            cache_service.clear_all()
            message = "All caches cleared"
        
        logger.info(f"Cache cleared: {message}")
        return {"success": True, "message": message}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear cache"
        )