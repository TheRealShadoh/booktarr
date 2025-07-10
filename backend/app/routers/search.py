"""
Search router for Booktarr API
Provides book search and library management endpoints
"""
import logging
import time
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ..models import SearchResponse, SearchResultModel, AddBookRequest, AddBookResponse, Book
from ..services.book_search_service import BookSearchService
from ..services.database_service import DatabaseIntegrationService
from ..services.cache_service import cache_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/search/books", response_model=SearchResponse)
async def search_books(
    query: str = Query(..., description="Search query for books (title, author, ISBN)", min_length=1),
    max_results: int = Query(20, description="Maximum number of results to return", ge=1, le=100)
):
    """
    Search for books across multiple APIs (Google Books, Open Library)
    
    Parameters:
    - query: Search term - can be book title, author name, or ISBN
    - max_results: Maximum number of results to return (1-100, default 20)
    
    Returns:
    - SearchResponse with list of books, scores, and metadata
    """
    start_time = time.time()
    
    try:
        logger.info(f"Searching for books with query: '{query}', max_results: {max_results}")
        
        # Validate query
        if not query or query.strip() == "":
            raise HTTPException(status_code=400, detail="Query parameter cannot be empty")
        
        # Use the book search service
        async with BookSearchService() as search_service:
            search_results = await search_service.search_books(query.strip(), max_results)
        
        # Convert to response models
        response_results = []
        for result in search_results:
            response_results.append(SearchResultModel(
                book=result.book,
                score=result.score,
                source=result.source
            ))
        
        search_time = time.time() - start_time
        
        logger.info(f"Search completed in {search_time:.2f}s, found {len(response_results)} results")
        
        return SearchResponse(
            results=response_results,
            total_found=len(response_results),
            query=query,
            search_time=round(search_time, 3)
        )
        
    except Exception as e:
        search_time = time.time() - start_time
        logger.error(f"Search failed after {search_time:.2f}s: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/library/add", response_model=AddBookResponse)
async def add_book_to_library(request: AddBookRequest):
    """
    Add a book to the user's library
    
    Parameters:
    - request: AddBookRequest with ISBN and optional source
    
    Returns:
    - AddBookResponse with success status and book details
    """
    try:
        logger.info(f"Adding book to library: ISBN {request.isbn}")
        
        # Validate ISBN format
        isbn = request.isbn.strip()
        if not isbn:
            raise HTTPException(status_code=400, detail="ISBN cannot be empty")
        
        # Check if book already exists in library
        existing_book = await DatabaseIntegrationService.get_book_by_isbn(isbn)
        if existing_book:
            logger.info(f"Book already exists in library: {isbn}")
            return AddBookResponse(
                success=True,
                message="Book already exists in your library",
                book=existing_book,
                already_exists=True
            )
        
        # Get book details from search APIs
        async with BookSearchService() as search_service:
            book = await search_service.get_book_by_isbn(isbn)
        
        if not book:
            logger.warning(f"Book not found in any API: {isbn}")
            raise HTTPException(status_code=404, detail=f"Book with ISBN {isbn} not found")
        
        # Add to database
        saved_book = await DatabaseIntegrationService.add_book(book)
        
        # Clear cache to ensure fresh data on next request
        cache_service.delete_api_response("all_books")
        
        logger.info(f"Successfully added book to library: {saved_book.title} by {', '.join(saved_book.authors)}")
        
        return AddBookResponse(
            success=True,
            message="Book successfully added to your library",
            book=saved_book,
            already_exists=False
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, etc.)
        raise
    except Exception as e:
        logger.error(f"Error adding book to library: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add book to library: {str(e)}")

@router.get("/library/search", response_model=SearchResponse)
async def search_library(
    query: str = Query(..., description="Search query for books in your library", min_length=1),
    max_results: int = Query(50, description="Maximum number of results to return", ge=1, le=100)
):
    """
    Search books in the user's library
    
    Parameters:
    - query: Search term - can be book title, author name, series, or ISBN
    - max_results: Maximum number of results to return (1-100, default 50)
    
    Returns:
    - SearchResponse with filtered library books
    """
    start_time = time.time()
    
    try:
        logger.info(f"Searching library with query: '{query}', max_results: {max_results}")
        
        # Validate query
        if not query or query.strip() == "":
            raise HTTPException(status_code=400, detail="Query parameter cannot be empty")
        
        query_lower = query.strip().lower()
        
        # Get all books from library
        books_response = await DatabaseIntegrationService.get_books_response()
        all_books = []
        for series_books in books_response.series.values():
            all_books.extend(series_books)
        
        # Filter books based on query
        matching_books = []
        for book in all_books:
            score = 0.0
            
            # Check title match
            if query_lower in book.title.lower():
                score += 0.5
                if book.title.lower().startswith(query_lower):
                    score += 0.3
            
            # Check author match
            for author in book.authors:
                if query_lower in author.lower():
                    score += 0.4
                    if author.lower().startswith(query_lower):
                        score += 0.2
            
            # Check series match
            if book.series and query_lower in book.series.lower():
                score += 0.3
            
            # Check ISBN match
            if query_lower in book.isbn.lower():
                score += 1.0  # Exact match gets highest score
            
            # Check publisher match
            if book.publisher and query_lower in book.publisher.lower():
                score += 0.1
            
            # Check categories match
            for category in book.categories:
                if query_lower in category.lower():
                    score += 0.1
            
            # If any match found, add to results
            if score > 0:
                matching_books.append((book, score))
        
        # Sort by score and limit results
        matching_books.sort(key=lambda x: x[1], reverse=True)
        limited_results = matching_books[:max_results]
        
        # Convert to response format
        response_results = []
        for book, score in limited_results:
            response_results.append(SearchResultModel(
                book=book,
                score=min(score, 1.0),  # Cap score at 1.0
                source="library"
            ))
        
        search_time = time.time() - start_time
        
        logger.info(f"Library search completed in {search_time:.2f}s, found {len(response_results)} results")
        
        return SearchResponse(
            results=response_results,
            total_found=len(response_results),
            query=query,
            search_time=round(search_time, 3)
        )
        
    except Exception as e:
        search_time = time.time() - start_time
        logger.error(f"Library search failed after {search_time:.2f}s: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Library search failed: {str(e)}")

@router.delete("/library/{isbn}")
async def remove_book_from_library(isbn: str):
    """
    Remove a book from the user's library
    
    Parameters:
    - isbn: ISBN of the book to remove
    
    Returns:
    - Success message
    """
    try:
        logger.info(f"Removing book from library: ISBN {isbn}")
        
        # Check if book exists
        existing_book = await DatabaseIntegrationService.get_book_by_isbn(isbn)
        if not existing_book:
            raise HTTPException(status_code=404, detail=f"Book with ISBN {isbn} not found in library")
        
        # Remove from database
        success = await DatabaseIntegrationService.delete_book(isbn)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to remove book from library")
        
        # Clear cache to ensure fresh data on next request
        cache_service.delete_api_response("all_books")
        
        logger.info(f"Successfully removed book from library: {existing_book.title}")
        
        return {
            "success": True,
            "message": f"Book '{existing_book.title}' removed from library"
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error removing book from library: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to remove book from library: {str(e)}")

@router.get("/book/{isbn}", response_model=Book)
async def get_book_details(isbn: str):
    """
    Get detailed information about a specific book by ISBN
    
    Parameters:
    - isbn: ISBN of the book
    
    Returns:
    - Book object with full details
    """
    try:
        logger.info(f"Getting book details for ISBN: {isbn}")
        
        # First check if book is in library
        library_book = await DatabaseIntegrationService.get_book_by_isbn(isbn)
        if library_book:
            logger.info(f"Found book in library: {library_book.title}")
            return library_book
        
        # If not in library, search external APIs
        async with BookSearchService() as search_service:
            book = await search_service.get_book_by_isbn(isbn)
        
        if not book:
            raise HTTPException(status_code=404, detail=f"Book with ISBN {isbn} not found")
        
        logger.info(f"Found book in external APIs: {book.title}")
        return book
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error getting book details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get book details: {str(e)}")