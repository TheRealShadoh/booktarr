"""
Metadata Enhancement Service
Enriches existing book metadata with external API data and handles caching
"""
import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from .google_books_service import GoogleBooksClient
from .open_library_service import OpenLibraryClient
from .cache_service import cache_service
from .database_service import DatabaseIntegrationService
from ..models import Book, MetadataSource

logger = logging.getLogger(__name__)

class EnhancementStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CACHED = "cached"

@dataclass
class EnhancementResult:
    """Result of metadata enhancement operation"""
    isbn: str
    status: EnhancementStatus
    original_book: Optional[Book] = None
    enhanced_book: Optional[Book] = None
    error_message: Optional[str] = None
    sources_used: List[str] = None
    cache_hit: bool = False
    processing_time: float = 0.0

@dataclass
class BatchEnhancementProgress:
    """Progress tracking for batch enhancement operations"""
    total_books: int
    processed_books: int
    successful_enhancements: int
    failed_enhancements: int
    cached_results: int
    current_isbn: Optional[str] = None
    estimated_completion: Optional[datetime] = None
    start_time: datetime = None

class MetadataEnhancementService:
    """Service for enhancing book metadata with external API data"""
    
    def __init__(self):
        self.google_books_client = None
        self.open_library_client = None
        self._enhancement_cache_ttl = 30 * 24 * 3600  # 30 days
        self._api_cache_ttl = 24 * 3600  # 24 hours
        self._book_cache_ttl = 7 * 24 * 3600  # 7 days
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.google_books_client = GoogleBooksClient()
        self.open_library_client = OpenLibraryClient()
        await self.google_books_client.__aenter__()
        await self.open_library_client.__aenter__()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.google_books_client:
            await self.google_books_client.__aexit__(exc_type, exc_val, exc_tb)
        if self.open_library_client:
            await self.open_library_client.__aexit__(exc_type, exc_val, exc_tb)
    
    async def enhance_book_metadata(self, isbn: str, force_refresh: bool = False) -> EnhancementResult:
        """
        Enhance metadata for a single book
        
        Args:
            isbn: ISBN of the book to enhance
            force_refresh: If True, bypass cache and fetch fresh data
            
        Returns:
            EnhancementResult with enhancement details
        """
        start_time = datetime.now()
        
        try:
            # Get original book from database
            original_book = await DatabaseIntegrationService.get_book_by_isbn(isbn)
            if not original_book:
                return EnhancementResult(
                    isbn=isbn,
                    status=EnhancementStatus.FAILED,
                    error_message=f"Book with ISBN {isbn} not found in database"
                )
            
            # Check for cached enhanced metadata
            cache_key = f"enhanced_metadata_{isbn}"
            if not force_refresh:
                cached_metadata = cache_service.get_api_response(cache_key)
                if cached_metadata:
                    logger.info(f"Using cached enhanced metadata for ISBN: {isbn}")
                    processing_time = (datetime.now() - start_time).total_seconds()
                    return EnhancementResult(
                        isbn=isbn,
                        status=EnhancementStatus.CACHED,
                        original_book=original_book,
                        enhanced_book=Book(**cached_metadata),
                        cache_hit=True,
                        processing_time=processing_time
                    )
            
            # Fetch metadata from external APIs
            enhanced_metadata = await self._fetch_enhanced_metadata(isbn)
            
            if enhanced_metadata:
                # Merge with existing book data
                enhanced_book = self._merge_metadata(original_book, enhanced_metadata)
                
                # Cache the enhanced metadata
                cache_service.set_api_response(cache_key, enhanced_book.dict(), ttl=self._enhancement_cache_ttl)
                
                # Update book in database
                await DatabaseIntegrationService.update_book(isbn, enhanced_book)
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return EnhancementResult(
                    isbn=isbn,
                    status=EnhancementStatus.COMPLETED,
                    original_book=original_book,
                    enhanced_book=enhanced_book,
                    sources_used=enhanced_metadata.get('sources_used', []),
                    processing_time=processing_time
                )
            else:
                processing_time = (datetime.now() - start_time).total_seconds()
                return EnhancementResult(
                    isbn=isbn,
                    status=EnhancementStatus.FAILED,
                    original_book=original_book,
                    error_message="No enhanced metadata found from external APIs",
                    processing_time=processing_time
                )
                
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"Error enhancing metadata for ISBN {isbn}: {str(e)}")
            return EnhancementResult(
                isbn=isbn,
                status=EnhancementStatus.FAILED,
                error_message=str(e),
                processing_time=processing_time
            )
    
    async def enhance_all_books_metadata(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Enhance metadata for all books in the database
        
        Args:
            force_refresh: If True, bypass cache and fetch fresh data
            
        Returns:
            Dictionary with enhancement results and statistics
        """
        start_time = datetime.now()
        
        try:
            # Get all books from database
            books_by_series = await DatabaseIntegrationService.get_all_books_grouped()
            all_books = []
            for series_books in books_by_series.values():
                all_books.extend(series_books)
            
            if not all_books:
                return {
                    "success": False,
                    "message": "No books found in database",
                    "total_books": 0,
                    "enhanced_books": 0,
                    "failed_books": 0,
                    "cached_books": 0,
                    "processing_time": 0.0
                }
            
            # Initialize progress tracking
            progress = BatchEnhancementProgress(
                total_books=len(all_books),
                processed_books=0,
                successful_enhancements=0,
                failed_enhancements=0,
                cached_results=0,
                start_time=start_time
            )
            
            results = []
            
            # Process books in batches to avoid overwhelming APIs
            batch_size = 5
            for i in range(0, len(all_books), batch_size):
                batch = all_books[i:i + batch_size]
                
                # Process batch concurrently
                batch_tasks = []
                for book in batch:
                    progress.current_isbn = book.isbn
                    task = self.enhance_book_metadata(book.isbn, force_refresh)
                    batch_tasks.append(task)
                
                # Wait for batch completion
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                # Process results
                for result in batch_results:
                    if isinstance(result, Exception):
                        progress.failed_enhancements += 1
                        logger.error(f"Batch enhancement error: {result}")
                    else:
                        results.append(result)
                        progress.processed_books += 1
                        
                        if result.status == EnhancementStatus.COMPLETED:
                            progress.successful_enhancements += 1
                        elif result.status == EnhancementStatus.CACHED:
                            progress.cached_results += 1
                        else:
                            progress.failed_enhancements += 1
                
                # Brief pause between batches to respect API rate limits
                await asyncio.sleep(1)
                
                # Update estimated completion
                if progress.processed_books > 0:
                    elapsed_time = (datetime.now() - start_time).total_seconds()
                    estimated_total_time = elapsed_time * (progress.total_books / progress.processed_books)
                    progress.estimated_completion = start_time + timedelta(seconds=estimated_total_time)
                
                logger.info(f"Processed {progress.processed_books}/{progress.total_books} books")
            
            total_processing_time = (datetime.now() - start_time).total_seconds()
            
            return {
                "success": True,
                "message": f"Enhanced metadata for {progress.successful_enhancements} books",
                "total_books": progress.total_books,
                "enhanced_books": progress.successful_enhancements,
                "failed_books": progress.failed_enhancements,
                "cached_books": progress.cached_results,
                "processing_time": total_processing_time,
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Error in batch metadata enhancement: {str(e)}")
            return {
                "success": False,
                "message": f"Batch enhancement failed: {str(e)}",
                "total_books": 0,
                "enhanced_books": 0,
                "failed_books": 0,
                "cached_books": 0,
                "processing_time": (datetime.now() - start_time).total_seconds()
            }
    
    async def _fetch_enhanced_metadata(self, isbn: str) -> Optional[Dict[str, Any]]:
        """
        Fetch enhanced metadata from external APIs
        
        Args:
            isbn: ISBN to fetch metadata for
            
        Returns:
            Dictionary with enhanced metadata or None if not found
        """
        sources_used = []
        
        # Try Google Books first
        google_metadata = None
        try:
            google_metadata = await self.google_books_client.fetch_book_metadata(isbn)
            if google_metadata:
                sources_used.append("Google Books")
                logger.info(f"Fetched Google Books metadata for ISBN: {isbn}")
        except Exception as e:
            logger.warning(f"Failed to fetch Google Books metadata for ISBN {isbn}: {str(e)}")
        
        # Try Open Library as fallback/supplement
        open_library_metadata = None
        try:
            open_library_metadata = await self.open_library_client.fetch_book_metadata(isbn)
            if open_library_metadata:
                sources_used.append("Open Library")
                logger.info(f"Fetched Open Library metadata for ISBN: {isbn}")
        except Exception as e:
            logger.warning(f"Failed to fetch Open Library metadata for ISBN {isbn}: {str(e)}")
        
        # Combine metadata from both sources
        if google_metadata or open_library_metadata:
            combined_metadata = self._combine_api_metadata(google_metadata, open_library_metadata)
            combined_metadata['sources_used'] = sources_used
            return combined_metadata
        
        return None
    
    def _combine_api_metadata(self, google_data: Optional[Dict], open_library_data: Optional[Dict]) -> Dict[str, Any]:
        """
        Combine metadata from Google Books and Open Library
        Google Books takes precedence for most fields
        
        Args:
            google_data: Metadata from Google Books API
            open_library_data: Metadata from Open Library API
            
        Returns:
            Combined metadata dictionary
        """
        combined = {}
        
        # Use Google Books as primary source
        if google_data:
            combined.update(google_data)
        
        # Supplement with Open Library data where Google Books data is missing
        if open_library_data:
            for key, value in open_library_data.items():
                if key not in combined or not combined[key]:
                    combined[key] = value
                elif key == 'categories' and isinstance(value, list):
                    # Combine categories from both sources
                    existing_categories = combined.get('categories', [])
                    combined_categories = list(set(existing_categories + value))
                    combined['categories'] = combined_categories
        
        return combined
    
    def _merge_metadata(self, original_book: Book, enhanced_metadata: Dict[str, Any]) -> Book:
        """
        Merge enhanced metadata with original book data
        
        Args:
            original_book: Original book from database
            enhanced_metadata: Enhanced metadata from external APIs
            
        Returns:
            Book with merged metadata
        """
        # Start with original book data
        merged_data = original_book.dict()
        
        # Update with enhanced metadata, preserving existing data where appropriate
        enhancement_fields = {
            'title': 'title',
            'authors': 'authors',
            'publisher': 'publisher',
            'published_date': 'published_date',
            'page_count': 'page_count',
            'language': 'language',
            'thumbnail_url': 'thumbnail_url',
            'description': 'description',
            'categories': 'categories',
            'pricing': 'pricing'
        }
        
        for field, enhanced_key in enhancement_fields.items():
            if enhanced_key in enhanced_metadata and enhanced_metadata[enhanced_key]:
                # For some fields, prefer enhanced data
                if field in ['thumbnail_url', 'description', 'page_count', 'published_date']:
                    merged_data[field] = enhanced_metadata[enhanced_key]
                # For others, only update if original is empty
                elif not merged_data.get(field):
                    merged_data[field] = enhanced_metadata[enhanced_key]
                # For categories, combine both
                elif field == 'categories':
                    original_categories = merged_data.get('categories', [])
                    enhanced_categories = enhanced_metadata[enhanced_key]
                    if isinstance(enhanced_categories, list):
                        combined_categories = list(set(original_categories + enhanced_categories))
                        merged_data['categories'] = combined_categories
        
        # Update metadata source and timestamps
        merged_data['metadata_source'] = MetadataSource.GOOGLE_BOOKS  # Primary source
        merged_data['last_updated'] = datetime.now()
        
        # Set enhancement tracking fields
        merged_data['metadata_enhanced'] = True
        merged_data['metadata_enhanced_date'] = datetime.now()
        merged_data['metadata_sources_used'] = enhanced_metadata.get('sources_used', [])
        
        return Book(**merged_data)
    
    def get_enhancement_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for enhancement operations"""
        return {
            "cache_stats": cache_service.get_stats(),
            "enhancement_cache_ttl": self._enhancement_cache_ttl,
            "api_cache_ttl": self._api_cache_ttl,
            "book_cache_ttl": self._book_cache_ttl
        }
    
    def clear_enhancement_cache(self):
        """Clear all enhancement-related caches"""
        cache_service.clear_all()
        logger.info("Cleared all enhancement caches")

# Global service instance
metadata_enhancement_service = MetadataEnhancementService()