"""
Goodreads API client for fetching book information and managing user shelves
Note: Goodreads official API is limited but we provide integration points
"""
import aiohttp
import xml.etree.ElementTree as ET
from typing import Optional, Dict, Any, List
from urllib.parse import quote
from datetime import datetime


class GoodreadsClient:
    """Client for interacting with Goodreads API for book metadata"""

    def __init__(self):
        self.base_url = "https://www.goodreads.com/api"
        self.session = None
        self.api_key = None  # Should be loaded from environment

    def set_api_key(self, api_key: str):
        """Set the Goodreads API key for authentication"""
        self.api_key = api_key

    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None

    async def search_books(self, query: str, page: int = 1) -> Optional[List[Dict[str, Any]]]:
        """
        Search for books on Goodreads

        Args:
            query: Search query (title, author, ISBN)
            page: Page number for pagination

        Returns:
            List of books matching the query
        """
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            params = {
                "q": query,
                "page": page
            }

            # Note: Goodreads API requires XML parsing
            # Using unofficial approach via search endpoint
            async with self.session.get(
                "https://www.goodreads.com/search/index.xml",
                params=params
            ) as response:
                if response.status == 200:
                    content = await response.text()
                    return self._parse_search_results(content)
                return None

        except Exception as e:
            print(f"Error searching Goodreads: {e}")
            return None

    async def get_book_by_isbn(self, isbn: str) -> Optional[Dict[str, Any]]:
        """
        Get book information from Goodreads by ISBN

        Args:
            isbn: ISBN-13 or ISBN-10

        Returns:
            Book information from Goodreads
        """
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            params = {
                "isbn": isbn,
                "key": self.api_key
            }

            async with self.session.get(
                f"{self.base_url}/books.xml",
                params=params
            ) as response:
                if response.status == 200:
                    content = await response.text()
                    return self._parse_book_xml(content)
                return None

        except Exception as e:
            print(f"Error fetching Goodreads book: {e}")
            return None

    async def get_author_books(self, author_id: int) -> Optional[List[Dict[str, Any]]]:
        """
        Get all books by an author from Goodreads

        Args:
            author_id: Goodreads author ID

        Returns:
            List of books by the author
        """
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            params = {
                "key": self.api_key
            }

            async with self.session.get(
                f"{self.base_url}/authors/{author_id}/books.xml",
                params=params
            ) as response:
                if response.status == 200:
                    content = await response.text()
                    return self._parse_author_books(content)
                return None

        except Exception as e:
            print(f"Error fetching Goodreads author books: {e}")
            return None

    async def get_series(self, series_id: int) -> Optional[Dict[str, Any]]:
        """
        Get series information from Goodreads

        Args:
            series_id: Goodreads series ID

        Returns:
            Series information including all books in series
        """
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            async with self.session.get(
                f"https://www.goodreads.com/series/{series_id}.xml",
                params={"key": self.api_key}
            ) as response:
                if response.status == 200:
                    content = await response.text()
                    return self._parse_series_xml(content)
                return None

        except Exception as e:
            print(f"Error fetching Goodreads series: {e}")
            return None

    def _parse_search_results(self, xml_content: str) -> List[Dict[str, Any]]:
        """Parse Goodreads search results from XML"""
        results = []
        try:
            root = ET.fromstring(xml_content)

            for work in root.findall(".//work"):
                book_info = self._extract_work_data(work)
                if book_info:
                    results.append(book_info)

        except Exception as e:
            print(f"Error parsing Goodreads search results: {e}")

        return results

    def _parse_book_xml(self, xml_content: str) -> Optional[Dict[str, Any]]:
        """Parse Goodreads book XML response"""
        try:
            root = ET.fromstring(xml_content)

            book_element = root.find(".//book")
            if book_element is not None:
                return self._extract_book_data(book_element)

        except Exception as e:
            print(f"Error parsing Goodreads book XML: {e}")

        return None

    def _parse_author_books(self, xml_content: str) -> List[Dict[str, Any]]:
        """Parse author's books from Goodreads XML"""
        books = []
        try:
            root = ET.fromstring(xml_content)

            for book in root.findall(".//book"):
                book_data = self._extract_book_data(book)
                if book_data:
                    books.append(book_data)

        except Exception as e:
            print(f"Error parsing Goodreads author books: {e}")

        return books

    def _parse_series_xml(self, xml_content: str) -> Optional[Dict[str, Any]]:
        """Parse Goodreads series XML"""
        try:
            root = ET.fromstring(xml_content)

            series_element = root.find(".//series")
            if series_element is not None:
                series_data = {
                    "gr_series_id": self._get_text(series_element, "id"),
                    "title": self._get_text(series_element, "title"),
                    "description": self._get_text(series_element, "description"),
                    "books": []
                }

                for book in series_element.findall(".//book"):
                    book_data = self._extract_book_data(book)
                    if book_data:
                        series_data["books"].append(book_data)

                return series_data

        except Exception as e:
            print(f"Error parsing Goodreads series XML: {e}")

        return None

    def _extract_work_data(self, work_element: ET.Element) -> Optional[Dict[str, Any]]:
        """Extract work data from search results"""
        best_book = work_element.find(".//best_book")
        if best_book is None:
            return None

        return {
            "gr_work_id": self._get_text(work_element, "id"),
            "title": self._get_text(best_book, "title"),
            "author": self._get_text(best_book, "author/name"),
            "gr_author_id": self._get_text(best_book, "author/id"),
            "isbn": self._get_text(best_book, "isbn"),
            "isbn13": self._get_text(best_book, "isbn13"),
            "publication_year": self._get_text(work_element, "original_publication_year"),
            "image_url": self._get_text(best_book, "image_url"),
            "rating_avg": float(self._get_text(work_element, "average_rating") or 0),
            "ratings_count": int(self._get_text(work_element, "ratings_count") or 0)
        }

    def _extract_book_data(self, book_element: ET.Element) -> Optional[Dict[str, Any]]:
        """Extract book data from Goodreads XML"""
        return {
            "gr_book_id": self._get_text(book_element, "id"),
            "title": self._get_text(book_element, "title"),
            "isbn": self._get_text(book_element, "isbn"),
            "isbn13": self._get_text(book_element, "isbn13"),
            "authors": [author.find("name").text for author in book_element.findall(".//author")
                       if author.find("name") is not None],
            "publication_year": self._get_text(book_element, "publication_year"),
            "publisher": self._get_text(book_element, "publisher"),
            "pages": int(self._get_text(book_element, "num_pages") or 0),
            "language": self._get_text(book_element, "language_code"),
            "image_url": self._get_text(book_element, "image_url"),
            "description": self._get_text(book_element, "description"),
            "rating_avg": float(self._get_text(book_element, "average_rating") or 0),
            "ratings_count": int(self._get_text(book_element, "ratings_count") or 0),
            "publication_date": self._get_text(book_element, "publication_date")
        }

    @staticmethod
    def _get_text(element: ET.Element, path: str) -> Optional[str]:
        """Safely get text from XML element"""
        try:
            found = element.find(path)
            if found is not None and found.text:
                return found.text.strip()
        except (AttributeError, TypeError):
            pass
        return None


class GoodreadsUserClient:
    """Client for accessing user's Goodreads shelves and reading progress"""

    def __init__(self, access_token: Optional[str] = None):
        self.base_url = "https://www.goodreads.com/api"
        self.session = None
        self.access_token = access_token
        self.api_key = None

    def set_credentials(self, api_key: str, access_token: Optional[str] = None):
        """Set API credentials"""
        self.api_key = api_key
        self.access_token = access_token

    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None

    async def get_user_shelves(self, user_id: int) -> Optional[List[Dict[str, Any]]]:
        """
        Get user's Goodreads shelves

        Note: Requires OAuth for private shelves
        """
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            params = {
                "key": self.api_key
            }

            async with self.session.get(
                f"{self.base_url}/shelf/list.xml",
                params=params
            ) as response:
                if response.status == 200:
                    content = await response.text()
                    return self._parse_shelves(content)
                return None

        except Exception as e:
            print(f"Error fetching Goodreads shelves: {e}")
            return None

    async def get_shelf_books(self, user_id: int, shelf: str = "read") -> Optional[List[Dict[str, Any]]]:
        """
        Get books from a specific shelf

        Args:
            user_id: Goodreads user ID
            shelf: Shelf name (read, currently-reading, to-read, etc.)

        Returns:
            List of books on the shelf
        """
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()

            params = {
                "key": self.api_key,
                "shelf": shelf,
                "per_page": 100
            }

            async with self.session.get(
                f"{self.base_url}/users/{user_id}/shelf.xml",
                params=params
            ) as response:
                if response.status == 200:
                    content = await response.text()
                    return self._parse_shelf_books(content)
                return None

        except Exception as e:
            print(f"Error fetching Goodreads shelf books: {e}")
            return None

    def _parse_shelves(self, xml_content: str) -> List[Dict[str, Any]]:
        """Parse user shelves from XML"""
        shelves = []
        try:
            root = ET.fromstring(xml_content)

            for shelf in root.findall(".//shelf"):
                shelf_data = {
                    "id": self._get_text(shelf, "id"),
                    "name": self._get_text(shelf, "name"),
                    "exclusive": self._get_text(shelf, "exclusive") == "true",
                    "book_count": int(self._get_text(shelf, "book_count") or 0)
                }
                shelves.append(shelf_data)

        except Exception as e:
            print(f"Error parsing Goodreads shelves: {e}")

        return shelves

    def _parse_shelf_books(self, xml_content: str) -> List[Dict[str, Any]]:
        """Parse books from shelf"""
        books = []
        try:
            root = ET.fromstring(xml_content)

            for book in root.findall(".//book"):
                book_data = {
                    "gr_book_id": self._get_text(book, "id"),
                    "title": self._get_text(book, "title"),
                    "author": self._get_text(book, "author/name"),
                    "isbn": self._get_text(book, "isbn"),
                    "isbn13": self._get_text(book, "isbn13"),
                    "rating": float(self._get_text(book, "rating") or 0),
                    "date_read": self._get_text(book, "date_read"),
                    "date_added": self._get_text(book, "date_added"),
                    "read_count": int(self._get_text(book, "read_count") or 0)
                }
                books.append(book_data)

        except Exception as e:
            print(f"Error parsing Goodreads shelf books: {e}")

        return books

    @staticmethod
    def _get_text(element: ET.Element, path: str) -> Optional[str]:
        """Safely get text from XML element"""
        try:
            found = element.find(path)
            if found is not None and found.text:
                return found.text.strip()
        except (AttributeError, TypeError):
            pass
        return None
