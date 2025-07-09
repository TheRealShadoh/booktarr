"""
Unified metadata enrichment service with fallback logic
"""
import asyncio
from typing import Optional, Dict, List
from datetime import datetime
import logging

from .cache_service import cache_service
from .google_books_service import GoogleBooksClient, GoogleBooksAPIError
from .open_library_service import OpenLibraryClient, OpenLibraryAPIError
from ..models import Book, MetadataSource, PriceInfo

logger = logging.getLogger(__name__)

class MetadataEnrichmentError(Exception):
    """Raised when metadata enrichment fails"""
    pass

class MetadataService:
    """Unified metadata enrichment service with multiple sources and fallback logic"""
    
    def __init__(self, google_api_key: Optional[str] = None):
        self.google_api_key = google_api_key
        self.google_books_client = None
        self.open_library_client = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.google_books_client = GoogleBooksClient(api_key=self.google_api_key)
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
    
    async def enrich_book(self, isbn: str, existing_data: Optional[Dict] = None) -> Optional[Dict]:
        """
        Enrich book metadata using multiple sources with fallback logic
        
        Args:
            isbn: ISBN to look up
            existing_data: Any existing book data to merge with
            
        Returns:
            Enriched book metadata dictionary or None if no data found
        """
        if not self.google_books_client or not self.open_library_client:
            raise MetadataEnrichmentError("Service not initialized. Use async context manager.")
        
        # Check cache first
        cache_key = f"enriched_metadata_{isbn}"
        cached_result = cache_service.get_book(isbn)
        if cached_result:
            logger.debug(f"Cache hit for ISBN {isbn}")
            return cached_result
        
        enriched_data = existing_data.copy() if existing_data else {}
        
        # Try Google Books first (higher quality data)
        google_data = await self._fetch_google_books_metadata(isbn)
        if google_data:
            enriched_data.update(google_data)
            logger.info(f"Successfully enriched {isbn} with Google Books data")
        
        # Try Open Library as fallback for missing fields
        if not self._is_sufficiently_enriched(enriched_data):
            open_library_data = await self._fetch_open_library_metadata(isbn)
            if open_library_data:
                # Merge data, preserving Google Books data where available
                enriched_data = self._merge_metadata(enriched_data, open_library_data)
                logger.info(f"Successfully enriched {isbn} with Open Library data")
        
        # Only cache and return if we have meaningful data
        if enriched_data and enriched_data.get("title"):
            cache_service.set_book(isbn, enriched_data)
            return enriched_data
        
        logger.warning(f"No metadata found for ISBN {isbn}")
        return None
    
    async def enrich_books_batch(self, isbns: List[str], batch_size: int = 5) -> Dict[str, Optional[Dict]]:
        """
        Enrich multiple books in batches to avoid overwhelming APIs
        
        Args:
            isbns: List of ISBNs to enrich
            batch_size: Number of concurrent requests
            
        Returns:
            Dictionary mapping ISBNs to enriched metadata
        """
        results = {}
        
        # Process in batches to avoid rate limits
        for i in range(0, len(isbns), batch_size):
            batch = isbns[i:i + batch_size]
            
            # Create tasks for concurrent processing
            tasks = [self.enrich_book(isbn) for isbn in batch]
            
            # Execute batch with proper error handling
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for isbn, result in zip(batch, batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Error enriching ISBN {isbn}: {result}")
                    results[isbn] = None
                else:
                    results[isbn] = result
            
            # Small delay between batches to be respectful to APIs
            if i + batch_size < len(isbns):
                await asyncio.sleep(0.5)
        
        return results
    
    async def _fetch_google_books_metadata(self, isbn: str) -> Optional[Dict]:
        """Fetch metadata from Google Books with error handling"""
        try:
            return await self.google_books_client.fetch_book_metadata(isbn)
        except GoogleBooksAPIError as e:
            logger.warning(f"Google Books API error for ISBN {isbn}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching from Google Books for ISBN {isbn}: {e}")
            return None
    
    async def _fetch_open_library_metadata(self, isbn: str) -> Optional[Dict]:
        """Fetch metadata from Open Library with error handling"""
        try:
            return await self.open_library_client.fetch_book_metadata(isbn)
        except OpenLibraryAPIError as e:
            logger.warning(f"Open Library API error for ISBN {isbn}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching from Open Library for ISBN {isbn}: {e}")
            return None
    
    def _is_sufficiently_enriched(self, data: Dict) -> bool:
        """Check if the data is sufficiently enriched"""
        required_fields = ["title", "authors"]
        optional_fields = ["description", "publisher", "published_date", "thumbnail_url"]
        
        # Must have required fields
        if not all(data.get(field) for field in required_fields):
            return False
        
        # Should have at least some optional fields
        optional_filled = sum(1 for field in optional_fields if data.get(field))
        return optional_filled >= 2
    
    def _merge_metadata(self, primary: Dict, secondary: Dict) -> Dict:
        """
        Merge metadata from two sources, preferring primary source
        
        Args:
            primary: Primary metadata (higher priority)
            secondary: Secondary metadata (fallback)
            
        Returns:
            Merged metadata dictionary
        """
        merged = secondary.copy()
        
        # Update with primary data, but only for non-empty values
        for key, value in primary.items():
            if value:  # Only override if primary has meaningful data
                merged[key] = value
        
        # Special handling for lists (combine and deduplicate)
        if "categories" in primary and "categories" in secondary:
            combined_categories = list(set(primary["categories"] + secondary["categories"]))
            merged["categories"] = combined_categories
        
        if "pricing" in primary and "pricing" in secondary:
            combined_pricing = primary["pricing"] + secondary["pricing"]
            merged["pricing"] = combined_pricing
        
        return merged
    
    def get_source_priority(self) -> List[MetadataSource]:
        """Get the priority order of metadata sources"""
        return [MetadataSource.GOOGLE_BOOKS, MetadataSource.OPEN_LIBRARY]

# Convenience function for standalone use
async def enrich_book_metadata(isbn: str, google_api_key: Optional[str] = None) -> Optional[Dict]:
    """
    Convenience function to enrich a single book's metadata
    
    Args:
        isbn: ISBN to enrich
        google_api_key: Optional Google Books API key
        
    Returns:
        Enriched metadata dictionary or None
    """
    async with MetadataService(google_api_key=google_api_key) as service:
        return await service.enrich_book(isbn)