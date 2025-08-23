import csv
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from sqlmodel import Session
from pathlib import Path

try:
    from backend.models import Book, Edition, UserEditionStatus
except ImportError:
    from models import Book, Edition, UserEditionStatus
try:
    from backend.database import get_db_session
except ImportError:
    from database import get_db_session
try:
    from backend.services.book_search import BookSearchService
except ImportError:
    from .book_search import BookSearchService


class CSVImportService:
    def __init__(self):
        self.book_search_service = BookSearchService()
        self._series_metadata_fetched = set()  # Track which series we've already fetched metadata for
    
    async def import_handylib_csv(self, csv_file_path: str, user_id: int = 1) -> Dict[str, Any]:
        """
        Import books from HandyLib CSV export format.
        
        HandyLib CSV columns:
        Title, Author, Publisher, Published Date, Format, Pages, Series, Volume, 
        Language, ISBN, Page Read, Item Url, Icon Path, Photo Path, Image Url, 
        Summary, Location, Price, Genres, Rating, Added Date, Copy Index, Read, 
        Started Reading Date, Finished Reading Date, Favorite, Comments, Tags, 
        BookShelf, Settings
        """
        # Clear series metadata tracking for fresh import
        self._series_metadata_fetched.clear()
        
        results = {
            "imported": 0,
            "updated": 0,
            "errors": [],
            "books": []
        }
        
        try:
            with open(csv_file_path, 'r', encoding='utf-8') as file:
                # Use csv.DictReader to handle the CSV with headers
                csv_reader = csv.DictReader(file)
                
                for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 since row 1 is headers
                    try:
                        book_data = await self._parse_handylib_row(row)
                        if book_data:
                            result = await self._import_book(book_data, user_id)
                            if result["success"]:
                                if result["action"] == "created":
                                    results["imported"] += 1
                                else:
                                    results["updated"] += 1
                                results["books"].append(result["book"])
                            else:
                                results["errors"].append({
                                    "row": row_num,
                                    "error": result["error"],
                                    "title": book_data.get("title", "Unknown")
                                })
                        else:
                            results["errors"].append({
                                "row": row_num,
                                "error": "Could not parse book data",
                                "title": row.get("Title", "Unknown")
                            })
                    except Exception as e:
                        results["errors"].append({
                            "row": row_num,
                            "error": str(e),
                            "title": row.get("Title", "Unknown")
                        })
        
        except Exception as e:
            results["errors"].append({
                "file": csv_file_path,
                "error": f"Failed to read CSV file: {str(e)}"
            })
        
        return results
    
    async def _parse_handylib_row(self, row: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """Parse a single row from HandyLib CSV into our book format."""
        title = row.get("Title", "").strip()
        if not title:
            return None
        
        # Parse authors - HandyLib uses semicolon separated authors
        authors_str = row.get("Author", "").strip()
        authors = []
        if authors_str:
            # Split by semicolon and clean up
            authors = [author.strip() for author in authors_str.split(";") if author.strip()]
        
        # Parse series and volume
        series_name = row.get("Series", "").strip() or None
        series_position = None
        volume_str = row.get("Volume", "").strip()
        if volume_str and volume_str.isdigit():
            series_position = int(volume_str)
        
        # Parse date
        published_date = None
        date_str = row.get("Published Date", "").strip()
        if date_str:
            try:
                # Try to parse various date formats
                for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%Y"]:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt)
                        published_date = parsed_date.date().isoformat()
                        break
                    except ValueError:
                        continue
            except:
                pass
        
        # Parse price
        price = None
        price_str = row.get("Price", "").strip()
        if price_str:
            try:
                # Remove currency symbols and parse
                price_clean = price_str.replace("$", "").replace(",", "")
                price = float(price_clean)
            except ValueError:
                pass
        
        # Parse rating
        rating = None
        rating_str = row.get("Rating", "").strip()
        if rating_str:
            try:
                rating = float(rating_str)
            except ValueError:
                pass
        
        # Determine ownership status based on HandyLib fields
        # Default to "own" for imported books since they're in the user's library
        status = "own"  # default for imported books
        read_status = row.get("Read", "").strip().lower()
        # Keep as own regardless of read status since it's in their collection
        
        # Map HandyLib format to our format
        format_mapping = {
            "paperback": "paperback",
            "hardcover": "hardcover", 
            "ebook": "ebook",
            "audiobook": "audiobook",
            "kindle": "ebook",
            "digital": "ebook"
        }
        book_format = format_mapping.get(row.get("Format", "").lower().strip(), row.get("Format", "").strip())
        
        book_data = {
            "title": title,
            "authors": authors,
            "series_name": series_name,
            "series_position": series_position,
            "isbn_13": row.get("ISBN", "").strip() or None,
            "publisher": row.get("Publisher", "").strip() or None,
            "release_date": published_date,
            "cover_url": row.get("Image Url", "").strip() or None,
            "price": price,
            "format": book_format,
            "source": "handylib_import",
            "summary": row.get("Summary", "").strip() or None,
            "rating": rating,
            "status": status,
            "notes": row.get("Comments", "").strip() or None,
            "tags": row.get("Tags", "").strip() or None,
            "pages": row.get("Pages", "").strip() or None,
            "started_reading": row.get("Started Reading Date", "").strip() or None,
            "finished_reading": row.get("Finished Reading Date", "").strip() or None,
            "favorite": row.get("Favorite", "").strip().lower() in ["true", "1", "yes"]
        }
        
        return book_data
    
    async def _import_book(self, book_data: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        """Import a single book into the database using existing services."""
        try:
            with get_db_session() as session:
                # Check if book already exists by ISBN or title+author
                existing_book = None
                existing_edition = None
                
                # First try to find by ISBN
                isbn = book_data.get("isbn_13")
                if isbn:
                    from sqlmodel import select, or_
                    stmt = select(Edition).where(
                        or_(Edition.isbn_10 == isbn, Edition.isbn_13 == isbn)
                    )
                    existing_edition = session.exec(stmt).first()
                    if existing_edition:
                        existing_book = existing_edition.book
                
                # If not found by ISBN, try by title and author
                if not existing_book and book_data.get("title") and book_data.get("authors"):
                    title = book_data["title"]
                    authors_json = json.dumps(book_data["authors"])
                    
                    stmt = select(Book).where(
                        Book.title == title,
                        Book.authors == authors_json
                    )
                    existing_book = session.exec(stmt).first()
                
                # Create or update book
                if existing_book:
                    # Update existing book if needed
                    updated = False
                    
                    if book_data.get("series_name") and not existing_book.series_name:
                        existing_book.series_name = book_data["series_name"]
                        updated = True
                    
                    if book_data.get("series_position") and not existing_book.series_position:
                        existing_book.series_position = book_data["series_position"]
                        updated = True
                    
                    if updated:
                        session.add(existing_book)
                        session.commit()
                        session.refresh(existing_book)
                        
                        # If we updated series info, ensure series record exists
                        if book_data.get("series_name"):
                            await self._ensure_series_exists(book_data["series_name"], book_data.get("authors", []), session)
                    
                    book = existing_book
                    action = "updated" if updated else "exists"
                else:
                    # Create new book
                    book = Book(
                        title=book_data["title"],
                        authors=json.dumps(book_data.get("authors", [])),
                        series_name=book_data.get("series_name"),
                        series_position=book_data.get("series_position")
                    )
                    session.add(book)
                    session.commit()
                    session.refresh(book)
                    action = "created"
                    
                    # Create/update series information if this book is part of a series
                    if book_data.get("series_name"):
                        await self._ensure_series_exists(book_data["series_name"], book_data.get("authors", []), session)
                
                # Handle edition
                if existing_edition:
                    edition = existing_edition
                    # Update edition if needed
                    if book_data.get("publisher") and not edition.publisher:
                        edition.publisher = book_data["publisher"]
                    if book_data.get("cover_url") and not edition.cover_url:
                        edition.cover_url = book_data["cover_url"]
                    if book_data.get("price") and not edition.price:
                        edition.price = book_data["price"]
                    
                    session.add(edition)
                    session.commit()
                else:
                    # Create edition if we have ISBN or other edition-specific data
                    if isbn or book_data.get("format") or book_data.get("publisher"):
                        release_date = None
                        if book_data.get("release_date"):
                            try:
                                release_date = datetime.fromisoformat(book_data["release_date"]).date()
                            except:
                                pass
                        
                        edition = Edition(
                            book_id=book.id,
                            isbn_13=book_data.get("isbn_13"),
                            book_format=book_data.get("format"),
                            publisher=book_data.get("publisher"),
                            release_date=release_date,
                            cover_url=book_data.get("cover_url"),
                            price=book_data.get("price"),
                            source="handylib_import"
                        )
                        session.add(edition)
                        session.commit()
                        session.refresh(edition)
                    else:
                        edition = None
                
                # Handle user status
                if edition:
                    from sqlmodel import select
                    stmt = select(UserEditionStatus).where(
                        UserEditionStatus.user_id == user_id,
                        UserEditionStatus.edition_id == edition.id
                    )
                    existing_status = session.exec(stmt).first()
                    
                    if not existing_status:
                        # Create user status
                        user_status = UserEditionStatus(
                            user_id=user_id,
                            edition_id=edition.id,
                            status=book_data.get("status", "missing"),
                            notes=book_data.get("notes")
                        )
                        session.add(user_status)
                        session.commit()
                
                return {
                    "success": True,
                    "action": action,
                    "book": {
                        "id": book.id,
                        "title": book.title,
                        "authors": json.loads(book.authors) if book.authors else [],
                        "series_name": book.series_name,
                        "series_position": book.series_position
                    }
                }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _ensure_series_exists(self, series_name: str, authors: List[str], session: Session):
        """Ensure series exists in database and trigger metadata fetch if needed"""
        try:
            # Import series models
            try:
                from backend.models import Series, SeriesVolume
            except ImportError:
                from models import Series, SeriesVolume
            
            from sqlmodel import select
            
            # Check if series already exists
            statement = select(Series).where(Series.name == series_name)
            existing_series = session.exec(statement).first()
            
            series_created = False
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
                series_created = True
                print(f"Created new series record: {series_name}")
                
            # Only fetch metadata once per series during import session
            if series_created or series_name not in self._series_metadata_fetched:
                self._series_metadata_fetched.add(series_name)
                
                # Import series metadata service
                try:
                    from backend.services.series_metadata import SeriesMetadataService
                except ImportError:
                    from services.series_metadata import SeriesMetadataService
                    
                # Fetch metadata using local-first approach (checks database first)
                try:
                    metadata_service = SeriesMetadataService()
                    # Use local-first approach: checks database first, then external APIs if needed
                    result = await metadata_service.fetch_and_update_series(series_name, authors[0] if authors else None)
                    await metadata_service.close()
                    print(f"Successfully processed metadata for series: {series_name}")
                except Exception as e:
                    print(f"Warning: Failed to fetch series metadata for '{series_name}': {e}")
                    # Continue without failing the book import
                    
        except Exception as e:
            print(f"Error ensuring series exists: {e}")
            # Don't fail the book import if series creation fails
    
    async def close(self):
        """Clean up resources."""
        await self.book_search_service.close()