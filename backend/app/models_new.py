from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict
from datetime import date, datetime
from enum import Enum
import uuid

class MetadataSource(str, Enum):
    SKOOLIB = "skoolib"
    GOOGLE_BOOKS = "google_books"
    OPEN_LIBRARY = "open_library"

class ReadingStatus(str, Enum):
    UNREAD = "unread"
    READING = "reading"
    READ = "read"
    WISHLIST = "wishlist"
    DNF = "dnf"  # Did Not Finish

class EditionType(str, Enum):
    HARDCOVER = "hardcover"
    PAPERBACK = "paperback"
    EBOOK = "ebook"
    AUDIOBOOK = "audiobook"
    MASS_MARKET = "mass_market"
    TRADE_PAPERBACK = "trade_paperback"
    BOARD_BOOK = "board_book"
    UNKNOWN = "unknown"

class PriceInfo(BaseModel):
    source: str
    price: float
    currency: str = "USD"
    url: Optional[HttpUrl] = None
    last_updated: datetime

class BookEdition(BaseModel):
    """Represents a specific edition/printing of a book with unique ISBN"""
    isbn: str  # Primary key for this edition
    isbn10: Optional[str] = None
    isbn13: Optional[str] = None
    
    # Edition-specific information
    publisher: Optional[str] = None
    published_date: Optional[date] = None
    page_count: Optional[int] = None
    language: str = "en"
    edition_type: EditionType = EditionType.UNKNOWN
    thumbnail_url: Optional[HttpUrl] = None
    description: Optional[str] = None
    pricing: List[PriceInfo] = []
    
    # Metadata tracking
    metadata_source: MetadataSource
    added_date: datetime
    last_updated: datetime
    metadata_enhanced: bool = False
    metadata_enhanced_date: Optional[datetime] = None
    metadata_sources_used: List[str] = []

class UserBookOwnership(BaseModel):
    """Tracks which edition(s) a user owns and their reading progress"""
    book_id: str  # References Book.id
    owned_editions: List[str] = []  # List of ISBN(s) user owns
    selected_edition: Optional[str] = None  # Primary edition for reading progress
    
    # Reading progress (tied to selected_edition)
    reading_status: ReadingStatus = ReadingStatus.UNREAD
    reading_progress_pages: Optional[int] = None
    reading_progress_percentage: Optional[float] = None
    date_started: Optional[date] = None
    date_finished: Optional[date] = None
    personal_rating: Optional[float] = None
    personal_notes: Optional[str] = None
    reading_goal_id: Optional[str] = None
    times_read: int = 0
    
    # Ownership tracking
    date_added_to_library: datetime
    last_updated: datetime

class Book(BaseModel):
    """Core book information shared across all editions"""
    id: str  # Unique ID (UUID) for this book across all editions
    title: str
    authors: List[str]
    series: Optional[str] = None
    series_position: Optional[int] = None
    categories: List[str] = []
    
    # Available editions
    editions: List[BookEdition] = []
    
    # User ownership and reading data
    ownership: Optional[UserBookOwnership] = None
    
    # Computed fields
    @property
    def primary_edition(self) -> Optional[BookEdition]:
        """Get the primary edition (user's selected or most recent)"""
        if self.ownership and self.ownership.selected_edition:
            return next((e for e in self.editions if e.isbn == self.ownership.selected_edition), None)
        return self.editions[0] if self.editions else None
    
    @property
    def thumbnail_url(self) -> Optional[HttpUrl]:
        """Get thumbnail from primary edition"""
        primary = self.primary_edition
        return primary.thumbnail_url if primary else None
    
    @property
    def is_owned(self) -> bool:
        """Check if user owns any edition"""
        return self.ownership is not None and len(self.ownership.owned_editions) > 0

# Legacy compatibility model for existing API endpoints
class LegacyBook(BaseModel):
    """Backward compatible Book model for existing frontend"""
    isbn: str
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
    metadata_enhanced: bool = False
    metadata_enhanced_date: Optional[datetime] = None
    metadata_sources_used: List[str] = []
    isbn10: Optional[str] = None
    isbn13: Optional[str] = None
    reading_status: ReadingStatus = ReadingStatus.UNREAD
    reading_progress_pages: Optional[int] = None
    reading_progress_percentage: Optional[float] = None
    date_started: Optional[date] = None
    date_finished: Optional[date] = None
    personal_rating: Optional[float] = None
    personal_notes: Optional[str] = None
    reading_goal_id: Optional[str] = None
    times_read: int = 0

# Response models
class BookDetailResponse(BaseModel):
    """Detailed book information with all editions"""
    book: Book

class BooksResponse(BaseModel):
    series: Dict[str, List[LegacyBook]]  # For backward compatibility
    total_books: int
    total_series: int
    last_sync: datetime

# Request models
class AddBookRequest(BaseModel):
    isbn: Optional[str] = None  # Now optional
    title: Optional[str] = None  # Required if no ISBN
    authors: Optional[List[str]] = None  # Required if no ISBN

class SelectEditionRequest(BaseModel):
    book_id: str
    isbn: str  # Edition to select
    mark_as_owned: bool = True