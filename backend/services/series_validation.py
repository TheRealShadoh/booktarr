"""
Series Validation Service for ensuring consistency between series metadata and actual book ownership
"""
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import date
from sqlmodel import Session, select
import logging

try:
    from backend.models import Series, SeriesVolume, Book
    from backend.database import get_session
except ImportError:
    from models import Series, SeriesVolume, Book
    from database import get_session

logger = logging.getLogger(__name__)


class SeriesValidationService:
    """Service for validating and reconciling series metadata"""
    
    def __init__(self):
        self.validation_errors = []
        self.validation_warnings = []
    
    async def validate_series(self, series_name: str) -> Dict[str, Any]:
        """
        Validate a series for consistency issues
        Returns validation report with errors and warnings
        """
        self.validation_errors = []
        self.validation_warnings = []
        
        with get_session() as session:
            # Get series
            statement = select(Series).where(Series.name == series_name)
            series = session.exec(statement).first()
            
            if not series:
                self.validation_errors.append(f"Series '{series_name}' not found")
                return self._create_validation_report()
            
            # Get all volumes
            statement = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
            volumes = session.exec(statement).all()
            
            # Get all owned books in series
            statement = select(Book).where(Book.series_name == series_name)
            owned_books = session.exec(statement).all()
            
            # Perform various validation checks
            self._validate_volume_count(series, volumes, owned_books)
            self._validate_volume_positions(volumes)
            self._validate_ownership_status(series, volumes, owned_books)
            self._validate_metadata_consistency(series, volumes)
            
            return self._create_validation_report()
    
    def _validate_volume_count(self, series: Series, volumes: List[SeriesVolume], owned_books: List[Book]):
        """Check if volume counts are consistent"""
        owned_volume_count = len([v for v in volumes if v.status == "owned"])
        actual_owned_books = len(owned_books)
        
        # Check if owned volumes match actual owned books
        if owned_volume_count != actual_owned_books:
            self.validation_errors.append(
                f"Owned volume count ({owned_volume_count}) doesn't match actual owned books ({actual_owned_books})"
            )
        
        # Check if total_books field is reasonable
        if series.total_books and len(volumes) > 0:
            if series.total_books < len(volumes):
                self.validation_errors.append(
                    f"Series total_books ({series.total_books}) is less than actual volumes ({len(volumes)})"
                )
            elif series.total_books > len(volumes) * 2:
                self.validation_warnings.append(
                    f"Series total_books ({series.total_books}) seems too high compared to known volumes ({len(volumes)})"
                )
        
        # Check if we have more owned books than total volumes
        if owned_volume_count > series.total_books:
            self.validation_errors.append(
                f"More owned books ({owned_volume_count}) than total series count ({series.total_books})"
            )
    
    def _validate_volume_positions(self, volumes: List[SeriesVolume]):
        """Check for duplicate or missing volume positions"""
        positions = [v.position for v in volumes]
        
        # Check for duplicates
        seen = set()
        duplicates = set()
        for pos in positions:
            if pos in seen:
                duplicates.add(pos)
            seen.add(pos)
        
        if duplicates:
            self.validation_errors.append(f"Duplicate volume positions found: {sorted(duplicates)}")
        
        # Check for gaps in sequence
        if positions:
            min_pos = min(positions)
            max_pos = max(positions)
            expected_positions = set(range(min_pos, max_pos + 1))
            missing_positions = expected_positions - set(positions)
            
            if missing_positions and len(missing_positions) <= 5:
                self.validation_warnings.append(f"Missing volume positions: {sorted(missing_positions)}")
    
    def _validate_ownership_status(self, series: Series, volumes: List[SeriesVolume], owned_books: List[Book]):
        """Validate that ownership status is consistent"""
        # Create ISBN to book mapping
        isbn_to_book = {}
        for book in owned_books:
            if book.editions:
                for edition in book.editions:
                    if edition.isbn_13:
                        isbn_to_book[edition.isbn_13] = book
                    if edition.isbn_10:
                        isbn_to_book[edition.isbn_10] = book
        
        # Check each volume
        for volume in volumes:
            if volume.status == "owned":
                # Check if we actually have this book
                found = False
                if volume.isbn_13 and volume.isbn_13 in isbn_to_book:
                    found = True
                elif volume.isbn_10 and volume.isbn_10 in isbn_to_book:
                    found = True
                else:
                    # Try to match by title and position
                    for book in owned_books:
                        if book.series_position == volume.position:
                            found = True
                            break
                
                if not found:
                    self.validation_warnings.append(
                        f"Volume {volume.position} marked as owned but no matching book found"
                    )
    
    def _validate_metadata_consistency(self, series: Series, volumes: List[SeriesVolume]):
        """Check for inconsistencies in metadata"""
        # Check if all volumes have consistent author/publisher info
        publishers = set()
        for volume in volumes:
            if volume.publisher:
                publishers.add(volume.publisher)
        
        if len(publishers) > 3:
            self.validation_warnings.append(
                f"Multiple publishers found ({len(publishers)}), series might contain different editions"
            )
    
    def _create_validation_report(self) -> Dict[str, Any]:
        """Create validation report"""
        return {
            "valid": len(self.validation_errors) == 0,
            "errors": self.validation_errors,
            "warnings": self.validation_warnings,
            "error_count": len(self.validation_errors),
            "warning_count": len(self.validation_warnings)
        }
    
    async def reconcile_series(self, series_name: str, fix_errors: bool = True) -> Dict[str, Any]:
        """
        Reconcile series data to fix inconsistencies
        """
        fixes_applied = []
        
        with get_session() as session:
            # Get series
            statement = select(Series).where(Series.name == series_name)
            series = session.exec(statement).first()
            
            if not series:
                return {
                    "success": False,
                    "error": f"Series '{series_name}' not found"
                }
            
            # Get all volumes
            statement = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
            volumes = session.exec(statement).all()
            
            # Get all owned books
            statement = select(Book).where(Book.series_name == series_name)
            owned_books = session.exec(statement).all()
            
            if fix_errors:
                # Fix volume count
                fixed_count = self._fix_volume_count(session, series, volumes, owned_books)
                if fixed_count:
                    fixes_applied.append(fixed_count)
                
                # Fix ownership status
                fixed_ownership = self._fix_ownership_status(session, series, volumes, owned_books)
                if fixed_ownership:
                    fixes_applied.extend(fixed_ownership)
                
                # Remove duplicate volumes
                fixed_duplicates = self._fix_duplicate_volumes(session, volumes)
                if fixed_duplicates:
                    fixes_applied.extend(fixed_duplicates)
            
            session.commit()
            
            return {
                "success": True,
                "fixes_applied": fixes_applied,
                "fix_count": len(fixes_applied)
            }
    
    def _fix_volume_count(self, session: Session, series: Series, volumes: List[SeriesVolume], 
                         owned_books: List[Book]) -> Optional[str]:
        """Fix series total_books count"""
        # Calculate the most reasonable total count
        owned_count = len([v for v in volumes if v.status == "owned"])
        volume_count = len(volumes)
        max_position = max([v.position for v in volumes]) if volumes else 0
        
        # Use the maximum of: current volume count, max position, or keep existing if reasonable
        new_total = max(volume_count, max_position)
        
        # If we have more owned books than the calculated total, use owned count
        if owned_count > new_total:
            new_total = owned_count
        
        # Only update if there's a significant difference
        if series.total_books != new_total:
            old_total = series.total_books
            series.total_books = new_total
            session.add(series)
            return f"Updated total_books from {old_total} to {new_total}"
        
        return None
    
    def _fix_ownership_status(self, session: Session, series: Series, volumes: List[SeriesVolume], 
                            owned_books: List[Book]) -> List[str]:
        """Fix ownership status mismatches"""
        fixes = []
        
        # Create mappings for efficient lookup
        position_to_book = {book.series_position: book for book in owned_books if book.series_position}
        isbn_to_book = {}
        for book in owned_books:
            if book.editions:
                for edition in book.editions:
                    if edition.isbn_13:
                        isbn_to_book[edition.isbn_13] = book
                    if edition.isbn_10:
                        isbn_to_book[edition.isbn_10] = book
        
        # Check each volume
        for volume in volumes:
            should_be_owned = False
            
            # Check if we have this book
            if volume.position in position_to_book:
                should_be_owned = True
            elif volume.isbn_13 and volume.isbn_13 in isbn_to_book:
                should_be_owned = True
            elif volume.isbn_10 and volume.isbn_10 in isbn_to_book:
                should_be_owned = True
            
            # Update status if needed
            if should_be_owned and volume.status != "owned":
                old_status = volume.status
                volume.status = "owned"
                session.add(volume)
                fixes.append(f"Updated volume {volume.position} status from '{old_status}' to 'owned'")
            elif not should_be_owned and volume.status == "owned":
                volume.status = "missing"
                session.add(volume)
                fixes.append(f"Updated volume {volume.position} status from 'owned' to 'missing'")
        
        # Add volumes for owned books that don't have volume entries
        existing_positions = {v.position for v in volumes}
        for book in owned_books:
            if book.series_position and book.series_position not in existing_positions:
                # Create new volume entry
                volume = SeriesVolume(
                    series_id=series.id,
                    position=book.series_position,
                    title=book.title,
                    status="owned",
                    user_id=1  # Default user
                )
                
                # Add ISBN info if available
                if book.editions:
                    first_edition = book.editions[0]
                    volume.isbn_13 = first_edition.isbn_13
                    volume.isbn_10 = first_edition.isbn_10
                    volume.publisher = first_edition.publisher
                    volume.published_date = first_edition.release_date
                    volume.cover_url = first_edition.cover_url
                
                session.add(volume)
                fixes.append(f"Created volume entry for position {book.series_position}")
        
        return fixes
    
    def _fix_duplicate_volumes(self, session: Session, volumes: List[SeriesVolume]) -> List[str]:
        """Remove duplicate volume entries"""
        fixes = []
        
        # Group volumes by position
        position_groups = {}
        for volume in volumes:
            if volume.position not in position_groups:
                position_groups[volume.position] = []
            position_groups[volume.position].append(volume)
        
        # Handle duplicates
        for position, vols in position_groups.items():
            if len(vols) > 1:
                # Keep the one with most metadata or owned status
                vols.sort(key=lambda v: (
                    v.status == "owned",  # Prefer owned
                    bool(v.isbn_13),      # Prefer with ISBN
                    bool(v.cover_url),    # Prefer with cover
                    v.id                  # Oldest ID as tiebreaker
                ), reverse=True)
                
                # Keep first, delete rest
                for vol in vols[1:]:
                    session.delete(vol)
                    fixes.append(f"Removed duplicate volume at position {position}")
        
        return fixes
    
    async def validate_all_series(self) -> Dict[str, Any]:
        """Validate all series in the database"""
        all_reports = {}
        
        with get_session() as session:
            statement = select(Series)
            all_series = session.exec(statement).all()
            
            for series in all_series:
                report = await self.validate_series(series.name)
                if report["error_count"] > 0 or report["warning_count"] > 0:
                    all_reports[series.name] = report
        
        return {
            "total_series": len(all_series),
            "series_with_issues": len(all_reports),
            "reports": all_reports
        }