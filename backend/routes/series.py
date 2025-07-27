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


@router.post("/validate")
async def validate_series_data(
    series_name: str = None,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Validate and fix series data inconsistencies."""
    
    try:
        # Import the series metadata service
        try:
            from backend.services.series_metadata import SeriesMetadataService
        except ImportError:
            from services.series_metadata import SeriesMetadataService
        
        metadata_service = SeriesMetadataService()
        try:
            result = await metadata_service.validate_and_fix_series_data(series_name)
            return result
        finally:
            await metadata_service.close()
            
    except Exception as e:
        print(f"Error validating series data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to validate series data: {str(e)}")


@router.post("/{series_name}/covers/match")
async def match_series_covers(
    series_name: str,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Match existing book covers to series volumes and download missing ones."""
    
    try:
        # Import the image service
        try:
            from backend.services.image_service import ImageService
        except ImportError:
            from services.image_service import ImageService
        
        image_service = ImageService()
        
        # Match existing covers to volumes
        matched_covers = await image_service.match_existing_covers_to_volumes(series_name)
        
        # Get series ID for downloading missing covers
        series = session.exec(select(Series).where(Series.name == series_name)).first()
        if series:
            downloaded_covers = await image_service.download_missing_volume_covers(series.id)
        else:
            downloaded_covers = {}
        
        return {
            "success": True,
            "message": f"Processed covers for series '{series_name}'",
            "matched_covers": len(matched_covers),
            "downloaded_covers": len(downloaded_covers),
            "cover_mappings": {**matched_covers, **downloaded_covers}
        }
        
    except Exception as e:
        print(f"Error matching series covers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to match series covers: {str(e)}")


@router.post("/{series_name}/sync")
async def sync_series_volumes(
    series_name: str,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Synchronize series volumes with actual book ownership."""
    
    try:
        # Import the volume sync service
        try:
            from backend.services.volume_sync_service import VolumeSyncService
        except ImportError:
            from services.volume_sync_service import VolumeSyncService
        
        sync_service = VolumeSyncService()
        result = await sync_service.sync_series_volumes_with_books(series_name)
        return result
        
    except Exception as e:
        print(f"Error syncing series volumes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync series volumes: {str(e)}")


@router.post("/sync-all")
async def sync_all_series_volumes(
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Synchronize volumes for all series with actual book ownership."""
    
    try:
        # Import the volume sync service
        try:
            from backend.services.volume_sync_service import VolumeSyncService
        except ImportError:
            from services.volume_sync_service import VolumeSyncService
        
        sync_service = VolumeSyncService()
        result = await sync_service.sync_all_series_volumes()
        return result
        
    except Exception as e:
        print(f"Error syncing all series volumes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync all series volumes: {str(e)}")


@router.get("/mismatches")
async def check_ownership_mismatches(
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Find and report mismatches between series volume status and actual book ownership."""
    
    try:
        # Import the volume sync service
        try:
            from backend.services.volume_sync_service import VolumeSyncService
        except ImportError:
            from services.volume_sync_service import VolumeSyncService
        
        sync_service = VolumeSyncService()
        result = await sync_service.reconcile_ownership_mismatches()
        return result
        
    except Exception as e:
        print(f"Error checking ownership mismatches: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check ownership mismatches: {str(e)}")


@router.post("/fix-all")
async def fix_all_series_data(
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Fix all series data issues - validation, synchronization, and totals update."""
    
    try:
        # Import services
        try:
            from backend.services.series_metadata import SeriesMetadataService
            from backend.services.volume_sync_service import VolumeSyncService
        except ImportError:
            from services.series_metadata import SeriesMetadataService
            from services.volume_sync_service import VolumeSyncService
        
        results = {
            "validation": None,
            "synchronization": None,
            "mismatches": None,
            "totals_update": None
        }
        
        # Step 1: Validate and fix series metadata
        metadata_service = SeriesMetadataService()
        try:
            results["validation"] = await metadata_service.validate_and_fix_series_data()
        finally:
            await metadata_service.close()
        
        # Step 2: Synchronize all series volumes
        sync_service = VolumeSyncService()
        results["synchronization"] = await sync_service.sync_all_series_volumes()
        
        # Step 3: Check for mismatches
        results["mismatches"] = await sync_service.reconcile_ownership_mismatches()
        
        # Step 4: Update series totals
        results["totals_update"] = await sync_service.update_series_totals_from_volumes()
        
        # Summary
        total_fixes = 0
        if results["validation"]["success"]:
            total_fixes += len(results["validation"]["fixed_series"])
        if results["synchronization"]["success"]:
            total_fixes += results["synchronization"]["total_changes"]
        if results["totals_update"]["success"]:
            total_fixes += len(results["totals_update"]["updated_series"])
        
        return {
            "success": True,
            "message": f"Fixed {total_fixes} total issues across all series",
            "details": results
        }
        
    except Exception as e:
        print(f"Error fixing all series data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fix series data: {str(e)}")


@router.post("/create")
async def create_series(
    series_data: dict,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Create a new series manually."""
    
    try:
        name = series_data.get("name")
        if not name:
            raise HTTPException(status_code=400, detail="Series name is required")
        
        # Check if series already exists
        existing_series = session.exec(select(Series).where(Series.name == name)).first()
        if existing_series:
            raise HTTPException(status_code=409, detail=f"Series '{name}' already exists")
        
        # Create new series
        new_series = Series(
            name=name,
            author=series_data.get("author"),
            description=series_data.get("description"),
            total_books=series_data.get("total_books", 0),
            publisher=series_data.get("publisher"),
            status=series_data.get("status", "ongoing"),
            genres=json.dumps(series_data.get("genres", [])),
            tags=json.dumps(series_data.get("tags", [])),
            first_published=series_data.get("first_published"),
            last_published=series_data.get("last_published"),
            created_date=date.today(),
            last_updated=date.today()
        )
        
        session.add(new_series)
        session.commit()
        session.refresh(new_series)
        
        return {
            "success": True,
            "message": f"Series '{name}' created successfully",
            "series_id": new_series.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create series: {str(e)}")


@router.put("/{series_name}/update")
async def update_series(
    series_name: str,
    series_data: dict,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Update an existing series."""
    
    try:
        # Get existing series
        series = session.exec(select(Series).where(Series.name == series_name)).first()
        if not series:
            raise HTTPException(status_code=404, detail=f"Series '{series_name}' not found")
        
        # Update fields if provided
        if "name" in series_data and series_data["name"] != series_name:
            # Check if new name already exists
            existing = session.exec(select(Series).where(Series.name == series_data["name"])).first()
            if existing:
                raise HTTPException(status_code=409, detail=f"Series '{series_data['name']}' already exists")
            series.name = series_data["name"]
        
        if "author" in series_data:
            series.author = series_data["author"]
        if "description" in series_data:
            series.description = series_data["description"]
        if "total_books" in series_data:
            series.total_books = series_data["total_books"]
        if "publisher" in series_data:
            series.publisher = series_data["publisher"]
        if "status" in series_data:
            series.status = series_data["status"]
        if "genres" in series_data:
            series.genres = json.dumps(series_data["genres"])
        if "tags" in series_data:
            series.tags = json.dumps(series_data["tags"])
        if "first_published" in series_data:
            series.first_published = series_data["first_published"]
        if "last_published" in series_data:
            series.last_published = series_data["last_published"]
        
        series.last_updated = date.today()
        session.add(series)
        session.commit()
        
        return {
            "success": True,
            "message": f"Series updated successfully",
            "series_id": series.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update series: {str(e)}")


@router.delete("/{series_name}")
async def delete_series(
    series_name: str,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Delete a series and all its volumes."""
    
    try:
        # Get series
        series = session.exec(select(Series).where(Series.name == series_name)).first()
        if not series:
            raise HTTPException(status_code=404, detail=f"Series '{series_name}' not found")
        
        # Delete all volumes first
        volumes = session.exec(select(SeriesVolume).where(SeriesVolume.series_id == series.id)).all()
        for volume in volumes:
            session.delete(volume)
        
        # Delete series
        session.delete(series)
        session.commit()
        
        return {
            "success": True,
            "message": f"Series '{series_name}' and {len(volumes)} volumes deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete series: {str(e)}")


@router.post("/{series_name}/books/add")
async def add_book_to_series(
    series_name: str,
    book_data: dict,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Add a book to a series by creating a volume entry."""
    
    try:
        # Get series
        series = session.exec(select(Series).where(Series.name == series_name)).first()
        if not series:
            raise HTTPException(status_code=404, detail=f"Series '{series_name}' not found")
        
        position = book_data.get("position")
        if not position:
            raise HTTPException(status_code=400, detail="Position is required")
        
        # Check if position already exists
        existing_volume = session.exec(
            select(SeriesVolume).where(
                SeriesVolume.series_id == series.id,
                SeriesVolume.position == position
            )
        ).first()
        
        if existing_volume:
            raise HTTPException(status_code=409, detail=f"Volume at position {position} already exists")
        
        # Create new volume
        new_volume = SeriesVolume(
            series_id=series.id,
            position=position,
            title=book_data.get("title", f"{series_name} Vol. {position}"),
            subtitle=book_data.get("subtitle"),
            isbn_13=book_data.get("isbn_13"),
            isbn_10=book_data.get("isbn_10"),
            publisher=book_data.get("publisher"),
            published_date=book_data.get("published_date"),
            page_count=book_data.get("page_count"),
            description=book_data.get("description"),
            cover_url=book_data.get("cover_url"),
            status=book_data.get("status", "missing"),
            user_id=1  # Default user
        )
        
        session.add(new_volume)
        session.commit()
        session.refresh(new_volume)
        
        return {
            "success": True,
            "message": f"Added volume {position} to series '{series_name}'",
            "volume_id": new_volume.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add book to series: {str(e)}")


@router.delete("/{series_name}/books/{position}")
async def remove_book_from_series(
    series_name: str,
    position: int,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Remove a book from a series."""
    
    try:
        # Get series
        series = session.exec(select(Series).where(Series.name == series_name)).first()
        if not series:
            raise HTTPException(status_code=404, detail=f"Series '{series_name}' not found")
        
        # Get volume
        volume = session.exec(
            select(SeriesVolume).where(
                SeriesVolume.series_id == series.id,
                SeriesVolume.position == position
            )
        ).first()
        
        if not volume:
            raise HTTPException(status_code=404, detail=f"Volume {position} not found in series '{series_name}'")
        
        session.delete(volume)
        session.commit()
        
        return {
            "success": True,
            "message": f"Removed volume {position} from series '{series_name}'"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove book from series: {str(e)}")


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
        
        # Use the larger of series.total_books or actual volume count for consistency
        display_total = max(series.total_books, total_count) if series.total_books and total_count else (series.total_books or total_count)
        
        series_list.append({
            "id": series.id,
            "name": series.name,
            "author": series.author,
            "total_books": display_total,
            "owned_books": owned_count,
            "completion_percentage": round(owned_count / display_total * 100) if display_total > 0 else 0,
            "status": series.status,
            "cover_url": series.cover_url
        })
    
    return {
        "series": series_list,
        "total_series": len(series_list)
    }


<<<<<<< HEAD
@router.post("/fix-orphaned-books")
async def fix_orphaned_books(
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Create series entries for books that have series_name but no series entry"""
    
    try:
        # Find books with series_name but no series entry
        statement = select(Book).where(Book.series_name.isnot(None))
        all_books_with_series = session.exec(statement).all()
        
        # Group by series_name and check if series exists
        series_book_count = {}
        orphaned_series = {}
        
        for book in all_books_with_series:
            series_name = book.series_name
            if series_name not in series_book_count:
                series_book_count[series_name] = []
            series_book_count[series_name].append(book)
        
        # Check which series don't exist
        for series_name, books in series_book_count.items():
            series_exists = session.exec(
                select(Series).where(Series.name == series_name)
            ).first()
            
            if not series_exists:
                orphaned_series[series_name] = books
        
        if not orphaned_series:
            return {
                "success": True,
                "message": "No orphaned books found",
                "fixed_series": []
            }
        
        fixed_series = []
        
        for series_name, books in orphaned_series.items():
            # Get primary author from first book
            primary_author = None
            if books and books[0].authors:
                try:
                    authors = json.loads(books[0].authors)
                    primary_author = authors[0] if authors else None
                except:
                    pass
            
            # Create series entry
            new_series = Series(
                name=series_name,
                author=primary_author,
                total_books=len(books),
                status="unknown",
                created_date=date.today(),
                last_updated=date.today()
            )
            
            session.add(new_series)
            session.commit()
            session.refresh(new_series)
            
            # Create volume entries
            volume_count = 0
            for book in sorted(books, key=lambda x: x.series_position or 999):
                position = book.series_position
                if position is None:
                    # Find next available position
                    max_position = session.exec(
                        select(SeriesVolume.position).where(
                            SeriesVolume.series_id == new_series.id
                        ).order_by(SeriesVolume.position.desc())
                    ).first()
                    position = (max_position or 0) + 1
                    
                    # Update book with calculated position
                    book.series_position = position
                    session.add(book)
                
                # Create volume entry
                volume = SeriesVolume(
                    series_id=new_series.id,
                    position=position,
                    title=book.title,
                    status="owned",
                    user_id=1
                )
                session.add(volume)
                volume_count += 1
            
            session.commit()
            
            fixed_series.append({
                "name": series_name,
                "author": primary_author,
                "books_count": len(books),
                "volumes_created": volume_count
            })
        
        return {
            "success": True,
            "message": f"Fixed {len(fixed_series)} orphaned series",
            "fixed_series": fixed_series
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fix orphaned books: {str(e)}")


@router.post("/fix-missing-volumes")
async def fix_missing_volumes(
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Create volume entries for books that have series but no volume entry"""
    
    try:
        # Find books with series info but no volume entries
        statement = select(Book, Series).join(
            Series, Book.series_name == Series.name
        ).outerjoin(
            SeriesVolume, 
            (SeriesVolume.series_id == Series.id) & 
            (SeriesVolume.position == Book.series_position)
        ).where(
            Book.series_name.isnot(None),
            SeriesVolume.id.is_(None)
        )
        
        results = session.exec(statement).all()
        
        if not results:
            return {
                "success": True,
                "message": "No books missing volume entries found",
                "fixed_books": []
            }
        
        fixed_books = []
        
        for book, series in results:
            position = book.series_position
            
            # If position is None, assign next available
            if position is None:
                max_position = session.exec(
                    select(SeriesVolume.position).where(
                        SeriesVolume.series_id == series.id
                    ).order_by(SeriesVolume.position.desc())
                ).first()
                position = (max_position or 0) + 1
                
                # Update book with calculated position
                book.series_position = position
                session.add(book)
            
            # Create volume entry
            volume = SeriesVolume(
                series_id=series.id,
                position=position,
                title=book.title,
                status="owned",
                user_id=1
            )
            session.add(volume)
            
            fixed_books.append({
                "book_id": book.id,
                "title": book.title,
                "series_name": series.name,
                "position": position
            })
        
        session.commit()
        
        return {
            "success": True,
            "message": f"Fixed {len(fixed_books)} missing volume entries",
            "fixed_books": fixed_books
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fix missing volumes: {str(e)}")
=======
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
>>>>>>> fix/volume-count-inconsistencies
