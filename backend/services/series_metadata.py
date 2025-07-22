"""
Series Metadata Service for fetching comprehensive series information from external APIs
"""
import json
import re
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from sqlmodel import Session, select
import httpx

try:
    from backend.models import Series, SeriesVolume, Book
    from backend.database import get_session
    from backend.clients import GoogleBooksClient
except ImportError:
    from models import Series, SeriesVolume, Book
    from database import get_session
    from clients import GoogleBooksClient


class SeriesMetadataService:
    def __init__(self):
        self.google_client = GoogleBooksClient()
    
    async def fetch_and_update_series(self, series_name: str, author: str = None) -> Dict[str, Any]:
        """
        Fetch comprehensive series information from external APIs and update the database
        """
        try:
            # Try to fetch from multiple sources
            series_data = await self._fetch_from_google_books(series_name, author)
            
            if not series_data:
                series_data = await self._fetch_from_goodreads(series_name, author)
            
            if not series_data:
                # Create basic series data from owned books
                series_data = await self._create_basic_series_data(series_name, author)
            
            # Update database with fetched information
            return await self._update_series_in_db(series_data)
            
        except Exception as e:
            print(f"Error fetching series metadata for '{series_name}': {e}")
            # Fallback to basic data from owned books
            return await self._create_basic_series_data(series_name, author)
    
    async def _fetch_from_google_books(self, series_name: str, author: str = None) -> Optional[Dict[str, Any]]:
        """
        Fetch series information from Google Books API
        """
        try:
            query = f"subject:{series_name}"
            if author:
                query += f" inauthor:{author}"
            
            # Search for books in the series
            books = await self.google_client.search_by_title(query)
            
            if not books:
                return None
            
            # Extract series information from the books
            series_info = {
                "name": series_name,
                "author": author,
                "description": None,
                "publisher": None,
                "total_books": len(books),
                "status": "unknown",
                "genres": [],
                "tags": [],
                "first_published": None,
                "last_published": None,
                "volumes": []
            }
            
            # Process each book to build volume list and series metadata
            publication_dates = []
            genres_set = set()
            publishers = set()
            
            for book in books:
                # Extract publication date
                if book.get("published_date"):
                    try:
                        pub_date = datetime.fromisoformat(book["published_date"].replace('Z', '')).date()
                        publication_dates.append(pub_date)
                    except:
                        pass
                
                # Extract genres/categories
                if book.get("categories"):
                    genres_set.update(book["categories"])
                
                # Extract publisher
                if book.get("publisher"):
                    publishers.add(book["publisher"])
                
                # Create volume entry
                position = self._extract_series_position(book.get("title", ""), series_name)
                volume = {
                    "position": position if position else 999,
                    "title": book.get("title", ""),
                    "isbn_13": book.get("isbn_13"),
                    "isbn_10": book.get("isbn_10"),
                    "publisher": book.get("publisher"),
                    "published_date": book.get("published_date"),
                    "page_count": book.get("page_count"),
                    "description": book.get("description"),
                    "cover_url": book.get("cover_url"),
                    "status": "missing"  # Default, will be updated based on ownership
                }
                series_info["volumes"].append(volume)
            
            # Set derived metadata
            if publication_dates:
                series_info["first_published"] = min(publication_dates)
                series_info["last_published"] = max(publication_dates)
            
            if genres_set:
                series_info["genres"] = list(genres_set)
            
            if publishers:
                series_info["publisher"] = list(publishers)[0]  # Use first publisher
            
            # Try to get series description from the first book
            if books and books[0].get("description"):
                series_info["description"] = books[0]["description"]
            
            return series_info
            
        except Exception as e:
            print(f"Error fetching from Google Books: {e}")
            return None
    
    async def _fetch_from_goodreads(self, series_name: str, author: str = None) -> Optional[Dict[str, Any]]:
        """
        Fetch series information from Goodreads (if API available)
        Note: Goodreads API is deprecated, but leaving structure for future integrations
        """
        # TODO: Implement if alternative APIs become available
        return None
    
    def _extract_series_position(self, title: str, series_name: str) -> Optional[int]:
        """
        Extract series position from book title
        """
        # Common patterns for series position
        patterns = [
            rf"{re.escape(series_name)}\s+#?(\d+)",  # Series Name #1 or Series Name 1
            rf"{re.escape(series_name)}\s+(?:book|vol|volume)\s+(\d+)",  # Series Name Book 1
            rf"(\d+):\s*{re.escape(series_name)}",  # 1: Series Name
            r"#(\d+)",  # Any #1 pattern
            r"\((\d+)\)",  # (1) pattern
            r":\s*(\d+)",  # : 1 pattern
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return int(match.group(1))
        
        return None
    
    async def _create_basic_series_data(self, series_name: str, author: str = None) -> Dict[str, Any]:
        """
        Create basic series data from owned books in the database
        """
        with get_session() as session:
            # Get all books in this series
            statement = select(Book).where(Book.series_name == series_name)
            books = session.exec(statement).all()
            
            volumes = []
            for book in books:
                volume = {
                    "position": book.series_position or 999,
                    "title": book.title,
                    "isbn_13": None,
                    "isbn_10": None,
                    "publisher": None,
                    "published_date": None,
                    "page_count": None,
                    "description": None,
                    "cover_url": None,
                    "status": "owned"  # These are owned books
                }
                
                # Get edition details if available
                if book.editions:
                    first_edition = book.editions[0]
                    volume.update({
                        "isbn_13": first_edition.isbn_13,
                        "isbn_10": first_edition.isbn_10,
                        "publisher": first_edition.publisher,
                        "published_date": first_edition.release_date.isoformat() if first_edition.release_date else None,
                        "cover_url": first_edition.cover_url
                    })
                
                volumes.append(volume)
            
            return {
                "name": series_name,
                "author": author or (json.loads(books[0].authors)[0] if books and books[0].authors else None),
                "description": None,
                "publisher": None,
                "total_books": len(books),
                "status": "unknown",
                "genres": [],
                "tags": [],
                "first_published": None,
                "last_published": None,
                "volumes": volumes
            }
    
    async def _update_series_in_db(self, series_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update the database with series information
        """
        with get_session() as session:
            # Get or create series record
            statement = select(Series).where(Series.name == series_data["name"])
            series = session.exec(statement).first()
            
            if not series:
                series = Series(
                    name=series_data["name"],
                    author=series_data.get("author"),
                    description=series_data.get("description"),
                    total_books=series_data.get("total_books"),
                    publisher=series_data.get("publisher"),
                    status=series_data.get("status", "unknown"),
                    genres=json.dumps(series_data.get("genres", [])),
                    tags=json.dumps(series_data.get("tags", [])),
                    first_published=series_data.get("first_published"),
                    last_published=series_data.get("last_published"),
                    last_updated=date.today()
                )
                session.add(series)
                session.commit()
                session.refresh(series)
            else:
                # Update existing series
                series.author = series_data.get("author") or series.author
                series.description = series_data.get("description") or series.description
                series.total_books = series_data.get("total_books", series.total_books)
                series.publisher = series_data.get("publisher") or series.publisher
                series.status = series_data.get("status", series.status)
                series.genres = json.dumps(series_data.get("genres", json.loads(series.genres) if series.genres else []))
                series.tags = json.dumps(series_data.get("tags", json.loads(series.tags) if series.tags else []))
                series.first_published = series_data.get("first_published") or series.first_published
                series.last_published = series_data.get("last_published") or series.last_published
                series.last_updated = date.today()
                session.add(series)
                session.commit()
            
            # Update volumes
            for volume_data in series_data.get("volumes", []):
                # Check if volume exists
                statement = select(SeriesVolume).where(
                    SeriesVolume.series_id == series.id,
                    SeriesVolume.position == volume_data["position"]
                )
                volume = session.exec(statement).first()
                
                if not volume:
                    # Create new volume
                    volume = SeriesVolume(
                        series_id=series.id,
                        position=volume_data["position"],
                        title=volume_data["title"],
                        isbn_13=volume_data.get("isbn_13"),
                        isbn_10=volume_data.get("isbn_10"),
                        publisher=volume_data.get("publisher"),
                        published_date=datetime.fromisoformat(volume_data["published_date"]).date() if volume_data.get("published_date") else None,
                        page_count=volume_data.get("page_count"),
                        description=volume_data.get("description"),
                        cover_url=volume_data.get("cover_url"),
                        status=volume_data.get("status", "missing"),
                        user_id=1  # Default user
                    )
                    session.add(volume)
                else:
                    # Update existing volume with new metadata
                    volume.title = volume_data["title"] or volume.title
                    volume.isbn_13 = volume_data.get("isbn_13") or volume.isbn_13
                    volume.isbn_10 = volume_data.get("isbn_10") or volume.isbn_10
                    volume.publisher = volume_data.get("publisher") or volume.publisher
                    volume.published_date = (datetime.fromisoformat(volume_data["published_date"]).date() 
                                           if volume_data.get("published_date") else volume.published_date)
                    volume.page_count = volume_data.get("page_count") or volume.page_count
                    volume.description = volume_data.get("description") or volume.description
                    volume.cover_url = volume_data.get("cover_url") or volume.cover_url
                    session.add(volume)
            
            session.commit()
            
            return {
                "success": True,
                "message": f"Updated series '{series_data['name']}'",
                "series_id": series.id,
                "volumes_updated": len(series_data.get("volumes", []))
            }
    
    async def close(self):
        await self.google_client.close()