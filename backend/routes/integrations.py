"""
API endpoints for managing integrations with external services
Handles metadata sources, sync services, and import/export functionality
"""
from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

try:
    from backend.services.integration_manager import get_integration_manager, MetadataSource
except ImportError:
    from services.integration_manager import get_integration_manager, MetadataSource

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


class IntegrationPreferences(BaseModel):
    """User integration preferences"""
    primary_source: Optional[str] = None
    manga_source: Optional[str] = None
    fallback_sources: Optional[List[str]] = None
    enable_anilist: Optional[bool] = None
    enable_mal: Optional[bool] = None
    enable_goodreads: Optional[bool] = None
    sync_reading_progress: Optional[bool] = None
    sync_ratings: Optional[bool] = None


class BookSearchRequest(BaseModel):
    """Request to search for book metadata"""
    query: str
    search_type: str = "title"  # isbn, title, author, series


class MangaSearchRequest(BaseModel):
    """Request to search for manga series"""
    series_name: str
    source: Optional[str] = None  # anilist, myanimelist


class GoodreadsExportRequest(BaseModel):
    """Request to export books in Goodreads format"""
    book_ids: List[int]


@router.get("/status")
async def get_integration_status():
    """Get status of all available integrations"""
    manager = await get_integration_manager()
    return manager.get_integration_status()


@router.get("/preferences")
async def get_integration_preferences():
    """Get current user integration preferences"""
    manager = await get_integration_manager()
    return manager.get_user_preferences()


@router.put("/preferences")
async def update_integration_preferences(preferences: IntegrationPreferences):
    """Update user integration preferences"""
    manager = await get_integration_manager()
    pref_dict = preferences.dict(exclude_none=True)
    manager.set_user_preferences(pref_dict)
    return manager.get_user_preferences()


@router.post("/search/metadata")
async def search_book_metadata(request: BookSearchRequest):
    """
    Search for book metadata across all available sources

    Args:
        query: Search query (ISBN, title, author)
        search_type: Type of search (isbn, title, author)

    Returns:
        Unified metadata from multiple sources
    """
    try:
        manager = await get_integration_manager()
        results = await manager.search_book_metadata(request.query, request.search_type)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/manga")
async def search_manga_series(request: MangaSearchRequest):
    """
    Search for manga series information

    Args:
        series_name: Manga series name
        source: Optional specific source (anilist, myanimelist)

    Returns:
        Manga metadata from available anime databases
    """
    try:
        manager = await get_integration_manager()
        results = await manager.search_manga_series(request.series_name)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/manga/{series_name}/volumes")
async def get_manga_volumes(
    series_name: str,
    source: Optional[str] = Query(None, description="anilist or myanimelist")
):
    """
    Get volume information for a manga series

    Args:
        series_name: Manga series name
        source: Specific source to use (anilist, myanimelist)

    Returns:
        List of volume information
    """
    try:
        manager = await get_integration_manager()
        volumes = await manager.get_series_volumes(series_name, source)
        return {"series_name": series_name, "volumes": volumes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goodreads/search")
async def search_goodreads(q: str = Query(..., description="Search query")):
    """
    Search Goodreads for book information

    Args:
        q: Search query

    Returns:
        List of books from Goodreads
    """
    try:
        manager = await get_integration_manager()
        results = await manager.search_goodreads(q)
        return {
            "query": q,
            "results": results or [],
            "source": "goodreads"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goodreads/book/{isbn}")
async def get_goodreads_book(isbn: str):
    """
    Get book information from Goodreads by ISBN

    Args:
        isbn: ISBN-13 or ISBN-10

    Returns:
        Book information from Goodreads
    """
    try:
        manager = await get_integration_manager()
        book = await manager.get_goodreads_book_by_isbn(isbn)
        if not book:
            raise HTTPException(status_code=404, detail="Book not found on Goodreads")
        return book
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anilist/search")
async def search_anilist(q: str = Query(..., description="Series name")):
    """
    Search AniList for manga series

    Args:
        q: Series name

    Returns:
        Manga series information from AniList
    """
    try:
        manager = await get_integration_manager()
        result = await manager.anilist_client.search_manga_series(q)
        return {
            "query": q,
            "result": result,
            "source": "anilist"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/myanimelist/search")
async def search_myanimelist(
    q: str = Query(..., description="Manga name"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Search MyAnimeList for manga

    Args:
        q: Search query
        limit: Number of results to return

    Returns:
        List of manga from MyAnimeList
    """
    try:
        manager = await get_integration_manager()
        results = await manager.mal_client.search_manga(q, limit)
        return {
            "query": q,
            "results": results or [],
            "source": "myanimelist"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enable/{source}")
async def enable_integration(source: str):
    """
    Enable a specific integration

    Args:
        source: Integration source (google_books, goodreads, anilist, myanimelist, openlibrary)

    Returns:
        Updated integration status
    """
    try:
        manager = await get_integration_manager()
        manager.enable_integration(source)
        return {
            "message": f"Integration {source} enabled",
            "status": manager.get_integration_status()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disable/{source}")
async def disable_integration(source: str):
    """
    Disable a specific integration

    Args:
        source: Integration source (google_books, goodreads, anilist, myanimelist, openlibrary)

    Returns:
        Updated integration status
    """
    try:
        manager = await get_integration_manager()
        manager.disable_integration(source)
        return {
            "message": f"Integration {source} disabled",
            "status": manager.get_integration_status()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/goodreads/export")
async def export_to_goodreads_format(request: GoodreadsExportRequest):
    """
    Export books in Goodreads-compatible CSV format

    Args:
        book_ids: List of book IDs to export

    Returns:
        CSV formatted data
    """
    try:
        manager = await get_integration_manager()
        # In production, fetch actual book data by IDs from database
        # For now, return format template
        csv_data = manager.goodreads_client.export_to_goodreads_format([])
        return {
            "format": "csv",
            "data": csv_data,
            "filename": "books-goodreads-export.csv"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources/available")
async def get_available_sources():
    """Get list of available metadata sources"""
    return {
        "sources": [
            {
                "id": "google_books",
                "name": "Google Books",
                "description": "Comprehensive book metadata with great coverage",
                "type": "metadata"
            },
            {
                "id": "openlibrary",
                "name": "OpenLibrary",
                "description": "Free book metadata and search",
                "type": "metadata"
            },
            {
                "id": "goodreads",
                "name": "Goodreads",
                "description": "Book ratings, reviews, and user lists",
                "type": "metadata_and_sync"
            },
            {
                "id": "anilist",
                "name": "AniList",
                "description": "Comprehensive manga and anime information",
                "type": "manga_metadata"
            },
            {
                "id": "myanimelist",
                "name": "MyAnimeList",
                "description": "Anime and manga database",
                "type": "manga_metadata"
            }
        ]
    }


@router.get("/integration-guide")
async def get_integration_guide():
    """Get guide for setting up integrations"""
    return {
        "integrations": {
            "google_books": {
                "name": "Google Books",
                "status": "Available - No setup required",
                "features": ["Book search", "Metadata enrichment", "Cover images"],
                "setup": "Works automatically"
            },
            "openlibrary": {
                "name": "OpenLibrary",
                "status": "Available - No setup required",
                "features": ["Book search", "ISBN lookup", "Cover images"],
                "setup": "Works automatically"
            },
            "goodreads": {
                "name": "Goodreads",
                "status": "Available - API key required for full features",
                "features": ["Book search", "Ratings", "Review metadata"],
                "setup": "Obtain API key from goodreads.com/api",
                "docs": "https://www.goodreads.com/api"
            },
            "anilist": {
                "name": "AniList",
                "status": "Available - No setup required",
                "features": ["Manga series search", "Volume counts", "Genre/tags"],
                "setup": "Works automatically"
            },
            "myanimelist": {
                "name": "MyAnimeList",
                "status": "Available - API key required",
                "features": ["Manga search", "Series metadata", "Ratings"],
                "setup": "Obtain Client ID from myanimelist.net/apiconfig",
                "docs": "https://myanimelist.net/forum/?topicid=1973382"
            }
        }
    }
