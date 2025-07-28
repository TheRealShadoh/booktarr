"""
Import functionality API routes for CSV and other data sources
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlmodel import Session
from typing import Dict, Any, List, Optional
from datetime import datetime
import csv
import io
import json
import uuid
import os
import logging
from pydantic import BaseModel

try:
    from backend.database import get_session
    from backend.models.book import Book, Edition
    from backend.services.book_search import BookSearchService
except ImportError:
    from database import get_session
    from models.book import Book, Edition
    from services.book_search import BookSearchService

router = APIRouter()

# In-memory storage for import status (in production, use database or Redis)
import_status_store: Dict[str, Dict[str, Any]] = {}


class ImportStatus(BaseModel):
    id: str
    status: str  # "processing", "completed", "failed"
    progress: float  # 0-100
    total_rows: int
    processed_rows: int
    success_count: int
    error_count: int
    errors: List[str]
    started_at: str
    completed_at: Optional[str] = None


class CSVPreviewData(BaseModel):
    headers: List[str]
    sample_rows: List[List[str]]
    total_rows: int
    detected_columns: Dict[str, str]  # column mapping


@router.post("/csv")
async def import_csv_file(
    file: UploadFile = File(...),
    preview_only: bool = Form(False),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Import books from CSV file"""
    
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")
    
    try:
        # Read CSV content
        content = await file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        rows = list(csv_reader)
        headers = csv_reader.fieldnames or []
        
        # Detect column mappings
        detected_columns = _detect_csv_columns(headers)
        
        if preview_only:
            # Return preview data
            sample_rows = []
            for i, row in enumerate(rows[:10]):  # First 10 rows
                sample_rows.append([row.get(header, '') for header in headers])
            
            return {
                "success": True,
                "preview": {
                    "headers": headers,
                    "sample_rows": sample_rows,
                    "total_rows": len(rows),
                    "detected_columns": detected_columns
                }
            }
        
        # Create import job
        import_id = str(uuid.uuid4())
        logging.info(f"Import {import_id}: Starting CSV import of {len(rows)} rows from {file.filename}")
        import_status_store[import_id] = {
            "id": import_id,
            "status": "processing",
            "progress": 0.0,
            "total_rows": len(rows),
            "processed_rows": 0,
            "success_count": 0,
            "error_count": 0,
            "errors": [],
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        # Process CSV rows
        book_search = BookSearchService()
        
        for i, row in enumerate(rows):
            try:
                # Extract book data from row
                book_data = _extract_book_data(row, detected_columns)
                
                if book_data.get('title'):
                    # Log import progress
                    logging.info(f"Import {import_id}: Processing row {i+1}/{len(rows)}: '{book_data.get('title')}'")
                    
                    # Create or update book with metadata enrichment
                    book = await _create_or_update_book(book_data, session, import_id)
                    import_status_store[import_id]["success_count"] += 1
                else:
                    import_status_store[import_id]["errors"].append(f"Row {i+1}: Missing title")
                    import_status_store[import_id]["error_count"] += 1
                
            except Exception as e:
                import_status_store[import_id]["errors"].append(f"Row {i+1}: {str(e)}")
                import_status_store[import_id]["error_count"] += 1
            
            # Update progress
            import_status_store[import_id]["processed_rows"] = i + 1
            import_status_store[import_id]["progress"] = ((i + 1) / len(rows)) * 100
        
        # Mark as completed
        import_status_store[import_id]["status"] = "completed"
        import_status_store[import_id]["completed_at"] = datetime.now().isoformat()
        
        success_count = import_status_store[import_id]["success_count"]
        error_count = import_status_store[import_id]["error_count"]
        logging.info(f"Import {import_id}: Completed CSV import - {success_count} successful, {error_count} errors")
        
        return {
            "success": True,
            "import_id": import_id,
            "message": f"CSV import completed",
            "stats": {
                "total_rows": len(rows),
                "success_count": import_status_store[import_id]["success_count"],
                "error_count": import_status_store[import_id]["error_count"]
            }
        }
        
    except Exception as e:
        if 'import_id' in locals():
            import_status_store[import_id]["status"] = "failed"
            import_status_store[import_id]["errors"].append(f"Import failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"CSV import failed: {str(e)}")


@router.get("/status/{import_id}")
async def get_import_status(import_id: str) -> Dict[str, Any]:
    """Get status of an import job"""
    
    if import_id not in import_status_store:
        raise HTTPException(status_code=404, detail="Import job not found")
    
    status = import_status_store[import_id]
    return {
        "success": True,
        "import_status": status
    }


@router.post("/preview")
async def preview_csv_file(
    file: UploadFile = File(...),
) -> Dict[str, Any]:
    """Preview CSV file before import"""
    
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")
    
    try:
        # Read CSV content
        content = await file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        rows = list(csv_reader)
        headers = csv_reader.fieldnames or []
        
        # Detect column mappings
        detected_columns = _detect_csv_columns(headers)
        
        # Create sample rows
        sample_rows = []
        for i, row in enumerate(rows[:10]):  # First 10 rows
            sample_rows.append([row.get(header, '') for header in headers])
        
        return {
            "success": True,
            "preview": {
                "headers": headers,
                "sample_rows": sample_rows,
                "total_rows": len(rows),
                "detected_columns": detected_columns,
                "suggested_mapping": _suggest_column_mapping(headers)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV preview failed: {str(e)}")


def _detect_csv_columns(headers: List[str]) -> Dict[str, str]:
    """Detect which columns map to which book fields"""
    mapping = {}
    
    for header in headers:
        header_lower = header.lower().strip()
        
        if 'title' in header_lower:
            mapping['title'] = header
        elif 'author' in header_lower:
            mapping['authors'] = header
        elif 'isbn' in header_lower:
            mapping['isbn'] = header
        elif 'series' in header_lower and 'position' not in header_lower:
            mapping['series_name'] = header
        elif 'position' in header_lower or ('series' in header_lower and 'number' in header_lower) or 'volume' in header_lower:
            mapping['series_position'] = header
        elif 'publisher' in header_lower:
            mapping['publisher'] = header
        elif 'date' in header_lower or 'year' in header_lower:
            mapping['published_date'] = header
        elif 'page' in header_lower:
            mapping['page_count'] = header
        elif 'description' in header_lower or 'summary' in header_lower:
            mapping['description'] = header
    
    return mapping


def _suggest_column_mapping(headers: List[str]) -> Dict[str, str]:
    """Suggest the best column mapping for import"""
    suggestions = {}
    
    # Required fields
    title_candidates = [h for h in headers if 'title' in h.lower()]
    if title_candidates:
        suggestions['title'] = title_candidates[0]
    
    author_candidates = [h for h in headers if 'author' in h.lower()]
    if author_candidates:
        suggestions['authors'] = author_candidates[0]
    
    # Optional fields
    isbn_candidates = [h for h in headers if 'isbn' in h.lower()]
    if isbn_candidates:
        suggestions['isbn'] = isbn_candidates[0]
    
    series_candidates = [h for h in headers if 'series' in h.lower() and 'position' not in h.lower()]
    if series_candidates:
        suggestions['series_name'] = series_candidates[0]
    
    return suggestions


def _extract_book_data(row: Dict[str, str], column_mapping: Dict[str, str]) -> Dict[str, Any]:
    """Extract book data from CSV row using column mapping"""
    book_data = {}
    
    # Map columns to book fields
    for field, column in column_mapping.items():
        value = row.get(column, '').strip()
        if value:
            if field == 'authors':
                # Split authors by common delimiters
                authors = [a.strip() for a in value.replace(' and ', ', ').split(',')]
                book_data['authors'] = [a for a in authors if a]
            elif field == 'series_position':
                try:
                    book_data['series_position'] = int(value)
                except ValueError:
                    pass
            elif field == 'page_count':
                try:
                    book_data['page_count'] = int(value)
                except ValueError:
                    pass
            else:
                book_data[field] = value
    
    return book_data


async def _create_or_update_book(book_data: Dict[str, Any], session: Session, import_id: str) -> Book:
    """Create or update a book from extracted data"""
    
    # Check if book already exists (by ISBN or title+author)
    existing_book = None
    
    if book_data.get('isbn'):
        # Try to find by ISBN in editions
        from sqlmodel import select
        edition = session.exec(
            select(Edition).where(
                (Edition.isbn_10 == book_data['isbn']) | 
                (Edition.isbn_13 == book_data['isbn'])
            )
        ).first()
        
        if edition:
            existing_book = session.exec(select(Book).where(Book.id == edition.book_id)).first()
    
    if not existing_book and book_data.get('title'):
        # Try to find by title and first author
        from sqlmodel import select
        existing_book = session.exec(
            select(Book).where(Book.title == book_data['title'])
        ).first()
    
    if existing_book:
        # Update existing book
        for field, value in book_data.items():
            if hasattr(existing_book, field) and value:
                if field == 'authors' and isinstance(value, list):
                    # Convert authors list to JSON string
                    setattr(existing_book, field, json.dumps(value))
                else:
                    setattr(existing_book, field, value)
        
        session.add(existing_book)
        session.commit()
        
        # Check if user owns this book, if not mark as owned
        if book_data.get('isbn'):
            from models.book import UserEditionStatus
            from sqlmodel import select
            
            edition = session.exec(
                select(Edition).where(
                    (Edition.isbn_10 == book_data['isbn']) | 
                    (Edition.isbn_13 == book_data['isbn'])
                )
            ).first()
            
            if edition:
                # Check if user already has status for this edition
                existing_status = session.exec(
                    select(UserEditionStatus).where(
                        (UserEditionStatus.user_id == 1) &
                        (UserEditionStatus.edition_id == edition.id)
                    )
                ).first()
                
                if not existing_status:
                    user_status = UserEditionStatus(
                        user_id=1,
                        edition_id=edition.id,
                        status='own',
                        notes='Imported from CSV'
                    )
                    session.add(user_status)
                    session.commit()
        
        # Enrich metadata if ISBN is available (limit to first 3 for demo)
        if book_data.get('isbn') and import_status_store[import_id]["success_count"] <= 3:
            try:
                await _enrich_book_metadata(existing_book, book_data['isbn'], import_id)
            except Exception as e:
                logging.error(f"Import {import_id}: Enrichment failed for {book_data['isbn']}: {str(e)}")
        elif book_data.get('isbn') and import_status_store[import_id]["success_count"] == 4:
            logging.info(f"Import {import_id}: Skipping enrichment for remaining books to avoid timeout")
        
        return existing_book
    else:
        # Create new book
        book = Book(
            title=book_data.get('title', ''),
            authors=json.dumps(book_data.get('authors', [])),
            series_name=book_data.get('series_name'),
            series_position=book_data.get('series_position'),
        )
        
        session.add(book)
        session.commit()
        session.refresh(book)
        
        # Create edition if ISBN provided
        if book_data.get('isbn'):
            edition = Edition(
                book_id=book.id,
                isbn_13=book_data['isbn'] if len(book_data['isbn']) == 13 else None,
                isbn_10=book_data['isbn'] if len(book_data['isbn']) == 10 else None,
                publisher=book_data.get('publisher'),
                # Add other edition fields as needed
            )
            session.add(edition)
            session.commit()
            session.refresh(edition)
            
            # Create UserEditionStatus to mark as owned (default user_id = 1)
            from models.book import UserEditionStatus
            user_status = UserEditionStatus(
                user_id=1,  # Default user
                edition_id=edition.id,
                status='own',
                notes='Imported from CSV'
            )
            session.add(user_status)
            session.commit()
        
        # Enrich metadata if ISBN is available (limit to first 3 for demo)
        if book_data.get('isbn') and import_status_store[import_id]["success_count"] <= 3:
            try:
                await _enrich_book_metadata(book, book_data['isbn'], import_id)
            except Exception as e:
                logging.error(f"Import {import_id}: Enrichment failed for {book_data['isbn']}: {str(e)}")
        elif book_data.get('isbn') and import_status_store[import_id]["success_count"] == 4:
            logging.info(f"Import {import_id}: Skipping enrichment for remaining books to avoid timeout")
        
        return book


async def _enrich_book_metadata(book: Book, isbn: str, import_id: str) -> None:
    """Enrich book metadata using external APIs and cache cover images"""
    
    try:
        # Import services
        from services.book_search import BookSearchService
        from services.image_service import ImageService
        from services.cache import JsonCache
        
        book_search = BookSearchService()
        image_service = ImageService()
        cache = JsonCache()
        
        logging.info(f"Import {import_id}: Enriching metadata for '{book.title}' (ISBN: {isbn})")
        
        # Check cache first
        cached_data = await cache.get_by_isbn(isbn)
        if cached_data:
            logging.info(f"Import {import_id}: Found cached metadata for ISBN {isbn}")
            cover_url = cached_data.get('thumbnail_url')
            if cover_url:
                # Download and cache cover image
                local_path = image_service.get_cover_storage_path(isbn)
                if await image_service.download_cover_image(cover_url, local_path):
                    logging.info(f"Import {import_id}: Cover image cached from cache source: {local_path}")
                else:
                    logging.info(f"Import {import_id}: Failed to cache cover image from cached URL")
            return
        
        # Search Google Books API
        logging.info(f"Import {import_id}: Searching Google Books API for ISBN {isbn}")
        google_data = await book_search.google_client.search_by_isbn(isbn)
        if google_data:
            logging.info(f"Import {import_id}: Found metadata in Google Books API")
            # Update book with Google Books data
            if google_data.get('description') and not book.description:
                book.description = google_data['description']
            if google_data.get('published_date') and not book.published_date:
                book.published_date = google_data['published_date'] 
            if google_data.get('page_count') and not book.page_count:
                book.page_count = google_data['page_count']
            
            # Cache the data
            await cache.set_isbn_cache(isbn, google_data)
            
            # Download cover image if available
            cover_url = google_data.get('thumbnail_url')
            if cover_url:
                local_path = image_service.get_cover_storage_path(isbn)
                if await image_service.download_cover_image(cover_url, local_path):
                    logging.info(f"Import {import_id}: Cover image downloaded from Google Books API: {local_path}")
                else:
                    logging.info(f"Import {import_id}: Failed to download cover from Google Books")
            return
        
        # Fallback to OpenLibrary API
        logging.info(f"Import {import_id}: Searching OpenLibrary API for ISBN {isbn}")
        openlibrary_data = await book_search.openlibrary_client.search_by_isbn(isbn)
        if openlibrary_data:
            logging.info(f"Import {import_id}: Found metadata in OpenLibrary API")
            # Update book with OpenLibrary data
            if openlibrary_data.get('description') and not book.description:
                book.description = openlibrary_data['description']
            if openlibrary_data.get('published_date') and not book.published_date:
                book.published_date = openlibrary_data['published_date']
            
            # Cache the data
            await cache.set_isbn_cache(isbn, openlibrary_data)
            
            # Download cover image if available
            cover_url = openlibrary_data.get('thumbnail_url')
            if cover_url:
                local_path = image_service.get_cover_storage_path(isbn)
                if await image_service.download_cover_image(cover_url, local_path):
                    logging.info(f"Import {import_id}: Cover image downloaded from OpenLibrary API: {local_path}")
                else:
                    logging.info(f"Import {import_id}: Failed to download cover from OpenLibrary")
            return
        
        logging.info(f"Import {import_id}: No metadata found for ISBN {isbn} in any API")
        
    except Exception as e:
        logging.info(f"Import {import_id}: Error enriching metadata for ISBN {isbn}: {str(e)}")


@router.get("/history")
async def get_import_history() -> Dict[str, Any]:
    """Get history of all import jobs"""
    
    imports = []
    for import_data in import_status_store.values():
        imports.append(import_data)
    
    # Sort by started_at descending
    imports.sort(key=lambda x: x['started_at'], reverse=True)
    
    return {
        "success": True,
        "imports": imports,
        "count": len(imports)
    }


@router.delete("/history/{import_id}")
async def delete_import_history(import_id: str) -> Dict[str, Any]:
    """Delete an import job from history"""
    
    if import_id not in import_status_store:
        raise HTTPException(status_code=404, detail="Import job not found")
    
    del import_status_store[import_id]
    
    return {
        "success": True,
        "message": "Import history deleted"
    }