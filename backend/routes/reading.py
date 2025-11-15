from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlmodel import Session, select
from datetime import datetime

try:
    from backend.services.reading_progress import ReadingProgressService
    from backend.models import ReadingProgress, ReadingStats, Edition, Book
    from backend.database import get_session
except ImportError:
    from services.reading_progress import ReadingProgressService
    from models import ReadingProgress, ReadingStats, Edition, Book
    from database import get_session


router = APIRouter()


class ProgressUpdate(BaseModel):
    isbn: Optional[str] = None
    edition_id: Optional[int] = None
    current_page: int
    total_pages: int
    reading_status: Optional[str] = None


class FinishReadingRequest(BaseModel):
    rating: Optional[int] = None
    review: Optional[str] = None


@router.put("/progress")
async def update_reading_progress(progress: ProgressUpdate, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Update reading progress for a book"""
    edition = None
    
    if progress.isbn:
        edition = _find_edition_by_isbn(progress.isbn, session)
    elif progress.edition_id:
        edition = session.exec(select(Edition).where(Edition.id == progress.edition_id)).first()
    
    if not edition:
        raise HTTPException(status_code=404, detail="Book/Edition not found")
    
    service = ReadingProgressService()
    try:
        result = service.update_progress(
            edition_id=edition.id,
            current_page=progress.current_page,
            total_pages=progress.total_pages
        )
        return {
            "success": True,
            "message": "Reading progress updated",
            "reading_progress": {
                "id": result.id,
                "status": result.status,
                "current_page": result.current_page,
                "total_pages": result.total_pages,
                "progress_percentage": result.progress_percentage
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_reading_stats() -> Dict[str, Any]:
    """Get reading statistics"""
    service = ReadingProgressService()
    try:
        stats = service.get_reading_stats()
        return {
            "success": True,
            "stats": {
                "total_books": stats.books_read + stats.books_reading + stats.books_want_to_read,
                "currently_reading": stats.books_reading,
                "books_read": stats.books_read,
                "want_to_read": stats.books_want_to_read,
                "books_read_this_year": stats.books_read_this_year,
                "books_read_this_month": stats.books_read_this_month,
                "average_rating": round(stats.average_rating, 2) if stats.average_rating else 0.0,
                "total_pages_read": stats.total_pages_read,
                "genre_breakdown": stats.genre_breakdown or {},
                "genre_percentages": stats.genre_percentages or {}
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/books/status/{status}")
async def get_books_by_reading_status(status: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get books by reading status"""
    valid_statuses = ["want_to_read", "currently_reading", "finished", "read", "abandoned"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Map 'read' to 'finished' for compatibility
    actual_status = "finished" if status == "read" else status
    
    service = ReadingProgressService()
    try:
        progress_records = service.get_books_by_status(actual_status)
        
        # Get full book details for each progress record
        books_data = []
        for progress in progress_records:
            edition = session.exec(select(Edition).where(Edition.id == progress.edition_id)).first()
            if edition:
                book = session.exec(select(Book).where(Book.id == edition.book_id)).first()
                if book:
                    books_data.append({
                        "id": book.id,
                        "title": book.title,
                        "authors": book.authors,
                        "isbn": edition.isbn_13 or edition.isbn_10,
                        "series": book.series_name,
                        "series_position": book.series_position,
                        "reading_status": progress.status,
                        "current_page": progress.current_page,
                        "total_pages": progress.total_pages,
                        "progress_percentage": progress.progress_percentage,
                        "rating": progress.rating,
                        "start_date": progress.start_date.isoformat() if progress.start_date else None,
                        "finish_date": progress.finish_date.isoformat() if progress.finish_date else None,
                        "cover_url": edition.cover_url
                    })
        
        return {
            "success": True,
            "status": status,
            "count": len(books_data),
            "books": books_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _find_edition_by_isbn(isbn: str, session: Session) -> Optional[Edition]:
    """Helper function to find edition by ISBN"""
    return session.exec(
        select(Edition).where(
            (Edition.isbn_10 == isbn) | 
            (Edition.isbn_13 == isbn)
        )
    ).first()


@router.post("/books/{isbn}/start-reading")
async def start_reading_book(isbn: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Mark a book as currently reading"""
    edition = _find_edition_by_isbn(isbn, session)
    if not edition:
        raise HTTPException(status_code=404, detail="Book not found")
    
    service = ReadingProgressService()
    try:
        result = service.start_reading(edition.id)
        return {
            "success": True,
            "message": f"Started reading book",
            "reading_progress": {
                "id": result.id,
                "status": result.status,
                "start_date": result.start_date.isoformat() if result.start_date else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/books/{isbn}/finish-reading")
async def finish_reading_book(isbn: str, request: FinishReadingRequest, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Mark a book as finished"""
    edition = _find_edition_by_isbn(isbn, session)
    if not edition:
        raise HTTPException(status_code=404, detail="Book not found")
    
    service = ReadingProgressService()
    try:
        result = service.finish_reading(edition.id, request.rating)
        return {
            "success": True,
            "message": f"Finished reading book",
            "reading_progress": {
                "id": result.id,
                "status": result.status,
                "rating": result.rating,
                "finish_date": result.finish_date.isoformat() if result.finish_date else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/books/{isbn}/add-to-wishlist")
async def add_book_to_wishlist(isbn: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Add a book to the wishlist"""
    edition = _find_edition_by_isbn(isbn, session)
    if not edition:
        raise HTTPException(status_code=404, detail="Book not found")
    
    service = ReadingProgressService()
    try:
        result = service.add_to_wishlist(edition.id)
        return {
            "success": True,
            "message": f"Added book to wishlist",
            "reading_progress": {
                "id": result.id,
                "status": result.status
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Alternative endpoints that use edition_id directly
@router.post("/editions/{edition_id}/start-reading")
async def start_reading_edition(edition_id: int):
    """Mark an edition as currently reading"""
    service = ReadingProgressService()
    try:
        result = service.start_reading(edition_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/editions/{edition_id}/finish-reading")
async def finish_reading_edition(edition_id: int, request: FinishReadingRequest):
    """Mark an edition as finished"""
    service = ReadingProgressService()
    try:
        result = service.finish_reading(edition_id, request.rating)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/editions/{edition_id}/add-to-wishlist")
async def add_edition_to_wishlist(edition_id: int):
    """Add an edition to the wishlist"""
    service = ReadingProgressService()
    try:
        result = service.add_to_wishlist(edition_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))