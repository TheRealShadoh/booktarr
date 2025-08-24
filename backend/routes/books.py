from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, Depends
from typing import Optional, List, Dict, Any
from sqlmodel import Session
from pydantic import BaseModel
import tempfile
import os
import json

try:
    from backend.services import BookSearchService, OwnershipService, ReleaseCalendarService, MetadataRefreshService, CSVImportService
    from backend.database import get_session, get_db_session
    from backend.models import Book, Edition, UserEditionStatus
except ImportError:
    from services import BookSearchService, OwnershipService, ReleaseCalendarService, MetadataRefreshService, CSVImportService
    from database import get_session, get_db_session
    from models import Book, Edition, UserEditionStatus


router = APIRouter(prefix="/books", tags=["books"])

# Create separate router for library endpoints
library_router = APIRouter(prefix="/library", tags=["library"])

# Make both routers available for import
__all__ = ["router", "library_router"]


class EditionStatusUpdate(BaseModel):
    status: str  # 'own', 'want', 'missing'
    notes: Optional[str] = None


class NoteUpdate(BaseModel):
    notes: str


class BookAdd(BaseModel):
    isbn: Optional[str] = None
    title: str
    authors: List[str] = []
    series: Optional[str] = None
    series_position: Optional[int] = None
    publisher: Optional[str] = None
    published_date: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    isbn10: Optional[str] = None
    isbn13: Optional[str] = None


@router.post("/add")
async def add_book(book_data: BookAdd, user_id: int = Query(1, description="User ID")) -> Dict[str, Any]:
    """
    Add a new book to the user's library.
    """
    try:
        with get_db_session() as session:
            from sqlmodel import select
            import json
            
            # Check if book already exists by ISBN or title/author combination
            existing_book = None
            if book_data.isbn13 or book_data.isbn10:
                isbn_to_check = book_data.isbn13 or book_data.isbn10
                stmt = select(Edition).where(
                    (Edition.isbn_13 == isbn_to_check) | (Edition.isbn_10 == isbn_to_check)
                )
                existing_edition = session.exec(stmt).first()
                if existing_edition:
                    existing_book = existing_edition.book
            
            if not existing_book:
                # Check by title and author
                stmt = select(Book).where(Book.title == book_data.title)
                existing_books = session.exec(stmt).all()
                for book in existing_books:
                    book_authors = json.loads(book.authors) if book.authors else []
                    if book_authors == book_data.authors:
                        existing_book = book
                        break
            
            if existing_book:
                # Book exists, just update user status
                # Find the appropriate edition
                edition = existing_book.editions[0] if existing_book.editions else None
                if edition:
                    # Update or create user status
                    stmt = select(UserEditionStatus).where(
                        UserEditionStatus.user_id == user_id,
                        UserEditionStatus.edition_id == edition.id
                    )
                    user_status = session.exec(stmt).first()
                    
                    if not user_status:
                        user_status = UserEditionStatus(
                            user_id=user_id,
                            edition_id=edition.id,
                            status="own",
                            notes=None
                        )
                        session.add(user_status)
                    else:
                        user_status.status = "own"
                    
                    session.commit()
                    
                    return {
                        "success": True,
                        "message": "Book already existed, marked as owned",
                        "book_id": existing_book.id,
                        "edition_id": edition.id
                    }
            
            # Create new book
            new_book = Book(
                title=book_data.title,
                authors=json.dumps(book_data.authors),
                series_name=book_data.series,
                series_position=book_data.series_position
            )
            session.add(new_book)
            session.flush()  # Get the book ID
            
            # Create edition
            new_edition = Edition(
                book_id=new_book.id,
                isbn_10=book_data.isbn10,
                isbn_13=book_data.isbn13,
                book_format="unknown",
                publisher=book_data.publisher,
                cover_url=book_data.cover_url,
                source="manual_add"
            )
            
            # Parse published date if provided
            if book_data.published_date:
                try:
                    from datetime import datetime
                    # Try different date formats
                    for fmt in ["%Y-%m-%d", "%Y", "%B %Y", "%B %d, %Y"]:
                        try:
                            parsed_date = datetime.strptime(book_data.published_date, fmt).date()
                            new_edition.release_date = parsed_date
                            break
                        except ValueError:
                            continue
                except:
                    pass
            
            session.add(new_edition)
            session.flush()  # Get the edition ID
            
            # Create user status
            user_status = UserEditionStatus(
                user_id=user_id,
                edition_id=new_edition.id,
                status="own",
                notes=None
            )
            session.add(user_status)
            
            session.commit()
            
            # Always try to detect and enrich series information for newly added books
            try:
                # Import enhanced series detection service
                try:
                    from backend.services.enhanced_series_detection import EnhancedSeriesDetectionService
                    from backend.services.volume_sync_service import VolumeSyncService
                except ImportError:
                    from services.enhanced_series_detection import EnhancedSeriesDetectionService
                    from services.volume_sync_service import VolumeSyncService
                
                async with EnhancedSeriesDetectionService() as detection_service:
                    # Try to detect series information for this book
                    series_info = await detection_service.detect_and_populate_series(
                        book_data.title,
                        book_data.authors,
                        book_data.series  # Use manually provided series if available
                    )
                    
                    if series_info:
                        # Update the book with detected series information
                        with get_db_session() as update_session:
                            book_to_update = update_session.get(Book, new_book.id)
                            if book_to_update:
                                book_to_update.series_name = series_info["series_name"]
                                # Try to find the position for this book
                                for book_info in series_info.get("books", []):
                                    if book_info.get("title", "").lower() == book_data.title.lower():
                                        book_to_update.series_position = book_info.get("position")
                                        break
                                update_session.add(book_to_update)
                                update_session.commit()
                        
                        # Sync series volumes to ensure the new book is marked as owned
                        sync_service = VolumeSyncService()
                        await sync_service.sync_series_volumes_with_books(series_info["series_name"])
                        
                        print(f"✅ Detected and enriched series '{series_info['series_name']}' for book '{book_data.title}'")
                    else:
                        print(f"ℹ️ No series detected for book '{book_data.title}'")
                
            except Exception as e:
                print(f"Warning: Failed to detect/enrich series for '{book_data.title}': {e}")
                # Don't fail the book addition if series detection fails
            
            return {
                "success": True,
                "message": "Book added successfully",
                "book_id": new_book.id,
                "edition_id": new_edition.id
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add book: {str(e)}")


@router.get("/test")
async def get_test_books() -> Dict[str, Any]:
    """
    Get test book data for frontend development.
    """
    return {
        "series": {
            "Harry Potter": [
                {
                    "id": 1,
                    "title": "Harry Potter and the Sorcerer's Stone",
                    "authors": ["J.K. Rowling"],
                    "series": "Harry Potter",
                    "series_position": 1,
                    "editions": [
                        {
                            "id": 1,
                            "isbn_13": "9780545010221",
                            "format": "hardcover",
                            "release_date": "1997-06-26",
                            "cover_url": "https://covers.openlibrary.org/b/isbn/9780545010221-L.jpg",
                            "price": 29.99,
                            "status": "own"
                        }
                    ]
                }
            ]
        },
        "total_books": 1,
        "total_series": 1,
        "last_sync": "2025-07-19T14:00:00Z"
    }


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


@router.put("/{book_id}/metadata")
async def update_book_metadata(
    book_id: int,
    book_data: dict,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Update book metadata manually."""
    
    try:
        from sqlmodel import select
        import json
        
        # Get the book
        book = session.get(Book, book_id)
        if not book:
            raise HTTPException(status_code=404, detail=f"Book with ID {book_id} not found")
        
        # Update fields if provided
        updated_fields = []
        
        if "title" in book_data and book_data["title"]:
            book.title = book_data["title"]
            updated_fields.append("title")
        
        if "authors" in book_data and book_data["authors"]:
            if isinstance(book_data["authors"], list):
                book.authors = json.dumps(book_data["authors"])
            else:
                book.authors = json.dumps([book_data["authors"]])
            updated_fields.append("authors")
        
        if "series_name" in book_data:
            book.series_name = book_data["series_name"]
            updated_fields.append("series_name")
        
        if "series_position" in book_data:
            book.series_position = book_data["series_position"]
            updated_fields.append("series_position")
        
        if "description" in book_data:
            book.description = book_data["description"]
            updated_fields.append("description")
        
        session.add(book)
        session.commit()
        
        return {
            "success": True,
            "message": f"Updated book '{book.title}'",
            "updated_fields": updated_fields,
            "book": {
                "id": book.id,
                "title": book.title,
                "authors": json.loads(book.authors) if book.authors else [],
                "series_name": book.series_name,
                "series_position": book.series_position
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating book metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update book: {str(e)}")


@router.put("/{book_id}/editions/{edition_id}")
async def update_edition_metadata(
    book_id: int,
    edition_id: int,
    edition_data: dict,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Update edition metadata manually."""
    
    try:
        from sqlmodel import select
        
        # Get the edition
        edition = session.get(Edition, edition_id)
        if not edition or edition.book_id != book_id:
            raise HTTPException(status_code=404, detail=f"Edition with ID {edition_id} not found for book {book_id}")
        
        # Update fields if provided
        updated_fields = []
        
        if "isbn_13" in edition_data:
            edition.isbn_13 = edition_data["isbn_13"]
            updated_fields.append("isbn_13")
        
        if "isbn_10" in edition_data:
            edition.isbn_10 = edition_data["isbn_10"]
            updated_fields.append("isbn_10")
        
        if "book_format" in edition_data:
            edition.book_format = edition_data["book_format"]
            updated_fields.append("book_format")
        
        if "publisher" in edition_data:
            edition.publisher = edition_data["publisher"]
            updated_fields.append("publisher")
        
        if "release_date" in edition_data:
            if edition_data["release_date"]:
                try:
                    from datetime import datetime
                    edition.release_date = datetime.fromisoformat(edition_data["release_date"]).date()
                    updated_fields.append("release_date")
                except:
                    pass
            else:
                edition.release_date = None
                updated_fields.append("release_date")
        
        if "cover_url" in edition_data:
            edition.cover_url = edition_data["cover_url"]
            updated_fields.append("cover_url")
        
        if "price" in edition_data:
            edition.price = edition_data["price"]
            updated_fields.append("price")
        
        session.add(edition)
        session.commit()
        
        return {
            "success": True,
            "message": f"Updated edition {edition_id}",
            "updated_fields": updated_fields,
            "edition": {
                "id": edition.id,
                "isbn_13": edition.isbn_13,
                "isbn_10": edition.isbn_10,
                "book_format": edition.book_format,
                "publisher": edition.publisher,
                "cover_url": edition.cover_url
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating edition metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update edition: {str(e)}")


@router.post("/{book_id}/apply-metadata")
async def apply_metadata_to_book(
    book_id: int,
    metadata: dict,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Apply selected metadata from search results to a book and its edition."""
    
    try:
        from sqlmodel import select
        import json
        
        # Get the book and its first edition
        book = session.get(Book, book_id)
        if not book:
            raise HTTPException(status_code=404, detail=f"Book with ID {book_id} not found")
        
        # Get the first edition (or create one if none exists)
        edition = None
        if book.editions:
            edition = book.editions[0]
        else:
            edition = Edition(
                book_id=book.id,
                book_format="unknown",
                source="manual_update"
            )
            session.add(edition)
            session.flush()
        
        # Apply book metadata
        book_updated_fields = []
        
        if metadata.get("title"):
            book.title = metadata["title"]
            book_updated_fields.append("title")
        
        if metadata.get("authors"):
            if isinstance(metadata["authors"], list):
                book.authors = json.dumps(metadata["authors"])
            else:
                book.authors = json.dumps([metadata["authors"]])
            book_updated_fields.append("authors")
        
        if metadata.get("series_name"):
            book.series_name = metadata["series_name"]
            book_updated_fields.append("series_name")
        
        if metadata.get("series_position"):
            book.series_position = metadata["series_position"]
            book_updated_fields.append("series_position")
        
        if metadata.get("description"):
            book.description = metadata["description"]
            book_updated_fields.append("description")
        
        # Apply edition metadata
        edition_updated_fields = []
        
        if metadata.get("isbn_13"):
            edition.isbn_13 = metadata["isbn_13"]
            edition_updated_fields.append("isbn_13")
        
        if metadata.get("isbn_10"):
            edition.isbn_10 = metadata["isbn_10"]
            edition_updated_fields.append("isbn_10")
        
        if metadata.get("publisher"):
            edition.publisher = metadata["publisher"]
            edition_updated_fields.append("publisher")
        
        if metadata.get("release_date"):
            try:
                from datetime import datetime
                if isinstance(metadata["release_date"], str):
                    edition.release_date = datetime.fromisoformat(metadata["release_date"]).date()
                    edition_updated_fields.append("release_date")
            except:
                pass
        
        if metadata.get("cover_url"):
            edition.cover_url = metadata["cover_url"]
            edition_updated_fields.append("cover_url")
        
        if metadata.get("price"):
            edition.price = metadata["price"]
            edition_updated_fields.append("price")
        
        if metadata.get("format"):
            edition.book_format = metadata["format"]
            edition_updated_fields.append("book_format")
        
        session.add(book)
        session.add(edition)
        session.commit()
        
        return {
            "success": True,
            "message": f"Applied metadata to book '{book.title}'",
            "book_updated_fields": book_updated_fields,
            "edition_updated_fields": edition_updated_fields,
            "source": metadata.get("source", "Unknown"),
            "book": {
                "id": book.id,
                "title": book.title,
                "authors": json.loads(book.authors) if book.authors else [],
                "series_name": book.series_name,
                "series_position": book.series_position
            },
            "edition": {
                "id": edition.id,
                "isbn_13": edition.isbn_13,
                "cover_url": edition.cover_url
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error applying metadata to book: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to apply metadata: {str(e)}")


@router.get("/{isbn}/metadata-sources")
async def get_metadata_sources(isbn: str) -> Dict[str, Any]:
    """
    Get available metadata sources for a book by ISBN.
    Shows what information is available from different sources.
    """
    try:
        # For now, return a simplified response
        # TODO: Implement proper metadata source checking
        return {
            "isbn": isbn,
            "title": "Unknown",
            "sources": {
                "google_books": {
                    "available": True,
                    "id": None,
                    "has_cover": False,
                    "has_description": False,
                    "last_updated": None
                },
                "openlibrary": {
                    "available": True,
                    "id": None,
                    "has_cover": False,
                    "last_updated": None
                },
                "cache": {
                    "available": False,
                    "last_updated": None
                }
            },
            "metadata_completeness": 0.0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/enrich/{isbn}")
async def enrich_book_metadata(isbn: str) -> Dict[str, Any]:
    """
    Legacy endpoint for metadata enrichment. Redirects to search endpoint.
    """
    search_service = BookSearchService()
    try:
        result = await search_service.search(isbn, 1)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _calculate_completeness(book_data: Dict[str, Any]) -> float:
    """Calculate how complete the metadata is as a percentage."""
    fields = [
        "title", "authors", "series", "series_position",
        "description", "editions", "google_books_id", "openlibrary_id"
    ]
    
    complete_fields = 0
    for field in fields:
        if book_data.get(field):
            complete_fields += 1
    
    # Check edition completeness
    if book_data.get("editions"):
        edition = book_data["editions"][0] if book_data["editions"] else {}
        edition_fields = ["isbn_13", "format", "release_date", "cover_url", "publisher"]
        edition_complete = sum(1 for f in edition_fields if edition.get(f))
        complete_fields += edition_complete / len(edition_fields)
    
    return round((complete_fields / (len(fields) + 1)) * 100, 1)


# Note: /{book_id} route moved to end of file to prevent conflicts with /search route


@router.get("/isbn/{isbn}")
async def get_book_by_isbn(isbn: str, user_id: int = Query(1, description="User ID")) -> Dict[str, Any]:
    """
    Get a specific book by ISBN with all its details and user status.
    """
    try:
        with get_db_session() as session:
            from sqlmodel import select, or_
            
            # Find edition by ISBN
            stmt = select(Edition).where(
                or_(Edition.isbn_10 == isbn, Edition.isbn_13 == isbn)
            )
            edition = session.exec(stmt).first()
            
            if not edition:
                raise HTTPException(status_code=404, detail=f"Book with ISBN {isbn} not found")
            
            book = edition.book
            
            # Get all editions for this book
            editions = []
            for ed in book.editions:
                # Get user status for this edition
                user_status = session.exec(
                    select(UserEditionStatus).where(
                        UserEditionStatus.user_id == user_id,
                        UserEditionStatus.edition_id == ed.id
                    )
                ).first()
                
                editions.append({
                    "id": ed.id,
                    "isbn_13": ed.isbn_13,
                    "isbn_10": ed.isbn_10,
                    "format": ed.book_format,
                    "publisher": ed.publisher,
                    "release_date": ed.release_date.isoformat() if ed.release_date else None,
                    "cover_url": ed.cover_url,
                    "price": ed.price,
                    "status": user_status.status if user_status else "missing",
                    "notes": user_status.notes if user_status else None
                })
            
            return {
                "id": book.id,
                "title": book.title,
                "authors": json.loads(book.authors) if book.authors else [],
                "series": book.series_name,
                "series_position": book.series_position,
                "google_books_id": book.google_books_id,
                "openlibrary_id": book.openlibrary_id,
                "editions": editions
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def get_books(user_id: int = Query(1, description="User ID")) -> Dict[str, Any]:
    """
    Get all books in the user's collection with series metadata.
    """
    ownership_service = OwnershipService()
    try:
        owned_books = ownership_service.get_owned_books(user_id)
        
        # Group books by series as expected by frontend
        series_grouped = {}
        series_metadata = {}
        
        with get_db_session() as session:
            from sqlmodel import select
            from models import Series
            
            for book in owned_books:
                series_name = book.get("series_name") or book.get("series", "Standalone Books")
                if series_name not in series_grouped:
                    series_grouped[series_name] = []
                    
                    # Fetch series metadata if it's not standalone
                    if series_name != "Standalone Books":
                        series = session.exec(select(Series).where(Series.name == series_name)).first()
                        if series:
                            series_metadata[series_name] = {
                                "total_books": series.total_books,
                                "description": series.description,
                                "status": series.status
                            }
                
                series_grouped[series_name].append(book)
        
        return {
            "series": series_grouped,
            "series_metadata": series_metadata,
            "total_books": len(owned_books),
            "total_series": len(series_grouped),
            "last_sync": "2025-07-19T14:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test")
async def get_test_books() -> Dict[str, Any]:
    """
    Get test books data for development.
    """
    # Return empty data in the expected format
    return {
        "series": {},
        "total_books": 0,
        "total_series": 0,
        "last_sync": "2025-07-19T14:00:00Z"
    }


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


@router.post("/import")
async def import_books(
    file: UploadFile = File(...),
    format: str = Form(...),
    field_mapping: Optional[str] = Form(None),
    skip_duplicates: Optional[str] = Form("true"),
    enrich_metadata: Optional[str] = Form("true"),
    user_id: int = Query(1, description="User ID")
) -> Dict[str, Any]:
    """
    Import books from a file (CSV, etc.).
    Main import endpoint used by ImportPage component.
    """
    
    # Parse form data
    skip_dups = skip_duplicates == "true"
    enrich_meta = enrich_metadata == "true"
    mapping = {}
    
    if field_mapping:
        try:
            mapping = json.loads(field_mapping)
        except json.JSONDecodeError:
            pass
    
    # For now, handle all formats as CSV since that's what we have implemented
    import_service = CSVImportService()
    
    # Validate file
    if file.filename and not file.filename.endswith(('.csv', '.txt', '.tsv')):
        raise HTTPException(status_code=400, detail="File must be a CSV, TSV, or text file")
    
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.csv') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process the file based on format type
            if format.lower() in ["handylib", "csv", "goodreads"]:
                result = await import_service.import_handylib_csv(temp_file_path, user_id)
                
                # Transform result to match expected format
                return {
                    "success": True,
                    "imported": result.get("imported", 0),
                    "failed": len(result.get("errors", [])),
                    "skipped": 0,
                    "errors": [str(err) for err in result.get("errors", [])],
                    "processing_time": 0,
                    "books_added": [book.get("title", "Unknown") for book in result.get("books", [])]
                }
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
        
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            await import_service.close()
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import: {str(e)}")


@router.post("/import/csv")
async def import_csv(
    file: UploadFile = File(...),
    user_id: int = Query(1, description="User ID"),
    format_type: str = Query("handylib", description="CSV format type (handylib, goodreads, etc.)")
) -> Dict[str, Any]:
    """
    Import books from a CSV file.
    Supports HandyLib, Goodreads, and other export formats.
    """
    import_service = CSVImportService()
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")
    
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.csv') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process the CSV based on format type
            if format_type.lower() == "handylib":
                result = await import_service.import_handylib_csv(temp_file_path, user_id)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported format type: {format_type}")
            
            return {
                "success": True,
                "filename": file.filename,
                "format": format_type,
                **result
            }
        
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            await import_service.close()
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import CSV: {str(e)}")


@router.post("/import/csv/preview")
async def preview_csv_import(
    file: UploadFile = File(...),
    format_type: str = Query("handylib", description="CSV format type"),
    limit: int = Query(5, description="Number of rows to preview")
) -> Dict[str, Any]:
    """
    Preview CSV import without actually importing the data.
    Shows how the first few rows would be parsed.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")
    
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.csv') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Preview the CSV parsing
            import csv
            preview_data = []
            
            with open(temp_file_path, 'r', encoding='utf-8') as csv_file:
                csv_reader = csv.DictReader(csv_file)
                headers = csv_reader.fieldnames
                
                for i, row in enumerate(csv_reader):
                    if i >= limit:
                        break
                    
                    if format_type.lower() == "handylib":
                        import_service = CSVImportService()
                        try:
                            parsed_row = await import_service._parse_handylib_row(row)
                            preview_data.append({
                                "row_number": i + 2,  # +2 because headers are row 1 and we start from row 2
                                "original": {k: v for k, v in row.items() if k in ["Title", "Author", "Series", "ISBN", "Format"]},
                                "parsed": parsed_row
                            })
                        finally:
                            await import_service.close()
                    else:
                        preview_data.append({
                            "row_number": i + 2,
                            "original": row,
                            "parsed": "Unsupported format for preview"
                        })
            
            return {
                "filename": file.filename,
                "format": format_type,
                "headers": headers,
                "preview": preview_data,
                "total_rows_in_file": "unknown"  # Would need to count all rows to determine this
            }
        
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to preview CSV: {str(e)}")


# Library endpoints expected by frontend scanner
@library_router.post("/add")
async def add_book_to_library(
    request: dict,
    user_id: int = Query(1, description="User ID")  
) -> Dict[str, Any]:
    """
    Add a book to user's library (used by scanner/frontend).
    Expected by frontend optimistic updates system.
    """
    try:
        isbn = request.get("isbn")
        source = request.get("source", "scanner")
        
        if not isbn:
            raise HTTPException(status_code=400, detail="ISBN is required")
        
        # Use existing search service to find/create book
        search_service = BookSearchService()
        try:
            # Search for the book first
            result = await search_service.search(isbn, user_id)
            
            if "error" in result:
                # Book not found in APIs, return error for now
                # TODO: Allow manual creation from scanner
                return {
                    "success": False,
                    "message": f"Book with ISBN {isbn} not found in metadata sources",
                    "isbn": isbn,
                    "needs_manual_entry": True
                }
            
            # Check if we already own this book
            with get_db_session() as session:
                from sqlmodel import select, or_
                
                # Look for existing edition
                stmt = select(Edition).where(
                    or_(Edition.isbn_10 == isbn, Edition.isbn_13 == isbn)
                )
                existing_edition = session.exec(stmt).first()
                
                already_owned = False
                if existing_edition:
                    # Check user status
                    user_status = session.exec(
                        select(UserEditionStatus).where(
                            UserEditionStatus.user_id == user_id,
                            UserEditionStatus.edition_id == existing_edition.id
                        )
                    ).first()
                    
                    if user_status and user_status.status == "own":
                        already_owned = True
                    else:
                        # Mark as owned
                        if not user_status:
                            user_status = UserEditionStatus(
                                user_id=user_id,
                                edition_id=existing_edition.id,
                                status="own",
                                notes=f"Added via {source}"
                            )
                            session.add(user_status)
                        else:
                            user_status.status = "own"
                            user_status.notes = f"Updated via {source}"
                        session.commit()
                
                # Trigger series creation and volume sync if the book has series info
                book_data = result
                if book_data.get("series"):
                    series_name = book_data["series"]
                    try:
                        # Import and use series services
                        try:
                            from backend.services.volume_sync_service import VolumeSyncService
                            from backend.services.series_metadata import SeriesMetadataService
                        except ImportError:
                            from services.volume_sync_service import VolumeSyncService
                            from services.series_metadata import SeriesMetadataService
                        
                        # First, try to fetch series metadata from external sources
                        series_service = SeriesMetadataService()
                        try:
                            await series_service.fetch_and_update_series(
                                series_name, 
                                book_data.get("authors", [None])[0] if book_data.get("authors") else None
                            )
                        finally:
                            await series_service.close()
                        
                        # Then sync series volumes to create series entry and volume if needed
                        sync_service = VolumeSyncService()
                        await sync_service.sync_series_volumes_with_books(series_name)
                        
                    except Exception as e:
                        print(f"Warning: Failed to sync series volumes for {series_name}: {e}")
                        # Don't fail the book addition if series sync fails
                
                return {
                    "success": True,
                    "message": "Book already owned" if already_owned else "Book added to library",
                    "already_exists": already_owned,
                    "isbn": isbn,
                    "book": result
                }
                
        finally:
            await search_service.close()
            
    except Exception as e:
        print(f"Error adding book to library: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add book: {str(e)}")


@library_router.delete("/{isbn}")
async def remove_book_from_library(
    isbn: str,
    user_id: int = Query(1, description="User ID")
) -> Dict[str, Any]:
    """
    Remove a book from user's library.
    Expected by frontend optimistic updates system.
    """
    try:
        with get_db_session() as session:
            from sqlmodel import select, or_
            
            # Find edition by ISBN
            stmt = select(Edition).where(
                or_(Edition.isbn_10 == isbn, Edition.isbn_13 == isbn)
            )
            edition = session.exec(stmt).first()
            
            if not edition:
                raise HTTPException(status_code=404, detail=f"Book with ISBN {isbn} not found")
            
            # Find user status
            stmt = select(UserEditionStatus).where(
                UserEditionStatus.user_id == user_id,
                UserEditionStatus.edition_id == edition.id
            )
            user_status = session.exec(stmt).first()
            
            if not user_status or user_status.status != "own":
                raise HTTPException(status_code=404, detail=f"Book with ISBN {isbn} not owned by user")
            
            # Change status to missing instead of deleting
            user_status.status = "missing"
            user_status.notes = "Removed from library"
            session.add(user_status)
            session.commit()
            
            return {
                "success": True,
                "message": "Book removed from library",
                "isbn": isbn
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing book from library: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove book: {str(e)}")


@library_router.get("/{isbn}")
async def get_library_book(
    isbn: str,
    user_id: int = Query(1, description="User ID")
) -> Dict[str, Any]:
    """
    Get book information from user's library by ISBN.
    Expected by frontend to check ownership status.
    """
    try:
        with get_db_session() as session:
            from sqlmodel import select, or_
            
            # Find edition by ISBN
            stmt = select(Edition).where(
                or_(Edition.isbn_10 == isbn, Edition.isbn_13 == isbn)
            )
            edition = session.exec(stmt).first()
            
            if not edition:
                raise HTTPException(status_code=404, detail=f"Book with ISBN {isbn} not found")
            
            book = edition.book
            
            # Get user status
            stmt = select(UserEditionStatus).where(
                UserEditionStatus.user_id == user_id,
                UserEditionStatus.edition_id == edition.id
            )
            user_status = session.exec(stmt).first()
            
            return {
                "id": book.id,
                "title": book.title,
                "authors": json.loads(book.authors) if book.authors else [],
                "series": book.series_name,
                "series_position": book.series_position,
                "isbn": isbn,
                "status": user_status.status if user_status else "missing",
                "owned": user_status.status == "own" if user_status else False,
                "edition": {
                    "id": edition.id,
                    "isbn_13": edition.isbn_13,
                    "isbn_10": edition.isbn_10,
                    "format": edition.book_format,
                    "cover_url": edition.cover_url
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting library book: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get book: {str(e)}")


# This route is placed at the end to prevent conflicts with specific routes like /search
@router.get("/{book_id}")
async def get_book_by_id(book_id: int, user_id: int = Query(1, description="User ID")) -> Dict[str, Any]:
    """
    Get a specific book by ID with all its details and user status.
    """
    ownership_service = OwnershipService()
    try:
        with get_db_session() as session:
            from sqlmodel import select
            
            # Get the book
            book = session.get(Book, book_id)
            if not book:
                raise HTTPException(status_code=404, detail=f"Book with id {book_id} not found")
            
            # Get all editions for this book
            editions = []
            for edition in book.editions:
                # Get user status for this edition
                user_status = session.exec(
                    select(UserEditionStatus).where(
                        UserEditionStatus.user_id == user_id,
                        UserEditionStatus.edition_id == edition.id
                    )
                ).first()
                
                editions.append({
                    "id": edition.id,
                    "isbn_13": edition.isbn_13,
                    "isbn_10": edition.isbn_10,
                    "format": edition.book_format,
                    "publisher": edition.publisher,
                    "release_date": edition.release_date.isoformat() if edition.release_date else None,
                    "cover_url": edition.cover_url,
                    "price": edition.price,
                    "status": user_status.status if user_status else "missing",
                    "notes": user_status.notes if user_status else None
                })
            
            return {
                "id": book.id,
                "title": book.title,
                "authors": json.loads(book.authors) if book.authors else [],
                "series": book.series_name,
                "series_position": book.series_position,
                "google_books_id": book.google_books_id,
                "openlibrary_id": book.openlibrary_id,
                "editions": editions
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))