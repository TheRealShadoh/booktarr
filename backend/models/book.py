from typing import Optional, List
from datetime import date
from sqlmodel import SQLModel, Field, Relationship


class Book(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    authors: str  # JSON serialized list
    series_name: Optional[str] = None
    series_position: Optional[int] = None
    openlibrary_id: Optional[str] = None
    google_books_id: Optional[str] = None

    editions: List["Edition"] = Relationship(back_populates="book")


class Edition(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    isbn_10: Optional[str] = None
    isbn_13: Optional[str] = None
    book_id: int = Field(foreign_key="book.id")
    book_format: Optional[str] = None  # hardcover, paperback, ebook, audiobook
    publisher: Optional[str] = None
    release_date: Optional[date] = None
    cover_url: Optional[str] = None
    price: Optional[float] = None
    source: Optional[str] = None  # openlibrary, google, amazon, etc.

    book: Book = Relationship(back_populates="editions")
    user_statuses: List["UserEditionStatus"] = Relationship(back_populates="edition")
    reading_progress: List["ReadingProgress"] = Relationship(back_populates="edition")


class UserEditionStatus(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    edition_id: int = Field(foreign_key="edition.id")
    status: str  # 'own', 'want', or 'missing'
    notes: Optional[str] = None

    edition: Edition = Relationship(back_populates="user_statuses")