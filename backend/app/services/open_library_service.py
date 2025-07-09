import httpx
import asyncio
from typing import Optional, Dict, List
from datetime import datetime, date
import re
from .cache_service import cache_service
from ..models import PriceInfo, MetadataSource

OPEN_LIBRARY_API = "https://openlibrary.org/api/books"

class OpenLibraryAPIError(Exception):
    """Raised when Open Library API request fails"""
    pass

class OpenLibraryClient:
    """Enhanced Open Library API client with caching and rate limiting"""
    
    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = None
        self._rate_limiter = RateLimiter(calls_per_second=2, calls_per_minute=100)
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = httpx.AsyncClient(timeout=self.timeout)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.aclose()
    
    async def fetch_book_metadata(self, isbn: str) -> Optional[Dict]:
        """Fetch book metadata from Open Library API with caching and rate limiting"""
        if not self.session:
            raise OpenLibraryAPIError("Client not initialized. Use async context manager.")
        
        # Check cache first
        cache_key = f"open_library_{isbn}"
        cached_result = cache_service.get_api_response(cache_key)
        if cached_result:
            return cached_result
        
        try:
            # Apply rate limiting
            await self._rate_limiter.acquire()
            
            # Try both ISBN formats
            isbn_keys = [f"ISBN:{isbn}"]
            if len(isbn) == 10:
                isbn_keys.append(f"ISBN:{self._isbn10_to_isbn13(isbn)}")
            elif len(isbn) == 13:
                isbn_keys.append(f"ISBN:{self._isbn13_to_isbn10(isbn)}")
            
            params = {
                "bibkeys": ",".join(isbn_keys),
                "format": "json",
                "jscmd": "data"
            }
            
            response = await self.session.get(OPEN_LIBRARY_API, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Find the first available book data
            book_data = None
            for key in isbn_keys:
                if key in data:
                    book_data = data[key]
                    break
            
            if book_data:
                metadata = {
                    "title": book_data.get("title", "").strip(),
                    "authors": [a.get("name", "") for a in book_data.get("authors", [])],
                    "series": None,  # Open Library doesn't provide series info reliably
                    "series_position": None,
                    "publisher": self._extract_publisher(book_data.get("publishers", [])),
                    "published_date": self._parse_published_date(book_data.get("publish_date")),
                    "page_count": book_data.get("number_of_pages"),
                    "language": self._extract_language(book_data.get("languages", [])),
                    "thumbnail_url": self._get_best_cover(book_data.get("cover", {})),
                    "description": self._extract_description(book_data),
                    "categories": self._extract_categories(book_data.get("subjects", [])),
                    "pricing": [],  # Open Library doesn't provide pricing
                    "metadata_source": MetadataSource.OPEN_LIBRARY
                }
                
                # Cache the result
                cache_service.set_api_response(cache_key, metadata)
                return metadata
                
        except httpx.HTTPError as e:
            raise OpenLibraryAPIError(f"HTTP error fetching from Open Library: {e}")
        except Exception as e:
            raise OpenLibraryAPIError(f"Error fetching from Open Library: {e}")
        
        return None
    
    def _isbn10_to_isbn13(self, isbn10: str) -> str:
        """Convert ISBN-10 to ISBN-13"""
        if len(isbn10) != 10:
            return isbn10
        
        isbn13_base = "978" + isbn10[:9]
        
        # Calculate check digit
        total = 0
        for i, digit in enumerate(isbn13_base):
            total += int(digit) * (3 if i % 2 == 1 else 1)
        
        check_digit = (10 - (total % 10)) % 10
        return isbn13_base + str(check_digit)
    
    def _isbn13_to_isbn10(self, isbn13: str) -> str:
        """Convert ISBN-13 to ISBN-10 (if it starts with 978)"""
        if len(isbn13) != 13 or not isbn13.startswith("978"):
            return isbn13
        
        isbn10_base = isbn13[3:12]
        
        # Calculate check digit
        total = 0
        for i, digit in enumerate(isbn10_base):
            total += int(digit) * (10 - i)
        
        check_digit = (11 - (total % 11)) % 11
        if check_digit == 10:
            check_digit = "X"
        elif check_digit == 11:
            check_digit = "0"
        
        return isbn10_base + str(check_digit)
    
    def _extract_publisher(self, publishers: List[Dict]) -> Optional[str]:
        """Extract publisher from publishers list"""
        if publishers:
            return publishers[0].get("name", "").strip()
        return None
    
    def _parse_published_date(self, date_string: Optional[str]) -> Optional[date]:
        """Parse published date string into date object"""
        if not date_string:
            return None
        
        # Try different date formats
        formats = [
            "%B %d, %Y",  # January 1, 2020
            "%B %Y",      # January 2020
            "%Y",         # 2020
            "%Y-%m-%d",   # 2020-01-01
            "%Y-%m",      # 2020-01
        ]
        
        for fmt in formats:
            try:
                parsed = datetime.strptime(date_string, fmt)
                return parsed.date()
            except ValueError:
                continue
        
        return None
    
    def _extract_language(self, languages: List[Dict]) -> str:
        """Extract language from languages list"""
        if languages:
            lang = languages[0].get("key", "").replace("/languages/", "")
            return lang if lang else "en"
        return "en"
    
    def _get_best_cover(self, cover: Dict) -> Optional[str]:
        """Get the best available cover URL"""
        preferred_sizes = ["large", "medium", "small"]
        
        for size in preferred_sizes:
            if size in cover:
                return cover[size]
        
        return None
    
    def _extract_description(self, book_data: Dict) -> str:
        """Extract description from book data"""
        # Open Library can have description in different formats
        description = book_data.get("description")
        
        if isinstance(description, dict):
            return description.get("value", "").strip()
        elif isinstance(description, str):
            return description.strip()
        
        return ""
    
    def _extract_categories(self, subjects: List[Dict]) -> List[str]:
        """Extract categories from subjects list"""
        categories = []
        for subject in subjects[:10]:  # Limit to first 10
            if isinstance(subject, dict):
                name = subject.get("name", "").strip()
                if name:
                    categories.append(name)
            elif isinstance(subject, str):
                categories.append(subject.strip())
        
        return categories

class RateLimiter:
    """Rate limiter for API calls"""
    
    def __init__(self, calls_per_second: int = 2, calls_per_minute: int = 100):
        self.calls_per_second = calls_per_second
        self.calls_per_minute = calls_per_minute
        self.second_calls = []
        self.minute_calls = []
    
    async def acquire(self):
        """Acquire permission to make an API call"""
        now = datetime.now()
        
        # Clean old calls
        self.second_calls = [call_time for call_time in self.second_calls 
                           if (now - call_time).total_seconds() < 1]
        self.minute_calls = [call_time for call_time in self.minute_calls 
                           if (now - call_time).total_seconds() < 60]
        
        # Check rate limits
        if len(self.second_calls) >= self.calls_per_second:
            sleep_time = 1.0 - (now - self.second_calls[0]).total_seconds()
            await asyncio.sleep(max(0, sleep_time))
        
        if len(self.minute_calls) >= self.calls_per_minute:
            sleep_time = 60.0 - (now - self.minute_calls[0]).total_seconds()
            await asyncio.sleep(max(0, sleep_time))
        
        # Record this call
        now = datetime.now()
        self.second_calls.append(now)
        self.minute_calls.append(now)

# Backward compatibility function
async def fetch_book_metadata_fallback(isbn: str) -> Optional[Dict]:
    """Backward compatibility function"""
    async with OpenLibraryClient() as client:
        return await client.fetch_book_metadata(isbn)