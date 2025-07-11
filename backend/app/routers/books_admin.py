"""
Admin endpoints for fixing book data
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..services.database_service import DatabaseIntegrationService
from ..database.services import BookService

router = APIRouter(prefix="/books/admin", tags=["books-admin"])

class UpdateSeriesRequest(BaseModel):
    isbn: str
    series: str
    series_position: Optional[int] = None

@router.post("/update-series")
async def update_book_series(updates: List[UpdateSeriesRequest]):
    """Update series information for multiple books"""
    try:
        results = []
        for update in updates:
            # Get existing book
            book = await BookService.get_book_by_isbn(update.isbn)
            if not book:
                results.append({
                    "isbn": update.isbn,
                    "status": "error",
                    "message": "Book not found"
                })
                continue
            
            # Update series info
            await BookService.update_book(book.isbn, {
                "series": update.series,
                "series_position": update.series_position
            })
            
            results.append({
                "isbn": update.isbn,
                "status": "success",
                "message": f"Updated series to '{update.series}'"
            })
        
        return {"results": results}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suggest-series-fixes")
async def suggest_series_fixes():
    """Suggest series fixes for books that might belong together"""
    try:
        # Get all books
        books = await BookService.get_all_books()
        
        suggestions = []
        
        # Group books by author and look for potential series
        author_books = {}
        for book in books:
            if not book.series:  # Only look at standalone books
                authors_key = "|".join(sorted(book.authors or ["Unknown"]))
                if authors_key not in author_books:
                    author_books[authors_key] = []
                author_books[authors_key].append(book)
        
        # Look for books by same author that might be a series
        for authors, author_book_list in author_books.items():
            if len(author_book_list) > 1:
                # Check for common patterns
                titles = [book.title for book in author_book_list]
                
                # Check for "From Blood and Ash" series
                blood_ash_books = [book for book in author_book_list 
                                  if "blood" in book.title.lower() or "kingdom" in book.title.lower()]
                if len(blood_ash_books) > 1:
                    suggestions.append({
                        "series_name": "From Blood and Ash",
                        "author": authors.split("|")[0],
                        "books": [{"isbn": book.isbn, "title": book.title} for book in blood_ash_books],
                        "suggested_updates": [
                            {"isbn": book.isbn, "series": "From Blood and Ash", "series_position": None}
                            for book in blood_ash_books
                        ]
                    })
                
                # Check for Lord of the Rings
                lotr_books = [book for book in author_book_list 
                             if "fellowship" in book.title.lower() or "lord of the rings" in book.title.lower()]
                if len(lotr_books) > 0:
                    suggestions.append({
                        "series_name": "The Lord of the Rings",
                        "author": authors.split("|")[0],
                        "books": [{"isbn": book.isbn, "title": book.title} for book in lotr_books],
                        "suggested_updates": [
                            {"isbn": book.isbn, "series": "The Lord of the Rings", "series_position": None}
                            for book in lotr_books
                        ]
                    })
        
        return {"suggestions": suggestions}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))