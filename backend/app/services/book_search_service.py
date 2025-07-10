"""
Book search service for Booktarr
Provides unified search functionality across multiple book APIs
"""
import asyncio
import logging
import re
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, date
from dataclasses import dataclass

from .google_books_service import GoogleBooksClient, GoogleBooksAPIError
from .open_library_service import OpenLibraryClient, OpenLibraryAPIError
from .cache_service import cache_service
from ..models import Book, MetadataSource, PriceInfo

logger = logging.getLogger(__name__)

@dataclass
class SearchResult:
    """Search result with scoring information"""
    book: Book
    score: float
    source: str
    
class BookSearchService:
    """
    Unified book search service that queries multiple APIs and provides
    ranking, scoring, and error handling
    """
    
    def __init__(self):
        self.google_client = None
        self.openlibrary_client = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.google_client = GoogleBooksClient()
        self.openlibrary_client = OpenLibraryClient()
        await self.google_client.__aenter__()
        await self.openlibrary_client.__aenter__()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.google_client:
            await self.google_client.__aexit__(exc_type, exc_val, exc_tb)
        if self.openlibrary_client:
            await self.openlibrary_client.__aexit__(exc_type, exc_val, exc_tb)
    
    async def search_books(self, query: str, max_results: int = 20) -> List[SearchResult]:
        """
        Search for books across multiple APIs and return unified results
        
        Args:
            query: Search query (title, author, ISBN)
            max_results: Maximum number of results to return
            
        Returns:
            List of SearchResult objects sorted by relevance score
        """
        # Check cache first
        cache_key = f"book_search_{hash(query)}_{max_results}"
        cached_result = cache_service.get_api_response(cache_key)
        if cached_result:
            logger.info(f"Returning cached search results for query: {query}")
            # Convert cached data back to SearchResult objects
            return [self._dict_to_search_result(result) for result in cached_result]
        
        logger.info(f"Searching for books with query: {query}")
        
        # Determine if query is an ISBN
        is_isbn = self._is_isbn(query)
        
        # Search results from different sources
        all_results = []
        
        try:
            # Search Google Books
            google_results = await self._search_google_books(query, max_results // 2, is_isbn)
            all_results.extend(google_results)
            logger.info(f"Found {len(google_results)} results from Google Books")
            
        except Exception as e:
            logger.warning(f"Google Books search failed: {e}")
        
        try:
            # Search Open Library (if not enough results from Google Books)
            if len(all_results) < max_results // 2:
                openlibrary_results = await self._search_open_library(query, max_results // 2, is_isbn)
                all_results.extend(openlibrary_results)
                logger.info(f"Found {len(openlibrary_results)} results from Open Library")
                
        except Exception as e:
            logger.warning(f"Open Library search failed: {e}")
        
        # Remove duplicates and score results
        unique_results = self._deduplicate_results(all_results)
        scored_results = self._score_results(unique_results, query)
        
        # Sort by score and limit results
        final_results = sorted(scored_results, key=lambda x: x.score, reverse=True)[:max_results]
        
        # Cache results for 30 minutes
        cache_data = [self._search_result_to_dict(result) for result in final_results]
        cache_service.set_api_response(cache_key, cache_data, ttl=1800)
        
        logger.info(f"Returning {len(final_results)} search results for query: {query}")
        return final_results
    
    async def get_book_by_isbn(self, isbn: str) -> Optional[Book]:
        """
        Get detailed book information by ISBN
        
        Args:
            isbn: ISBN-10 or ISBN-13
            
        Returns:
            Book object if found, None otherwise
        """
        # Check cache first
        cache_key = f"book_detail_{isbn}"
        cached_result = cache_service.get_api_response(cache_key)
        if cached_result:
            logger.info(f"Returning cached book details for ISBN: {isbn}")
            return Book(**cached_result)
        
        logger.info(f"Fetching book details for ISBN: {isbn}")
        
        # Try Google Books first
        try:
            metadata = await self.google_client.fetch_book_metadata(isbn)
            if metadata:
                book = self._metadata_to_book(metadata, isbn)
                # Cache for 24 hours
                cache_service.set_api_response(cache_key, book.dict(), ttl=86400)
                return book
        except Exception as e:
            logger.warning(f"Google Books lookup failed for ISBN {isbn}: {e}")
        
        # Fallback to Open Library
        try:
            metadata = await self.openlibrary_client.fetch_book_metadata(isbn)
            if metadata:
                book = self._metadata_to_book(metadata, isbn)
                # Cache for 24 hours
                cache_service.set_api_response(cache_key, book.dict(), ttl=86400)
                return book
        except Exception as e:
            logger.warning(f"Open Library lookup failed for ISBN {isbn}: {e}")
        
        logger.warning(f"No book found for ISBN: {isbn}")
        return None
    
    async def _search_google_books(self, query: str, max_results: int, is_isbn: bool) -> List[SearchResult]:
        """Search Google Books API"""
        results = []
        
        try:
            if is_isbn:
                # Direct ISBN lookup
                metadata = await self.google_client.fetch_book_metadata(query)
                if metadata:
                    book = self._metadata_to_book(metadata, query)
                    results.append(SearchResult(book=book, score=1.0, source="google_books"))
            else:
                # Text search using Google Books search API
                search_results = await self._google_books_text_search(query, max_results)
                for i, metadata in enumerate(search_results):
                    if metadata.get('isbn'):
                        book = self._metadata_to_book(metadata, metadata['isbn'])
                        # Higher score for earlier results
                        score = max(0.1, 1.0 - (i * 0.1))
                        results.append(SearchResult(book=book, score=score, source="google_books"))
                        
        except Exception as e:
            logger.error(f"Error searching Google Books: {e}")
            raise GoogleBooksAPIError(f"Google Books search failed: {e}")
        
        return results
    
    async def _search_open_library(self, query: str, max_results: int, is_isbn: bool) -> List[SearchResult]:
        """Search Open Library API"""
        results = []
        
        try:
            if is_isbn:
                # Direct ISBN lookup
                metadata = await self.openlibrary_client.fetch_book_metadata(query)
                if metadata:
                    book = self._metadata_to_book(metadata, query)
                    results.append(SearchResult(book=book, score=0.9, source="open_library"))
            else:
                # Text search using Open Library search API
                search_results = await self._open_library_text_search(query, max_results)
                for i, metadata in enumerate(search_results):
                    if metadata.get('isbn'):
                        book = self._metadata_to_book(metadata, metadata['isbn'])
                        # Slightly lower score than Google Books, higher score for earlier results
                        score = max(0.1, 0.9 - (i * 0.1))
                        results.append(SearchResult(book=book, score=score, source="open_library"))
                        
        except Exception as e:
            logger.error(f"Error searching Open Library: {e}")
            raise OpenLibraryAPIError(f"Open Library search failed: {e}")
        
        return results
    
    async def _google_books_text_search(self, query: str, max_results: int) -> List[Dict]:
        """Perform text search on Google Books API"""
        try:
            import httpx
            
            # Build search query
            search_params = {
                "q": query,
                "maxResults": min(max_results, 40),  # Google Books API limit
                "printType": "books"
            }
            
            # Add API key if available
            if self.google_client.api_key:
                search_params["key"] = self.google_client.api_key
            
            # Apply rate limiting
            await self.google_client._rate_limiter.acquire()
            
            response = await self.google_client.session.get(
                "https://www.googleapis.com/books/v1/volumes",
                params=search_params
            )
            response.raise_for_status()
            data = response.json()
            
            results = []
            if data.get("totalItems", 0) > 0:
                for item in data.get("items", []):
                    volume_info = item.get("volumeInfo", {})
                    sale_info = item.get("saleInfo", {})
                    
                    # Extract ISBN
                    isbn = self._extract_isbn_from_volume(volume_info)
                    if not isbn:
                        continue
                    
                    # Build metadata
                    metadata = {
                        "isbn": isbn,
                        "title": volume_info.get("title", "").strip(),
                        "authors": volume_info.get("authors", []),
                        "series": self.google_client._extract_series_info(volume_info),
                        "series_position": self.google_client._extract_series_position(volume_info),
                        "publisher": volume_info.get("publisher", "").strip(),
                        "published_date": self.google_client._parse_published_date(volume_info.get("publishedDate")),
                        "page_count": volume_info.get("pageCount"),
                        "language": volume_info.get("language", "en"),
                        "thumbnail_url": self.google_client._get_best_thumbnail(volume_info.get("imageLinks", {})),
                        "description": volume_info.get("description", "").strip(),
                        "categories": volume_info.get("categories", []),
                        "pricing": self.google_client._extract_pricing(sale_info),
                        "metadata_source": MetadataSource.GOOGLE_BOOKS
                    }
                    
                    results.append(metadata)
            
            return results
            
        except Exception as e:
            logger.error(f"Google Books text search failed: {e}")
            return []
    
    async def _open_library_text_search(self, query: str, max_results: int) -> List[Dict]:
        """Perform text search on Open Library API"""
        try:
            import httpx
            
            # Apply rate limiting
            await self.openlibrary_client._rate_limiter.acquire()
            
            # Open Library search API
            search_params = {
                "q": query,
                "limit": min(max_results, 100),  # Open Library limit
                "fields": "key,title,author_name,isbn,publisher,publish_date,number_of_pages,language,cover_i,subject"
            }
            
            response = await self.openlibrary_client.session.get(
                "https://openlibrary.org/search.json",
                params=search_params
            )
            response.raise_for_status()
            data = response.json()
            
            results = []
            for doc in data.get("docs", []):
                # Extract ISBN
                isbns = doc.get("isbn", [])
                if not isbns:
                    continue
                
                isbn = isbns[0]  # Use first available ISBN
                
                # Build metadata
                metadata = {
                    "isbn": isbn,
                    "title": doc.get("title", "").strip(),
                    "authors": doc.get("author_name", []),
                    "series": None,  # Open Library search doesn't provide series info
                    "series_position": None,
                    "publisher": doc.get("publisher", [None])[0] if doc.get("publisher") else None,
                    "published_date": self._parse_open_library_date(doc.get("publish_date", [None])[0]),
                    "page_count": doc.get("number_of_pages"),
                    "language": self._extract_open_library_language(doc.get("language", [])),
                    "thumbnail_url": self._get_open_library_cover(doc.get("cover_i")),
                    "description": "",  # Search API doesn't include description
                    "categories": doc.get("subject", [])[:10],  # Limit categories
                    "pricing": [],
                    "metadata_source": MetadataSource.OPEN_LIBRARY
                }
                
                results.append(metadata)
            
            return results
            
        except Exception as e:
            logger.error(f"Open Library text search failed: {e}")
            return []
    
    def _extract_isbn_from_volume(self, volume_info: Dict) -> Optional[str]:
        """Extract ISBN from Google Books volume info"""
        industry_identifiers = volume_info.get("industryIdentifiers", [])
        
        # Prefer ISBN-13, fallback to ISBN-10
        for identifier in industry_identifiers:
            if identifier.get("type") == "ISBN_13":
                return identifier.get("identifier")
        
        for identifier in industry_identifiers:
            if identifier.get("type") == "ISBN_10":
                return identifier.get("identifier")
        
        return None
    
    def _parse_open_library_date(self, date_str: Optional[str]) -> Optional[date]:
        """Parse Open Library date string"""
        if not date_str:
            return None
        
        # Try different formats
        formats = [
            "%Y",
            "%B %d, %Y",
            "%B %Y",
            "%Y-%m-%d",
            "%Y-%m"
        ]
        
        for fmt in formats:
            try:
                parsed = datetime.strptime(str(date_str), fmt)
                return parsed.date()
            except ValueError:
                continue
        
        return None
    
    def _extract_open_library_language(self, languages: List[str]) -> str:
        """Extract language from Open Library language list"""
        if languages:
            # Take first language and clean it
            lang = languages[0].strip()
            # Map common language codes
            lang_map = {
                "eng": "en",
                "english": "en",
                "spanish": "es",
                "esp": "es",
                "french": "fr",
                "fre": "fr",
                "german": "de",
                "ger": "de"
            }
            return lang_map.get(lang.lower(), lang)
        return "en"
    
    def _get_open_library_cover(self, cover_id: Optional[int]) -> Optional[str]:
        """Get Open Library cover URL"""
        if cover_id:
            return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
        return None
    
    def _metadata_to_book(self, metadata: Dict, isbn: str) -> Book:
        """Convert metadata dict to Book object"""
        current_time = datetime.now()
        
        return Book(
            isbn=isbn,
            title=metadata.get("title", "Unknown Title"),
            authors=metadata.get("authors", ["Unknown Author"]),
            series=metadata.get("series"),
            series_position=metadata.get("series_position"),
            publisher=metadata.get("publisher"),
            published_date=metadata.get("published_date"),
            page_count=metadata.get("page_count"),
            language=metadata.get("language", "en"),
            thumbnail_url=metadata.get("thumbnail_url"),
            description=metadata.get("description", ""),
            categories=metadata.get("categories", []),
            pricing=metadata.get("pricing", []),
            metadata_source=metadata.get("metadata_source", MetadataSource.GOOGLE_BOOKS),
            added_date=current_time,
            last_updated=current_time
        )
    
    def _is_isbn(self, query: str) -> bool:
        """Check if query is an ISBN"""
        # Remove hyphens and spaces
        clean_query = re.sub(r'[\s\-]', '', query)
        
        # Check if it's numeric and correct length
        if clean_query.isdigit():
            return len(clean_query) in [10, 13]
        
        # Check ISBN-10 with X check digit
        if len(clean_query) == 10 and clean_query[:9].isdigit() and clean_query[9].upper() == 'X':
            return True
        
        return False
    
    def _deduplicate_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """Remove duplicate books based on ISBN"""
        seen_isbns = set()
        unique_results = []
        
        for result in results:
            isbn = result.book.isbn
            if isbn not in seen_isbns:
                seen_isbns.add(isbn)
                unique_results.append(result)
        
        return unique_results
    
    def _score_results(self, results: List[SearchResult], query: str) -> List[SearchResult]:
        """Score search results based on relevance to query"""
        query_lower = query.lower()
        
        for result in results:
            book = result.book
            base_score = result.score
            
            # Title match scoring
            title_score = 0
            if query_lower in book.title.lower():
                title_score = 0.3
                if book.title.lower().startswith(query_lower):
                    title_score = 0.5
            
            # Author match scoring
            author_score = 0
            for author in book.authors:
                if query_lower in author.lower():
                    author_score = max(author_score, 0.2)
                    if author.lower().startswith(query_lower):
                        author_score = max(author_score, 0.3)
            
            # Series match scoring
            series_score = 0
            if book.series and query_lower in book.series.lower():
                series_score = 0.1
            
            # Publisher match scoring
            publisher_score = 0
            if book.publisher and query_lower in book.publisher.lower():
                publisher_score = 0.05
            
            # Metadata source preference (Google Books > Open Library)
            source_score = 0.1 if result.source == "google_books" else 0.05
            
            # Calculate final score
            relevance_score = title_score + author_score + series_score + publisher_score + source_score
            result.score = min(1.0, base_score + relevance_score)
        
        return results
    
    def _search_result_to_dict(self, result: SearchResult) -> Dict:
        """Convert SearchResult to dict for caching"""
        return {
            "book": result.book.dict(),
            "score": result.score,
            "source": result.source
        }
    
    def _dict_to_search_result(self, data: Dict) -> SearchResult:
        """Convert dict to SearchResult from cache"""
        return SearchResult(
            book=Book(**data["book"]),
            score=data["score"],
            source=data["source"]
        )

# Convenience function for standalone usage
async def search_books(query: str, max_results: int = 20) -> List[SearchResult]:
    """
    Standalone function to search for books
    
    Args:
        query: Search query (title, author, ISBN)
        max_results: Maximum number of results to return
        
    Returns:
        List of SearchResult objects sorted by relevance score
    """
    async with BookSearchService() as search_service:
        return await search_service.search_books(query, max_results)

async def get_book_by_isbn(isbn: str) -> Optional[Book]:
    """
    Standalone function to get book by ISBN
    
    Args:
        isbn: ISBN-10 or ISBN-13
        
    Returns:
        Book object if found, None otherwise
    """
    async with BookSearchService() as search_service:
        return await search_service.get_book_by_isbn(isbn)