import httpx
from typing import List
import json

SKOOLIB_URL = "https://skoolib.net/share/library/d14ba5a0-b081-70ba-a7e4-237b4befefed*library2025-07-07T23:44:27.734Z.1/books"

async def fetch_skoolib_books() -> List[dict]:
    """Fetch books from the Skoolib share URL"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(SKOOLIB_URL)
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        print(f"Error fetching from Skoolib: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error: {e}")
        return []