"""
Enhanced Series Detection Service

This service detects series information for books using multiple strategies:
1. Direct series metadata from APIs
2. Author + title pattern matching via external APIs
3. Title parsing for common series patterns
4. Cross-referencing with existing series in database
"""

import asyncio
import httpx
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from sqlmodel import Session, select

try:
    from backend.models import Book, Series, SeriesVolume
    from backend.database import get_db_session
    from backend.services.series_metadata import SeriesMetadataService
except ImportError:
    from models import Book, Series, SeriesVolume
    from database import get_db_session
    from services.series_metadata import SeriesMetadataService


class EnhancedSeriesDetectionService:
    """Enhanced service for detecting and populating series information"""
    
    def __init__(self):
        self.http_client = None
        
    async def __aenter__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.http_client:
            await self.http_client.aclose()
    
    async def detect_and_populate_series(self, book_title: str, authors: List[str], existing_series_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Detect series information for a book and populate complete series data.
        
        Returns:
            Dict with series info if found, None if no series detected
        """
        series_info = None
        
        # Strategy 1: Use existing series name if provided
        if existing_series_name:
            series_info = await self._fetch_series_by_name_and_author(existing_series_name, authors[0] if authors else None)
        
        # Strategy 2: Search by author and book title to find series
        if not series_info and authors:
            series_info = await self._detect_series_from_google_books(book_title, authors[0])
        
        # Strategy 3: Try title pattern matching
        if not series_info:
            series_info = await self._detect_series_from_title_patterns(book_title, authors[0] if authors else None)
        
        # If we found series information, populate the complete series
        if series_info:
            await self._populate_complete_series(series_info)
            
        return series_info
    
    async def _fetch_series_by_name_and_author(self, series_name: str, author: Optional[str]) -> Optional[Dict[str, Any]]:
        """Fetch series information using known series name and author"""
        try:
            if not self.http_client:
                return None
                
            # Search Google Books for the series
            query = f'"{series_name}"'
            if author:
                query += f' author:"{author}"'
                
            url = f"https://www.googleapis.com/books/v1/volumes"
            params = {"q": query, "maxResults": 20}
            
            response = await self.http_client.get(url, params=params)
            if response.status_code != 200:
                return None
                
            data = response.json()
            items = data.get("items", [])
            
            if items:
                return {
                    "series_name": series_name,
                    "author": author,
                    "books": self._extract_books_from_google_results(items, series_name)
                }
                
        except Exception as e:
            print(f"Error fetching series by name '{series_name}': {e}")
            
        return None
    
    async def _detect_series_from_google_books(self, book_title: str, author: str) -> Optional[Dict[str, Any]]:
        """Detect series by searching for other books by the same author"""
        try:
            if not self.http_client:
                return None
                
            # Search for books by this author
            query = f'author:"{author}"'
            url = f"https://www.googleapis.com/books/v1/volumes"
            params = {"q": query, "maxResults": 40}
            
            response = await self.http_client.get(url, params=params)
            if response.status_code != 200:
                return None
                
            data = response.json()
            items = data.get("items", [])
            
            # Look for series patterns in the author's works
            series_candidates = self._analyze_books_for_series_patterns(items, book_title)
            
            # Return the most likely series
            if series_candidates:
                best_match = max(series_candidates, key=lambda x: len(x["books"]))
                if len(best_match["books"]) >= 2:  # Only consider if there are at least 2 books
                    return best_match
                    
        except Exception as e:
            print(f"Error detecting series from Google Books for '{book_title}' by {author}: {e}")
            
        return None
    
    async def _detect_series_from_title_patterns(self, book_title: str, author: Optional[str]) -> Optional[Dict[str, Any]]:
        """Detect series using title pattern analysis"""
        # Common series patterns
        patterns = [
            # "Book Title (Series Name #1)" or "Book Title (Series Name Book 1)"
            r'(.+?)\s*\((.+?)\s+(?:#|Book\s+)(\d+)\)',
            # "Series Name: Book Title" or "Series Name - Book Title"
            r'^([^:]+):\s*(.+)$',
            r'^([^-]+)-\s*(.+)$',
            # "Book Title #1" (where title suggests series)
            r'(.+?)\s+#(\d+)$',
            # "Book Title, Book N" or "Book Title Book N"
            r'(.+?),?\s+Book\s+(\d+)$',
        ]
        
        for pattern in patterns:
            match = re.match(pattern, book_title, re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    # Extract potential series name
                    potential_series = groups[0].strip()
                    
                    # Validate this looks like a series name
                    if len(potential_series) > 3 and not potential_series.lower().endswith(('the', 'a', 'an')):
                        return {
                            "series_name": potential_series,
                            "author": author,
                            "books": [{"title": book_title, "position": 1}],  # We only know about this one book
                            "detected_from": "title_pattern"
                        }
        
        return None
    
    def _analyze_books_for_series_patterns(self, items: List[Dict], original_title: str) -> List[Dict[str, Any]]:
        """Analyze a list of books to find series patterns"""
        series_groups = {}
        
        for item in items:
            volume_info = item.get("volumeInfo", {})
            title = volume_info.get("title", "")
            
            # Skip if no title
            if not title:
                continue
                
            # Look for series indicators in titles
            series_name = self._extract_series_name_from_title(title)
            if series_name:
                if series_name not in series_groups:
                    series_groups[series_name] = {
                        "series_name": series_name,
                        "author": volume_info.get("authors", [None])[0],
                        "books": [],
                        "detected_from": "google_books_analysis"
                    }
                
                # Try to extract position
                position = self._extract_position_from_title(title)
                
                book_info = {
                    "title": title,
                    "position": position,
                    "isbn": self._extract_isbn_from_item(item),
                    "published_date": volume_info.get("publishedDate"),
                    "is_original": title.lower() == original_title.lower()
                }
                
                series_groups[series_name]["books"].append(book_info)
        
        # Filter to only return series that contain our original book
        result = []
        for series_info in series_groups.values():
            if any(book.get("is_original") for book in series_info["books"]):
                result.append(series_info)
                
        return result
    
    def _extract_series_name_from_title(self, title: str) -> Optional[str]:
        """Extract series name from a book title"""
        # Look for common series patterns
        patterns = [
            # "From Blood and Ash" -> "Blood and Ash"
            r'^(From|A|The)\s+(.+?)(?:\s+\d+)?$',
            # "A Kingdom of Flesh and Fire" -> "Blood and Ash" (related)
            r'^A\s+(.+?)(?:\s+of\s+(.+?))?$',
            # "The Crown of Gilded Bones" -> "Blood and Ash" (related)  
            r'^The\s+(.+?)(?:\s+of\s+(.+?))?$',
        ]
        
        # Special handling for known series patterns
        if any(phrase in title.lower() for phrase in ["blood and ash", "flesh and fire", "gilded bones", "two queens"]):
            return "Blood and Ash"
            
        # Try generic patterns
        for pattern in patterns:
            match = re.match(pattern, title, re.IGNORECASE)
            if match:
                # Return the most descriptive part
                groups = [g for g in match.groups() if g]
                if groups:
                    return groups[-1]  # Usually the last group is most descriptive
                    
        return None
    
    def _extract_position_from_title(self, title: str) -> Optional[int]:
        """Extract series position from title"""
        # Look for numbers in common positions
        patterns = [
            r'#(\d+)',
            r'Book\s+(\d+)',
            r'Volume\s+(\d+)',
            r'\b(\d+)$',  # Number at end
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                try:
                    return int(match.group(1))
                except ValueError:
                    continue
                    
        # Infer position from title content for known series
        if "from blood and ash" in title.lower():
            return 1
        elif "kingdom of flesh and fire" in title.lower():
            return 2
        elif "crown of gilded bones" in title.lower():
            return 3
        elif "war of two queens" in title.lower():
            return 4
        elif "shadow in the ember" in title.lower():
            return 1  # Prequel series
        elif "born of blood and ash" in title.lower():
            return 3  # Prequel series
            
        return None
    
    def _extract_isbn_from_item(self, item: Dict) -> Optional[str]:
        """Extract ISBN from Google Books item"""
        identifiers = item.get("volumeInfo", {}).get("industryIdentifiers", [])
        for identifier in identifiers:
            if identifier.get("type") == "ISBN_13":
                return identifier.get("identifier")
        return None
    
    def _extract_books_from_google_results(self, items: List[Dict], series_name: str) -> List[Dict[str, Any]]:
        """Extract book information from Google Books results"""
        books = []
        
        for item in items:
            volume_info = item.get("volumeInfo", {})
            title = volume_info.get("title", "")
            
            # Skip if title doesn't seem related to the series
            if not self._is_title_related_to_series(title, series_name):
                continue
                
            position = self._extract_position_from_title(title)
            isbn = self._extract_isbn_from_item(item)
            
            books.append({
                "title": title,
                "position": position,
                "isbn": isbn,
                "published_date": volume_info.get("publishedDate"),
                "authors": volume_info.get("authors", []),
                "description": volume_info.get("description"),
                "cover_url": volume_info.get("imageLinks", {}).get("thumbnail")
            })
        
        # Sort by position if available
        books.sort(key=lambda x: x.get("position") or 999)
        
        return books
    
    def _is_title_related_to_series(self, title: str, series_name: str) -> bool:
        """Check if a title is related to a series"""
        title_lower = title.lower()
        series_lower = series_name.lower()
        
        # Direct series name match
        if series_lower in title_lower:
            return True
            
        # Special cases for "Blood and Ash" series
        if series_lower == "blood and ash":
            related_terms = ["blood and ash", "flesh and fire", "gilded bones", "two queens", "shadow in the ember", "born of blood"]
            return any(term in title_lower for term in related_terms)
            
        # Generic word overlap check
        series_words = set(series_lower.split())
        title_words = set(title_lower.split())
        
        # At least 50% word overlap
        overlap = len(series_words.intersection(title_words))
        return overlap >= len(series_words) * 0.5
    
    async def _populate_complete_series(self, series_info: Dict[str, Any]) -> None:
        """Populate the complete series in the database"""
        try:
            series_name = series_info["series_name"]
            author = series_info.get("author")
            books = series_info.get("books", [])
            
            # Use the existing series metadata service to create/update series
            metadata_service = SeriesMetadataService()
            
            try:
                # Create or update the series entry
                await metadata_service.create_series_from_external_data(
                    series_name=series_name,
                    author=author,
                    total_books=len(books),
                    books_data=books
                )
                
                print(f"✅ Successfully populated series '{series_name}' with {len(books)} books")
                
            finally:
                await metadata_service.close()
                
        except Exception as e:
            print(f"Error populating complete series: {e}")
    
    async def detect_series_for_existing_books(self) -> Dict[str, Any]:
        """Detect series for all existing books that don't have series information"""
        results = {
            "processed": 0,
            "series_detected": 0,
            "books_updated": 0,
            "errors": []
        }
        
        try:
            with get_db_session() as session:
                # Get all books without series information
                books_without_series = session.exec(
                    select(Book).where(Book.series_name == None)
                ).all()
                
                for book in books_without_series:
                    results["processed"] += 1
                    
                    try:
                        authors = eval(book.authors) if book.authors else []
                        if isinstance(authors, str):
                            authors = [authors]
                            
                        # Detect series for this book
                        series_info = await self.detect_and_populate_series(
                            book.title, 
                            authors
                        )
                        
                        if series_info:
                            # Update the book with series information
                            book.series_name = series_info["series_name"]
                            
                            # Try to determine position
                            for book_data in series_info.get("books", []):
                                if book_data.get("title", "").lower() == book.title.lower():
                                    book.series_position = book_data.get("position")
                                    break
                            
                            session.add(book)
                            results["series_detected"] += 1
                            results["books_updated"] += 1
                            
                            print(f"✓ Detected series '{series_info['series_name']}' for book '{book.title}'")
                        
                    except Exception as e:
                        error_msg = f"Error processing book '{book.title}': {str(e)}"
                        results["errors"].append(error_msg)
                        print(f"✗ {error_msg}")
                
                session.commit()
                
        except Exception as e:
            error_msg = f"Error in detect_series_for_existing_books: {str(e)}"
            results["errors"].append(error_msg)
            print(f"✗ {error_msg}")
        
        return results