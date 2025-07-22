from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

try:
    from backend.services.reading_progress import ReadingProgressService
    from backend.models import ReadingProgress, ReadingStats
except ImportError:
    from services.reading_progress import ReadingProgressService
    from models import ReadingProgress, ReadingStats


router = APIRouter()


class ProgressUpdate(BaseModel):
    edition_id: int
    current_page: int
    total_pages: int


class FinishReadingRequest(BaseModel):
    rating: Optional[int] = None


@router.put("/progress")
async def update_reading_progress(progress: ProgressUpdate):
    """Update reading progress for a book"""
    service = ReadingProgressService()
    try:
        result = service.update_progress(
            edition_id=progress.edition_id,
            current_page=progress.current_page,
            total_pages=progress.total_pages
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_reading_stats():
    """Get reading statistics"""
    service = ReadingProgressService()
    try:
        stats = service.get_reading_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/books/status/{status}")
async def get_books_by_reading_status(status: str):
    """Get books by reading status"""
    if status not in ["want_to_read", "currently_reading", "finished"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    service = ReadingProgressService()
    try:
        books = service.get_books_by_status(status)
        return books
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/books/{isbn}/start-reading")
async def start_reading_book(isbn: str):
    """Mark a book as currently reading"""
    # TODO: Need to look up edition by ISBN first
    # For now, we'll need the edition_id instead
    raise HTTPException(status_code=501, detail="Not implemented - use edition_id instead")


@router.post("/books/{isbn}/finish-reading")
async def finish_reading_book(isbn: str, request: FinishReadingRequest):
    """Mark a book as finished"""
    # TODO: Need to look up edition by ISBN first
    # For now, we'll need the edition_id instead
    raise HTTPException(status_code=501, detail="Not implemented - use edition_id instead")


@router.post("/books/{isbn}/add-to-wishlist")
async def add_book_to_wishlist(isbn: str):
    """Add a book to the wishlist"""
    # TODO: Need to look up edition by ISBN first
    # For now, we'll need the edition_id instead
    raise HTTPException(status_code=501, detail="Not implemented - use edition_id instead")


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