from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict
from datetime import datetime
import logging
import traceback
from ..services import google_books_service, open_library_service
from ..services.cache_service import cache_service
from ..services.settings_service import settings_service
from ..services.skoolib_playwright_parser import SkoolibPlaywrightParser
from ..services.database_service import DatabaseIntegrationService
from ..services.metadata_enhancement_service import MetadataEnhancementService
from ..models import (
    Book, SeriesGroup, BooksResponse, MetadataSource,
    EnhancementRequest, EnhancementResult, BatchEnhancementResponse,
    EnhancementProgressResponse, CacheStatsResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/books/isbn/{isbn}")
async def get_book_by_isbn(isbn: str):
    """Get detailed book information by ISBN (temporary endpoint for book details page)"""
    try:
        logger.info(f"Fetching book details for ISBN: {isbn}")
        
        # Get book from database
        books = await DatabaseIntegrationService.get_all_books_grouped()
        
        # Find the book with this ISBN
        for series_name, book_list in books.items():
            for book in book_list:
                if book.isbn == isbn:
                    # For now, return a mock book details structure with single edition
                    book_details = {
                        "id": book.isbn,  # Using ISBN as ID for now
                        "title": book.title,
                        "authors": book.authors,
                        "series": book.series,
                        "series_position": book.series_position,
                        "categories": book.categories,
                        "editions": [
                            {
                                "isbn": book.isbn,
                                "isbn10": book.isbn10,
                                "isbn13": book.isbn13,
                                "publisher": book.publisher,
                                "published_date": book.published_date.isoformat() if book.published_date else None,
                                "page_count": book.page_count,
                                "language": book.language,
                                "edition_type": "unknown",  # We don't have this info yet
                                "thumbnail_url": book.thumbnail_url,
                                "description": book.description,
                                "pricing": book.pricing,
                                "added_date": book.added_date.isoformat(),
                                "last_updated": book.last_updated.isoformat()
                            }
                        ],
                        "ownership": {
                            "owned_editions": [book.isbn],
                            "selected_edition": book.isbn,
                            "reading_status": book.reading_status,
                            "reading_progress_pages": book.reading_progress_pages,
                            "reading_progress_percentage": book.reading_progress_percentage,
                            "date_started": book.date_started.isoformat() if book.date_started else None,
                            "date_finished": book.date_finished.isoformat() if book.date_finished else None,
                            "personal_rating": book.personal_rating,
                            "personal_notes": book.personal_notes,
                            "times_read": book.times_read
                        }
                    }
                    return book_details
        
        raise HTTPException(status_code=404, detail=f"Book with ISBN {isbn} not found")
        
    except Exception as e:
        logger.error(f"Error fetching book details for ISBN {isbn}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to fetch book details")

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
    

# Metadata Enhancement Endpoints

@router.post("/books/enhance-metadata", response_model=BatchEnhancementResponse)
async def enhance_all_books_metadata(
    request: EnhancementRequest,
    background_tasks: BackgroundTasks
):
    """
    Enhance metadata for all books in the library
    
    Args:
        request: Enhancement request with options
        background_tasks: FastAPI background tasks for async processing
    
    Returns:
        BatchEnhancementResponse with enhancement results
    """
    try:
        logger.info(f"Starting bulk metadata enhancement (force_refresh={request.force_refresh})")
        
        async with MetadataEnhancementService() as service:
            result = await service.enhance_all_books_metadata(
                force_refresh=request.force_refresh
            )
            
            # Clear books cache since metadata was updated
            cache_service.book_cache.delete("all_books")
            
            # Convert dataclass results to dictionaries for Pydantic
            results_list = []
            for result_obj in result.get("results", []):
                if hasattr(result_obj, '__dict__'):
                    # Convert dataclass to dict
                    result_dict = {
                        'isbn': result_obj.isbn,
                        'status': result_obj.status.value if hasattr(result_obj.status, 'value') else result_obj.status,
                        'original_book': result_obj.original_book.dict() if result_obj.original_book else None,
                        'enhanced_book': result_obj.enhanced_book.dict() if result_obj.enhanced_book else None,
                        'error_message': result_obj.error_message,
                        'sources_used': result_obj.sources_used or [],
                        'cache_hit': result_obj.cache_hit,
                        'processing_time': result_obj.processing_time
                    }
                    results_list.append(result_dict)
                else:
                    results_list.append(result_obj)
            
            return BatchEnhancementResponse(
                success=result["success"],
                message=result["message"],
                total_books=result["total_books"],
                enhanced_books=result["enhanced_books"],
                failed_books=result["failed_books"],
                cached_books=result["cached_books"],
                processing_time=result["processing_time"],
                results=results_list
            )
    
    except Exception as e:
        logger.error(f"Error in bulk metadata enhancement: {str(e)}")
        logger.error(f"Error traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to enhance metadata: {str(e)}"
        )

@router.post("/books/{isbn}/enhance-metadata", response_model=EnhancementResult)
async def enhance_book_metadata(
    isbn: str,
    request: EnhancementRequest
):
    """
    Enhance metadata for a specific book
    
    Args:
        isbn: ISBN of the book to enhance
        request: Enhancement request with options
    
    Returns:
        EnhancementResult with enhancement details
    """
    try:
        logger.info(f"Starting metadata enhancement for ISBN: {isbn}")
        
        async with MetadataEnhancementService() as service:
            result = await service.enhance_book_metadata(
                isbn=isbn,
                force_refresh=request.force_refresh
            )
            
            # Clear books cache since metadata was updated
            cache_service.book_cache.delete("all_books")
            
            return result
    
    except Exception as e:
        logger.error(f"Error enhancing metadata for ISBN {isbn}: {str(e)}")
        logger.error(f"Error traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to enhance metadata for ISBN {isbn}: {str(e)}"
        )

@router.get("/books/enhancement/cache-stats", response_model=CacheStatsResponse)
async def get_enhancement_cache_stats():
    """
    Get cache statistics for metadata enhancement
    
    Returns:
        CacheStatsResponse with cache statistics
    """
    try:
        async with MetadataEnhancementService() as service:
            stats = service.get_enhancement_cache_stats()
            
            return CacheStatsResponse(
                cache_stats=stats["cache_stats"],
                enhancement_cache_ttl=stats["enhancement_cache_ttl"],
                api_cache_ttl=stats["api_cache_ttl"],
                book_cache_ttl=stats["book_cache_ttl"]
            )
    
    except Exception as e:
        logger.error(f"Error getting cache stats: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get cache statistics: {str(e)}"
        )

@router.delete("/books/enhancement/cache")
async def clear_enhancement_cache():
    """
    Clear all enhancement-related caches
    
    Returns:
        Success message
    """
    try:
        async with MetadataEnhancementService() as service:
            service.clear_enhancement_cache()
            
        return {"message": "Enhancement caches cleared successfully"}
    
    except Exception as e:
        logger.error(f"Error clearing enhancement cache: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to clear enhancement cache: {str(e)}"
        )

@router.get("/books/{isbn}/metadata-sources")
async def get_book_metadata_sources(isbn: str):
    """
    Get available metadata sources for a specific book
    
    Args:
        isbn: ISBN of the book
    
    Returns:
        Available metadata sources and their data
    """
    try:
        logger.info(f"Fetching metadata sources for ISBN: {isbn}")
        
        sources = {}
        
        async with MetadataEnhancementService() as service:
            # Get Google Books metadata
            try:
                google_metadata = await service.google_books_client.fetch_book_metadata(isbn)
                if google_metadata:
                    sources["google_books"] = google_metadata
            except Exception as e:
                logger.warning(f"Failed to fetch Google Books metadata: {str(e)}")
            
            # Get Open Library metadata
            try:
                open_library_metadata = await service.open_library_client.fetch_book_metadata(isbn)
                if open_library_metadata:
                    sources["open_library"] = open_library_metadata
            except Exception as e:
                logger.warning(f"Failed to fetch Open Library metadata: {str(e)}")
        
        return {
            "isbn": isbn,
            "sources": sources,
            "total_sources": len(sources)
        }
    
    except Exception as e:
        logger.error(f"Error fetching metadata sources for ISBN {isbn}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch metadata sources: {str(e)}"
        )
    # Add standalone books as a group
    if standalone:
        standalone.sort(key=lambda x: x.title)
        series_map["Standalone"] = standalone
    
    return series_map