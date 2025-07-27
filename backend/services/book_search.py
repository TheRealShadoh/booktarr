import json
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from sqlmodel import Session, select, or_

try:
    from backend.models import Book, Edition, UserEditionStatus
except ImportError:
    from models import Book, Edition, UserEditionStatus
try:
    from backend.clients import GoogleBooksClient, OpenLibraryClient
except ImportError:
    from clients import GoogleBooksClient, OpenLibraryClient
try:
    from backend.database import get_db_session
except ImportError:
    from database import get_db_session
try:
    from backend.services.cache import JsonCache
except ImportError:
    from .cache import JsonCache


class BookSearchService:
    def __init__(self):
        self.google_client = GoogleBooksClient()
        self.openlibrary_client = OpenLibraryClient()
        self.cache = JsonCache()
    
    async def search(self, query: str, user_id: int = 1) -> Dict[str, Any]:
        # Determine search type
        if query.replace("-", "").isdigit() and len(query.replace("-", "")) in [10, 13]:
            # ISBN search
            return await self._search_by_isbn(query, user_id)
        else:
            # Try to determine if it's a series, title, or author
            # First check cache for all types
            cached_series = await self.cache.get_by_series(query)
            if cached_series:
                return self._format_series_response(cached_series, user_id)
            
            cached_title = await self.cache.get_by_title_author(query)
            if cached_title:
                return self._format_search_response(cached_title, user_id)
            
            # Search APIs
            results = await self._search_apis(query)
            if results:
                # Cache results
                await self.cache.set_title_author_cache(query, None, results)
                return self._format_search_response(results, user_id)
            
            return {"error": "No results found", "query": query}
    
    async def _search_by_isbn(self, isbn: str, user_id: int) -> Dict[str, Any]:
        # Check cache first
        cached = await self.cache.get_by_isbn(isbn)
        if cached:
            return self._format_book_response(cached, user_id)
        
        # Check database
        with get_db_session() as session:
            # Look for edition with this ISBN
            stmt = select(Edition).where(
                or_(Edition.isbn_10 == isbn, Edition.isbn_13 == isbn)
            )
            edition = session.exec(stmt).first()
            
            if edition:
                book = edition.book
                return self._format_book_from_db(book, user_id, session)
        
        # Search external APIs
        book_data = None
        
        # Try Google Books first
        google_data = await self.google_client.search_by_isbn(isbn)
        if google_data:
            book_data = google_data
        
        # Try OpenLibrary
        if not book_data:
            ol_data = await self.openlibrary_client.search_by_isbn(isbn)
            if ol_data:
                book_data = ol_data
        
        if book_data:
            # Save to database
            await self._save_book_to_db(book_data)
            
            # Cache the result
            await self.cache.set_isbn_cache(isbn, book_data)
            
            return self._format_book_response(book_data, user_id)
        
        return {"error": f"No book found with ISBN: {isbn}"}
    
    async def _search_apis(self, query: str) -> List[Dict[str, Any]]:
        results = []
        
        # Search Google Books
        try:
            google_results = await self.google_client.search_by_title(query)
            results.extend(google_results)
        except Exception as e:
            print(f"Error searching Google Books: {e}")
        
        # Search OpenLibrary
        try:
            ol_results = await self.openlibrary_client.search_by_title(query)
            results.extend(ol_results)
        except Exception as e:
            print(f"Error searching OpenLibrary: {e}")
        
        # Deduplicate by ISBN
        seen_isbns = set()
        unique_results = []
        for result in results:
            isbn = result.get("isbn_13") or result.get("isbn_10")
            if isbn and isbn not in seen_isbns:
                seen_isbns.add(isbn)
                unique_results.append(result)
            elif not isbn:
                unique_results.append(result)
        
        return unique_results
    
    async def _save_book_to_db(self, book_data: Dict[str, Any]):
        with get_db_session() as session:
            # Check if book already exists
            existing_book = None
            if book_data.get("google_books_id"):
                existing_book = session.exec(
                    select(Book).where(Book.google_books_id == book_data["google_books_id"])
                ).first()
            elif book_data.get("openlibrary_id"):
                existing_book = session.exec(
                    select(Book).where(Book.openlibrary_id == book_data["openlibrary_id"])
                ).first()
            
            if not existing_book:
                # Create new book
                book = Book(
                    title=book_data["title"],
                    authors=json.dumps(book_data.get("authors", [])),
                    series_name=book_data.get("series_name"),
                    series_position=book_data.get("series_position"),
                    google_books_id=book_data.get("google_books_id"),
                    openlibrary_id=book_data.get("openlibrary_id")
                )
                session.add(book)
                session.commit()
                session.refresh(book)
            else:
                book = existing_book
            
            # Add edition if it doesn't exist
            isbn_10 = book_data.get("isbn_10")
            isbn_13 = book_data.get("isbn_13")
            
            existing_edition = session.exec(
                select(Edition).where(
                    Edition.book_id == book.id,
                    or_(Edition.isbn_10 == isbn_10, Edition.isbn_13 == isbn_13)
                )
            ).first()
            
            if not existing_edition and (isbn_10 or isbn_13):
                edition = Edition(
                    book_id=book.id,
                    isbn_10=isbn_10,
                    isbn_13=isbn_13,
                    book_format=book_data.get("format"),
                    publisher=book_data.get("publisher"),
                    release_date=datetime.fromisoformat(book_data["release_date"]).date() if book_data.get("release_date") else None,
                    cover_url=book_data.get("cover_url"),
                    price=book_data.get("price"),
                    source=book_data.get("source")
                )
                session.add(edition)
                session.commit()
            
            # Create/update series information if this book is part of a series
            if book_data.get("series_name"):
                await self._ensure_series_exists(book_data["series_name"], book_data.get("authors", []), session)
    
    async def _ensure_series_exists(self, series_name: str, authors: List[str], session: Session):
        """Ensure series exists in database and trigger enhanced series detection"""
        try:
            # Import enhanced series detection
            try:
                from backend.services.enhanced_series_detection import EnhancedSeriesDetectionService
            except ImportError:
                from services.enhanced_series_detection import EnhancedSeriesDetectionService
            
            # Use enhanced series detection to find and populate complete series info
            async with EnhancedSeriesDetectionService() as detection_service:
                series_info = await detection_service.detect_and_populate_series(
                    book_title="",  # We don't have the full book title here
                    authors=authors,
                    existing_series_name=series_name
                )
                
                if series_info:
                    print(f"✅ Enhanced series detection found series '{series_info['series_name']}' with {len(series_info.get('books', []))} books")
                else:
                    # Fallback to basic series creation
                    await self._create_basic_series_fallback(series_name, authors, session)
                    
        except Exception as e:
            print(f"Warning: Enhanced series detection failed for '{series_name}': {e}")
            # Fallback to basic series creation
            await self._create_basic_series_fallback(series_name, authors, session)
    
    async def _create_basic_series_fallback(self, series_name: str, authors: List[str], session: Session):
        """Fallback method to create basic series record"""
        try:
            # Import series models
            try:
                from backend.models import Series, SeriesVolume
            except ImportError:
                from models import Series, SeriesVolume
            
            # Check if series already exists
            statement = select(Series).where(Series.name == series_name)
            existing_series = session.exec(statement).first()
            
            if not existing_series:
                # Create basic series record
                author = authors[0] if authors else None
                series = Series(
                    name=series_name,
                    author=author,
                    status="unknown",
                    total_books=1,  # Will be updated by metadata service
                    created_date=datetime.now().date(),
                    last_updated=datetime.now().date()
                )
                session.add(series)
                session.commit()
                print(f"Created basic series record for '{series_name}'")
                    
        except Exception as e:
            print(f"Error creating basic series fallback: {e}")
            # Don't fail the book import if series creation fails
    
    def _format_book_response(self, book_data: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        # Get user status for editions
        with get_db_session() as session:
            # Find the book in DB to get edition statuses
            book = None
            if book_data.get("google_books_id"):
                book = session.exec(
                    select(Book).where(Book.google_books_id == book_data["google_books_id"])
                ).first()
            elif book_data.get("openlibrary_id"):
                book = session.exec(
                    select(Book).where(Book.openlibrary_id == book_data["openlibrary_id"])
                ).first()
            
            editions = []
            if book:
                for edition in book.editions:
                    edition_data = {
                        "isbn_10": edition.isbn_10,
                        "isbn_13": edition.isbn_13,
                        "format": edition.book_format,
                        "release_date": edition.release_date.isoformat() if edition.release_date else None,
                        "cover_url": edition.cover_url,
                        "price": edition.price,
                        "publisher": edition.publisher,
                        "status": "missing"  # default
                    }
                    
                    # Check user status
                    user_status = session.exec(
                        select(UserEditionStatus).where(
                            UserEditionStatus.user_id == user_id,
                            UserEditionStatus.edition_id == edition.id
                        )
                    ).first()
                    
                    if user_status:
                        edition_data["status"] = user_status.status
                        edition_data["notes"] = user_status.notes
                    
                    editions.append(edition_data)
            else:
                # Format from API data
                edition_data = {
                    "isbn_10": book_data.get("isbn_10"),
                    "isbn_13": book_data.get("isbn_13"),
                    "format": book_data.get("format"),
                    "release_date": book_data.get("release_date"),
                    "cover_url": book_data.get("cover_url"),
                    "price": book_data.get("price"),
                    "publisher": book_data.get("publisher"),
                    "status": "missing"
                }
                editions.append(edition_data)
        
        return {
            "title": book_data["title"],
            "authors": book_data.get("authors", []),
            "series": book_data.get("series_name"),
            "series_position": book_data.get("series_position"),
            "editions": editions
        }
    
    def _format_book_from_db(self, book: Book, user_id: int, session: Session) -> Dict[str, Any]:
        editions = []
        for edition in book.editions:
            edition_data = {
                "isbn_10": edition.isbn_10,
                "isbn_13": edition.isbn_13,
                "format": edition.book_format,
                "release_date": edition.release_date.isoformat() if edition.release_date else None,
                "cover_url": edition.cover_url,
                "price": edition.price,
                "publisher": edition.publisher,
                "status": "missing"
            }
            
            # Check user status
            user_status = session.exec(
                select(UserEditionStatus).where(
                    UserEditionStatus.user_id == user_id,
                    UserEditionStatus.edition_id == edition.id
                )
            ).first()
            
            if user_status:
                edition_data["status"] = user_status.status
                edition_data["notes"] = user_status.notes
            
            editions.append(edition_data)
        
        return {
            "title": book.title,
            "authors": json.loads(book.authors) if book.authors else [],
            "series": book.series_name,
            "series_position": book.series_position,
            "editions": editions
        }
    
    def _format_search_response(self, results: List[Dict[str, Any]], user_id: int) -> Dict[str, Any]:
        return {
            "results": [self._format_book_response(book, user_id) for book in results],
            "count": len(results)
        }
    
    def _format_series_response(self, books: List[Dict[str, Any]], user_id: int) -> Dict[str, Any]:
        return {
            "series_books": [self._format_book_response(book, user_id) for book in books],
            "count": len(books)
        }
    
    async def close(self):
        await self.google_client.close()
        await self.openlibrary_client.close()