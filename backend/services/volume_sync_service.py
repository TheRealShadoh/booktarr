"""
Volume Status Synchronization Service
Keeps series volume status in sync with actual book ownership
"""
from typing import Dict, Any, List, Optional
from sqlmodel import Session, select
import json

try:
    from backend.models import Book, Edition, Series, SeriesVolume
    from backend.database import get_db_session
except ImportError:
    from models import Book, Edition, Series, SeriesVolume
    from database import get_db_session


class VolumeSyncService:
    """Service for synchronizing series volume status with book ownership"""
    
    def __init__(self):
        pass
    
    async def sync_series_volumes_with_books(self, series_name: str) -> Dict[str, Any]:
        """
        Synchronize series volumes with actual book ownership for a specific series
        """
        changes_made = []
        
        with get_db_session() as session:
            # Get the series
            series = session.exec(select(Series).where(Series.name == series_name)).first()
            if not series:
                return {
                    "success": False,
                    "message": f"Series '{series_name}' not found",
                    "changes": []
                }
            
            # Get all books in this series
            owned_books = session.exec(
                select(Book).where(Book.series_name == series_name)
            ).all()
            
            # Create mapping of series position to owned book
            position_to_book = {}
            for book in owned_books:
                if book.series_position:
                    position_to_book[book.series_position] = book
            
            # Get all series volumes
            volumes = session.exec(
                select(SeriesVolume).where(SeriesVolume.series_id == series.id)
            ).all()
            
            # Update volume statuses based on ownership
            for volume in volumes:
                old_status = volume.status
                
                if volume.position in position_to_book:
                    # We own this volume
                    if volume.status != "owned":
                        volume.status = "owned"
                        changes_made.append({
                            "position": volume.position,
                            "title": volume.title,
                            "old_status": old_status,
                            "new_status": "owned",
                            "reason": "Book found in collection"
                        })
                        session.add(volume)
                else:
                    # We don't own this volume
                    if volume.status == "owned":
                        volume.status = "missing"
                        changes_made.append({
                            "position": volume.position,
                            "title": volume.title,
                            "old_status": old_status,
                            "new_status": "missing",
                            "reason": "Book not found in collection"
                        })
                        session.add(volume)
            
            # Check for owned books that don't have corresponding volumes
            volume_positions = {vol.position for vol in volumes}
            for position, book in position_to_book.items():
                if position not in volume_positions:
                    # Create missing volume entry
                    new_volume = SeriesVolume(
                        series_id=series.id,
                        position=position,
                        title=book.title,
                        status="owned",
                        user_id=1  # Default user
                    )
                    
                    # Get additional details from book editions if available
                    if book.editions:
                        first_edition = book.editions[0]
                        new_volume.isbn_13 = first_edition.isbn_13
                        new_volume.isbn_10 = first_edition.isbn_10
                        new_volume.publisher = first_edition.publisher
                        new_volume.published_date = first_edition.release_date
                        new_volume.cover_url = first_edition.cover_url
                    
                    session.add(new_volume)
                    changes_made.append({
                        "position": position,
                        "title": book.title,
                        "old_status": None,
                        "new_status": "owned",
                        "reason": "Created volume from owned book"
                    })
            
            session.commit()
            
        return {
            "success": True,
            "message": f"Synchronized {len(changes_made)} volume statuses for series '{series_name}'",
            "changes": changes_made
        }
    
    async def sync_all_series_volumes(self) -> Dict[str, Any]:
        """
        Synchronize volumes for all series with actual book ownership
        """
        all_changes = []
        series_processed = 0
        
        with get_db_session() as session:
            # Get all series
            all_series = session.exec(select(Series)).all()
            
            for series in all_series:
                result = await self.sync_series_volumes_with_books(series.name)
                if result["success"]:
                    all_changes.extend(result["changes"])
                    series_processed += 1
        
        return {
            "success": True,
            "message": f"Synchronized volumes for {series_processed} series",
            "total_changes": len(all_changes),
            "changes_by_series": all_changes
        }
    
    async def reconcile_ownership_mismatches(self) -> Dict[str, Any]:
        """
        Find and report mismatches between series volume status and actual book ownership
        """
        mismatches = []
        
        with get_db_session() as session:
            # Get all series
            all_series = session.exec(select(Series)).all()
            
            for series in all_series:
                # Get owned books for this series
                owned_books = session.exec(
                    select(Book).where(Book.series_name == series.name)
                ).all()
                owned_positions = {book.series_position for book in owned_books if book.series_position}
                
                # Get series volumes
                volumes = session.exec(
                    select(SeriesVolume).where(SeriesVolume.series_id == series.id)
                ).all()
                
                for volume in volumes:
                    # Check for mismatches
                    if volume.position in owned_positions and volume.status != "owned":
                        mismatches.append({
                            "series": series.name,
                            "position": volume.position,
                            "title": volume.title,
                            "current_status": volume.status,
                            "expected_status": "owned",
                            "issue": "Volume marked as not owned but book exists in collection"
                        })
                    elif volume.position not in owned_positions and volume.status == "owned":
                        mismatches.append({
                            "series": series.name,
                            "position": volume.position,
                            "title": volume.title,
                            "current_status": volume.status,
                            "expected_status": "missing",
                            "issue": "Volume marked as owned but book not found in collection"
                        })
                
                # Check for owned books without volume entries
                volume_positions = {vol.position for vol in volumes}
                for book in owned_books:
                    if book.series_position and book.series_position not in volume_positions:
                        mismatches.append({
                            "series": series.name,
                            "position": book.series_position,
                            "title": book.title,
                            "current_status": None,
                            "expected_status": "owned",
                            "issue": "Owned book has no corresponding series volume entry"
                        })
        
        return {
            "success": True,
            "message": f"Found {len(mismatches)} ownership mismatches",
            "mismatches": mismatches
        }
    
    async def update_series_totals_from_volumes(self) -> Dict[str, Any]:
        """
        Update series total_books count based on actual volume data
        """
        updated_series = []
        
        with get_db_session() as session:
            all_series = session.exec(select(Series)).all()
            
            for series in all_series:
                # Get volume count
                volumes = session.exec(
                    select(SeriesVolume).where(SeriesVolume.series_id == series.id)
                ).all()
                volume_count = len(volumes)
                
                # Get owned books count
                owned_books = session.exec(
                    select(Book).where(Book.series_name == series.name)
                ).all()
                owned_count = len(owned_books)
                
                # Update total_books to be the maximum of current total, volume count, or owned count
                new_total = max(series.total_books or 0, volume_count, owned_count)
                
                if new_total != series.total_books:
                    old_total = series.total_books
                    series.total_books = new_total
                    session.add(series)
                    
                    updated_series.append({
                        "series": series.name,
                        "old_total": old_total,
                        "new_total": new_total,
                        "volume_count": volume_count,
                        "owned_count": owned_count
                    })
            
            session.commit()
        
        return {
            "success": True,
            "message": f"Updated totals for {len(updated_series)} series",
            "updated_series": updated_series
        }