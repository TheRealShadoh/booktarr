import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime
from tenacity import retry, stop_after_attempt, wait_exponential


class OpenLibraryClient:
    BASE_URL = "https://openlibrary.org"
    
    def __init__(self):
        self.client = httpx.AsyncClient(verify=False)  # Skip SSL verification for OpenLibrary
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def search_by_isbn(self, isbn: str) -> Optional[Dict[str, Any]]:
        # Try to get book data by ISBN
        response = await self.client.get(f"{self.BASE_URL}/isbn/{isbn}.json")
        if response.status_code == 404:
            return None
        response.raise_for_status()
        
        book_data = response.json()
        
        # Get work data if available
        work_data = None
        if "works" in book_data and book_data["works"]:
            work_key = book_data["works"][0]["key"]
            work_response = await self.client.get(f"{self.BASE_URL}{work_key}.json")
            if work_response.status_code == 200:
                work_data = work_response.json()
        
        return self._parse_book_data(book_data, work_data)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def search_by_title(self, title: str, author: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {
            "title": title,
            "limit": 10
        }
        if author:
            params["author"] = author
            
        response = await self.client.get(f"{self.BASE_URL}/search.json", params=params)
        response.raise_for_status()
        
        data = response.json()
        results = []
        
        for doc in data.get("docs", []):
            # Get full book data for each result
            if doc.get("isbn") and doc["isbn"]:
                isbn = doc["isbn"][0]
                book_data = await self.search_by_isbn(isbn)
                if book_data:
                    results.append(book_data)
            else:
                # Parse search result directly
                results.append(self._parse_search_doc(doc))
                
        return results
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def search_by_author(self, author: str) -> List[Dict[str, Any]]:
        params = {
            "author": author,
            "limit": 40
        }
        
        response = await self.client.get(f"{self.BASE_URL}/search.json", params=params)
        response.raise_for_status()
        
        data = response.json()
        results = []
        
        for doc in data.get("docs", []):
            results.append(self._parse_search_doc(doc))
                
        return results
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def get_editions(self, work_key: str) -> List[Dict[str, Any]]:
        response = await self.client.get(f"{self.BASE_URL}{work_key}/editions.json")
        response.raise_for_status()
        
        data = response.json()
        editions = []
        
        for entry in data.get("entries", []):
            edition = self._parse_edition(entry)
            if edition:
                editions.append(edition)
                
        return editions
    
    def _parse_book_data(self, book_data: Dict[str, Any], work_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        # Extract basic info
        result = {
            "openlibrary_id": book_data.get("key"),
            "title": book_data.get("title"),
            "authors": [],
            "publisher": None,
            "isbn_10": None,
            "isbn_13": None,
            "release_date": None,
            "page_count": book_data.get("number_of_pages"),
            "cover_url": None,
            "format": None,
            "source": "openlibrary"
        }
        
        # Extract authors
        for author_ref in book_data.get("authors", []):
            if isinstance(author_ref, dict) and "key" in author_ref:
                # We'd need to fetch author data, but for now just store the key
                result["authors"].append(author_ref["key"])
        
        # Extract publishers
        publishers = book_data.get("publishers", [])
        if publishers:
            result["publisher"] = publishers[0]
        
        # Extract ISBNs
        for isbn in book_data.get("isbn_10", []):
            result["isbn_10"] = isbn
            break
        for isbn in book_data.get("isbn_13", []):
            result["isbn_13"] = isbn
            break
        
        # Extract publish date
        publish_date = book_data.get("publish_date")
        if publish_date:
            try:
                # OpenLibrary has various date formats
                for fmt in ["%B %d, %Y", "%Y", "%B %Y", "%Y-%m-%d"]:
                    try:
                        result["release_date"] = datetime.strptime(publish_date, fmt).date().isoformat()
                        break
                    except:
                        continue
            except:
                pass
        
        # Extract cover
        if book_data.get("covers"):
            cover_id = book_data["covers"][0]
            result["cover_url"] = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
        
        # Extract format
        if book_data.get("physical_format"):
            result["format"] = book_data["physical_format"].lower()
        
        # Add work data if available
        if work_data:
            result["description"] = work_data.get("description")
            if isinstance(result["description"], dict):
                result["description"] = result["description"].get("value")
        
        # Extract series information
        series_name, series_position = self._extract_series_info(result["title"], work_data)
        result["series_name"] = series_name
        result["series_position"] = series_position
                
        return result
    
    def _parse_search_doc(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        result = {
            "openlibrary_id": doc.get("key"),
            "title": doc.get("title"),
            "authors": doc.get("author_name", []),
            "publisher": doc.get("publisher", [None])[0] if doc.get("publisher") else None,
            "isbn_10": doc.get("isbn", [None])[0] if doc.get("isbn") else None,
            "isbn_13": None,
            "release_date": None,
            "page_count": doc.get("number_of_pages_median"),
            "cover_url": None,
            "format": None,
            "source": "openlibrary"
        }
        
        # Extract publish year
        if doc.get("first_publish_year"):
            result["release_date"] = f"{doc['first_publish_year']}-01-01"
        
        # Extract cover
        if doc.get("cover_i"):
            result["cover_url"] = f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-M.jpg"
        
        # Extract series information
        series_name, series_position = self._extract_series_info(result["title"])
        result["series_name"] = series_name
        result["series_position"] = series_position
        
        return result
    
    def _parse_edition(self, edition: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            return self._parse_book_data(edition)
        except:
            return None
    
    def _extract_series_info(self, title: str, work_data: Optional[Dict[str, Any]] = None) -> tuple[Optional[str], Optional[int]]:
        """
        Extract series name and position from OpenLibrary data.
        Uses similar patterns to Google Books client.
        """
        import re
        
        if not title:
            return None, None
        
        # Reuse the same series extraction patterns from Google Books
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
        
        # Pattern 4: Look for common manga/light novel patterns
        pattern4 = re.compile(r'^(.+?)\s+(?:Vol|Volume)\.?\s*(\d+)(?:\D|$)', re.IGNORECASE)
        match4 = pattern4.match(title)
        if match4:
            return match4.group(1).strip(), int(match4.group(2))
        
        # Pattern 5: Japanese series with brackets "[Series Name]"
        pattern5 = re.compile(r'^.*?\[(.+?)\].*?(?:Vol|Volume|#)\.?\s*(\d+)', re.IGNORECASE)
        match5 = pattern5.match(title)
        if match5:
            return match5.group(1).strip(), int(match5.group(2))
        
        # Check work data for series information if available
        if work_data and work_data.get("series"):
            # OpenLibrary sometimes has explicit series data
            series_data = work_data["series"][0] if isinstance(work_data["series"], list) else work_data["series"]
            if isinstance(series_data, dict) and series_data.get("name"):
                return series_data["name"], series_data.get("position")
        
        return None, None
    
    async def close(self):
        await self.client.aclose()