"""
Series management API routes
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select
import json
from datetime import date

try:
    from backend.database import get_session
    from backend.models import Series, SeriesVolume, Book
except ImportError:
    from database import get_session
    from models import Series, SeriesVolume, Book

router = APIRouter()


@router.get("/test")
async def test_series_endpoint() -> Dict[str, Any]:
    """Test endpoint to verify series routes work"""
    return {"status": "Series routes working", "test": True}


@router.get("/{series_name}")
async def get_series_details(
    series_name: str,
    user_id: int = Query(1, description="User ID"),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get detailed information about a series including all volumes and ownership status."""
    
    # First check if we have series info in the database
    statement = select(Series).where(Series.name == series_name)
    series = session.exec(statement).first()
    
    if not series:
        # Create a new series entry based on owned books
        statement = select(Book).where(Book.series_name == series_name)
        owned_books = session.exec(statement).all()
        
        if not owned_books:
            raise HTTPException(status_code=404, detail=f"Series '{series_name}' not found")
        
        # Create series entry from first book
        first_book = owned_books[0]
        authors = json.loads(first_book.authors) if first_book.authors else []
        
        series = Series(
            name=series_name,
            author=authors[0] if authors else None,
            total_books=len(owned_books),  # Will be updated when we get external data
            status="unknown"
        )
        session.add(series)
        session.commit()
        session.refresh(series)
    
    # Get all volumes for this series
    statement = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
    volumes = session.exec(statement).all()
    
    # If no volumes exist, create them from owned books
    if not volumes:
        statement = select(Book).where(Book.series_name == series_name)
        owned_books = session.exec(statement).all()
        
        for book in owned_books:
            if book.series_position:
                volume = SeriesVolume(
                    series_id=series.id,
                    position=book.series_position,
                    title=book.title,
                    user_id=user_id,
                    status="owned"
                )
                session.add(volume)
                volumes.append(volume)
        
        session.commit()
    
    # Get ownership status for all volumes
    volume_data = []
    for volume in sorted(volumes, key=lambda x: x.position):
        volume_data.append({
            "position": volume.position,
            "title": volume.title,
            "subtitle": volume.subtitle,
            "isbn_13": volume.isbn_13,
            "isbn_10": volume.isbn_10,
            "publisher": volume.publisher,
            "published_date": volume.published_date.isoformat() if volume.published_date else None,
            "page_count": volume.page_count,
            "description": volume.description,
            "cover_url": volume.cover_url,
            "status": volume.status,
            "notes": volume.notes,
            "date_acquired": volume.date_acquired.isoformat() if volume.date_acquired else None,
            "owned_book": {
                "id": volume.id,
                "title": volume.title,
                "authors": [series.author] if series.author else [],
                "isbn": volume.isbn_13 or volume.isbn_10
            } if volume.status == "owned" else None
        })
    
    # Calculate accurate total books count
    owned_count = len([v for v in volume_data if v["status"] == "owned"])
    total_count = max(len(volume_data), series.total_books or 0)
    
    # If we have more owned than total, adjust total
    if owned_count > total_count:
        total_count = owned_count
    
    return {
        "series": {
            "id": series.id,
            "name": series.name,
            "description": series.description,
            "total_books": total_count,
            "author": series.author,
            "publisher": series.publisher,
            "first_published": series.first_published.isoformat() if series.first_published else None,
            "last_published": series.last_published.isoformat() if series.last_published else None,
            "status": series.status,
            "genres": json.loads(series.genres) if series.genres else [],
            "tags": json.loads(series.tags) if series.tags else [],
            "cover_url": series.cover_url,
            "created_date": series.created_date.isoformat(),
            "last_updated": series.last_updated.isoformat()
        },
        "volumes": volume_data,
        "stats": {
            "total_volumes": total_count,
            "owned_volumes": owned_count,
            "wanted_volumes": len([v for v in volume_data if v["status"] == "wanted"]),
            "missing_volumes": len([v for v in volume_data if v["status"] == "missing"]),
            "completion_percentage": round(owned_count / total_count * 100) if total_count > 0 else 0
        }
    }


@router.post("/{series_name}/volumes/{position}/status")
async def update_volume_status(
    series_name: str,
    position: int,
    status: str,
    user_id: int = Query(1, description="User ID"),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Update the ownership status of a specific volume in a series."""
    
    if status not in ["owned", "wanted", "missing"]:
        raise HTTPException(status_code=400, detail="Status must be 'owned', 'wanted', or 'missing'")
    
    # Get the series
    statement = select(Series).where(Series.name == series_name)
    series = session.exec(statement).first()
    
    if not series:
        raise HTTPException(status_code=404, detail=f"Series '{series_name}' not found")
    
    # Get the volume
    statement = select(SeriesVolume).where(
        SeriesVolume.series_id == series.id,
        SeriesVolume.position == position
    )
    volume = session.exec(statement).first()
    
    if not volume:
        raise HTTPException(status_code=404, detail=f"Volume {position} not found in series '{series_name}'")
    
    # Update the status
    volume.status = status
    session.add(volume)
    session.commit()
    
    return {
        "success": True,
        "message": f"Updated volume {position} status to '{status}'",
        "volume": {
            "position": volume.position,
            "title": volume.title,
            "status": volume.status
        }
    }


@router.post("/{series_name}/refresh")
async def refresh_series_metadata(
    series_name: str,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Refresh series metadata from external sources."""
    
    try:
        # Import the series metadata service  
        try:
            from backend.services.series_metadata import SeriesMetadataService
        except ImportError:
            try:
                from services.series_metadata import SeriesMetadataService
            except ImportError:
                # Fallback - just update timestamp for now
                series = session.exec(select(Series).where(Series.name == series_name)).first()
                if series:
                    series.last_updated = date.today()
                    session.add(series)
                    session.commit()
                return {
                    "success": True,
                    "message": f"Series '{series_name}' timestamp updated (metadata service not available)",
                    "updated_volumes": 0,
                    "last_updated": date.today().isoformat()
                }
        
        # Get the series to find the author
        statement = select(Series).where(Series.name == series_name)
        series = session.exec(statement).first()
        
        author = None
        if series:
            author = series.author
        else:
            # Try to get author from owned books
            statement = select(Book).where(Book.series_name == series_name)
            books = session.exec(statement).all()
            if books and books[0].authors:
                authors = json.loads(books[0].authors)
                author = authors[0] if authors else None
        
        # Fetch and update series metadata
        metadata_service = SeriesMetadataService()
        try:
            result = await metadata_service.fetch_and_update_series(series_name, author)
            return {
                "success": True,
                "message": f"Series '{series_name}' metadata refreshed successfully",
                "updated_volumes": result.get("volumes_updated", 0),
                "last_updated": date.today().isoformat()
            }
        finally:
            await metadata_service.close()
            
    except Exception as e:
        print(f"Error refreshing series metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh series metadata: {str(e)}")


@router.get("/")
async def list_all_series(
    user_id: int = Query(1, description="User ID"),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """List all series in the user's library."""
    
    statement = select(Series).order_by(Series.name)
    all_series = session.exec(statement).all()
    
    series_list = []
    for series in all_series:
        # Get volume count and ownership stats
        statement = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
        volumes = session.exec(statement).all()
        
        owned_count = len([v for v in volumes if v.status == "owned"])
        
        # Use the actual number of volumes or series.total_books, whichever makes more sense
        total_count = max(len(volumes), series.total_books or 0)
        
        # If we have more owned than total, adjust total
        if owned_count > total_count:
            total_count = owned_count
        
        series_list.append({
            "id": series.id,
            "name": series.name,
            "author": series.author,
            "total_books": total_count,
            "owned_books": owned_count,
            "completion_percentage": round(owned_count / total_count * 100) if total_count > 0 else 0,
            "status": series.status,
            "cover_url": series.cover_url
        })
    
    return {
        "series": series_list,
        "total_series": len(series_list)
    }


@router.post("/{series_name}/validate")
async def validate_series(
    series_name: str,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Validate series data for consistency issues."""
    try:
        from backend.services.series_validation import SeriesValidationService
    except ImportError:
        from services.series_validation import SeriesValidationService
    
    validation_service = SeriesValidationService()
    report = await validation_service.validate_series(series_name)
    
    return report


@router.post("/{series_name}/reconcile")
async def reconcile_series(
    series_name: str,
    fix_errors: bool = Query(True, description="Apply fixes for detected errors"),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Reconcile series data to fix inconsistencies."""
    try:
        from backend.services.series_validation import SeriesValidationService
    except ImportError:
        from services.series_validation import SeriesValidationService
    
    validation_service = SeriesValidationService()
    result = await validation_service.reconcile_series(series_name, fix_errors=fix_errors)
    
    return result


@router.post("/validate-all")
async def validate_all_series(
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Validate all series in the database for consistency issues."""
    try:
        from backend.services.series_validation import SeriesValidationService
    except ImportError:
        from services.series_validation import SeriesValidationService
    
    validation_service = SeriesValidationService()
    report = await validation_service.validate_all_series()
    
    return report