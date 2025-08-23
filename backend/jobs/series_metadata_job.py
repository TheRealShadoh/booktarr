"""
Series metadata update job - ensures all series have complete metadata from external sources
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List
from sqlmodel import Session, select

try:
    from backend.database import get_session
    from backend.models import Series, Book
    from backend.services.series_metadata import SeriesMetadataService
    from backend.routes.logs import add_log
except ImportError:
    from database import get_session
    from models import Series, Book
    from services.series_metadata import SeriesMetadataService
    def add_log(*args, **kwargs):
        pass  # Fallback if logs module not available

logger = logging.getLogger(__name__)


class SeriesMetadataUpdateJob:
    def __init__(self):
        self.metadata_service = SeriesMetadataService()
        self.consecutive_failures = 0
        self.max_consecutive_failures = 15
        
    async def check_series_needs_update(self, series: Series) -> bool:
        """Check if series metadata needs updating"""
        # Series needs update if:
        # 1. Missing total_books or total_books <= 0
        # 2. No description
        # 3. No volumes in database
        # 4. Status is unknown
        # 5. Last updated is old (more than 30 days ago)
        
        if not series.total_books or series.total_books <= 0:
            return True
            
        if not series.description:
            return True
            
        if series.status == "unknown":
            return True
            
        # Check for volumes
        with next(get_session()) as session:
            from backend.models import SeriesVolume
            volumes_count = len(session.exec(
                select(SeriesVolume).where(SeriesVolume.series_id == series.id)
            ).all())
            
            if volumes_count == 0:
                return True
                
        # Check last update date (if available)
        if hasattr(series, 'last_metadata_update') and series.last_metadata_update:
            days_since_update = (datetime.now() - series.last_metadata_update).days
            if days_since_update > 30:
                return True
                
        return False
        
    async def update_series_metadata(self, session: Session, series: Series) -> bool:
        """Update metadata for a single series"""
        try:
            logger.info(f"Updating metadata for series: {series.name}")
            add_log("info", "series_metadata_job", f"Updating metadata for series: {series.name}")
            
            # Fetch complete metadata
            result = await self.metadata_service.fetch_and_update_series(
                series.name, 
                series.author
            )
            
            if result and result.get("total_books", 0) > 0:
                # Update the series with new metadata
                series.total_books = result.get("total_books", series.total_books)
                series.description = result.get("description") or series.description
                series.status = result.get("status", series.status)
                series.genres = result.get("genres") or series.genres
                series.publisher = result.get("publisher") or series.publisher
                series.first_published = result.get("first_published") or series.first_published
                series.last_published = result.get("last_published") or series.last_published
                
                # Add metadata update timestamp if field exists
                if hasattr(series, 'last_metadata_update'):
                    series.last_metadata_update = datetime.now()
                
                session.add(series)
                session.commit()
                
                logger.info(f"Successfully updated series: {series.name} ({series.total_books} volumes)")
                return True
            else:
                logger.warning(f"No metadata found for series: {series.name}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating metadata for series {series.name}: {e}")
            self.consecutive_failures += 1
            return False
            
    async def create_missing_series_from_books(self, session: Session) -> int:
        """Create series entries for books that have series_name but no Series record"""
        created_count = 0
        
        try:
            # Find books with series_name but no corresponding Series record
            books_with_series = session.exec(
                select(Book).where(Book.series_name.isnot(None))
            ).all()
            
            existing_series = {series.name for series in session.exec(select(Series)).all()}
            
            series_to_create = {}
            for book in books_with_series:
                if book.series_name and book.series_name not in existing_series:
                    if book.series_name not in series_to_create:
                        # Get author from book
                        authors = []
                        if book.authors:
                            import json
                            try:
                                authors = json.loads(book.authors) if isinstance(book.authors, str) else book.authors
                            except:
                                authors = [book.authors] if book.authors else []
                                
                        series_to_create[book.series_name] = {
                            "name": book.series_name,
                            "author": authors[0] if authors else None,
                            "total_books": 0,  # Will be updated by metadata fetch
                            "status": "unknown"
                        }
            
            # Create new series records
            for series_name, series_data in series_to_create.items():
                new_series = Series(**series_data)
                session.add(new_series)
                created_count += 1
                logger.info(f"Created new series record: {series_name}")
                
            if created_count > 0:
                session.commit()
                add_log("info", "series_metadata_job", f"Created {created_count} new series records")
                
        except Exception as e:
            logger.error(f"Error creating missing series: {e}")
            
        return created_count
            
    async def run(self, job_config: Any) -> Dict[str, Any]:
        """Run the series metadata update job"""
        processed = 0
        updated = 0
        created = 0
        failed = 0
        
        logger.info("Starting series metadata update job")
        add_log("info", "series_metadata_job", "Starting series metadata update job")
        
        try:
            with next(get_session()) as session:
                # First, create any missing series records
                created = await self.create_missing_series_from_books(session)
                
                # Get all series
                series_list = session.exec(select(Series)).all()
                total_series = len(series_list)
                
                logger.info(f"Found {total_series} series to check")
                add_log("info", "series_metadata_job", f"Found {total_series} series to check")
                
                for i, series in enumerate(series_list):
                    if self.consecutive_failures >= self.max_consecutive_failures:
                        logger.warning(f"Stopping job after {self.consecutive_failures} consecutive failures")
                        add_log("warning", "series_metadata_job", 
                               f"Stopping job after {self.consecutive_failures} consecutive failures")
                        break
                        
                    # Check if series needs metadata update
                    needs_update = await self.check_series_needs_update(series)
                    
                    if needs_update:
                        logger.debug(f"Series '{series.name}' needs metadata update")
                        
                        # Update series metadata
                        success = await self.update_series_metadata(session, series)
                        
                        if success:
                            updated += 1
                            self.consecutive_failures = 0  # Reset on success
                        else:
                            failed += 1
                    else:
                        logger.debug(f"Series '{series.name}' metadata is current")
                        
                    processed += 1
                    
                    # Log progress every 10 series
                    if i % 10 == 0 and i > 0:
                        logger.info(f"Progress: {i}/{total_series} series processed")
                        
                    # Small delay to be respectful to APIs
                    await asyncio.sleep(1.0)
                    
        except Exception as e:
            logger.error(f"Series metadata update job error: {e}")
            add_log("error", "series_metadata_job", f"Job failed: {str(e)}")
            failed += processed
            
        finally:
            # Always close the metadata service
            await self.metadata_service.close()
            
        # Check if we were rate limited
        rate_limited = self.consecutive_failures >= self.max_consecutive_failures
        
        result = {
            "processed": processed,
            "updated": updated,
            "created": created,
            "failed": failed,
            "consecutive_failures": self.consecutive_failures,
            "rate_limited": rate_limited
        }
        
        logger.info(f"Series metadata update job completed: {result}")
        add_log("info", "series_metadata_job", 
               f"Job completed: {processed} processed, {updated} updated, {created} created, {failed} failed")
        
        return result


# Job function for the scheduler
async def series_metadata_update_job(job_config: Any) -> Dict[str, Any]:
    """Series metadata update job function"""
    job = SeriesMetadataUpdateJob()
    return await job.run(job_config)