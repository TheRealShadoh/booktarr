"""
Series information API endpoints
"""
import asyncio
import httpx
import re
import logging
from typing import List, Dict, Optional, Any
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_async_session
from app.services.dynamic_cache_service import get_cache_service
from app.services.google_books_service import GoogleBooksClient

router = APIRouter(prefix="/series", tags=["series"])
logger = logging.getLogger(__name__)

class SeriesBook(BaseModel):
    position: int
    title: str
    isbn: Optional[str] = None
    author: str
    published_date: Optional[str] = None

class SeriesInfo(BaseModel):
    series_name: str
    total_books: int
    known_books: List[SeriesBook]
    source: str

class SeriesService:
    def __init__(self, cache_service=None):
        self.cache_service = cache_service
    
    async def get_series_info(self, series_name: str, author: Optional[str] = None) -> Optional[SeriesInfo]:
        """Get series information from external APIs with caching"""
        
        # Check cache first if available
        if self.cache_service:
            cached_metadata = await self.cache_service.get_series_metadata(series_name, author)
            if cached_metadata:
                metadata = cached_metadata['metadata']
                return SeriesInfo(
                    series_name=metadata['series_name'],
                    total_books=metadata['total_books'],
                    known_books=[SeriesBook(**book) for book in metadata['known_books']],
                    source=cached_metadata['source_api']
                )
        
        # Try Google Books API first
        result = await self._search_google_books_dynamic(series_name, author)
        if result:
            # Store in cache
            if self.cache_service:
                await self.cache_service.store_series_metadata(
                    series_name=series_name,
                    author_name=author or "Unknown",
                    metadata={
                        'series_name': result.series_name,
                        'total_books': result.total_books,
                        'known_books': [book.dict() for book in result.known_books]
                    },
                    source_api="google_books",
                    ttl_hours=168  # 1 week
                )
            return result
        
        # Try Open Library as fallback
        result = await self._search_open_library_dynamic(series_name, author)
        if result:
            # Store in cache
            if self.cache_service:
                await self.cache_service.store_series_metadata(
                    series_name=series_name,
                    author_name=author or "Unknown",
                    metadata={
                        'series_name': result.series_name,
                        'total_books': result.total_books,
                        'known_books': [book.dict() for book in result.known_books]
                    },
                    source_api="open_library",
                    ttl_hours=168  # 1 week
                )
            return result
        
        return None
    
    async def _search_google_books_dynamic(self, series_name: str, author: Optional[str] = None) -> Optional[SeriesInfo]:
        """Search Google Books API using dynamic cache service"""
        try:
            async with GoogleBooksClient(cache_service=self.cache_service) as client:
                books = await client.search_series_books(series_name, author, max_results=40)
                
                if not books:
                    return None
                
                # Process and organize books
                series_books = []
                for book in books:
                    if book.get('series_position') is None:
                        # Try to extract position from title
                        position = self._extract_series_position(book['title'], series_name)
                        if position is None:
                            continue
                    else:
                        position = book['series_position']
                    
                    series_book = SeriesBook(
                        position=position,
                        title=book['title'],
                        isbn=book.get('isbn'),
                        author=book['authors'][0] if book['authors'] else "Unknown Author",
                        published_date=book.get('published_date')
                    )
                    series_books.append(series_book)
                
                if not series_books:
                    return None
                
                # Remove duplicates and sort by position
                unique_books = {}
                for book in series_books:
                    if book.position not in unique_books:
                        unique_books[book.position] = book
                
                sorted_books = sorted(unique_books.values(), key=lambda x: x.position)
                
                return SeriesInfo(
                    series_name=series_name,
                    total_books=len(sorted_books),
                    known_books=sorted_books,
                    source="google_books"
                )
                
        except Exception as e:
            logger.error(f"Error searching Google Books for {series_name}: {e}")
            return None
    
    
    async def _search_open_library_dynamic(self, series_name: str, author: Optional[str] = None) -> Optional[SeriesInfo]:
        """Search Open Library API using dynamic cache service"""
        try:
            # Use cache service if available for rate limiting
            if self.cache_service:
                if not await self.cache_service.check_rate_limit("open_library", "minute"):
                    logger.warning("Rate limit exceeded for Open Library")
                    return None
            
            # Build search query
            query_parts = [f'title:"{series_name}"']
            if author:
                query_parts.append(f'author:"{author}"')
            
            query = " ".join(query_parts)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://openlibrary.org/search.json",
                    params={
                        "q": query,
                        "limit": 40
                    },
                    timeout=10
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                if not data.get("docs"):
                    return None
                
                # Parse results
                books = self._parse_open_library_results(data["docs"], series_name)
                if not books:
                    return None
                
                return SeriesInfo(
                    series_name=series_name,
                    total_books=len(books),
                    known_books=books,
                    source="open_library"
                )
        
        except Exception as e:
            logger.error(f"Error searching Open Library for {series_name}: {e}")
            return None
    
    def _extract_series_position(self, title: str, series_name: str) -> Optional[int]:
        """Extract series position from book title (dynamic parsing only)"""
        # Escape series name for regex
        escaped_series = re.escape(series_name)
        
        # Common patterns for series positions
        patterns = [
            rf"{escaped_series}\s*#?(\d+)",
            rf"{escaped_series}\s*(?:book|volume|part)\s*(\d+)",
            r"\b(?:book|volume|part)\s*(\d+)\b",
            r"#(\d+)\b",
            r"\b(\d+)(?:st|nd|rd|th)?\s*(?:book|volume|part)?\b"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                try:
                    position = int(match.group(1))
                    if 1 <= position <= 50:  # Reasonable range
                        return position
                except ValueError:
                    continue
        
        return None

@router.get("/info/{series_name}", response_model=SeriesInfo)
async def get_series_info(
    series_name: str,
    author: Optional[str] = Query(None, description="Author name to help narrow down search"),
    session: AsyncSession = Depends(get_async_session)
):
    """Get information about a book series from external APIs"""
    try:
        cache_service = get_cache_service(session)
        series_service = SeriesService(cache_service=cache_service)
        
        series_info = await series_service.get_series_info(series_name, author)
        
        if not series_info:
            raise HTTPException(
                status_code=404, 
                detail=f"No series information found for '{series_name}'"
            )
        
        return series_info
    
    except Exception as e:
        logger.error(f"Error fetching series information for {series_name}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching series information: {str(e)}"
        )

@router.post("/clear-cache")
async def clear_cache(session: AsyncSession = Depends(get_async_session)):
    """Clear the series information cache"""
    try:
        cache_service = get_cache_service(session)
        cleaned_count = await cache_service.clean_expired_cache()
        return {"message": f"Series cache cleared successfully. Removed {cleaned_count} expired entries."}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail="Error clearing cache")