from fastapi import APIRouter, HTTPException, BackgroundTasks, File, UploadFile
from typing import List, Dict, Optional
from datetime import datetime
import logging
import traceback
import csv
import json
import io
from ..services import google_books_service, open_library_service
from ..services.cache_service import cache_service
from ..services.settings_service import settings_service
from ..services.skoolib_playwright_parser import SkoolibPlaywrightParser
from ..services.database_service import DatabaseIntegrationService
from ..services.metadata_enhancement_service import MetadataEnhancementService
from ..models import (
    Book, SeriesGroup, BooksResponse, MetadataSource,
    EnhancementRequest, EnhancementResult, BatchEnhancementResponse,
    EnhancementProgressResponse, CacheStatsResponse, ImportResult, ImportRequest
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

# Import endpoints
@router.post("/books/import", response_model=ImportResult)
async def import_books(
    file: UploadFile = File(...),
    format: str = "csv",
    field_mapping: str = "{}",
    skip_duplicates: bool = True,
    enrich_metadata: bool = True
):
    """
    Import books from various formats (CSV, JSON, etc.)
    """
    start_time = datetime.now()
    
    try:
        # Parse field mapping
        try:
            field_mapping_dict = json.loads(field_mapping) if field_mapping else {}
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid field mapping JSON")
        
        # Read file content
        content = await file.read()
        
        # Parse content based on format
        if format in ["csv", "goodreads"]:
            books_data = await parse_csv_content(content, format, field_mapping_dict)
        elif format == "handylib":
            books_data = await parse_tab_delimited_content(content)
        elif format == "hardcover":
            books_data = await parse_json_content(content)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
        
        # Process books
        result = await process_imported_books(
            books_data, 
            skip_duplicates, 
            enrich_metadata
        )
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        result.processing_time = processing_time
        
        # Clear cache
        cache_service.book_cache.delete("all_books")
        
        return result
        
    except Exception as e:
        logger.error(f"Error importing books: {str(e)}")
        logger.error(f"Error traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

async def parse_csv_content(content: bytes, format: str, field_mapping: Dict[str, str]) -> List[Dict]:
    """Parse CSV content with field mapping"""
    try:
        text = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(text))
        books_data = []
        
        for row in reader:
            book_data = {}
            
            if format == "csv":
                # Use custom field mapping
                for field, column in field_mapping.items():
                    if column in row:
                        book_data[field] = row[column]
            elif format == "goodreads":
                # Standard Goodreads format
                book_data = {
                    'title': clean_goodreads_value(row.get('Title', '')),
                    'author': clean_goodreads_value(row.get('Author', '')),
                    'isbn': clean_goodreads_value(row.get('ISBN', '') or row.get('ISBN13', '')),
                    'series': clean_goodreads_value(row.get('Series', '')),
                    'series_position': parse_int_safe(clean_goodreads_value(row.get('Series Position', ''))),
                    'rating': parse_float_safe(clean_goodreads_value(row.get('My Rating', ''))),
                    'description': clean_goodreads_value(row.get('Description', '')),
                    'published_date': clean_goodreads_value(row.get('Year Published', '')),
                    'page_count': parse_int_safe(clean_goodreads_value(row.get('Number of Pages', ''))),
                }
            
            if book_data.get('title') and book_data.get('isbn'):
                books_data.append(book_data)
        
        return books_data
        
    except Exception as e:
        logger.error(f"Error parsing CSV content: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

async def parse_tab_delimited_content(content: bytes) -> List[Dict]:
    """Parse HandyLib tab-delimited content"""
    try:
        text = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(text), delimiter='\t')
        books_data = []
        
        for row in reader:
            book_data = {
                'title': row.get('Title', ''),
                'author': row.get('Author', ''),
                'isbn': row.get('ISBN', ''),
                'series': row.get('Series', ''),
                'series_position': parse_int_safe(row.get('Position', '')),
                'description': row.get('Description', ''),
                'published_date': row.get('Published', ''),
                'page_count': parse_int_safe(row.get('Pages', '')),
            }
            
            if book_data.get('title') and book_data.get('isbn'):
                books_data.append(book_data)
        
        return books_data
        
    except Exception as e:
        logger.error(f"Error parsing tab-delimited content: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid tab-delimited format: {str(e)}")

async def parse_json_content(content: bytes) -> List[Dict]:
    """Parse JSON content (Hardcover format)"""
    try:
        text = content.decode('utf-8')
        data = json.loads(text)
        
        # Handle both array and single object
        if isinstance(data, list):
            books_data = data
        else:
            books_data = [data]
        
        # Normalize field names
        normalized_books = []
        for book in books_data:
            normalized_book = {
                'title': book.get('title', ''),
                'author': book.get('author', ''),
                'isbn': book.get('isbn', '') or book.get('isbn13', ''),
                'series': book.get('series', ''),
                'series_position': parse_int_safe(book.get('seriesPosition', '')),
                'description': book.get('description', ''),
                'published_date': book.get('publishedDate', ''),
                'page_count': parse_int_safe(book.get('pageCount', '')),
            }
            
            if normalized_book.get('title') and normalized_book.get('isbn'):
                normalized_books.append(normalized_book)
        
        return normalized_books
        
    except Exception as e:
        logger.error(f"Error parsing JSON content: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")

def clean_goodreads_value(value: str) -> str:
    """Clean Goodreads Excel formula format (="value")"""
    if value.startswith('="') and value.endswith('"'):
        return value[2:-1]
    return value

def parse_int_safe(value: str) -> Optional[int]:
    """Safely parse integer from string"""
    try:
        return int(value) if value else None
    except (ValueError, TypeError):
        return None

def parse_float_safe(value: str) -> Optional[float]:
    """Safely parse float from string"""
    try:
        return float(value) if value else None
    except (ValueError, TypeError):
        return None

async def process_imported_books(
    books_data: List[Dict], 
    skip_duplicates: bool, 
    enrich_metadata: bool
) -> ImportResult:
    """Process imported books and add them to the database"""
    result = ImportResult(
        success=True,
        imported=0,
        failed=0,
        errors=[],
        skipped=0,
        processing_time=0.0,
        books_added=[]
    )
    
    try:
        # Get existing books to check for duplicates
        existing_books = await DatabaseIntegrationService.get_all_books_grouped()
        existing_isbns = set()
        for series_books in existing_books.values():
            for book in series_books:
                existing_isbns.add(book.isbn)
        
        for book_data in books_data:
            try:
                isbn = book_data.get('isbn', '').strip()
                title = book_data.get('title', '').strip()
                
                if not isbn or not title:
                    result.failed += 1
                    result.errors.append(f"Missing required fields (title or ISBN) for book: {title or 'Unknown'}")
                    continue
                
                # Check for duplicates
                if skip_duplicates and isbn in existing_isbns:
                    result.skipped += 1
                    continue
                
                # Create book object
                book = Book(
                    isbn=isbn,
                    title=title,
                    authors=[book_data.get('author', 'Unknown Author')] if book_data.get('author') else ['Unknown Author'],
                    series=book_data.get('series') if book_data.get('series') else None,
                    series_position=book_data.get('series_position'),
                    description=book_data.get('description', ''),
                    published_date=None,  # Will be enriched if requested
                    page_count=book_data.get('page_count'),
                    categories=[],
                    thumbnail_url=None,
                    language='en',
                    pricing=[],
                    metadata_source=MetadataSource.SKOOLIB,
                    added_date=datetime.now(),
                    last_updated=datetime.now()
                )
                
                # Enrich metadata if requested
                if enrich_metadata:
                    try:
                        enriched_book = await enrich_book_metadata(isbn)
                        # Merge imported data with enriched metadata
                        book.description = enriched_book.description or book.description
                        book.published_date = enriched_book.published_date
                        book.page_count = enriched_book.page_count or book.page_count
                        book.categories = enriched_book.categories or book.categories
                        book.thumbnail_url = enriched_book.thumbnail_url
                        book.metadata_enhanced = True
                        book.metadata_enhanced_date = datetime.now()
                    except Exception as e:
                        logger.warning(f"Failed to enrich metadata for ISBN {isbn}: {str(e)}")
                
                # Add to database
                await DatabaseIntegrationService.add_book(book)
                
                result.imported += 1
                result.books_added.append(isbn)
                existing_isbns.add(isbn)  # Prevent duplicates within the same import
                
            except Exception as e:
                result.failed += 1
                result.errors.append(f"Failed to process book '{book_data.get('title', 'Unknown')}': {str(e)}")
                logger.error(f"Error processing book: {str(e)}")
        
        if result.failed > 0:
            result.success = len(result.errors) == 0
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing imported books: {str(e)}")
        result.success = False
        result.errors.append(f"Processing failed: {str(e)}")
        return result