from typing import Optional, List
from datetime import date
from sqlmodel import SQLModel, Field, Relationship
from pydantic import field_validator


class Series(SQLModel, table=True):
    """
    Series model to store comprehensive information about book series
    """
    __table_args__ = {'extend_existing': True}

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    total_books: Optional[int] = Field(default=None, ge=0)  # Must be >= 0
    author: Optional[str] = None
    publisher: Optional[str] = None
    first_published: Optional[date] = None
    last_published: Optional[date] = None
    status: Optional[str] = None  # ongoing, completed, hiatus, etc.
    genres: Optional[str] = None  # JSON serialized list
    tags: Optional[str] = None  # JSON serialized list
    universe: Optional[str] = None  # e.g., "Cosmere", "Middle Earth", "MCU"
    universe_order: Optional[int] = None  # Order within universe for visual grouping
    goodreads_id: Optional[str] = None
    openlibrary_id: Optional[str] = None
    google_books_id: Optional[str] = None
    anilist_id: Optional[int] = None  # AniList ID for manga series
    cover_url: Optional[str] = None
    created_date: date = Field(default_factory=date.today)
    last_updated: date = Field(default_factory=date.today)

    # Manga-specific metadata
    series_type: Optional[str] = None  # manga_series, light_novel_series, book_series, comic_series, web_series, etc.
    original_language: Optional[str] = None  # Language code: ja, ko, zh, en, etc.
    year_started: Optional[int] = None  # Year series began publication

    # Relationships
    volumes: List["SeriesVolume"] = Relationship(back_populates="series")
    serializations: List["Serialization"] = Relationship(back_populates="series")
    
    @field_validator('total_books')
    @classmethod
    def validate_total_books(cls, v):
        """Ensure total_books is reasonable"""
        if v is not None and v < 0:
            raise ValueError('total_books cannot be negative')
        if v is not None and v > 10000:  # Reasonable upper limit
            raise ValueError('total_books seems unreasonably high (>10000)')
        return v
    
    def validate_against_owned_count(self, session) -> bool:
        """
        Validate that total_books is not less than owned volumes
        This should be called before saving/updating a Series
        """
        if not self.id:
            return True  # New series, no volumes yet
        
        from sqlmodel import select
        volumes = session.exec(
            select(SeriesVolume).where(SeriesVolume.series_id == self.id)
        ).all()
        owned_count = len([v for v in volumes if v.status == "owned"])
        
        if self.total_books and self.total_books < owned_count:
            raise ValueError(f'total_books ({self.total_books}) cannot be less than owned volumes ({owned_count})')
        
        return True


class SeriesVolume(SQLModel, table=True):
    """
    Individual volumes/books in a series with their metadata
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    series_id: int = Field(foreign_key="series.id")
    position: int  # Book number in series
    title: str
    subtitle: Optional[str] = None
    isbn_10: Optional[str] = None
    isbn_13: Optional[str] = None
    publisher: Optional[str] = None
    published_date: Optional[date] = None
    page_count: Optional[int] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    goodreads_id: Optional[str] = None
    openlibrary_id: Optional[str] = None
    google_books_id: Optional[str] = None

    # Manga-specific metadata
    chapter_count: Optional[int] = None  # Number of chapters in this volume
    is_color: Optional[bool] = None  # Whether volume is in color or B&W (for manga)

    # Ownership tracking
    user_id: int = Field(default=1)  # Default user for now
    status: str = Field(default="missing")  # owned, wanted, missing
    owned_edition_id: Optional[int] = Field(default=None)  # Remove foreign key for now
    notes: Optional[str] = None
    date_acquired: Optional[date] = None

    # Relationships
    series: Series = Relationship(back_populates="volumes")


class Serialization(SQLModel, table=True):
    """
    Model for tracking serialization information - where and when a series was serialized.
    Used for manga and light novels that were serialized in magazines.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    series_id: int = Field(foreign_key="series.id")
    magazine_name: str  # e.g., "Weekly Shonen Jump", "Monthly Magazine Z"
    start_date: Optional[date] = None  # When serialization started
    end_date: Optional[date] = None  # When serialization ended
    region: Optional[str] = None  # Country/region (Japan, USA, Korea, etc.) - language code or country name
    notes: Optional[str] = None  # Additional info (e.g., "original serialization", "ongoing")

    # Relationships
    series: Series = Relationship(back_populates="serializations")