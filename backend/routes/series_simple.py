"""
Simplified series management API routes for testing
"""
from typing import Dict, Any
from fastapi import APIRouter, Query
from database import get_session
from models import Series, SeriesVolume
from sqlmodel import select
from datetime import date
try:
    from routes.settings import is_external_metadata_enabled
except ImportError:
    from .settings import is_external_metadata_enabled

router = APIRouter()

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {"status": "working", "message": "Series routes are functional"}

@router.get("/{series_name}")
async def get_series_simple(series_name: str) -> Dict[str, Any]:
    """Get basic series information, create if doesn't exist"""
    try:
        with get_session() as session:
            # Get series
            series = session.exec(select(Series).where(Series.name == series_name)).first()
            
            if not series:
                # Series doesn't exist - try to create it by finding books with this series
                from models import Book
                books_in_series = session.exec(select(Book).where(Book.series_name == series_name)).all()
                
                if books_in_series:
                    # Create series from existing books
                    first_book = books_in_series[0]
                    import json
                    authors = json.loads(first_book.authors) if first_book.authors else []
                    author = authors[0] if authors else None
                    
                    series = Series(
                        name=series_name,
                        author=author,
                        status="unknown",
                        total_books=len(books_in_series),
                        created_date=date.today(),
                        last_updated=date.today()
                    )
                    session.add(series)
                    session.commit()
                    session.refresh(series)
                    
                    # Create SeriesVolume records for the books we have
                    for book in books_in_series:
                        if book.series_position:
                            volume = SeriesVolume(
                                series_id=series.id,
                                position=book.series_position,
                                title=book.title,
                                status="owned",
                                user_id=1
                            )
                            session.add(volume)
                    
                    session.commit()
                    
                    # Try to fetch complete series metadata if enabled
                    if is_external_metadata_enabled():
                        try:
                            from services.series_metadata import SeriesMetadataService
                            metadata_service = SeriesMetadataService()
                            await metadata_service.fetch_and_update_series(series_name, author)
                            await metadata_service.close()
                            
                            # Refresh series data after metadata fetch
                            session.refresh(series)
                            
                        except Exception as e:
                            print(f"Warning: Could not fetch series metadata for '{series_name}': {e}")
                            # Continue without failing
                    else:
                        print(f"Created series '{series_name}' from existing books. External metadata fetch disabled.")
                
                else:
                    # No books found with this series name - create empty series and try metadata fetch
                    series = Series(
                        name=series_name,
                        author=None,
                        status="unknown",
                        total_books=0,
                        created_date=date.today(),
                        last_updated=date.today()
                    )
                    session.add(series)
                    session.commit()
                    session.refresh(series)
                    
                    # If we have no books for this series, we can't create meaningful data
                    print(f"No books found for series '{series_name}'. Empty series created.")
                    # TODO: Add background metadata fetch here
            
            # Get volumes
            volumes = session.exec(select(SeriesVolume).where(SeriesVolume.series_id == series.id)).all()
            
            # Build response
            volume_data = []
            for volume in sorted(volumes, key=lambda x: x.position):
                volume_data.append({
                    "position": volume.position,
                    "title": volume.title,
                    "isbn_13": volume.isbn_13,
                    "isbn_10": volume.isbn_10,
                    "publisher": volume.publisher,
                    "published_date": volume.published_date.isoformat() if volume.published_date else None,
                    "cover_url": volume.cover_url,
                    "status": volume.status,
                    "owned_book": {
                        "id": volume.id,
                        "title": volume.title,
                        "authors": [series.author] if series.author else [],
                        "isbn": volume.isbn_13 or volume.isbn_10
                    } if volume.status == "owned" else None
                })
            
            owned_count = len([v for v in volume_data if v["status"] == "owned"])
            total_count = len(volume_data)
            
            return {
                "series": {
                    "id": series.id,
                    "name": series.name,
                    "description": series.description,
                    "author": series.author,
                    "publisher": series.publisher,
                    "status": series.status,
                    "total_books": series.total_books,
                    "genres": [],
                    "tags": []
                },
                "volumes": volume_data,
                "stats": {
                    "total_volumes": total_count,
                    "owned_volumes": owned_count,
                    "missing_volumes": total_count - owned_count,
                    "wanted_volumes": 0,
                    "completion_percentage": round((owned_count / total_count) * 100) if total_count > 0 else 0
                }
            }
    
    except Exception as e:
        return {"error": f"Internal error: {str(e)}"}

@router.post("/{series_name}/refresh")
async def refresh_series_metadata_simple(series_name: str):
    """Refresh series metadata if external metadata is enabled"""
    try:
        # Check if external metadata is enabled
        if not is_external_metadata_enabled():
            return {
                "success": False,
                "message": "External metadata lookups are currently disabled",
                "updated_volumes": 0
            }
        
        with get_session() as session:
            series = session.exec(select(Series).where(Series.name == series_name)).first()
            if not series:
                return {"error": f"Series '{series_name}' not found"}
            
            # Try to fetch metadata from external sources
            try:
                from services.series_metadata import SeriesMetadataService
                metadata_service = SeriesMetadataService()
                result = await metadata_service.fetch_and_update_series(series_name, series.author)
                await metadata_service.close()
                
                # Update timestamp
                series.last_updated = date.today()
                session.add(series)
                session.commit()
                
                return {
                    "success": True,
                    "message": f"Series '{series_name}' metadata refreshed",
                    "updated_volumes": result.get("volumes_updated", 0),
                    "last_updated": series.last_updated.isoformat()
                }
            except Exception as e:
                print(f"Error fetching metadata: {e}")
                # Just update timestamp on error
                series.last_updated = date.today()
                session.add(series)
                session.commit()
                
                return {
                    "success": False,
                    "message": f"Failed to refresh metadata: {str(e)}",
                    "updated_volumes": 0,
                    "last_updated": series.last_updated.isoformat()
                }
    except Exception as e:
        return {"error": f"Internal error: {str(e)}"}

@router.post("/{series_name}/volumes/{position}/status")
async def update_volume_status_simple(series_name: str, position: int, status: str = Query(...)):
    """Update volume status"""
    if status not in ["owned", "wanted", "missing"]:
        return {"error": "Status must be 'owned', 'wanted', or 'missing'"}
    
    try:
        with get_session() as session:
            # Get series
            series = session.exec(select(Series).where(Series.name == series_name)).first()
            if not series:
                return {"error": f"Series '{series_name}' not found"}
            
            # Get volume
            volume = session.exec(select(SeriesVolume).where(
                SeriesVolume.series_id == series.id,
                SeriesVolume.position == position
            )).first()
            
            if not volume:
                return {"error": f"Volume {position} not found in series '{series_name}'"}
            
            # Update status
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
    except Exception as e:
        return {"error": f"Internal error: {str(e)}"}