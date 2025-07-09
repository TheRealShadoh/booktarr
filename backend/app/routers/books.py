from fastapi import APIRouter, HTTPException
from typing import List
from ..services import skoolib_service, google_books_service, open_library_service, cache_service
from ..models import Book, SeriesGroup

router = APIRouter()

@router.get("/books", response_model=List[SeriesGroup])
async def get_books():
    """Get all books grouped by series"""
    # Check cache first
    cached_result = cache_service.cache.get("all_books")
    if cached_result:
        return cached_result
    
    try:
        # Fetch from Skoolib
        skoolib_books = await skoolib_service.fetch_skoolib_books()
        
        if not skoolib_books:
            raise HTTPException(status_code=503, detail="Unable to fetch books from Skoolib")
        
        # Enrich with metadata
        enriched_books = []
        for book in skoolib_books:
            enriched = await enrich_book_metadata(book)
            enriched_books.append(enriched)
        
        # Group by series
        grouped_books = group_books_by_series(enriched_books)
        
        # Cache result
        cache_service.cache.set("all_books", grouped_books)
        
        return grouped_books
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing books: {str(e)}")

async def enrich_book_metadata(book: dict) -> Book:
    """Enrich book data with metadata from external APIs"""
    isbn = book.get("isbn13") or book.get("isbn10")
    metadata = None
    
    if isbn:
        # Try Google Books first
        metadata = await google_books_service.fetch_book_metadata(isbn)
        
        # Fallback to Open Library
        if not metadata:
            metadata = await open_library_service.fetch_book_metadata_fallback(isbn)
    
    # Create Book object with enriched data
    return Book(
        id=book.get("id", isbn or book.get("title", "unknown")),
        title=metadata.get("title") if metadata else book.get("title", "Unknown Title"),
        author=", ".join(metadata.get("authors", [])) if metadata else book.get("author", "Unknown Author"),
        isbn10=book.get("isbn10"),
        isbn13=book.get("isbn13"),
        shelves=book.get("shelves", []),
        series=metadata.get("series") if metadata else None,
        cover_image=metadata.get("cover_image") if metadata else None,
        pricing=metadata.get("pricing") if metadata else None
    )

def group_books_by_series(books: List[Book]) -> List[SeriesGroup]:
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
    
    # Create series groups
    groups = []
    for series_name, series_books in series_map.items():
        # Sort books within series by title
        series_books.sort(key=lambda x: x.title)
        groups.append(SeriesGroup(series_name=series_name, books=series_books))
    
    # Add standalone books as a group
    if standalone:
        standalone.sort(key=lambda x: x.title)
        groups.append(SeriesGroup(series_name="Standalone", books=standalone))
    
    return groups