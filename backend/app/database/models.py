"""
SQLAlchemy database models for Booktarr
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Float, JSON
from sqlalchemy.sql import func
from datetime import datetime
from .connection import Base

class BookModel(Base):
    """
    Database model for books
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
    
    # Metadata tracking
    metadata_source = Column(String, default="skoolib")  # skoolib, google_books, open_library
    added_date = Column(DateTime, default=func.now(), nullable=False)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<BookModel(isbn='{self.isbn}', title='{self.title}')>"

class SettingsModel(Base):
    """
    Database model for application settings
    Key-value store for configuration
    """
    __tablename__ = "settings"
    
    key = Column(String, primary_key=True)
    value = Column(Text, nullable=True)  # JSON string for complex values
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<SettingsModel(key='{self.key}', value='{self.value}')>"

class SyncHistoryModel(Base):
    """
    Database model for sync history tracking
    """
    __tablename__ = "sync_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_type = Column(String, nullable=False)  # 'skoolib', 'manual', 'api'
    source_url = Column(Text, nullable=True)  # Source URL for sync
    
    # Timing information
    started_at = Column(DateTime, default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    
    # Results
    books_found = Column(Integer, default=0)
    books_added = Column(Integer, default=0)
    books_updated = Column(Integer, default=0)
    books_skipped = Column(Integer, default=0)
    
    # Status tracking
    status = Column(String, default="running")  # 'running', 'completed', 'failed', 'cancelled'
    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)  # Detailed error information
    
    # Additional metadata
    sync_metadata = Column(JSON, nullable=True)  # Store additional sync information
    
    def __repr__(self):
        return f"<SyncHistoryModel(id={self.id}, sync_type='{self.sync_type}', status='{self.status}')>"

# Additional utility models can be added here in the future
class CacheModel(Base):
    """
    Database model for persistent caching
    """
    __tablename__ = "cache"
    
    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)  # JSON string
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<CacheModel(key='{self.key}', expires_at='{self.expires_at}')>"