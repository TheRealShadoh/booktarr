from fastapi import APIRouter, HTTPException
from typing import List, Dict
from datetime import datetime
import logging
import traceback
from ..services import google_books_service, open_library_service
from ..services.cache_service import cache_service
from ..services.settings_service import settings_service
from ..services.skoolib_playwright_parser import SkoolibPlaywrightParser
from ..models import Book, SeriesGroup, BooksResponse, MetadataSource

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/books", response_model=BooksResponse)
async def get_books():
    """Get all books grouped by series - returns test data by default"""
    # Check cache first
    cached_result = cache_service.get_api_response("all_books")
    if cached_result:
        return BooksResponse(**cached_result)
    
    try:
        logger.info("Loading books - using test data (Skoolib sync moved to manual trigger)")
        
        # Use test data by default - Skoolib sync is now manual via settings
        isbns = [
            "9780143127741",  # The Body Keeps the Score
            "9780547928227",  # The Hobbit
            "9780553103540",  # A Game of Thrones
            "9780553108033",  # A Clash of Kings
            "9780553106633",  # A Storm of Swords
        ]
        
        # Enrich with metadata
        enriched_books = []
        for isbn in isbns:
            enriched = await enrich_book_metadata(isbn)
            enriched_books.append(enriched)
        
        # Group by series
        grouped_books = group_books_by_series(enriched_books)
        
        # Create response object
        response_data = {
            "series": grouped_books,
            "total_books": len(enriched_books),
            "total_series": len(grouped_books),
            "last_sync": datetime.now()
        }
        
        # Cache result
        cache_service.set_api_response("all_books", response_data)
        
        return BooksResponse(**response_data)
    
    except Exception as e:
        logger.error(f"Error processing books: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error processing books: {str(e)}")

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