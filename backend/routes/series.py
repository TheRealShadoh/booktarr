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
    
    # Force refresh the session to get latest data
    session.expire_all()
    
    # First check if we have series info in the database
    statement = select(Series).where(Series.name == series_name)
    series = session.exec(statement).first()
    
    if not series:
        # Create a new series entry based on owned books
        statement = select(Book).where(Book.series_name == series_name)
        owned_books = session.exec(statement).all()
        
        if not owned_books:
            raise HTTPException(status_code=404, detail=f"Series '{series_name}' not found")
        
        # Create series entry from first book with minimal data
        first_book = owned_books[0]
        authors = json.loads(first_book.authors) if first_book.authors else []
        
        # Create basic series record - metadata service will populate the rest
        series = Series(
            name=series_name,
            author=authors[0] if authors else None,
            total_books=1,  # Will be updated by metadata service
            status="unknown"
        )
        session.add(series)
        session.commit()
        session.refresh(series)
        
        # Get complete series metadata from external sources
        try:
            from backend.services.series_metadata import SeriesMetadataService
            metadata_service = SeriesMetadataService()
            try:
                await metadata_service.fetch_and_update_series(series_name, series.author, session=session)
                # Refresh the series from database after update
                session.refresh(series)
            except Exception as e:
                print(f"Warning: Could not fetch external metadata for '{series_name}': {e}")
            finally:
                await metadata_service.close()
        except ImportError:
            print(f"Warning: SeriesMetadataService not available for '{series_name}'")
    
    # Get all volumes for this series
    statement = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
    volumes = session.exec(statement).all()
    
    # If no volumes exist, create them from owned books
    if not volumes:
        statement = select(Book).where(Book.series_name == series_name)
        owned_books = session.exec(statement).all()
        
        for book in owned_books:
            if book.series_position:
                # Get cover URL from book's first edition
                cover_url = None
                if book.editions:
                    for edition in book.editions:
                        if edition.cover_url:
                            cover_url = edition.cover_url
                            break
                
                volume = SeriesVolume(
                    series_id=series.id,
                    position=book.series_position,
                    title=book.title,
                    cover_url=cover_url,
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
            "owned_book": None
        })
    
    # For owned volumes, fetch the actual book data to get correct ISBN
    for i, volume_info in enumerate(volume_data):
        if volume_info["status"] == "owned":
            # Find the actual book for this volume
            volume_obj = volumes[i]
            statement = select(Book).where(
                Book.series_name == series_name,
                Book.series_position == volume_obj.position
            )
            actual_book = session.exec(statement).first()
            
            if actual_book and actual_book.editions:
                # Get the primary ISBN from the first edition
                first_edition = actual_book.editions[0]
                primary_isbn = first_edition.isbn_13 or first_edition.isbn_10
                
                volume_info["owned_book"] = {
                    "id": actual_book.id,
                    "title": actual_book.title,
                    "authors": json.loads(actual_book.authors) if actual_book.authors else [series.author] if series.author else [],
                    "isbn": primary_isbn
                }
    
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


@router.post("/refresh-all")
async def refresh_all_series_metadata(
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Refresh metadata for all series from external sources."""
    
    try:
        # Get all series names
        all_series = session.exec(select(Series)).all()
        series_names = [series.name for series in all_series]
        
        # Also get series names from owned books that might not have series records yet
        books_with_series = session.exec(
            select(Book.series_name).where(Book.series_name.isnot(None)).distinct()
        ).all()
        
        all_series_names = set(series_names + [name for name in books_with_series if name])
        
        # Import the series metadata service
        try:
            from backend.services.series_metadata import SeriesMetadataService
        except ImportError:
            from services.series_metadata import SeriesMetadataService
        
        metadata_service = SeriesMetadataService()
        updated_series = []
        failed_series = []
        
        try:
            for series_name in all_series_names:
                try:
                    # Get author from existing series or first book
                    author = None
                    existing_series = session.exec(select(Series).where(Series.name == series_name)).first()
                    if existing_series:
                        author = existing_series.author
                    else:
                        # Get author from first book in series
                        first_book = session.exec(
                            select(Book).where(Book.series_name == series_name)
                        ).first()
                        if first_book and first_book.authors:
                            authors = json.loads(first_book.authors)
                            author = authors[0] if authors else None
                    
                    result = await metadata_service.fetch_and_update_series(series_name, author)
                    if result.get("success"):
                        updated_series.append({
                            "name": series_name,
                            "volumes_updated": result.get("volumes_updated", 0)
                        })
                    else:
                        failed_series.append({"name": series_name, "error": "Update failed"})
                        
                except Exception as e:
                    failed_series.append({"name": series_name, "error": str(e)})
                    
        finally:
            await metadata_service.anilist_client.close()
        
        return {
            "success": True,
            "message": f"Refreshed metadata for {len(updated_series)} series",
            "total_series": len(all_series_names),
            "updated_series": updated_series,
            "failed_series": failed_series
        }
        
    except Exception as e:
        print(f"Error refreshing all series metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to refresh all series metadata: {str(e)}")


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
    
    # Force refresh the session to get latest data
    session.expire_all()
    
    statement = select(Series).order_by(Series.name)
    all_series = session.exec(statement).all()
    
    # Debug: Print all series being processed
    print(f"Processing {len(all_series)} series from database")
    for s in all_series:
        if 'bleach' in s.name.lower():
            print(f"Found Bleach: ID={s.id}, total_books={s.total_books}, status={s.status}")
    
    series_list = []
    for series in all_series:
        # Get volume count and ownership stats
        statement = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
        volumes = session.exec(statement).all()
        
        owned_count = len([v for v in volumes if v.status == "owned"])
        
        # Debug logging for Bleach  
        if 'bleach' in series.name.lower():
            print(f"DEBUG: Bleach series - ID={series.id}, total_books={series.total_books}, volumes={len(volumes)}, owned={owned_count}, status={series.status}")
            print(f"DEBUG: Query result - display_total will be: {series.total_books or max(len(volumes), owned_count)}")
        
        # Always use series.total_books from metadata service
        display_total = series.total_books or max(len(volumes), owned_count)
        
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


@router.post("/detect-all")
async def detect_series_for_all_books(
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Detect and populate series information for ALL books in the library."""
    
    try:
        # Import the enhanced series detection service
        try:
            from backend.services.enhanced_series_detection import EnhancedSeriesDetectionService
        except ImportError:
            from services.enhanced_series_detection import EnhancedSeriesDetectionService
        
        async with EnhancedSeriesDetectionService() as detection_service:
            result = await detection_service.detect_series_for_existing_books()
            return {
                "success": True,
                "message": f"Processed {result['processed']} books, detected {result['series_detected']} series",
                **result
            }
        
    except Exception as e:
        print(f"Error detecting series for all books: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to detect series: {str(e)}")


@router.post("/enrich-all-covers")
async def enrich_all_series_covers(
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Fetch missing cover images for all series volumes."""
    
    try:
        # Get all series with missing covers
        all_series = session.exec(select(Series)).all()
        
        # Import services
        try:
            from backend.clients.google_books import GoogleBooksClient
        except ImportError:
            from clients.google_books import GoogleBooksClient
        
        google_client = GoogleBooksClient()
        covers_updated = 0
        errors = []
        
        try:
            for series in all_series:
                try:
                    # Get volumes without covers
                    volumes_without_covers = session.exec(
                        select(SeriesVolume).where(
                            SeriesVolume.series_id == series.id,
                            SeriesVolume.cover_url.is_(None)
                        )
                    ).all()
                    
                    for volume in volumes_without_covers:
                        # Try to get cover from Google Books by ISBN
                        if volume.isbn_13:
                            book_info = await google_client.search_by_isbn(volume.isbn_13)
                            if book_info and book_info.get("cover_url"):
                                volume.cover_url = book_info["cover_url"]
                                session.add(volume)
                                covers_updated += 1
                                continue
                        
                        # If no ISBN or no result, try by title and author
                        if volume.title and series.author:
                            search_results = await google_client.search_by_title(volume.title, series.author)
                            if search_results and search_results[0].get("cover_url"):
                                volume.cover_url = search_results[0]["cover_url"]
                                session.add(volume)
                                covers_updated += 1
                
                except Exception as e:
                    errors.append(f"Error processing series '{series.name}': {str(e)}")
            
            session.commit()
            
        finally:
            await google_client.close()
        
        return {
            "success": True,
            "message": f"Updated {covers_updated} volume covers",
            "covers_updated": covers_updated,
            "errors": errors
        }
        
    except Exception as e:
        print(f"Error enriching series covers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to enrich covers: {str(e)}")


@router.post("/search-metadata")
async def search_metadata(
    query: str = Query(..., description="Search query (title, author, ISBN)"),
    search_type: str = Query("title", description="Search type: title, author, isbn"),
    max_results: int = Query(10, description="Maximum results to return")
) -> Dict[str, Any]:
    """Search for book metadata from multiple sources for manual selection."""
    
    try:
        # Import clients
        try:
            from backend.clients.google_books import GoogleBooksClient
            from backend.clients.openlibrary import OpenLibraryClient
        except ImportError:
            from clients.google_books import GoogleBooksClient
            from clients.openlibrary import OpenLibraryClient
        
        results = []
        errors = []
        
        # Search Google Books
        try:
            google_client = GoogleBooksClient()
            try:
                if search_type == "isbn":
                    google_result = await google_client.search_by_isbn(query)
                    if google_result:
                        google_result["source"] = "Google Books"
                        results.append(google_result)
                elif search_type == "title":
                    google_results = await google_client.search_by_title(query)
                    for result in google_results[:max_results//2]:
                        result["source"] = "Google Books"
                        results.append(result)
                elif search_type == "author":
                    google_results = await google_client.search_by_author(query)
                    for result in google_results[:max_results//2]:
                        result["source"] = "Google Books"
                        results.append(result)
            finally:
                await google_client.close()
        except Exception as e:
            errors.append(f"Google Books error: {str(e)}")
        
        # Search OpenLibrary (temporarily disabled for performance)
        # try:
        #     ol_client = OpenLibraryClient()
        #     try:
        #         if search_type == "isbn":
        #             ol_result = await ol_client.search_by_isbn(query)
        #             if ol_result:
        #                 ol_result["source"] = "Open Library"
        #                 results.append(ol_result)
        #         elif search_type == "title":
        #             ol_results = await ol_client.search_by_title(query)
        #             for result in ol_results[:max_results//2]:
        #                 result["source"] = "Open Library"
        #                 results.append(result)
        #     finally:
        #         await ol_client.close()
        # except Exception as e:
        #     errors.append(f"OpenLibrary error: {str(e)}")
        errors.append("OpenLibrary search temporarily disabled for performance")
        
        # Deduplicate results by ISBN or title
        seen = set()
        unique_results = []
        for result in results:
            key = result.get("isbn_13") or result.get("isbn_10") or result.get("title", "").lower()
            if key and key not in seen:
                seen.add(key)
                unique_results.append(result)
        
        return {
            "success": True,
            "query": query,
            "search_type": search_type,
            "results": unique_results[:max_results],
            "total_found": len(unique_results),
            "errors": errors
        }
        
    except Exception as e:
        print(f"Error searching metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search metadata: {str(e)}")


@router.put("/{series_name}/volumes/{position}")
async def update_volume_metadata(
    series_name: str,
    position: int,
    volume_data: dict,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Update volume metadata manually."""
    
    try:
        # Get the series
        series = session.exec(select(Series).where(Series.name == series_name)).first()
        if not series:
            raise HTTPException(status_code=404, detail=f"Series '{series_name}' not found")
        
        # Get the volume
        volume = session.exec(
            select(SeriesVolume).where(
                SeriesVolume.series_id == series.id,
                SeriesVolume.position == position
            )
        ).first()
        
        if not volume:
            raise HTTPException(status_code=404, detail=f"Volume {position} not found in series '{series_name}'")
        
        # Update fields if provided
        updated_fields = []
        
        if "title" in volume_data and volume_data["title"]:
            volume.title = volume_data["title"]
            updated_fields.append("title")
        
        if "subtitle" in volume_data:
            volume.subtitle = volume_data["subtitle"]
            updated_fields.append("subtitle")
        
        if "isbn_13" in volume_data:
            volume.isbn_13 = volume_data["isbn_13"]
            updated_fields.append("isbn_13")
        
        if "isbn_10" in volume_data:
            volume.isbn_10 = volume_data["isbn_10"]
            updated_fields.append("isbn_10")
        
        if "publisher" in volume_data:
            volume.publisher = volume_data["publisher"]
            updated_fields.append("publisher")
        
        if "published_date" in volume_data:
            if volume_data["published_date"]:
                try:
                    from datetime import datetime
                    volume.published_date = datetime.fromisoformat(volume_data["published_date"]).date()
                    updated_fields.append("published_date")
                except:
                    pass
            else:
                volume.published_date = None
                updated_fields.append("published_date")
        
        if "page_count" in volume_data:
            volume.page_count = volume_data["page_count"]
            updated_fields.append("page_count")
        
        if "description" in volume_data:
            volume.description = volume_data["description"]
            updated_fields.append("description")
        
        if "cover_url" in volume_data:
            volume.cover_url = volume_data["cover_url"]
            updated_fields.append("cover_url")
        
        session.add(volume)
        session.commit()
        
        return {
            "success": True,
            "message": f"Updated volume {position} in series '{series_name}'",
            "updated_fields": updated_fields,
            "volume": {
                "position": volume.position,
                "title": volume.title,
                "isbn_13": volume.isbn_13,
                "cover_url": volume.cover_url
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating volume metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update volume: {str(e)}")


@router.post("/{series_name}/volumes/{position}/apply-metadata")
async def apply_metadata_to_volume(
    series_name: str,
    position: int,
    metadata: dict,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Apply selected metadata from search results to a volume."""
    
    try:
        # Get the series and volume
        series = session.exec(select(Series).where(Series.name == series_name)).first()
        if not series:
            raise HTTPException(status_code=404, detail=f"Series '{series_name}' not found")
        
        volume = session.exec(
            select(SeriesVolume).where(
                SeriesVolume.series_id == series.id,
                SeriesVolume.position == position
            )
        ).first()
        
        if not volume:
            raise HTTPException(status_code=404, detail=f"Volume {position} not found in series '{series_name}'")
        
        # Apply metadata from the selected result
        updated_fields = []
        
        if metadata.get("title"):
            volume.title = metadata["title"]
            updated_fields.append("title")
        
        if metadata.get("isbn_13"):
            volume.isbn_13 = metadata["isbn_13"]
            updated_fields.append("isbn_13")
        
        if metadata.get("isbn_10"):
            volume.isbn_10 = metadata["isbn_10"]
            updated_fields.append("isbn_10")
        
        if metadata.get("publisher"):
            volume.publisher = metadata["publisher"]
            updated_fields.append("publisher")
        
        if metadata.get("release_date"):
            try:
                from datetime import datetime
                if isinstance(metadata["release_date"], str):
                    volume.published_date = datetime.fromisoformat(metadata["release_date"]).date()
                    updated_fields.append("published_date")
            except:
                pass
        
        if metadata.get("page_count"):
            volume.page_count = metadata["page_count"]
            updated_fields.append("page_count")
        
        if metadata.get("description"):
            volume.description = metadata["description"]
            updated_fields.append("description")
        
        if metadata.get("cover_url"):
            volume.cover_url = metadata["cover_url"]
            updated_fields.append("cover_url")
        
        session.add(volume)
        session.commit()
        
        return {
            "success": True,
            "message": f"Applied metadata to volume {position} in series '{series_name}'",
            "updated_fields": updated_fields,
            "source": metadata.get("source", "Unknown"),
            "volume": {
                "position": volume.position,
                "title": volume.title,
                "isbn_13": volume.isbn_13,
                "cover_url": volume.cover_url
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error applying metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to apply metadata: {str(e)}")
