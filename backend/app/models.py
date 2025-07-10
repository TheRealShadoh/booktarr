from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict
from datetime import date, datetime
from enum import Enum

class MetadataSource(str, Enum):
    SKOOLIB = "skoolib"
    GOOGLE_BOOKS = "google_books"
    OPEN_LIBRARY = "open_library"

class PriceInfo(BaseModel):
    source: str
    price: float
    currency: str = "USD"
    url: Optional[HttpUrl] = None
    last_updated: datetime

class Book(BaseModel):
    isbn: str  # Primary ISBN (13 preferred, 10 fallback)
    title: str
    authors: List[str]
    series: Optional[str] = None
    series_position: Optional[int] = None
    publisher: Optional[str] = None
    published_date: Optional[date] = None
    page_count: Optional[int] = None
    language: str = "en"
    thumbnail_url: Optional[HttpUrl] = None
    description: Optional[str] = None
    categories: List[str] = []
    pricing: List[PriceInfo] = []
    metadata_source: MetadataSource
    added_date: datetime
    last_updated: datetime
    
    # Legacy fields for backward compatibility
    isbn10: Optional[str] = None
    isbn13: Optional[str] = None
    
class SeriesGroup(BaseModel):
    series_name: str
    books: List[Book]
    book_count: int
    
class BooksResponse(BaseModel):
    series: Dict[str, List[Book]]
    total_books: int
    total_series: int
    last_sync: datetime
    
class Settings(BaseModel):
    skoolib_url: Optional[str] = None
    google_books_api_key: Optional[str] = None
    open_library_api_key: Optional[str] = None
    cache_ttl: int = 3600
    enable_price_lookup: bool = True
    default_language: str = "en"
    
class SettingsResponse(BaseModel):
    message: str
    settings: Settings

# Search-related models
class SearchResultModel(BaseModel):
    """Search result with book data and relevance score"""
    book: Book
    score: float
    source: str

class SearchResponse(BaseModel):
    """Response for book search endpoint"""
    results: List[SearchResultModel]
    total_found: int
    query: str
    search_time: float

class AddBookRequest(BaseModel):
    """Request to add a book to the library"""
    isbn: str
    source: Optional[str] = None  # Optional source identifier for tracking

class AddBookResponse(BaseModel):
    """Response after adding a book to the library"""
    success: bool
    message: str
    book: Optional[Book] = None
    already_exists: bool = False