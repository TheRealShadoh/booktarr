import httpx
from typing import Optional, Dict

OPEN_LIBRARY_API = "https://openlibrary.org/api/books"

async def fetch_book_metadata_fallback(isbn: str) -> Optional[Dict]:
    """Fetch book metadata from Open Library API as fallback"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPEN_LIBRARY_API}?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
            )
            response.raise_for_status()
            data = response.json()
            
            if f"ISBN:{isbn}" in data:
                book_data = data[f"ISBN:{isbn}"]
                return {
                    "title": book_data.get("title"),
                    "authors": [a["name"] for a in book_data.get("authors", [])],
                    "cover_image": book_data.get("cover", {}).get("medium")
                }
    except Exception as e:
        print(f"Error fetching from Open Library: {e}")
    return None