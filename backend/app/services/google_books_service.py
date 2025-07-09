import httpx
from typing import Optional, Dict
import re

GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"

async def fetch_book_metadata(isbn: str) -> Optional[Dict]:
    """Fetch book metadata from Google Books API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{GOOGLE_BOOKS_API}?q=isbn:{isbn}")
            response.raise_for_status()
            data = response.json()
            
            if data.get("totalItems", 0) > 0:
                volume = data["items"][0]["volumeInfo"]
                sale_info = data["items"][0].get("saleInfo", {})
                
                return {
                    "title": volume.get("title"),
                    "authors": volume.get("authors", []),
                    "series": extract_series_info(volume),
                    "cover_image": volume.get("imageLinks", {}).get("thumbnail"),
                    "pricing": extract_pricing(sale_info)
                }
    except Exception as e:
        print(f"Error fetching from Google Books: {e}")
    return None

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