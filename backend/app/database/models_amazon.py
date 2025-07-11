"""
Database models for Amazon Audible and Kindle integration
"""
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .connection import Base


class AmazonAuth(Base):
    """Amazon authentication credentials storage"""
    __tablename__ = "amazon_auth"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default")  # Support for multi-user in future
    service = Column(String, index=True)  # 'audible' or 'kindle'
    
    # Encrypted authentication data
    auth_data = Column(Text)  # Encrypted JSON containing tokens/credentials
    marketplace = Column(String, default="us")  # Audible marketplace (us, uk, de, etc.)
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime, nullable=True)
    sync_status = Column(String, default="pending")  # pending, syncing, completed, error
    sync_error = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sync_jobs = relationship("AmazonSyncJob", back_populates="auth", cascade="all, delete-orphan")


class AmazonSyncJob(Base):
    """Track Amazon library sync operations"""
    __tablename__ = "amazon_sync_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    auth_id = Column(Integer, ForeignKey("amazon_auth.id"), index=True)
    
    job_type = Column(String)  # 'full_sync', 'incremental_sync', 'single_book'
    service = Column(String)  # 'audible' or 'kindle'
    status = Column(String, default="pending")  # pending, running, completed, failed
    
    # Job metrics
    books_found = Column(Integer, default=0)
    books_added = Column(Integer, default=0)
    books_updated = Column(Integer, default=0)
    books_failed = Column(Integer, default=0)
    
    # Job details
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    job_data = Column(JSON, nullable=True)  # Additional job-specific data
    
    # Relationships
    auth = relationship("AmazonAuth", back_populates="sync_jobs")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BookEdition(Base):
    """Track different editions/formats of books (Audible, Kindle, Physical)"""
    __tablename__ = "book_editions"
    
    id = Column(Integer, primary_key=True, index=True)
    book_isbn = Column(String, ForeignKey("books.isbn"), index=True)
    
    # Edition details
    edition_type = Column(String)  # 'audible', 'kindle', 'physical', 'epub', 'pdf'
    format = Column(String, nullable=True)  # 'aax', 'aaxc', 'azw3', 'mobi', 'pdf', 'epub'
    source = Column(String)  # 'audible', 'kindle', 'manual', 'import'
    
    # Amazon-specific identifiers
    asin = Column(String, nullable=True, index=True)  # Amazon Standard Identification Number
    audible_asin = Column(String, nullable=True)
    kindle_asin = Column(String, nullable=True)
    
    # Edition metadata
    title = Column(String, nullable=True)  # May differ from main book title
    subtitle = Column(String, nullable=True)
    narrator = Column(String, nullable=True)  # For audiobooks
    duration_minutes = Column(Integer, nullable=True)  # Audiobook duration
    file_size_mb = Column(Integer, nullable=True)
    
    # Purchase and availability info
    purchase_date = Column(DateTime, nullable=True)
    purchase_price = Column(String, nullable=True)
    is_owned = Column(Boolean, default=True)
    is_downloaded = Column(Boolean, default=False)
    download_path = Column(String, nullable=True)
    
    # Sync metadata
    amazon_metadata = Column(JSON, nullable=True)  # Raw Amazon metadata
    last_synced = Column(DateTime, nullable=True)
    sync_source = Column(String, nullable=True)  # Which sync job created this
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AmazonLibraryItem(Base):
    """Raw Amazon library items before processing"""
    __tablename__ = "amazon_library_items"
    
    id = Column(Integer, primary_key=True, index=True)
    auth_id = Column(Integer, ForeignKey("amazon_auth.id"), index=True)
    
    service = Column(String)  # 'audible' or 'kindle'
    asin = Column(String, index=True)
    
    # Raw item data from Amazon
    title = Column(String)
    subtitle = Column(String, nullable=True)
    authors = Column(JSON)  # List of author names
    narrator = Column(String, nullable=True)
    publisher = Column(String, nullable=True)
    
    # Identifiers
    isbn = Column(String, nullable=True)
    isbn10 = Column(String, nullable=True)
    isbn13 = Column(String, nullable=True)
    
    # Metadata
    description = Column(Text, nullable=True)
    genres = Column(JSON, nullable=True)  # List of genres
    release_date = Column(DateTime, nullable=True)
    purchase_date = Column(DateTime, nullable=True)
    
    # Audible-specific
    duration_minutes = Column(Integer, nullable=True)
    sample_url = Column(String, nullable=True)
    cover_url = Column(String, nullable=True)
    
    # Kindle-specific
    page_count = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    
    # Processing status
    processed = Column(Boolean, default=False)
    matched_isbn = Column(String, nullable=True)
    processing_error = Column(Text, nullable=True)
    
    # Raw Amazon data
    raw_data = Column(JSON)  # Complete raw response from Amazon
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)