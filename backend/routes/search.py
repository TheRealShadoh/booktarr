from fastapi import APIRouter, Query
from typing import Dict, Any

try:
    from backend.services import BookSearchService
    from backend.routes.settings import is_external_metadata_enabled
except ImportError:
    from services import BookSearchService
    from routes.settings import is_external_metadata_enabled

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/books-direct")
async def search_books_direct(
    query: str = Query(..., description="Search query for books"),
    max_results: int = Query(20, description="Maximum number of results to return")
) -> Dict[str, Any]:
    """
    Direct search using Google Books API - bypassing all middleware.
    """
    try:
        from clients.google_books import GoogleBooksClient
        
        google_client = GoogleBooksClient()
        try:
            if query.replace("-", "").isdigit() and len(query.replace("-", "")) in [10, 13]:
                # ISBN search
                result = await google_client.search_by_isbn(query)
                results = [result] if result else []
            else:
                # Title search
                results = await google_client.search_by_title(query)
            
            return {
                "results": results,
                "query": query,
                "total": len(results),
                "source": "google_books_direct"
            }
        finally:
            await google_client.close()
            
    except Exception as e:
        print(f"Direct search error: {e}")
        return {
            "results": [],
            "error": str(e),
            "query": query,
            "total": 0
        }


@router.get("/books")
async def search_books(
    query: str = Query(..., description="Search query for books"),
    max_results: int = Query(20, description="Maximum number of results to return")
) -> Dict[str, Any]:
    """
    Search for books using external metadata services - SIMPLIFIED VERSION.
    """
    print(f"DEBUG - Search endpoint called with query: {query}")
    try:
        from clients.google_books import GoogleBooksClient
        
        google_client = GoogleBooksClient()
        try:
            # Determine if this is an ISBN search or title search
            if query.replace("-", "").isdigit() and len(query.replace("-", "")) in [10, 13]:
                # ISBN search
                print(f"DEBUG - Searching ISBN: {query}")
                try:
                    result = await google_client.search_by_isbn(query)
                    print(f"DEBUG - Google Books ISBN result: {result}")
                    google_results = [result] if result else []
                    print(f"DEBUG - Final google_results list: {len(google_results)} items")
                except Exception as isbn_error:
                    print(f"DEBUG - Error in ISBN search: {isbn_error}")
                    google_results = []
            else:
                # Title/author search
                print(f"DEBUG - Searching title: {query}")
                try:
                    google_results = await google_client.search_by_title(query)
                    print(f"DEBUG - Google Books title results: {len(google_results) if google_results else 0}")
                except Exception as title_error:
                    print(f"DEBUG - Error in title search: {title_error}")
                    google_results = []
            
            # Transform Google Books results to the format expected by frontend
            search_results = []
            for book_data in google_results[:max_results]:
                if book_data:
                    search_result = {
                        "book": {
                            "isbn": book_data.get("isbn_13") or book_data.get("isbn_10") or "",
                            "title": book_data.get("title", ""),
                            "authors": book_data.get("authors", []),
                            "series": book_data.get("series_name"),
                            "series_position": book_data.get("series_position"),
                            "publisher": book_data.get("publisher", ""),
                            "published_date": book_data.get("release_date", ""),
                            "page_count": book_data.get("page_count", 0),
                            "language": "en",  # Default
                            "thumbnail_url": book_data.get("cover_url", ""),
                            "cover_url": book_data.get("cover_url", ""),
                            "description": book_data.get("description", ""),
                            "categories": book_data.get("categories", []),
                            "pricing": [],
                            "metadata_source": "google_books",
                            "added_date": "",
                            "last_updated": "",
                            "isbn10": book_data.get("isbn_10"),
                            "isbn13": book_data.get("isbn_13"),
                            "metadata_enhanced": False,
                            "reading_status": "unread",
                            "times_read": 0
                        },
                        "score": 1.0,  # Default score
                        "source": "google_books"
                    }
                    search_results.append(search_result)
            
            return {
                "results": search_results,
                "query": query,
                "total": len(search_results)
            }
            
        finally:
            await google_client.close()
        
    except Exception as e:
        print(f"Search error: {e}")
        return {
            "results": [],
            "error": str(e),
            "query": query,
            "total": 0
        }