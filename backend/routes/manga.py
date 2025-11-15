"""
Manga-specific metadata API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from sqlmodel import Session

try:
    from backend.database import get_session
    from backend.models import Book, Edition
    from backend.services.manga_metadata_service import MangaMetadataService
except ImportError:
    from database import get_session
    from models import Book, Edition
    from services.manga_metadata_service import MangaMetadataService

router = APIRouter(prefix="/manga", tags=["manga"])


@router.get("/formats")
def get_available_formats():
    """
    Get list of available book format types with icons and labels
    """
    formats = []
    for book_type in MangaMetadataService.BOOK_TYPES:
        formats.append({
            "type": book_type,
            "label": MangaMetadataService.get_book_format_label(book_type),
            "icon": MangaMetadataService.get_book_format_icon(book_type)
        })
    return {"formats": formats}


@router.get("/translation-statuses")
def get_available_translation_statuses():
    """
    Get list of available translation statuses with labels
    """
    statuses = []
    for status in MangaMetadataService.TRANSLATION_STATUSES:
        statuses.append({
            "type": status,
            "label": MangaMetadataService.get_translation_status_label(status)
        })
    return {"statuses": statuses}


@router.get("/books/{book_id}/metadata")
def get_book_manga_metadata(book_id: int, session: Session = Depends(get_session)):
    """
    Get manga-specific metadata for a book (original title, format type, original language, etc.)
    """
    try:
        book = session.get(Book, book_id)
        if not book:
            raise HTTPException(status_code=404, detail=f"Book with id {book_id} not found")

        return {
            "id": book.id,
            "title": book.title,
            "original_title": book.original_title,
            "book_type": book.book_type,
            "book_type_label": MangaMetadataService.get_book_format_label(book.book_type),
            "book_type_icon": MangaMetadataService.get_book_format_icon(book.book_type),
            "original_language": book.original_language,
            "anilist_id": book.anilist_id,
            "creators": [
                {
                    "id": creator.id,
                    "name": creator.name,
                    "role": creator.role,
                    "language": creator.language,
                    "notes": creator.notes
                }
                for creator in book.creators
            ] if book.creators else []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/books/{book_id}/metadata")
def update_book_manga_metadata(
    book_id: int,
    book_type: Optional[str] = None,
    original_title: Optional[str] = None,
    original_language: Optional[str] = None,
    anilist_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    """
    Update manga-specific metadata for a book
    """
    try:
        book = session.get(Book, book_id)
        if not book:
            raise HTTPException(status_code=404, detail=f"Book with id {book_id} not found")

        if book_type:
            if book_type not in MangaMetadataService.BOOK_TYPES:
                raise HTTPException(status_code=400, detail=f"Invalid book type: {book_type}")
            book.book_type = book_type

        if original_title:
            book.original_title = original_title
        if original_language:
            book.original_language = original_language
        if anilist_id:
            book.anilist_id = anilist_id

        session.add(book)
        session.commit()
        session.refresh(book)

        return {
            "id": book.id,
            "title": book.title,
            "original_title": book.original_title,
            "book_type": book.book_type,
            "book_type_label": MangaMetadataService.get_book_format_label(book.book_type),
            "book_type_icon": MangaMetadataService.get_book_format_icon(book.book_type),
            "original_language": book.original_language,
            "anilist_id": book.anilist_id,
            "message": "Manga metadata updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/editions/{edition_id}/translation-status")
def get_edition_translation_status(edition_id: int, session: Session = Depends(get_session)):
    """
    Get translation and format information for an edition
    """
    try:
        edition = session.get(Edition, edition_id)
        if not edition:
            raise HTTPException(status_code=404, detail=f"Edition with id {edition_id} not found")

        return {
            "id": edition.id,
            "isbn_13": edition.isbn_13,
            "language": edition.language,
            "translation_status": edition.translation_status,
            "translation_status_label": MangaMetadataService.get_translation_status_label(edition.translation_status) if edition.translation_status else None,
            "translator": edition.translator,
            "is_color": edition.is_color,
            "chapter_count": edition.chapter_count,
            "format_variant": edition.format_variant,
            "is_current_edition": edition.is_current_edition,
            "page_count": edition.page_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/editions/{edition_id}/translation-status")
def update_edition_translation_status(
    edition_id: int,
    language: Optional[str] = None,
    translation_status: Optional[str] = None,
    translator: Optional[str] = None,
    is_color: Optional[bool] = None,
    chapter_count: Optional[int] = None,
    format_variant: Optional[str] = None,
    is_current_edition: Optional[bool] = None,
    session: Session = Depends(get_session)
):
    """
    Update translation and format information for an edition
    """
    try:
        edition = session.get(Edition, edition_id)
        if not edition:
            raise HTTPException(status_code=404, detail=f"Edition with id {edition_id} not found")

        if language:
            edition.language = language
        if translation_status:
            if translation_status not in MangaMetadataService.TRANSLATION_STATUSES:
                raise HTTPException(status_code=400, detail=f"Invalid translation status: {translation_status}")
            edition.translation_status = translation_status
        if translator:
            edition.translator = translator
        if is_color is not None:
            edition.is_color = is_color
        if chapter_count is not None:
            edition.chapter_count = chapter_count
        if format_variant:
            edition.format_variant = format_variant
        if is_current_edition is not None:
            edition.is_current_edition = is_current_edition

        session.add(edition)
        session.commit()
        session.refresh(edition)

        return {
            "id": edition.id,
            "isbn_13": edition.isbn_13,
            "language": edition.language,
            "translation_status": edition.translation_status,
            "translation_status_label": MangaMetadataService.get_translation_status_label(edition.translation_status) if edition.translation_status else None,
            "translator": edition.translator,
            "is_color": edition.is_color,
            "chapter_count": edition.chapter_count,
            "format_variant": edition.format_variant,
            "is_current_edition": edition.is_current_edition,
            "page_count": edition.page_count,
            "message": "Edition translation status updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
