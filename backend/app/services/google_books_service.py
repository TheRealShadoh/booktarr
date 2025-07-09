import httpx
import asyncio
from typing import Optional, Dict, List
from datetime import datetime, date
import re
import os
from .cache_service import cache_service
from ..models import PriceInfo, MetadataSource

GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"

class GoogleBooksAPIError(Exception):
    """Raised when Google Books API request fails"""
    pass

class GoogleBooksClient:
    """Enhanced Google Books API client with rate limiting and caching"""
    
    def __init__(self, api_key: Optional[str] = None, timeout: int = 30):
        self.api_key = api_key or os.getenv("GOOGLE_BOOKS_API_KEY")
        self.timeout = timeout
        self.session = None
        self._rate_limiter = RateLimiter(calls_per_second=10, calls_per_minute=1000)
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = httpx.AsyncClient(timeout=self.timeout)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.aclose()
    
    async def fetch_book_metadata(self, isbn: str) -> Optional[Dict]:
        """Fetch book metadata from Google Books API with caching and rate limiting"""
        if not self.session:
            raise GoogleBooksAPIError("Client not initialized. Use async context manager.")
        
        # Check cache first
        cache_key = f"google_books_{isbn}"
        cached_result = cache_service.get_api_response(cache_key)
        if cached_result:
            return cached_result
        
        try:
            # Apply rate limiting
            await self._rate_limiter.acquire()
            
            # Build request parameters
            params = {"q": f"isbn:{isbn}"}
            if self.api_key:
                params["key"] = self.api_key
            
            response = await self.session.get(GOOGLE_BOOKS_API, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("totalItems", 0) > 0:
                volume = data["items"][0]["volumeInfo"]
                sale_info = data["items"][0].get("saleInfo", {})
                
                metadata = {
                    "title": volume.get("title", "").strip(),
                    "authors": volume.get("authors", []),
                    "series": self._extract_series_info(volume),
                    "series_position": self._extract_series_position(volume),
                    "publisher": volume.get("publisher", "").strip(),
                    "published_date": self._parse_published_date(volume.get("publishedDate")),
                    "page_count": volume.get("pageCount"),
                    "language": volume.get("language", "en"),
                    "thumbnail_url": self._get_best_thumbnail(volume.get("imageLinks", {})),
                    "description": volume.get("description", "").strip(),
                    "categories": volume.get("categories", []),
                    "pricing": self._extract_pricing(sale_info),
                    "metadata_source": MetadataSource.GOOGLE_BOOKS
                }
                
                # Cache the result
                cache_service.set_api_response(cache_key, metadata)
                return metadata
                
        except httpx.HTTPError as e:
            raise GoogleBooksAPIError(f"HTTP error fetching from Google Books: {e}")
        except Exception as e:
            raise GoogleBooksAPIError(f"Error fetching from Google Books: {e}")
        
        return None
    
    def _extract_series_info(self, volume_info: Dict) -> Optional[str]:
        """Extract series information from volume info"""
        title = volume_info.get("title", "")
        subtitle = volume_info.get("subtitle", "")
        
        # Look for series patterns in title
        series_patterns = [
            r'(.+?)\s+(?:Book|Volume|#)\s*(\d+)',
            r'(.+?)\s+(\d+)',
            r'(.+?):\s*(.+)',
        ]
        
        for pattern in series_patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_series_position(self, volume_info: Dict) -> Optional[int]:
        """Extract series position from volume info"""
        title = volume_info.get("title", "")
        subtitle = volume_info.get("subtitle", "")
        
        # Look for position patterns
        position_patterns = [
            r'(?:Book|Volume|#)\s*(\d+)',
            r'(\d+)(?:st|nd|rd|th)?\s+(?:Book|Volume)',
            r'Book\s+(\d+)',
            r'Volume\s+(\d+)',
            r'#(\d+)',
        ]
        
        for pattern in position_patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                try:
                    return int(match.group(1))
                except ValueError:
                    continue
        
        return None
    
    def _parse_published_date(self, date_string: Optional[str]) -> Optional[date]:
        """Parse published date string into date object"""
        if not date_string:
            return None
        
        # Try different date formats
        formats = [
            "%Y-%m-%d",
            "%Y-%m",
            "%Y",
        ]
        
        for fmt in formats:
            try:
                parsed = datetime.strptime(date_string, fmt)
                return parsed.date()
            except ValueError:
                continue
        
        return None
    
    def _get_best_thumbnail(self, image_links: Dict) -> Optional[str]:
        """Get the best available thumbnail URL"""
        # Prefer higher resolution images
        preferred_sizes = ["large", "medium", "small", "thumbnail", "smallThumbnail"]
        
        for size in preferred_sizes:
            if size in image_links:
                url = image_links[size]
                # Convert to HTTPS if needed
                if url.startswith("http://"):
                    url = url.replace("http://", "https://")
                return url
        
        return None
    
    def _extract_pricing(self, sale_info: Dict) -> List[PriceInfo]:
        """Extract pricing information from sale info"""
        pricing = []
        
        if sale_info.get("saleability") == "FOR_SALE":
            retail_price = sale_info.get("retailPrice", {})
            if retail_price.get("amount"):
                pricing.append(PriceInfo(
                    source="Google Books",
                    price=retail_price["amount"],
                    currency=retail_price.get("currencyCode", "USD"),
                    last_updated=datetime.now()
                ))
        
        return pricing

class RateLimiter:
    """Rate limiter for API calls"""
    
    def __init__(self, calls_per_second: int = 10, calls_per_minute: int = 1000):
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

# Backward compatibility functions
async def fetch_book_metadata(isbn: str) -> Optional[Dict]:
    """Backward compatibility function"""
    async with GoogleBooksClient() as client:
        return await client.fetch_book_metadata(isbn)

def extract_series_info(volume_info: Dict) -> Optional[str]:
    """Extract series information from volume info"""
    title = volume_info.get("title", "")
    subtitle = volume_info.get("subtitle", "")
    
    # Look for series patterns in title
    series_patterns = [
        r'(.+?)\s+(?:Book|Volume|#)\s*(\d+)',
        r'(.+?)\s+(\d+)',
        r'(.+?):\s*(.+)',
    ]
    
    for pattern in series_patterns:
        match = re.search(pattern, title, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    return None

def extract_pricing(sale_info: Dict) -> Optional[Dict[str, float]]:
    """Extract pricing information from sale info"""
    if sale_info.get("saleability") == "FOR_SALE":
        retail_price = sale_info.get("retailPrice", {})
        if retail_price.get("amount"):
            return {"retail": retail_price["amount"]}
    return None