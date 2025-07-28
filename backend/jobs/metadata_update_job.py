"""
Metadata update job - checks for missing metadata and fetches from online sources
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List
from sqlmodel import Session, select
from database import get_session
from models.book import Book
from services.book_search import BookSearchService
from clients.google_books import GoogleBooksClient
from clients.openlibrary import OpenLibraryClient

logger = logging.getLogger(__name__)

class MetadataUpdateJob:
    def __init__(self):
        self.search_service = BookSearchService()
        self.google_client = GoogleBooksClient()
        self.openlibrary_client = OpenLibraryClient()
        self.consecutive_failures = 0
        self.max_consecutive_failures = 10
        
    def check_missing_metadata(self, book: Book) -> List[str]:
        """Check which metadata fields are missing"""
        missing = []
        
        # Check essential fields
        if not book.description:
            missing.append("description")
        if not book.cover_url and not book.thumbnail_url:
            missing.append("cover")
        if not book.publisher:
            missing.append("publisher")
        if not book.published_date:
            missing.append("published_date")
        if not book.page_count:
            missing.append("page_count")
        if not book.categories or len(book.categories) == 0:
            missing.append("categories")
        if not book.series_name and book.title and any(char.isdigit() for char in book.title):
            missing.append("series_info")
            
        return missing
        
    async def update_book_metadata(self, session: Session, book: Book, missing_fields: List[str]) -> bool:
        """Update metadata for a single book"""
        try:
            updated = False
            api_failed = False
            
            # Try Google Books first
            try:
                google_data = await self.google_client.search_by_isbn(book.isbn or book.isbn13 or book.isbn10)
                if google_data and google_data.get("items"):
                    item = google_data["items"][0]["volumeInfo"]
                    
                    if "description" in missing_fields and item.get("description"):
                        book.description = item["description"]
                        updated = True
                        
                    if "cover" in missing_fields and item.get("imageLinks"):
                        book.cover_url = item["imageLinks"].get("thumbnail", "").replace("http://", "https://")
                        book.thumbnail_url = book.cover_url
                        updated = True
                        
                    if "publisher" in missing_fields and item.get("publisher"):
                        book.publisher = item["publisher"]
                        updated = True
                        
                    if "published_date" in missing_fields and item.get("publishedDate"):
                        book.published_date = item["publishedDate"]
                        updated = True
                        
                    if "page_count" in missing_fields and item.get("pageCount"):
                        book.page_count = item["pageCount"]
                        updated = True
                        
                    if "categories" in missing_fields and item.get("categories"):
                        book.categories = item["categories"]
                        updated = True
                        
            except Exception as e:
                api_failed = True
                if "429" in str(e) or "rate limit" in str(e).lower():
                    logger.warning("Google Books API rate limit hit")
                else:
                    logger.error(f"Error fetching from Google Books: {e}")
                        
            # Try OpenLibrary as fallback
            if not updated:
                try:
                    ol_data = await self.openlibrary_client.get_by_isbn(book.isbn or book.isbn13 or book.isbn10)
                    if ol_data:
                        if "description" in missing_fields and ol_data.get("description"):
                            desc = ol_data["description"]
                            book.description = desc if isinstance(desc, str) else desc.get("value", "")
                            updated = True
                            
                        if "cover" in missing_fields and ol_data.get("covers"):
                            cover_id = ol_data["covers"][0]
                            book.cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
                            book.thumbnail_url = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
                            updated = True
                            
                        if "publisher" in missing_fields and ol_data.get("publishers"):
                            book.publisher = ol_data["publishers"][0]
                            updated = True
                            
                        if "published_date" in missing_fields and ol_data.get("publish_date"):
                            book.published_date = ol_data["publish_date"]
                            updated = True
                            
                        if "page_count" in missing_fields and ol_data.get("number_of_pages"):
                            book.page_count = ol_data["number_of_pages"]
                            updated = True
                            
                except Exception as e:
                    api_failed = True
                    if "429" in str(e) or "rate limit" in str(e).lower():
                        logger.warning("OpenLibrary API rate limit hit")
                    else:
                        logger.error(f"Error fetching from OpenLibrary: {e}")
            
            # Track consecutive failures
            if api_failed and not updated:
                self.consecutive_failures += 1
                logger.debug(f"Consecutive API failures: {self.consecutive_failures}/{self.max_consecutive_failures}")
            else:
                # Reset failure counter on success
                self.consecutive_failures = 0
                        
            if updated:
                book.metadata_enhanced = True
                book.metadata_enhanced_date = datetime.now()
                book.last_updated = datetime.now()
                session.add(book)
                session.commit()
                logger.info(f"Updated metadata for book: {book.title}")
                
            return updated
            
        except Exception as e:
            logger.error(f"Error updating metadata for book {book.title}: {e}")
            self.consecutive_failures += 1
            return False
            
    async def run(self, job_config: Any) -> Dict[str, Any]:
        """Run the metadata update job"""
        processed = 0
        updated = 0
        failed = 0
        
        # Import here to avoid circular imports
        try:
            from routes.logs import add_log
        except ImportError:
            def add_log(*args, **kwargs):
                pass  # Fallback if logs module not available
        
        try:
            with next(get_session()) as session:
                # Get all books
                books = session.exec(select(Book)).all()
                total_books = len(books)
                logger.info(f"Starting metadata update for {total_books} books")
                add_log("info", "metadata_job", f"Starting metadata update for {total_books} books")
                
                for i, book in enumerate(books):
                    if self.consecutive_failures >= self.max_consecutive_failures:
                        logger.warning(f"Stopping job after {self.consecutive_failures} consecutive API failures")
                        add_log("warning", "metadata_job", f"Stopping job after {self.consecutive_failures} consecutive API failures")
                        break
                        
                    # Check for missing metadata
                    missing_fields = self.check_missing_metadata(book)
                    
                    if missing_fields:
                        logger.debug(f"Book '{book.title}' missing: {', '.join(missing_fields)}")
                        
                        # Update metadata
                        success = await self.update_book_metadata(session, book, missing_fields)
                        
                        if success:
                            updated += 1
                        else:
                            failed += 1
                            
                    processed += 1
                    
                    # Log progress every 10 books
                    if i % 10 == 0:
                        logger.info(f"Progress: {i}/{total_books} books processed")
                        
                    # Small delay to avoid rate limits
                    await asyncio.sleep(0.5)
                    
        except Exception as e:
            logger.error(f"Metadata update job error: {e}")
            add_log("error", "metadata_job", f"Job failed: {str(e)}")
            failed += processed  # Mark remaining as failed
            
        result = {
            "processed": processed,
            "updated": updated,
            "failed": failed,
            "consecutive_failures": self.consecutive_failures,
            "stopped_early": self.consecutive_failures >= self.max_consecutive_failures
        }
        
        logger.info(f"Metadata update job completed: {result}")
        add_log("info", "metadata_job", f"Job completed: {processed} processed, {updated} updated, {failed} failed")
        return result

# Job function for the scheduler
async def metadata_update_job(job_config: Any) -> Dict[str, Any]:
    """Metadata update job function"""
    job = MetadataUpdateJob()
    return await job.run(job_config)