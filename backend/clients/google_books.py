import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
from tenacity import retry, stop_after_attempt, wait_exponential


class GoogleBooksClient:
    BASE_URL = "https://www.googleapis.com/books/v1/volumes"
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_BOOKS_API_KEY")
        self.client = httpx.AsyncClient()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def search_by_isbn(self, isbn: str) -> Optional[Dict[str, Any]]:
        params = {
            "q": f"isbn:{isbn}",
            "maxResults": 1
        }
        if self.api_key:
            params["key"] = self.api_key
            
        response = await self.client.get(self.BASE_URL, params=params)
        response.raise_for_status()
        
        data = await response.json()
        if data.get("totalItems", 0) > 0:
            return self._parse_volume(data["items"][0])
        return None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def search_by_title(self, title: str, author: Optional[str] = None) -> List[Dict[str, Any]]:
        query = f"intitle:{title}"
        if author:
            query += f" inauthor:{author}"
            
        params = {
            "q": query,
            "maxResults": 10
        }
        if self.api_key:
            params["key"] = self.api_key
            
        response = await self.client.get(self.BASE_URL, params=params)
        response.raise_for_status()
        
        data = await response.json()
        results = []
        for item in data.get("items", []):
            parsed = self._parse_volume(item)
            if parsed:
                results.append(parsed)
        return results
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def search_by_author(self, author: str) -> List[Dict[str, Any]]:
        params = {
            "q": f"inauthor:{author}",
            "maxResults": 40,
            "orderBy": "newest"
        }
        if self.api_key:
            params["key"] = self.api_key
            
        response = await self.client.get(self.BASE_URL, params=params)
        response.raise_for_status()
        
        data = await response.json()
        results = []
        for item in data.get("items", []):
            parsed = self._parse_volume(item)
            if parsed:
                results.append(parsed)
        return results
    
    def _parse_volume(self, volume: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            volume_info = volume.get("volumeInfo", {})
            sale_info = volume.get("saleInfo", {})
            
            # Extract ISBNs
            isbn_10 = None
            isbn_13 = None
            for identifier in volume_info.get("industryIdentifiers", []):
                if identifier["type"] == "ISBN_10":
                    isbn_10 = identifier["identifier"]
                elif identifier["type"] == "ISBN_13":
                    isbn_13 = identifier["identifier"]
            
            # Parse release date
            published_date = volume_info.get("publishedDate", "")
            try:
                if len(published_date) == 4:  # Year only
                    release_date = datetime.strptime(published_date, "%Y").date()
                elif len(published_date) == 7:  # Year-month
                    release_date = datetime.strptime(published_date, "%Y-%m").date()
                else:  # Full date
                    release_date = datetime.strptime(published_date, "%Y-%m-%d").date()
            except:
                release_date = None
            
            # Extract price
            price = None
            if sale_info.get("saleability") == "FOR_SALE":
                price = sale_info.get("retailPrice", {}).get("amount")
            
            return {
                "google_books_id": volume.get("id"),
                "title": volume_info.get("title"),
                "authors": volume_info.get("authors", []),
                "publisher": volume_info.get("publisher"),
                "isbn_10": isbn_10,
                "isbn_13": isbn_13,
                "release_date": release_date.isoformat() if release_date else None,
                "page_count": volume_info.get("pageCount"),
                "categories": volume_info.get("categories", []),
                "description": volume_info.get("description"),
                "cover_url": volume_info.get("imageLinks", {}).get("thumbnail"),
                "price": price,
                "format": volume_info.get("printType", "").lower(),
                "source": "google_books"
            }
        except Exception as e:
            print(f"Error parsing Google Books volume: {e}")
            return None
    
    async def close(self):
        await self.client.aclose()