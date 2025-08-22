"""
MF-001: Advanced Book Search API

Comprehensive search API that:
1. Searches local database first
2. Falls back to external APIs if needed
3. Supports ISBN, title, author, and series search
4. Returns structured JSON with relevance scoring
5. Handles fuzzy matching and partial searches
"""

from fastapi import APIRouter, Query, Depends, HTTPException
from sqlmodel import Session, select, or_, and_, func
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel
import json
import re
from datetime import datetime

try:
    from database import get_session
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress
    from models.series import Series, SeriesVolume
    from services.book_search import BookSearchService
    from services.cache import JsonCache
    from clients.google_books import GoogleBooksClient
    from clients.openlibrary import OpenLibraryClient
except ImportError:
    from database import get_session
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress
    from models.series import Series, SeriesVolume
    from services.book_search import BookSearchService
    from services.cache import JsonCache
    from clients.google_books import GoogleBooksClient
    from clients.openlibrary import OpenLibraryClient


router = APIRouter(prefix="/search", tags=["advanced_search"])


class SearchRequest(BaseModel):
    """Search request model"""
    query: str
    search_type: Optional[str] = "auto"  # auto, isbn, title, author, series
    include_owned: bool = True
    include_external: bool = True
    max_results: int = 20
    user_id: int = 1


class SearchResult(BaseModel):
    """Individual search result"""
    book_id: Optional[int] = None
    isbn: Optional[str] = None
    title: str
    authors: List[str]
    series_name: Optional[str] = None
    series_position: Optional[int] = None
    publisher: Optional[str] = None
    published_date: Optional[str] = None
    page_count: Optional[int] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    rating: Optional[float] = None
    owned: bool = False
    reading_status: Optional[str] = None
    source: str  # "local" or "external"
    relevance_score: float = 0.0
    metadata_source: Optional[str] = None


class SearchResponse(BaseModel):
    """Search response model"""
    success: bool
    query: str
    search_type: str
    total_results: int
    local_results: int
    external_results: int
    results: List[SearchResult]
    execution_time_ms: float
    suggestions: List[str] = []


class AdvancedSearchService:
    """Advanced search service with local-first approach"""
    
    def __init__(self, session: Session):
        self.session = session
        self.book_search_service = BookSearchService()
        self.cache = JsonCache()
        self.google_client = GoogleBooksClient()
        self.openlibrary_client = OpenLibraryClient()
    
    async def search(self, request: SearchRequest) -> SearchResponse:
        """Perform comprehensive search"""
        start_time = datetime.now()
        
        # Determine search type
        search_type = self._determine_search_type(request.query, request.search_type)
        
        # Search local database first
        local_results = await self._search_local(request, search_type)
        
        # Search external APIs if needed and enabled
        external_results = []
        if request.include_external and len(local_results) < request.max_results:
            remaining_slots = request.max_results - len(local_results)
            external_results = await self._search_external(request, search_type, remaining_slots)
        
        # Combine and rank results
        all_results = local_results + external_results
        ranked_results = self._rank_results(all_results, request.query, search_type)
        
        # Limit final results
        final_results = ranked_results[:request.max_results]
        
        # Calculate execution time
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds() * 1000
        
        # Generate search suggestions
        suggestions = self._generate_suggestions(request.query, search_type, local_results)
        
        return SearchResponse(
            success=True,
            query=request.query,
            search_type=search_type,
            total_results=len(final_results),
            local_results=len(local_results),
            external_results=len(external_results),
            results=final_results,
            execution_time_ms=execution_time,
            suggestions=suggestions
        )
    
    def _determine_search_type(self, query: str, search_type: str) -> str:
        """Determine the type of search based on query"""
        if search_type != "auto":
            return search_type
        
        # Clean query for analysis
        clean_query = query.strip().replace("-", "")
        
        # Check for ISBN (10 or 13 digits)
        if clean_query.isdigit() and len(clean_query) in [10, 13]:
            return "isbn"
        
        # Check for series patterns
        series_indicators = ["vol", "volume", "book", "#", "tome", "part"]
        query_lower = query.lower()
        if any(indicator in query_lower for indicator in series_indicators):
            return "series"
        
        # Check for author patterns (Last, First or common author indicators)
        if "," in query or any(word in query_lower for word in ["by", "author:"]):
            return "author"
        
        # Default to title search
        return "title"
    
    async def _search_local(self, request: SearchRequest, search_type: str) -> List[SearchResult]:
        """Search local database"""
        results = []
        
        if search_type == "isbn":
            results = await self._search_local_isbn(request.query)
        elif search_type == "title":
            results = await self._search_local_title(request.query)
        elif search_type == "author":
            results = await self._search_local_author(request.query)
        elif search_type == "series":
            results = await self._search_local_series(request.query)
        else:
            # Multi-field search for "auto" type
            results = await self._search_local_multi(request.query)
        
        # Add ownership and reading status info
        for result in results:
            await self._enrich_local_result(result, request.user_id)
        
        return results
    
    async def _search_local_isbn(self, query: str) -> List[SearchResult]:
        """Search by ISBN in local database"""
        clean_isbn = query.replace("-", "").replace(" ", "")
        
        # Search editions by ISBN
        editions = self.session.exec(
            select(Edition).where(
                or_(
                    Edition.isbn_10 == clean_isbn,
                    Edition.isbn_13 == clean_isbn
                )
            )
        ).all()
        
        results = []
        for edition in editions:
            book = self.session.exec(
                select(Book).where(Book.id == edition.book_id)
            ).first()
            
            if book:
                result = self._book_to_search_result(book, edition, "local")
                result.relevance_score = 1.0  # Exact ISBN match
                results.append(result)
        
        return results
    
    async def _search_local_title(self, query: str) -> List[SearchResult]:
        """Search by title in local database"""
        query_lower = query.lower()
        
        # Use fuzzy matching for titles
        books = self.session.exec(
            select(Book).where(
                func.lower(Book.title).contains(query_lower)
            )
        ).all()
        
        results = []
        for book in books:
            edition = self.session.exec(
                select(Edition).where(Edition.book_id == book.id)
            ).first()
            
            result = self._book_to_search_result(book, edition, "local")
            result.relevance_score = self._calculate_title_relevance(book.title, query)
            results.append(result)
        
        return sorted(results, key=lambda x: x.relevance_score, reverse=True)
    
    async def _search_local_author(self, query: str) -> List[SearchResult]:
        """Search by author in local database"""
        query_lower = query.lower()
        
        # Search in JSON authors field
        books = self.session.exec(
            select(Book).where(
                func.lower(Book.authors).contains(query_lower)
            )
        ).all()
        
        results = []
        for book in books:
            try:
                authors = json.loads(book.authors) if book.authors else []
                if any(query_lower in author.lower() for author in authors):
                    edition = self.session.exec(
                        select(Edition).where(Edition.book_id == book.id)
                    ).first()
                    
                    result = self._book_to_search_result(book, edition, "local")
                    result.relevance_score = self._calculate_author_relevance(authors, query)
                    results.append(result)
            except json.JSONDecodeError:
                continue
        
        return sorted(results, key=lambda x: x.relevance_score, reverse=True)
    
    async def _search_local_series(self, query: str) -> List[SearchResult]:
        """Search by series in local database"""
        query_lower = query.lower()
        
        # Search books by series name
        books = self.session.exec(
            select(Book).where(
                and_(
                    Book.series_name.is_not(None),
                    func.lower(Book.series_name).contains(query_lower)
                )
            ).order_by(Book.series_position)
        ).all()
        
        results = []
        for book in books:
            edition = self.session.exec(
                select(Edition).where(Edition.book_id == book.id)
            ).first()
            
            result = self._book_to_search_result(book, edition, "local")
            result.relevance_score = self._calculate_series_relevance(book.series_name, query)
            results.append(result)
        
        return results
    
    async def _search_local_multi(self, query: str) -> List[SearchResult]:
        """Multi-field search in local database"""
        query_lower = query.lower()
        
        # Search across title, authors, and series
        books = self.session.exec(
            select(Book).where(
                or_(
                    func.lower(Book.title).contains(query_lower),
                    func.lower(Book.authors).contains(query_lower),
                    func.lower(Book.series_name).contains(query_lower)
                )
            )
        ).all()
        
        results = []
        for book in books:
            edition = self.session.exec(
                select(Edition).where(Edition.book_id == book.id)
            ).first()
            
            result = self._book_to_search_result(book, edition, "local")
            
            # Calculate multi-field relevance
            title_score = self._calculate_title_relevance(book.title, query)
            try:
                authors = json.loads(book.authors) if book.authors else []
                author_score = self._calculate_author_relevance(authors, query)
            except json.JSONDecodeError:
                author_score = 0.0
            
            series_score = self._calculate_series_relevance(book.series_name, query) if book.series_name else 0.0
            
            # Weighted combination
            result.relevance_score = (title_score * 0.5) + (author_score * 0.3) + (series_score * 0.2)
            results.append(result)
        
        return sorted(results, key=lambda x: x.relevance_score, reverse=True)
    
    async def _search_external(self, request: SearchRequest, search_type: str, max_results: int) -> List[SearchResult]:
        """Search external APIs"""
        external_results = []
        
        try:
            # Try Google Books first
            google_results = await self._search_google_books(request.query, search_type, max_results)
            external_results.extend(google_results)
            
            # Try OpenLibrary if we need more results
            if len(external_results) < max_results:
                remaining = max_results - len(external_results)
                openlibrary_results = await self._search_openlibrary(request.query, search_type, remaining)
                external_results.extend(openlibrary_results)
        
        except Exception as e:
            print(f"External search error: {e}")
        
        return external_results[:max_results]
    
    async def _search_google_books(self, query: str, search_type: str, max_results: int) -> List[SearchResult]:
        """Search Google Books API"""
        try:
            if search_type == "isbn":
                google_data = await self.google_client.search_by_isbn(query)
                if google_data:
                    return [self._google_to_search_result(google_data)]
            else:
                # For other search types, use general search
                # This would need to be implemented in the GoogleBooksClient
                pass
        except Exception as e:
            print(f"Google Books search error: {e}")
        
        return []
    
    async def _search_openlibrary(self, query: str, search_type: str, max_results: int) -> List[SearchResult]:
        """Search OpenLibrary API"""
        try:
            if search_type == "isbn":
                ol_data = await self.openlibrary_client.search_by_isbn(query)
                if ol_data:
                    return [self._openlibrary_to_search_result(ol_data)]
            else:
                # For other search types, use general search
                # This would need to be implemented in the OpenLibraryClient
                pass
        except Exception as e:
            print(f"OpenLibrary search error: {e}")
        
        return []
    
    def _book_to_search_result(self, book: Book, edition: Optional[Edition], source: str) -> SearchResult:
        """Convert Book model to SearchResult"""
        try:
            authors = json.loads(book.authors) if book.authors else []
        except json.JSONDecodeError:
            authors = [book.authors] if book.authors else []
        
        return SearchResult(
            book_id=book.id,
            isbn=edition.isbn_13 or edition.isbn_10 if edition else None,
            title=book.title,
            authors=authors,
            series_name=book.series_name,
            series_position=book.series_position,
            publisher=edition.publisher if edition else None,
            published_date=str(edition.release_date) if edition and edition.release_date else None,
            page_count=None,  # Not stored in current model
            description=book.description if hasattr(book, 'description') else None,
            cover_url=edition.cover_url if edition else None,
            source=source,
            relevance_score=0.0
        )
    
    def _google_to_search_result(self, google_data: Dict[str, Any]) -> SearchResult:
        """Convert Google Books data to SearchResult"""
        return SearchResult(
            isbn=google_data.get('isbn_13') or google_data.get('isbn_10'),
            title=google_data.get('title', ''),
            authors=google_data.get('authors', []),
            publisher=google_data.get('publisher'),
            published_date=google_data.get('published_date'),
            page_count=google_data.get('page_count'),
            description=google_data.get('description'),
            cover_url=google_data.get('thumbnail_url'),
            source="external",
            metadata_source="google_books",
            relevance_score=0.8  # External results get lower base score
        )
    
    def _openlibrary_to_search_result(self, ol_data: Dict[str, Any]) -> SearchResult:
        """Convert OpenLibrary data to SearchResult"""
        return SearchResult(
            isbn=ol_data.get('isbn_13') or ol_data.get('isbn_10'),
            title=ol_data.get('title', ''),
            authors=ol_data.get('authors', []),
            publisher=ol_data.get('publisher'),
            published_date=ol_data.get('published_date'),
            description=ol_data.get('description'),
            cover_url=ol_data.get('thumbnail_url'),
            source="external",
            metadata_source="openlibrary",
            relevance_score=0.8
        )
    
    async def _enrich_local_result(self, result: SearchResult, user_id: int):
        """Add ownership and reading status to local results"""
        if result.book_id:
            # Check ownership
            edition = self.session.exec(
                select(Edition).where(Edition.book_id == result.book_id)
            ).first()
            
            if edition:
                ownership = self.session.exec(
                    select(UserEditionStatus).where(
                        and_(
                            UserEditionStatus.edition_id == edition.id,
                            UserEditionStatus.user_id == user_id
                        )
                    )
                ).first()
                
                result.owned = ownership is not None
                
                # Check reading progress
                progress = self.session.exec(
                    select(ReadingProgress).where(
                        and_(
                            ReadingProgress.edition_id == edition.id,
                            ReadingProgress.user_id == user_id
                        )
                    ).first()
                )
                
                if progress:
                    result.reading_status = progress.status
                    result.rating = progress.rating
    
    def _calculate_title_relevance(self, title: str, query: str) -> float:
        """Calculate relevance score for title match"""
        title_lower = title.lower()
        query_lower = query.lower()
        
        # Exact match gets highest score
        if title_lower == query_lower:
            return 1.0
        
        # Starts with gets high score
        if title_lower.startswith(query_lower):
            return 0.9
        
        # Contains gets medium score based on position
        if query_lower in title_lower:
            position = title_lower.find(query_lower)
            length_factor = len(query) / len(title)
            position_factor = 1.0 - (position / len(title))
            return 0.5 + (0.3 * length_factor) + (0.2 * position_factor)
        
        # Fuzzy matching for partial words
        query_words = query_lower.split()
        title_words = title_lower.split()
        matches = sum(1 for word in query_words if any(word in title_word for title_word in title_words))
        return (matches / len(query_words)) * 0.4
    
    def _calculate_author_relevance(self, authors: List[str], query: str) -> float:
        """Calculate relevance score for author match"""
        query_lower = query.lower()
        
        for author in authors:
            author_lower = author.lower()
            
            # Exact match
            if author_lower == query_lower:
                return 1.0
            
            # Contains match
            if query_lower in author_lower:
                return 0.8
            
            # Partial name match
            query_words = query_lower.split()
            author_words = author_lower.split()
            matches = sum(1 for word in query_words if word in author_words)
            if matches > 0:
                return (matches / len(query_words)) * 0.6
        
        return 0.0
    
    def _calculate_series_relevance(self, series_name: Optional[str], query: str) -> float:
        """Calculate relevance score for series match"""
        if not series_name:
            return 0.0
        
        series_lower = series_name.lower()
        query_lower = query.lower()
        
        # Exact match
        if series_lower == query_lower:
            return 1.0
        
        # Contains match
        if query_lower in series_lower:
            return 0.7
        
        # Partial word match
        query_words = query_lower.split()
        series_words = series_lower.split()
        matches = sum(1 for word in query_words if any(word in series_word for series_word in series_words))
        return (matches / len(query_words)) * 0.5
    
    def _rank_results(self, results: List[SearchResult], query: str, search_type: str) -> List[SearchResult]:
        """Apply final ranking to search results"""
        # Boost local results
        for result in results:
            if result.source == "local":
                result.relevance_score += 0.1
            
            # Boost owned books
            if result.owned:
                result.relevance_score += 0.05
        
        return sorted(results, key=lambda x: x.relevance_score, reverse=True)
    
    def _generate_suggestions(self, query: str, search_type: str, local_results: List[SearchResult]) -> List[str]:
        """Generate search suggestions"""
        suggestions = []
        
        # If no local results, suggest variations
        if not local_results:
            if search_type == "title":
                suggestions.append(f"Try searching for author instead")
                suggestions.append(f"Check spelling of '{query}'")
            elif search_type == "author":
                suggestions.append(f"Try searching for book title instead")
            
        # Suggest related series if applicable
        if local_results and search_type != "series":
            series_names = set(r.series_name for r in local_results if r.series_name)
            for series in list(series_names)[:3]:
                suggestions.append(f"Explore series: {series}")
        
        return suggestions


@router.post("/advanced", response_model=SearchResponse)
async def advanced_search(
    request: SearchRequest,
    session: Session = Depends(get_session)
) -> SearchResponse:
    """
    Advanced book search with local-first approach
    
    Features:
    - Searches local database first for better performance
    - Falls back to external APIs if needed
    - Supports ISBN, title, author, and series search
    - Provides relevance scoring and ranking
    - Includes ownership and reading status
    """
    search_service = AdvancedSearchService(session)
    return await search_service.search(request)


@router.get("/suggestions")
async def get_search_suggestions(
    query: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=20),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get search suggestions based on partial query
    """
    query_lower = query.lower()
    
    # Get title suggestions
    title_suggestions = session.exec(
        select(Book.title).where(
            func.lower(Book.title).contains(query_lower)
        ).limit(limit)
    ).all()
    
    # Get author suggestions
    author_suggestions = []
    books_with_authors = session.exec(
        select(Book.authors).where(
            func.lower(Book.authors).contains(query_lower)
        ).limit(limit)
    ).all()
    
    for authors_json in books_with_authors:
        try:
            authors = json.loads(authors_json) if authors_json else []
            for author in authors:
                if query_lower in author.lower() and author not in author_suggestions:
                    author_suggestions.append(author)
                    if len(author_suggestions) >= limit:
                        break
        except json.JSONDecodeError:
            continue
    
    # Get series suggestions
    series_suggestions = session.exec(
        select(Book.series_name).where(
            and_(
                Book.series_name.is_not(None),
                func.lower(Book.series_name).contains(query_lower)
            )
        ).distinct().limit(limit)
    ).all()
    
    return {
        "success": True,
        "query": query,
        "suggestions": {
            "titles": list(title_suggestions)[:limit//3],
            "authors": author_suggestions[:limit//3],
            "series": list(series_suggestions)[:limit//3]
        }
    }


@router.get("/isbn/{isbn}")
async def search_by_isbn(
    isbn: str,
    include_external: bool = Query(True),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Search for a specific book by ISBN
    """
    request = SearchRequest(
        query=isbn,
        search_type="isbn",
        include_external=include_external,
        max_results=5
    )
    
    search_service = AdvancedSearchService(session)
    result = await search_service.search(request)
    
    if result.total_results > 0:
        return {
            "success": True,
            "book": result.results[0],
            "alternatives": result.results[1:] if len(result.results) > 1 else []
        }
    else:
        return {
            "success": False,
            "message": f"No book found with ISBN: {isbn}",
            "isbn": isbn
        }