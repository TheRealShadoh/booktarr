"""
Enhanced SQLAlchemy database models for Booktarr with book editions support
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from .connection import Base
import uuid

class BookModel(Base):
    """
    Core book model - represents a book title across all editions
    """
    __tablename__ = "books_v2"
    
    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Core book information (shared across editions)
    title = Column(String, nullable=False, index=True)
    authors = Column(JSON, default=list)  # JSON array of author names
    series = Column(String, nullable=True, index=True)
    series_position = Column(Integer, nullable=True)
    categories = Column(JSON, default=list)  # JSON array of categories
    
    # Timestamps
    added_date = Column(DateTime, default=func.now(), nullable=False)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    editions = relationship("BookEditionModel", back_populates="book", cascade="all, delete-orphan")
    ownership = relationship("UserBookOwnershipModel", back_populates="book", uselist=False, cascade="all, delete-orphan")

class BookEditionModel(Base):
    """
    Book edition model - represents a specific ISBN/printing of a book
    """
    __tablename__ = "book_editions"
    
    # Primary key
    isbn = Column(String, primary_key=True, index=True)
    
    # Foreign key to book
    book_id = Column(String, ForeignKey("books_v2.id"), nullable=False, index=True)
    
    # Edition-specific information
    isbn10 = Column(String, nullable=True)
    isbn13 = Column(String, nullable=True)
    publisher = Column(String, nullable=True)
    published_date = Column(String, nullable=True)  # Store as ISO string
    page_count = Column(Integer, nullable=True)
    language = Column(String, default="en")
    edition_type = Column(String, default="unknown")  # hardcover, paperback, ebook, etc.
    
    # Content and metadata
    thumbnail_url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    pricing = Column(JSON, default=list)  # JSON array of price objects
    
    # Metadata tracking
    metadata_source = Column(String, default="google_books")
    metadata_enhanced = Column(Boolean, default=False)
    metadata_enhanced_date = Column(DateTime, nullable=True)
    metadata_sources_used = Column(JSON, default=list)
    
    # Timestamps
    added_date = Column(DateTime, default=func.now(), nullable=False)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    book = relationship("BookModel", back_populates="editions")

class UserBookOwnershipModel(Base):
    """
    User's ownership and reading progress for a book
    """
    __tablename__ = "user_book_ownership"
    
    # Primary key
    book_id = Column(String, ForeignKey("books_v2.id"), primary_key=True, index=True)
    
    # Ownership information
    owned_editions = Column(JSON, default=list)  # List of ISBN(s) user owns
    selected_edition = Column(String, nullable=True)  # Primary edition for reading progress
    
    # Reading progress and status fields (tied to selected_edition)
    reading_status = Column(String, default="unread")  # unread, reading, read, wishlist, dnf
    reading_progress_pages = Column(Integer, nullable=True)  # Current page number
    reading_progress_percentage = Column(Float, nullable=True)  # Percentage read (0-100)
    date_started = Column(String, nullable=True)  # Store as ISO date string
    date_finished = Column(String, nullable=True)  # Store as ISO date string
    personal_rating = Column(Float, nullable=True)  # 1-5 star rating
    personal_notes = Column(Text, nullable=True)
    reading_goal_id = Column(String, nullable=True)  # Reference to reading goal
    times_read = Column(Integer, default=0)  # Number of times this book has been read
    
    # Timestamps
    date_added_to_library = Column(DateTime, default=func.now(), nullable=False)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    book = relationship("BookModel", back_populates="ownership")

# Keep existing models for backward compatibility during migration
class BookModelLegacy(Base):
    """
    Legacy book model for backward compatibility
    """
    __tablename__ = "books"
    
    # Primary key
    isbn = Column(String, primary_key=True, index=True)
    
    # Basic book information
    title = Column(String, nullable=False, index=True)
    authors = Column(JSON, default=list)  # JSON array of author names
    series = Column(String, nullable=True, index=True)
    series_position = Column(Integer, nullable=True)
    
    # Publication details
    publisher = Column(String, nullable=True)
    published_date = Column(String, nullable=True)  # Store as ISO string
    page_count = Column(Integer, nullable=True)
    language = Column(String, default="en")
    
    # Content and metadata
    thumbnail_url = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    categories = Column(JSON, default=list)  # JSON array of categories
    
    # Pricing information
    pricing = Column(JSON, default=list)  # JSON array of price objects
    
    # Legacy ISBN fields
    isbn10 = Column(String, nullable=True)
    isbn13 = Column(String, nullable=True)
    
    # Reading progress and status fields
    reading_status = Column(String, default="unread")  # unread, reading, read, wishlist, dnf
    reading_progress_pages = Column(Integer, nullable=True)  # Current page number
    reading_progress_percentage = Column(Float, nullable=True)  # Percentage read (0-100)
    date_started = Column(String, nullable=True)  # Store as ISO date string
    date_finished = Column(String, nullable=True)  # Store as ISO date string
    personal_rating = Column(Float, nullable=True)  # 1-5 star rating
    personal_notes = Column(Text, nullable=True)
    reading_goal_id = Column(String, nullable=True)  # Reference to reading goal
    times_read = Column(Integer, default=0)  # Number of times this book has been read
    
    # Metadata tracking
    metadata_source = Column(String, default="skoolib")  # skoolib, google_books, open_library
    metadata_enhanced = Column(Boolean, default=False)  # Whether metadata has been enhanced
    metadata_enhanced_date = Column(DateTime, nullable=True)  # When metadata was last enhanced
    metadata_sources_used = Column(JSON, default=list)  # List of sources used for enhancement
    added_date = Column(DateTime, default=func.now(), nullable=False)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

class SettingsModel(Base):
    """
    Application settings model
    """
    __tablename__ = "settings"
    
    key = Column(String, primary_key=True, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

class SyncHistoryModel(Base):
    """
    Sync history tracking model
    """
    __tablename__ = "sync_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String, nullable=False)  # skoolib, manual, etc.
    url = Column(Text, nullable=True)  # Source URL if applicable
    books_found = Column(Integer, default=0)
    books_processed = Column(Integer, default=0)
    success = Column(Boolean, default=False)
    error_details = Column(JSON, nullable=True)  # JSON array of error messages
    
    # Timestamps
    started_at = Column(DateTime, default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)