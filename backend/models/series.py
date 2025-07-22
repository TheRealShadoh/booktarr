from typing import Optional, List
from datetime import date
from sqlmodel import SQLModel, Field, Relationship


class Series(SQLModel, table=True):
    """
    Series model to store comprehensive information about book series
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    total_books: Optional[int] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    first_published: Optional[date] = None
    last_published: Optional[date] = None
    status: Optional[str] = None  # ongoing, completed, hiatus, etc.
    genres: Optional[str] = None  # JSON serialized list
    tags: Optional[str] = None  # JSON serialized list
    goodreads_id: Optional[str] = None
    openlibrary_id: Optional[str] = None
    google_books_id: Optional[str] = None
    cover_url: Optional[str] = None
    created_date: date = Field(default_factory=date.today)
    last_updated: date = Field(default_factory=date.today)

    # Relationships
    volumes: List["SeriesVolume"] = Relationship(back_populates="series")


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
    
    # Ownership tracking
    user_id: int = Field(default=1)  # Default user for now
    status: str = Field(default="missing")  # owned, wanted, missing
    owned_edition_id: Optional[int] = Field(default=None)  # Remove foreign key for now
    notes: Optional[str] = None
    date_acquired: Optional[date] = None
    
    # Relationships
    series: Series = Relationship(back_populates="volumes")