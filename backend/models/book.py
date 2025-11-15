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
    genres: Optional[str] = None  # JSON serialized list of genres

    # Manga-specific metadata
    book_type: Optional[str] = None  # manga, light_novel, manhwa, manhua, web_novel, traditional_novel, graphic_novel, etc.
    original_title: Optional[str] = None  # Original title in native language (e.g., Japanese)
    original_language: Optional[str] = None  # Language code: ja, ko, zh, en, etc.
    anilist_id: Optional[int] = None  # AniList ID for manga

    # Smart Collection Features
    language: Optional[str] = None  # e.g., "en", "ja", "fr"
    page_count: Optional[int] = None
    description: Optional[str] = None
    categories: Optional[str] = None  # JSON serialized list (e.g., ["Fiction", "Fantasy"])
    tags: Optional[str] = None  # JSON serialized list (e.g., ["Isekai", "Found Family", "Time Travel"])

    editions: List["Edition"] = Relationship(back_populates="book")
    creators: List["Creator"] = Relationship(back_populates="book")


class Edition(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    isbn_10: Optional[str] = None
    isbn_13: Optional[str] = None
    book_id: int = Field(foreign_key="book.id")
    book_format: Optional[str] = None  # hardcover, paperback, ebook, audiobook, digital, paperback manga, hardcover manga, special edition
    publisher: Optional[str] = None
    release_date: Optional[date] = None
    cover_url: Optional[str] = None
    price: Optional[float] = None
    source: Optional[str] = None  # openlibrary, google, amazon, etc.
    page_count: Optional[int] = None  # Page count for this edition

    # Manga/translation specific
    language: Optional[str] = None  # Language of this edition (e.g., "en", "ja")
    translation_status: Optional[str] = None  # official, fan_translation, scanlation
    translator: Optional[str] = None  # Name of translator (JSON serialized list if multiple)
    is_color: Optional[bool] = None  # For manga: whether it's in color or B&W
    chapter_count: Optional[int] = None  # For manga: number of chapters
    format_variant: Optional[str] = None  # e.g., "deluxe hardcover", "box set", "omnibus", "limited edition"
    is_current_edition: Optional[bool] = None  # Whether this is the latest/preferred edition

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


class Creator(SQLModel, table=True):
    """
    Model for tracking creators (authors, artists, illustrators, translators) with their roles.
    Separates author from artist for manga/graphic novels where they may differ.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    book_id: int = Field(foreign_key="book.id")
    name: str
    role: str  # author, artist, mangaka, illustrator, translator, adapter, etc.
    language: Optional[str] = None  # Language they are credited in (important for translators)
    notes: Optional[str] = None  # Additional context (e.g., "original series artist", "English translator")

    book: Book = Relationship(back_populates="creators")