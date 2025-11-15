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
        
        data = response.json()
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
        
        data = response.json()
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
        
        data = response.json()
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
            
            # Extract series information
            series_name, series_position = self._extract_series_info(volume_info)
            
            return {
                "google_books_id": volume.get("id"),
                "title": volume_info.get("title"),
                "authors": volume_info.get("authors", []),
                "publisher": volume_info.get("publisher"),
                "isbn_10": isbn_10,
                "isbn_13": isbn_13,
                "release_date": release_date.isoformat() if release_date else None,
                "page_count": volume_info.get("pageCount"),
                "language": volume_info.get("language"),  # Extract language code (e.g., "en", "ja")
                "categories": volume_info.get("categories", []),
                "description": volume_info.get("description"),
                "cover_url": volume_info.get("imageLinks", {}).get("thumbnail"),
                "price": price,
                "format": volume_info.get("printType", "").lower(),
                "source": "google_books",
                "series_name": series_name,
                "series_position": series_position
            }
        except Exception as e:
            print(f"Error parsing Google Books volume: {e}")
            return None
    
    def _extract_series_info(self, volume_info: Dict[str, Any]) -> tuple[Optional[str], Optional[int]]:
        """
        Extract series name and position from Google Books volume info.
        Google Books doesn't have explicit series fields, so we extract from:
        1. Title patterns (e.g., "Series Name, Vol. 1", "Series Name #1")
        2. Subtitle
        3. Description
        """
        title = volume_info.get("title", "")
        subtitle = volume_info.get("subtitle", "")
        description = volume_info.get("description", "")
        
        # Common series patterns to look for
        import re
        
        # Pattern 1: "Series Name, Vol. X" or "Series Name, Volume X"
        pattern1 = re.compile(r'^(.+?),\s*(?:Vol|Volume)\.?\s*(\d+)', re.IGNORECASE)
        match1 = pattern1.match(title)
        if match1:
            return match1.group(1).strip(), int(match1.group(2))
        
        # Pattern 2: "Series Name #X" or "Series Name: X"
        pattern2 = re.compile(r'^(.+?)\s*(?:#|:)\s*(?:Volume\s*)?(\d+)', re.IGNORECASE)
        match2 = pattern2.match(title)
        if match2:
            series_name = match2.group(1).strip()
            # Remove trailing colon if present
            if series_name.endswith(':'):
                series_name = series_name[:-1].strip()
            return series_name, int(match2.group(2))
        
        # Pattern 3: "Series Name (Book X)" or "Series Name (Vol X)"
        pattern3 = re.compile(r'^(.+?)\s*\((?:Book|Vol|Volume)\s*(\d+)\)', re.IGNORECASE)
        match3 = pattern3.match(title)
        if match3:
            return match3.group(1).strip(), int(match3.group(2))
        
        # Pattern 4: Check subtitle for volume info if title seems like a series
        if subtitle:
            # "Volume X of Series Name"
            pattern4 = re.compile(r'Volume\s*(\d+)\s*of\s*(.+)', re.IGNORECASE)
            match4 = pattern4.match(subtitle)
            if match4:
                return match4.group(2).strip(), int(match4.group(1))
            
            # "Book X in the Series Name series"
            pattern5 = re.compile(r'Book\s*(\d+)\s*in\s*the\s*(.+?)\s*series', re.IGNORECASE)
            match5 = pattern5.match(subtitle)
            if match5:
                return match5.group(2).strip(), int(match5.group(1))
            
            # Pattern 6: Subtitle is just a number (common for manga/light novels)
            if subtitle.strip().isdigit():
                volume_num = int(subtitle.strip())
                # Use title as series name
                return title.strip(), volume_num
        
        # Pattern 5: Check for series mentioned in categories
        categories = volume_info.get("categories", [])
        for category in categories:
            if "series" in category.lower():
                # Try to extract series name from category
                series_match = re.search(r'(.+?)\s+series', category, re.IGNORECASE)
                if series_match:
                    return series_match.group(1).strip(), None
        
        # Pattern 6: Look for common manga/light novel patterns
        # "Series Name Vol. X" or "Series Name Volume X"
        pattern6 = re.compile(r'^(.+?)\s+(?:Vol|Volume)\.?\s*(\d+)(?:\D|$)', re.IGNORECASE)
        match6 = pattern6.match(title)
        if match6:
            return match6.group(1).strip(), int(match6.group(2))
        
        # Pattern 7: Japanese series with brackets "[Series Name]"
        pattern7 = re.compile(r'^.*?\[(.+?)\].*?(?:Vol|Volume|#)\.?\s*(\d+)', re.IGNORECASE)
        match7 = pattern7.match(title)
        if match7:
            return match7.group(1).strip(), int(match7.group(2))
        
        # Pattern 8: Check description for series information
        if description:
            # Look for "Book X in the Series Name series"
            desc_pattern1 = re.compile(r'Book\s+(\d+)\s+(?:in\s+(?:the\s+)?)?(.+?)\s+series', re.IGNORECASE)
            desc_match1 = desc_pattern1.search(description)
            if desc_match1:
                return desc_match1.group(2).strip(), int(desc_match1.group(1))
            
            # Look for "Volume X of Series Name"
            desc_pattern2 = re.compile(r'Volume\s+(\d+)\s+of\s+(?:the\s+)?(.+?)(?:\s+series)?[.!]', re.IGNORECASE)
            desc_match2 = desc_pattern2.search(description)
            if desc_match2:
                return desc_match2.group(2).strip(), int(desc_match2.group(1))
            
            # Look for "X in the Y series" or "Part X of Y"
            desc_pattern3 = re.compile(r'(?:Part|Volume|Book)\s+(\d+)\s+(?:of|in)\s+(?:the\s+)?(.+?)(?:\s+(?:series|saga|trilogy))?[.!]', re.IGNORECASE)
            desc_match3 = desc_pattern3.search(description)
            if desc_match3:
                return desc_match3.group(2).strip(), int(desc_match3.group(1))
        
        # Pattern 9: Look for common series keywords in title that might not have numbers
        series_keywords = ["saga", "trilogy", "chronicles", "tales", "adventures", "series"]
        for keyword in series_keywords:
            if keyword in title.lower():
                # Try to extract the base name before the keyword
                keyword_pattern = re.compile(rf'^(.+?)\s+{keyword}', re.IGNORECASE)
                keyword_match = keyword_pattern.match(title)
                if keyword_match:
                    base_name = keyword_match.group(1).strip()
                    # Look for a number in the remaining title
                    number_pattern = re.compile(r'(\d+)')
                    number_match = number_pattern.search(title[len(base_name):])
                    if number_match:
                        return base_name, int(number_match.group(1))
                    else:
                        return base_name, None
        
        # If no clear series pattern found, return None
        return None, None
    
    async def close(self):
        await self.client.aclose()