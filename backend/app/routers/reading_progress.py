"""
Reading Progress API Router

Handles reading status tracking, progress updates, and reading statistics
"""
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, date
import logging

from ..models import (
    UpdateReadingProgressRequest, 
    ReadingProgressResponse, 
    ReadingStatsResponse,
    Book,
    ReadingStatus
)
from ..database.services import BookService
from ..services.database_service import DatabaseIntegrationService

router = APIRouter(prefix="/api/reading", tags=["reading-progress"])
logger = logging.getLogger(__name__)

@router.put("/progress")
async def update_reading_progress(
    request: UpdateReadingProgressRequest
) -> ReadingProgressResponse:
    """Update reading progress for a book"""
    try:
        # Get the book
        book_model = await BookService.get_book_by_isbn(request.isbn)
        if not book_model:
            raise HTTPException(status_code=404, detail=f"Book with ISBN {request.isbn} not found")
        
        # Prepare update data
        update_data = {}
        
        if request.reading_status is not None:
            update_data['reading_status'] = request.reading_status.value
            
            # Auto-set dates based on status changes
            if request.reading_status == ReadingStatus.READING and not book_model.date_started:
                update_data['date_started'] = datetime.now().date().isoformat()
            elif request.reading_status == ReadingStatus.READ and not book_model.date_finished:
                update_data['date_finished'] = datetime.now().date().isoformat()
                # Increment times_read counter
                update_data['times_read'] = (book_model.times_read or 0) + 1
                # Set progress to 100% if completed
                if book_model.page_count:
                    update_data['reading_progress_pages'] = book_model.page_count
                    update_data['reading_progress_percentage'] = 100.0
        
        if request.reading_progress_pages is not None:
            update_data['reading_progress_pages'] = request.reading_progress_pages
            # Calculate percentage if page_count is available
            if book_model.page_count and book_model.page_count > 0:
                percentage = (request.reading_progress_pages / book_model.page_count) * 100
                update_data['reading_progress_percentage'] = min(100.0, max(0.0, percentage))
        
        if request.reading_progress_percentage is not None:
            update_data['reading_progress_percentage'] = min(100.0, max(0.0, request.reading_progress_percentage))
            # Calculate pages if page_count is available
            if book_model.page_count and book_model.page_count > 0:
                pages = int((request.reading_progress_percentage / 100) * book_model.page_count)
                update_data['reading_progress_pages'] = pages
        
        if request.date_started is not None:
            update_data['date_started'] = request.date_started.isoformat()
        
        if request.date_finished is not None:
            update_data['date_finished'] = request.date_finished.isoformat()
        
        if request.personal_rating is not None:
            # Validate rating is between 0 and 5
            if not (0 <= request.personal_rating <= 5):
                raise HTTPException(status_code=400, detail="Rating must be between 0 and 5")
            update_data['personal_rating'] = request.personal_rating
        
        if request.personal_notes is not None:
            update_data['personal_notes'] = request.personal_notes
        
        # Update the book
        updated_book_model = await BookService.update_book(request.isbn, update_data)
        
        # Convert to Pydantic model
        updated_book = DatabaseIntegrationService._convert_book_model_to_pydantic(updated_book_model)
        
        return ReadingProgressResponse(
            success=True,
            message="Reading progress updated successfully",
            book=updated_book
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating reading progress: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update reading progress: {str(e)}")

@router.get("/stats")
async def get_reading_stats() -> ReadingStatsResponse:
    """Get reading statistics for the library"""
    try:
        # Get all books
        books = await BookService.get_all_books()
        
        # Calculate statistics
        total_books = len(books)
        books_read = len([b for b in books if b.reading_status == 'read'])
        books_reading = len([b for b in books if b.reading_status == 'reading'])
        books_unread = len([b for b in books if b.reading_status == 'unread'])
        books_wishlist = len([b for b in books if b.reading_status == 'wishlist'])
        books_dnf = len([b for b in books if b.reading_status == 'dnf'])
        
        # Calculate average rating
        rated_books = [b for b in books if b.personal_rating is not None and b.personal_rating > 0]
        average_rating = sum(b.personal_rating for b in rated_books) / len(rated_books) if rated_books else None
        
        # Calculate total pages read
        read_books_with_pages = [b for b in books if b.reading_status == 'read' and b.page_count]
        total_pages_read = sum(b.page_count for b in read_books_with_pages)
        
        # Calculate books read this year and month
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        books_this_year = 0
        books_this_month = 0
        
        for book in books:
            if book.date_finished:
                try:
                    finished_date = datetime.fromisoformat(book.date_finished).date()
                    if finished_date.year == current_year:
                        books_this_year += 1
                        if finished_date.month == current_month:
                            books_this_month += 1
                except:
                    continue
        
        # TODO: Calculate reading streak (requires more complex logic)
        reading_streak_days = 0
        
        return ReadingStatsResponse(
            total_books=total_books,
            books_read=books_read,
            books_reading=books_reading,
            books_unread=books_unread,
            books_wishlist=books_wishlist,
            books_dnf=books_dnf,
            average_rating=round(average_rating, 2) if average_rating else None,
            total_pages_read=total_pages_read,
            reading_streak_days=reading_streak_days,
            books_this_year=books_this_year,
            books_this_month=books_this_month
        )
        
    except Exception as e:
        logger.error(f"Error getting reading statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get reading statistics: {str(e)}")

@router.get("/books/status/{status}")
async def get_books_by_status(status: ReadingStatus) -> List[Book]:
    """Get all books with a specific reading status"""
    try:
        book_models = await BookService.get_books_by_status(status.value)
        # Convert to Pydantic models
        books = []
        for book_model in book_models:
            book = DatabaseIntegrationService._convert_book_model_to_pydantic(book_model)
            books.append(book)
        return books
        
    except Exception as e:
        logger.error(f"Error getting books by status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get books by status: {str(e)}")

@router.post("/books/{isbn}/start-reading")
async def start_reading(isbn: str) -> ReadingProgressResponse:
    """Quick action to start reading a book"""
    request = UpdateReadingProgressRequest(
        isbn=isbn,
        reading_status=ReadingStatus.READING
    )
    return await update_reading_progress(request)

@router.post("/books/{isbn}/finish-reading")
async def finish_reading(isbn: str, rating: float = None) -> ReadingProgressResponse:
    """Quick action to mark a book as finished"""
    request = UpdateReadingProgressRequest(
        isbn=isbn,
        reading_status=ReadingStatus.READ,
        personal_rating=rating
    )
    return await update_reading_progress(request)

@router.post("/books/{isbn}/add-to-wishlist")
async def add_to_wishlist(isbn: str) -> ReadingProgressResponse:
    """Quick action to add a book to wishlist"""
    request = UpdateReadingProgressRequest(
        isbn=isbn,
        reading_status=ReadingStatus.WISHLIST
    )
    return await update_reading_progress(request)