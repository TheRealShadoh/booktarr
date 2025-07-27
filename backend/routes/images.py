"""
Image management API routes
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session

try:
    from backend.database import get_session
    from backend.services.image_service import ImageService
except ImportError:
    from database import get_session
    from services.image_service import ImageService

router = APIRouter()


@router.post("/cache/all")
async def cache_all_covers() -> Dict[str, Any]:
    """Download and cache all book cover images locally."""
    
    try:
        image_service = ImageService()
        result = await image_service.cache_all_book_covers()
        return result
        
    except Exception as e:
        print(f"Error caching all covers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cache covers: {str(e)}")


@router.get("/info/{isbn}")
async def get_image_info(isbn: str) -> Dict[str, Any]:
    """Get information about cached images for an ISBN."""
    
    try:
        image_service = ImageService()
        info = image_service.get_image_info(isbn)
        return info
        
    except Exception as e:
        print(f"Error getting image info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get image info: {str(e)}")


@router.post("/series/{series_name}/sync")
async def sync_series_covers(series_name: str) -> Dict[str, Any]:
    """Sync all covers for a series - match existing and download missing."""
    
    try:
        image_service = ImageService()
        
        # First match existing covers
        matched = await image_service.match_existing_covers_to_volumes(series_name)
        
        # Then download any missing covers
        # Get series ID first
        from sqlmodel import select
        try:
            from backend.models import Series
        except ImportError:
            from models import Series
            
        with get_session() as session:
            series = session.exec(select(Series).where(Series.name == series_name)).first()
            if series:
                downloaded = await image_service.download_missing_volume_covers(series.id)
            else:
                downloaded = {}
        
        return {
            "success": True,
            "message": f"Synced covers for series '{series_name}'",
            "matched_covers": len(matched),
            "downloaded_covers": len(downloaded),
            "total_processed": len(matched) + len(downloaded)
        }
        
    except Exception as e:
        print(f"Error syncing series covers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync series covers: {str(e)}")