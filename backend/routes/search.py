from fastapi import APIRouter, Query
from typing import Dict, Any

try:
    from backend.services import BookSearchService
    from backend.routes.settings import is_external_metadata_enabled
except ImportError:
    from services import BookSearchService
    from routes.settings import is_external_metadata_enabled

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/books")
async def search_books(
    query: str = Query(..., description="Search query for books"),
    max_results: int = Query(20, description="Maximum number of results to return")
) -> Dict[str, Any]:
    """
    Search for books using external metadata services.
    """
    try:
        # Check if external metadata is enabled
        if not is_external_metadata_enabled():
            return {
                "results": [],
                "message": "External metadata lookups are currently disabled",
                "query": query,
                "total": 0
            }
        
        # Use the book search service
        search_service = BookSearchService()
        search_result = await search_service.search(query=query)
        
        # Extract books from the search result
        books = []
        if "results" in search_result:
            books = search_result["results"]
        elif "series_books" in search_result:
            books = search_result["series_books"]
        elif "error" in search_result:
            return {
                "results": [],
                "query": query,
                "total": 0,
                "error": search_result["error"]
            }
        
        # Limit results
        books = books[:max_results] if books else []
        
        # Transform books to SearchResult format expected by frontend
        search_results = []
        for book in books:
            search_result = {
                "book": {
                    "isbn": book.get("editions", [{}])[0].get("isbn_13") or book.get("editions", [{}])[0].get("isbn_10") or "",
                    "title": book.get("title", ""),
                    "authors": book.get("authors", []),
                    "series": book.get("series"),
                    "series_position": book.get("series_position"),
                    "publisher": book.get("editions", [{}])[0].get("publisher", ""),
                    "published_date": book.get("editions", [{}])[0].get("release_date", ""),
                    "page_count": 0,  # Not provided in search results
                    "language": "en",  # Default
                    "thumbnail_url": book.get("editions", [{}])[0].get("cover_url", ""),
                    "cover_url": book.get("editions", [{}])[0].get("cover_url", ""),
                    "description": "",  # Not provided in search results
                    "categories": [],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": "",
                    "last_updated": "",
                    "isbn10": book.get("editions", [{}])[0].get("isbn_10"),
                    "isbn13": book.get("editions", [{}])[0].get("isbn_13"),
                    "metadata_enhanced": False,
                    "reading_status": "unread",
                    "times_read": 0
                },
                "score": 1.0,  # Default score
                "source": "api_search"
            }
            search_results.append(search_result)
        
        return {
            "results": search_results,
            "query": query,
            "total": len(search_results)
        }
        
    except Exception as e:
        print(f"Search error: {e}")
        return {
            "results": [],
            "error": str(e),
            "query": query,
            "total": 0
        }