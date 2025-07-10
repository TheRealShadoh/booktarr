from fastapi import APIRouter, HTTPException
from typing import List, Dict
from datetime import datetime
import logging
import traceback
from ..services import google_books_service, open_library_service
from ..services.cache_service import cache_service
from ..services.settings_service import settings_service
from ..services.skoolib_playwright_parser import SkoolibPlaywrightParser
from ..services.database_service import DatabaseIntegrationService
from ..models import Book, SeriesGroup, BooksResponse, MetadataSource

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/books", response_model=BooksResponse)
async def get_books():
    """Get all books grouped by series from database"""
    # Check cache first
    cached_result = cache_service.get_api_response("all_books")
    if cached_result:
        return BooksResponse(**cached_result)
    
    try:
        logger.info("Loading books from database")
        
        # Get books from database
        books_response = await DatabaseIntegrationService.get_books_response()
        
        # Create response object for caching
        response_data = {
            "series": books_response.series,
            "total_books": books_response.total_books,
            "total_series": books_response.total_series,
            "last_sync": books_response.last_sync
        }
        
        # Cache result
        cache_service.set_api_response("all_books", response_data)
        
        return books_response
    
    except Exception as e:
        logger.error(f"Error loading books from database: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error loading books: {str(e)}")

async def enrich_book_metadata(isbn: str) -> Book:
    """Enrich book data with metadata from external APIs"""
    metadata = None
    
    # Try Google Books first
    metadata = await google_books_service.fetch_book_metadata(isbn)
    
    # Fallback to Open Library
    if not metadata:
        metadata = await open_library_service.fetch_book_metadata_fallback(isbn)
    
    # Create Book object with enriched data
    current_time = datetime.now()
    return Book(
        isbn=isbn,
        title=metadata.get("title") if metadata else "Unknown Title",
        authors=metadata.get("authors", []) if metadata else ["Unknown Author"],
        series=metadata.get("series") if metadata else None,
        series_position=metadata.get("series_position") if metadata else None,
        publisher=metadata.get("publisher") if metadata else None,
        published_date=metadata.get("published_date") if metadata else None,
        page_count=metadata.get("page_count") if metadata else None,
        thumbnail_url=metadata.get("thumbnail_url") if metadata else None,
        description=metadata.get("description") if metadata else None,
        categories=metadata.get("categories", []) if metadata else [],
        pricing=metadata.get("pricing", []) if metadata else [],
        metadata_source=MetadataSource.SKOOLIB,
        added_date=current_time,
        last_updated=current_time
    )

def group_books_by_series(books: List[Book]) -> Dict[str, List[Book]]:
    """Group books by series"""
    series_map = {}
    standalone = []
    
    for book in books:
        if book.series:
            if book.series not in series_map:
                series_map[book.series] = []
            series_map[book.series].append(book)
        else:
            standalone.append(book)
    
    # Sort books within each series by series_position, then by title
    for series_name, series_books in series_map.items():
        series_books.sort(key=lambda x: (x.series_position or 999, x.title))
    
    # Add standalone books as a group
    if standalone:
        standalone.sort(key=lambda x: x.title)
        series_map["Standalone"] = standalone
    
    return series_map