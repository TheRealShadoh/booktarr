"""
API routes for Smart Collection Features
Handles tags, categories, language filtering, and duplicate detection
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any
from database import get_session
from services.tag_manager import TagManager, SmartDuplicateDetector
from models.book import Book, Edition

router = APIRouter(tags=["collections"])


# ============= TAG MANAGEMENT =============

@router.post("/api/tags/add")
async def add_tag_to_book(
    book_id: int,
    tag: str,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Add a tag to a book"""
    try:
        book = TagManager.add_tag_to_book(session, book_id, tag)
        return {
            "success": True,
            "book_id": book.id,
            "tags": TagManager.parse_json_list(book.tags) or [],
            "message": f"Tag '{tag}' added to book"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/api/tags/remove")
async def remove_tag_from_book(
    book_id: int,
    tag: str,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Remove a tag from a book"""
    try:
        book = TagManager.remove_tag_from_book(session, book_id, tag)
        return {
            "success": True,
            "book_id": book.id,
            "tags": TagManager.parse_json_list(book.tags) or [],
            "message": f"Tag '{tag}' removed from book"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/api/tags/{book_id}")
async def set_book_tags(
    book_id: int,
    tags: List[str],
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Set all tags for a book (replaces existing tags)"""
    try:
        book = TagManager.set_tags_for_book(session, book_id, tags)
        return {
            "success": True,
            "book_id": book.id,
            "tags": TagManager.parse_json_list(book.tags) or [],
            "message": f"Set {len(tags)} tags for book"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/tags")
async def get_all_tags(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get all unique tags in the collection"""
    tags = TagManager.get_all_tags(session)
    return {
        "tags": tags,
        "count": len(tags),
        "message": f"Found {len(tags)} unique tags"
    }


@router.get("/api/tags/{tag}/books")
async def get_books_by_tag(tag: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get all books with a specific tag"""
    books = TagManager.filter_books_by_tag(session, tag)
    return {
        "tag": tag,
        "books": [
            {
                "id": book.id,
                "title": book.title,
                "authors": book.authors,
                "tags": TagManager.parse_json_list(book.tags) or []
            }
            for book in books
        ],
        "count": len(books)
    }


@router.post("/api/tags/filter")
async def filter_by_tags(
    tags: List[str],
    match_all: bool = False,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Filter books by multiple tags

    Args:
        tags: List of tags to filter by
        match_all: If true, book must have ALL tags. If false, book must have ANY tag
    """
    books = TagManager.filter_books_by_multiple_tags(session, tags, match_all=match_all)
    return {
        "filters": {
            "tags": tags,
            "match_all": match_all
        },
        "books": [
            {
                "id": book.id,
                "title": book.title,
                "authors": book.authors,
                "tags": TagManager.parse_json_list(book.tags) or []
            }
            for book in books
        ],
        "count": len(books)
    }


# ============= CATEGORY MANAGEMENT =============

@router.get("/api/categories")
async def get_all_categories(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get all unique categories in the collection"""
    categories = TagManager.get_all_categories(session)
    return {
        "categories": categories,
        "count": len(categories),
        "message": f"Found {len(categories)} unique categories"
    }


@router.get("/api/categories/{category}/books")
async def get_books_by_category(
    category: str,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get all books in a specific category"""
    books = TagManager.filter_books_by_category(session, category)
    return {
        "category": category,
        "books": [
            {
                "id": book.id,
                "title": book.title,
                "authors": book.authors,
                "categories": TagManager.parse_json_list(book.categories) or []
            }
            for book in books
        ],
        "count": len(books)
    }


# ============= LANGUAGE MANAGEMENT =============

@router.get("/api/languages")
async def get_all_languages(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get all languages in the collection"""
    books = session.exec(select(Book)).all()
    languages = {}

    for book in books:
        if book.language:
            if book.language not in languages:
                languages[book.language] = 0
            languages[book.language] += 1

    return {
        "languages": languages,
        "unique_languages": len(languages),
        "total_books": len(books)
    }


@router.get("/api/languages/{language}/books")
async def get_books_by_language(
    language: str,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get all books in a specific language"""
    books = TagManager.filter_books_by_language(session, language)
    return {
        "language": language,
        "books": [
            {
                "id": book.id,
                "title": book.title,
                "authors": book.authors,
                "language": book.language
            }
            for book in books
        ],
        "count": len(books)
    }


# ============= COLLECTION STATISTICS =============

@router.get("/api/collection/stats")
async def get_collection_stats(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get statistics about the collection (tags, categories, languages, formats)"""
    stats = TagManager.get_book_collection_stats(session)
    return {
        "success": True,
        "statistics": stats
    }


# ============= EDITION VARIANTS =============

@router.get("/api/books/{book_id}/editions")
async def get_edition_variants(
    book_id: int,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get all edition variants (different formats) for a book"""
    from models.book import Edition

    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    variants = {}
    for edition in book.editions:
        format_key = edition.book_format or "unknown"
        if format_key not in variants:
            variants[format_key] = []

        variants[format_key].append({
            "id": edition.id,
            "isbn_13": edition.isbn_13,
            "isbn_10": edition.isbn_10,
            "format": edition.book_format,
            "language": edition.language,
            "publisher": edition.publisher,
            "release_date": edition.release_date,
            "price": edition.price,
            "cover_url": edition.cover_url
        })

    return {
        "book_id": book_id,
        "title": book.title,
        "variants": variants,
        "total_editions": len(book.editions)
    }


# ============= DUPLICATE DETECTION =============

@router.get("/api/duplicates")
async def find_duplicates(
    confidence: float = 0.6,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Find potential duplicate books in the collection

    Args:
        confidence: Confidence threshold (0.0-1.0) for detecting duplicates
    """
    if confidence < 0 or confidence > 1:
        raise HTTPException(status_code=400, detail="Confidence must be between 0 and 1")

    duplicates = SmartDuplicateDetector.find_duplicates_with_confidence(session, confidence)

    return {
        "duplicates_found": len(duplicates),
        "confidence_threshold": confidence,
        "duplicates": [
            {
                "book1": {
                    "id": dup[0].id,
                    "title": dup[0].title,
                    "authors": dup[0].authors,
                    "series": dup[0].series_name
                },
                "book2": {
                    "id": dup[1].id,
                    "title": dup[1].title,
                    "authors": dup[1].authors,
                    "series": dup[1].series_name
                },
                "confidence": round(dup[2], 2)
            }
            for dup in duplicates
        ]
    }


@router.post("/api/duplicates/merge")
async def merge_duplicates(
    primary_id: int,
    duplicate_ids: List[int],
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Merge duplicate books into a primary book"""
    try:
        merged_book = SmartDuplicateDetector.merge_duplicate_books(
            session, primary_id, duplicate_ids
        )
        return {
            "success": True,
            "primary_book_id": merged_book.id,
            "merged_count": len(duplicate_ids),
            "message": f"Successfully merged {len(duplicate_ids)} duplicate(s)"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
