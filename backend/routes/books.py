from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from services import BookSearchService, OwnershipService, ReleaseCalendarService, MetadataRefreshService


router = APIRouter(prefix="/books", tags=["books"])


class EditionStatusUpdate(BaseModel):
    status: str  # 'own', 'want', 'missing'
    notes: Optional[str] = None


class NoteUpdate(BaseModel):
    notes: str


@router.get("/search")
async def search_books(
    q: str = Query(..., description="Search query (ISBN, title, author, or series)"),
    user_id: int = Query(1, description="User ID")
) -> Dict[str, Any]:
    """
    Search for books by ISBN, title, author, or series name.
    Returns structured JSON with book metadata and edition information.
    """
    search_service = BookSearchService()
    try:
        result = await search_service.search(q, user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await search_service.close()


@router.post("/editions/{edition_id}/status")
async def update_edition_status(
    edition_id: int,
    status_update: EditionStatusUpdate,
    user_id: int = Query(1, description="User ID")
) -> Dict[str, Any]:
    """
    Update the ownership status of a book edition.
    """
    ownership_service = OwnershipService()
    try:
        result = ownership_service.mark_edition_status(
            user_id=user_id,
            edition_id=edition_id,
            status=status_update.status,
            notes=status_update.notes
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/editions/{edition_id}/notes")
async def update_edition_notes(
    edition_id: int,
    note_update: NoteUpdate,
    user_id: int = Query(1, description="User ID")
) -> Dict[str, Any]:
    """
    Add or update notes for a book edition.
    """
    ownership_service = OwnershipService()
    try:
        result = ownership_service.add_note_to_edition(
            user_id=user_id,
            edition_id=edition_id,
            note=note_update.notes
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/series/{series_name}/missing")
async def get_missing_from_series(
    series_name: str,
    user_id: int = Query(1, description="User ID")
) -> List[Dict[str, Any]]:
    """
    Get missing editions from a specific series.
    """
    ownership_service = OwnershipService()
    try:
        result = ownership_service.get_missing_from_series(user_id, series_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/authors/{author_name}/missing")
async def get_missing_from_author(
    author_name: str,
    user_id: int = Query(1, description="User ID")
) -> List[Dict[str, Any]]:
    """
    Get missing editions from a specific author.
    """
    ownership_service = OwnershipService()
    try:
        result = ownership_service.get_missing_from_author(user_id, author_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/wanted")
async def get_wanted_books(
    user_id: int = Query(1, description="User ID")
) -> List[Dict[str, Any]]:
    """
    Get all books marked as wanted by the user.
    """
    ownership_service = OwnershipService()
    try:
        result = ownership_service.get_wanted_books(user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/owned")
async def get_owned_books(
    user_id: int = Query(1, description="User ID")
) -> List[Dict[str, Any]]:
    """
    Get all books owned by the user.
    """
    ownership_service = OwnershipService()
    try:
        result = ownership_service.get_owned_books(user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calendar")
async def get_release_calendar(
    user_id: int = Query(1, description="User ID")
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get a calendar of upcoming book releases and recently released books.
    """
    calendar_service = ReleaseCalendarService()
    try:
        result = calendar_service.get_release_calendar(user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/series/{series_name}/upcoming")
async def get_upcoming_series_releases(
    series_name: str,
    user_id: int = Query(1, description="User ID")
) -> List[Dict[str, Any]]:
    """
    Get upcoming releases for a specific series.
    """
    calendar_service = ReleaseCalendarService()
    try:
        result = calendar_service.get_upcoming_series_releases(user_id, series_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/authors/{author_name}/upcoming")
async def get_author_upcoming_releases(
    author_name: str,
    user_id: int = Query(1, description="User ID")
) -> List[Dict[str, Any]]:
    """
    Get upcoming releases from a specific author.
    """
    calendar_service = ReleaseCalendarService()
    try:
        result = calendar_service.get_author_upcoming_releases(user_id, author_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_releases(
    days: int = Query(30, description="Number of days to look back"),
    user_id: int = Query(1, description="User ID")
) -> List[Dict[str, Any]]:
    """
    Get books released in the last N days that the user doesn't own.
    """
    calendar_service = ReleaseCalendarService()
    try:
        result = calendar_service.get_recent_releases(user_id, days)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh/stale")
async def refresh_stale_metadata(
    days_old: int = Query(30, description="Refresh entries older than this many days")
) -> Dict[str, Any]:
    """
    Refresh stale metadata from cache.
    """
    refresh_service = MetadataRefreshService()
    try:
        result = await refresh_service.refresh_stale_metadata(days_old)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh/incomplete")
async def refresh_incomplete_metadata() -> Dict[str, Any]:
    """
    Refresh incomplete metadata entries.
    """
    refresh_service = MetadataRefreshService()
    try:
        result = await refresh_service.refresh_incomplete_metadata()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))