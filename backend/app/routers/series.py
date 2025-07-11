"""
Series information API endpoints
"""
import asyncio
import httpx
import re
from typing import List, Dict, Optional, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/series", tags=["series"])

class SeriesBook(BaseModel):
    position: int
    title: str
    isbn: Optional[str] = None
    author: str
    published_date: Optional[str] = None

class SeriesInfo(BaseModel):
    series_name: str
    total_books: int
    known_books: List[SeriesBook]
    source: str

class SeriesService:
    def __init__(self):
        self.cache: Dict[str, SeriesInfo] = {}
    
    async def get_series_info(self, series_name: str, author: Optional[str] = None) -> Optional[SeriesInfo]:
        """Get series information from external APIs"""
        cache_key = f"{series_name}:{author or ''}"
        
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Try Google Books API first
        result = await self._search_google_books(series_name, author)
        if result:
            self.cache[cache_key] = result
            return result
        
        # Try Open Library as fallback
        result = await self._search_open_library(series_name, author)
        if result:
            self.cache[cache_key] = result
            return result
        
        return None
    
    async def _search_google_books(self, series_name: str, author: Optional[str] = None) -> Optional[SeriesInfo]:
        """Search Google Books API for series information"""
        try:
            # Try multiple search strategies for better results
            search_queries = []
            
            # Strategy 1: Exact series name with author
            if author:
                search_queries.append(f'intitle:"{series_name}" inauthor:"{author}"')
            
            # Strategy 2: Series name without quotes to catch variations
            if author:
                search_queries.append(f'intitle:{series_name.replace(" ", "+")} inauthor:"{author}"')
            else:
                search_queries.append(f'intitle:{series_name.replace(" ", "+")}')
            
            # Strategy 3: Search for individual book titles if it's a known series
            if "lord of the rings" in series_name.lower():
                search_queries = [
                    f'intitle:"fellowship of the ring" inauthor:"{author}"' if author else 'intitle:"fellowship of the ring"',
                    f'intitle:"two towers" inauthor:"{author}"' if author else 'intitle:"two towers"',
                    f'intitle:"return of the king" inauthor:"{author}"' if author else 'intitle:"return of the king"'
                ]
            elif "harry potter" in series_name.lower():
                search_queries = [
                    f'intitle:"harry potter philosopher" inauthor:"{author}"' if author else 'intitle:"harry potter philosopher"',
                    f'intitle:"harry potter chamber" inauthor:"{author}"' if author else 'intitle:"harry potter chamber"',
                    f'intitle:"harry potter prisoner" inauthor:"{author}"' if author else 'intitle:"harry potter prisoner"',
                    f'intitle:"harry potter goblet" inauthor:"{author}"' if author else 'intitle:"harry potter goblet"',
                    f'intitle:"harry potter phoenix" inauthor:"{author}"' if author else 'intitle:"harry potter phoenix"',
                    f'intitle:"harry potter prince" inauthor:"{author}"' if author else 'intitle:"harry potter prince"',
                    f'intitle:"harry potter hallows" inauthor:"{author}"' if author else 'intitle:"harry potter hallows"'
                ]
            
            all_books = []
            
            for query in search_queries:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://www.googleapis.com/books/v1/volumes",
                        params={
                            "q": query,
                            "maxResults": 40,
                            "orderBy": "relevance"
                        },
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("items"):
                            books = self._parse_google_books_results(data["items"], series_name, author)
                            all_books.extend(books)
            
            if not all_books:
                return None
            
            # Remove duplicates based on position
            unique_books = {}
            for book in all_books:
                if book.position not in unique_books:
                    unique_books[book.position] = book
            
            sorted_books = sorted(unique_books.values(), key=lambda x: x.position)
            
            if not sorted_books:
                return None
                
            return SeriesInfo(
                series_name=series_name,
                total_books=len(sorted_books),
                known_books=sorted_books,
                source="google_books"
            )
        
        except Exception as e:
            print(f"Error searching Google Books for {series_name}: {e}")
            return None
    
    async def _search_open_library(self, series_name: str, author: Optional[str] = None) -> Optional[SeriesInfo]:
        """Search Open Library API for series information"""
        try:
            # Build search query
            query_parts = [f'title:"{series_name}"']
            if author:
                query_parts.append(f'author:"{author}"')
            
            query = " ".join(query_parts)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://openlibrary.org/search.json",
                    params={
                        "q": query,
                        "limit": 40
                    },
                    timeout=10
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                if not data.get("docs"):
                    return None
                
                # Parse results
                books = self._parse_open_library_results(data["docs"], series_name)
                if not books:
                    return None
                
                return SeriesInfo(
                    series_name=series_name,
                    total_books=len(books),
                    known_books=books,
                    source="open_library"
                )
        
        except Exception as e:
            print(f"Error searching Open Library for {series_name}: {e}")
            return None
    
    def _parse_google_books_results(self, items: List[Dict], series_name: str, author: Optional[str] = None) -> List[SeriesBook]:
        """Parse Google Books API results"""
        books = []
        
        for item in items:
            volume_info = item.get("volumeInfo", {})
            title = volume_info.get("title", "")
            book_authors = volume_info.get("authors", [])
            
            if not title:
                continue
            
            # If we have an author filter, check if this book matches
            if author:
                author_match = any(author.lower() in book_author.lower() or book_author.lower() in author.lower() 
                                 for book_author in book_authors)
                if not author_match:
                    continue
            
            # Extract series position - try multiple strategies
            position = self._extract_series_position(title, series_name)
            
            # Special handling for well-known series
            if position is None and "lord of the rings" in series_name.lower():
                if "fellowship" in title.lower():
                    position = 1
                elif "two towers" in title.lower():
                    position = 2
                elif "return" in title.lower() and "king" in title.lower():
                    position = 3
            elif position is None and "harry potter" in series_name.lower():
                if "philosopher" in title.lower() or "sorcerer" in title.lower():
                    position = 1
                elif "chamber" in title.lower():
                    position = 2
                elif "prisoner" in title.lower():
                    position = 3
                elif "goblet" in title.lower():
                    position = 4
                elif "phoenix" in title.lower() or "order" in title.lower():
                    position = 5
                elif "prince" in title.lower():
                    position = 6
                elif "hallows" in title.lower():
                    position = 7
            
            if position is None:
                continue
            
            # Get ISBN
            isbn = None
            identifiers = volume_info.get("industryIdentifiers", [])
            for identifier in identifiers:
                if identifier.get("type") in ["ISBN_13", "ISBN_10"]:
                    isbn = identifier.get("identifier")
                    break
            
            books.append(SeriesBook(
                position=position,
                title=title,
                isbn=isbn,
                author=book_authors[0] if book_authors else "Unknown Author",
                published_date=volume_info.get("publishedDate")
            ))
        
        return books
    
    def _parse_open_library_results(self, docs: List[Dict], series_name: str) -> List[SeriesBook]:
        """Parse Open Library API results"""
        books = []
        
        for doc in docs:
            title = doc.get("title", "")
            
            if not title:
                continue
            
            # Extract series position
            position = self._extract_series_position(title, series_name)
            if position is None:
                continue
            
            books.append(SeriesBook(
                position=position,
                title=title,
                isbn=doc.get("isbn", [None])[0] if doc.get("isbn") else None,
                author=doc.get("author_name", ["Unknown Author"])[0],
                published_date=str(doc.get("first_publish_year", "")) if doc.get("first_publish_year") else None
            ))
        
        # Sort by position and remove duplicates
        books.sort(key=lambda x: x.position)
        seen_positions = set()
        unique_books = []
        for book in books:
            if book.position not in seen_positions:
                unique_books.append(book)
                seen_positions.add(book.position)
        
        return unique_books
    
    def _extract_series_position(self, title: str, series_name: str) -> Optional[int]:
        """Extract series position from book title"""
        # Escape series name for regex
        escaped_series = re.escape(series_name)
        
        # Common patterns for series positions
        patterns = [
            rf"{escaped_series}\s*#?(\d+)",
            rf"{escaped_series}\s*(?:book|volume|part)\s*(\d+)",
            r"\b(?:book|volume|part)\s*(\d+)\b",
            r"#(\d+)\b",
            r"\b(\d+)(?:st|nd|rd|th)?\s*(?:book|volume|part)?\b"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                try:
                    position = int(match.group(1))
                    if 1 <= position <= 50:  # Reasonable range
                        return position
                except ValueError:
                    continue
        
        return None

# Global service instance
series_service = SeriesService()

@router.get("/info/{series_name}", response_model=SeriesInfo)
async def get_series_info(
    series_name: str,
    author: Optional[str] = Query(None, description="Author name to help narrow down search")
):
    """Get information about a book series from external APIs"""
    try:
        series_info = await series_service.get_series_info(series_name, author)
        
        if not series_info:
            raise HTTPException(
                status_code=404, 
                detail=f"No series information found for '{series_name}'"
            )
        
        return series_info
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching series information: {str(e)}"
        )

@router.post("/clear-cache")
async def clear_cache():
    """Clear the series information cache"""
    series_service.cache.clear()
    return {"message": "Series cache cleared successfully"}