"""
Database service layer for Booktarr
Provides high-level database operations
"""
from typing import List, Optional, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func, or_
from sqlalchemy.orm import selectinload
import json
import logging
from datetime import datetime, date

from .models import BookModel, SettingsModel, SyncHistoryModel, CacheModel
from .connection import get_async_session, AsyncSessionLocal
from ..models import Book, Settings, MetadataSource

logger = logging.getLogger(__name__)

class BookService:
    """Service for book-related database operations"""
    
    @staticmethod
    async def get_all_books() -> List[BookModel]:
        """Get all books from database"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(BookModel).order_by(BookModel.title))
            return result.scalars().all()
    
    @staticmethod
    async def get_book_by_isbn(isbn: str) -> Optional[BookModel]:
        """Get a book by ISBN"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(BookModel).where(BookModel.isbn == isbn))
            return result.scalar_one_or_none()
    
    @staticmethod
    async def get_books_by_series(series: str) -> List[BookModel]:
        """Get all books in a series"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(BookModel)
                .where(BookModel.series == series)
                .order_by(BookModel.series_position, BookModel.title)
            )
            return result.scalars().all()
    
    @staticmethod
    async def search_books(query: str) -> List[BookModel]:
        """Search books by title, author, or series"""
        async with AsyncSessionLocal() as session:
            # Create search conditions
            search_pattern = f"%{query.lower()}%"
            conditions = or_(
                func.lower(BookModel.title).like(search_pattern),
                func.lower(BookModel.series).like(search_pattern),
                # Note: JSON search is database-specific, this is a simplified version
                BookModel.authors.like(search_pattern)
            )
            
            result = await session.execute(
                select(BookModel)
                .where(conditions)
                .order_by(BookModel.title)
            )
            return result.scalars().all()
    
    @staticmethod
    async def create_book(book_data: Dict[str, Any]) -> BookModel:
        """Create a new book"""
        async with AsyncSessionLocal() as session:
            book = BookModel(**book_data)
            session.add(book)
            await session.commit()
            await session.refresh(book)
            return book
    
    @staticmethod
    async def update_book(isbn: str, book_data: Dict[str, Any]) -> Optional[BookModel]:
        """Update an existing book"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(BookModel).where(BookModel.isbn == isbn))
            book = result.scalar_one_or_none()
            
            if book:
                for key, value in book_data.items():
                    if hasattr(book, key):
                        setattr(book, key, value)
                book.last_updated = datetime.utcnow()
                await session.commit()
                await session.refresh(book)
            
            return book
    
    @staticmethod
    async def delete_book(isbn: str) -> bool:
        """Delete a book by ISBN"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(delete(BookModel).where(BookModel.isbn == isbn))
            await session.commit()
            return result.rowcount > 0
    
    @staticmethod
    async def get_books_grouped_by_series() -> Dict[str, List[BookModel]]:
        """Get all books grouped by series"""
        books = await BookService.get_all_books()
        
        grouped = {}
        standalone = []
        
        for book in books:
            if book.series:
                if book.series not in grouped:
                    grouped[book.series] = []
                grouped[book.series].append(book)
            else:
                standalone.append(book)
        
        # Sort books within each series
        for series_books in grouped.values():
            series_books.sort(key=lambda x: (x.series_position or 999, x.title))
        
        # Add standalone books
        if standalone:
            standalone.sort(key=lambda x: x.title)
            grouped["Standalone"] = standalone
        
        return grouped
    
    @staticmethod
    async def get_books_by_status(status: str) -> List[BookModel]:
        """Get all books with a specific reading status"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(BookModel)
                .where(BookModel.reading_status == status)
                .order_by(BookModel.title)
            )
            return result.scalars().all()

class SettingsService:
    """Service for settings-related database operations"""
    
    @staticmethod
    async def get_setting(key: str) -> Optional[str]:
        """Get a setting value by key"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(SettingsModel).where(SettingsModel.key == key))
            setting = result.scalar_one_or_none()
            return setting.value if setting else None
    
    @staticmethod
    async def set_setting(key: str, value: str) -> None:
        """Set a setting value"""
        async with AsyncSessionLocal() as session:
            # Try to update existing setting
            result = await session.execute(select(SettingsModel).where(SettingsModel.key == key))
            setting = result.scalar_one_or_none()
            
            if setting:
                setting.value = value
                setting.updated_at = datetime.utcnow()
            else:
                setting = SettingsModel(key=key, value=value)
                session.add(setting)
            
            await session.commit()
    
    @staticmethod
    async def get_all_settings() -> Dict[str, str]:
        """Get all settings as a dictionary"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(SettingsModel))
            settings = result.scalars().all()
            return {setting.key: setting.value for setting in settings}
    
    @staticmethod
    async def delete_setting(key: str) -> bool:
        """Delete a setting"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(delete(SettingsModel).where(SettingsModel.key == key))
            await session.commit()
            return result.rowcount > 0

class SyncHistoryService:
    """Service for sync history operations"""
    
    @staticmethod
    async def create_sync_record(sync_type: str, source_url: Optional[str] = None) -> SyncHistoryModel:
        """Create a new sync history record"""
        async with AsyncSessionLocal() as session:
            sync_record = SyncHistoryModel(
                sync_type=sync_type,
                source_url=source_url,
                status="running"
            )
            session.add(sync_record)
            await session.commit()
            await session.refresh(sync_record)
            return sync_record
    
    @staticmethod
    async def update_sync_record(
        sync_id: int,
        status: str,
        books_found: int = 0,
        books_added: int = 0,
        books_updated: int = 0,
        books_skipped: int = 0,
        error_message: Optional[str] = None,
        error_details: Optional[Dict] = None,
        sync_metadata: Optional[Dict] = None
    ) -> Optional[SyncHistoryModel]:
        """Update a sync history record"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(SyncHistoryModel).where(SyncHistoryModel.id == sync_id))
            sync_record = result.scalar_one_or_none()
            
            if sync_record:
                sync_record.status = status
                sync_record.books_found = books_found
                sync_record.books_added = books_added
                sync_record.books_updated = books_updated
                sync_record.books_skipped = books_skipped
                sync_record.error_message = error_message
                sync_record.error_details = error_details
                sync_record.sync_metadata = sync_metadata
                
                if status in ["completed", "failed", "cancelled"]:
                    sync_record.completed_at = datetime.utcnow()
                    if sync_record.started_at:
                        duration = sync_record.completed_at - sync_record.started_at
                        sync_record.duration_seconds = duration.total_seconds()
                
                await session.commit()
                await session.refresh(sync_record)
            
            return sync_record
    
    @staticmethod
    async def get_recent_syncs(limit: int = 10) -> List[SyncHistoryModel]:
        """Get recent sync history records"""
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(SyncHistoryModel)
                .order_by(SyncHistoryModel.started_at.desc())
                .limit(limit)
            )
            return result.scalars().all()
    
    @staticmethod
    async def create_sync_record(sync_data: Dict[str, Any]) -> SyncHistoryModel:
        """Create a sync history record with provided data"""
        async with AsyncSessionLocal() as session:
            # Map the new API to the existing model structure
            sync_record = SyncHistoryModel(
                sync_type=sync_data.get('source', 'manual'),
                source_url=sync_data.get('url'),
                status="completed" if sync_data.get('success', False) else "failed",
                books_found=sync_data.get('books_found', 0),
                books_added=sync_data.get('books_processed', 0),  # Map books_processed to books_added
                books_updated=0,
                books_skipped=0,
                started_at=sync_data.get('timestamp', datetime.utcnow()),
                completed_at=sync_data.get('timestamp', datetime.utcnow()),
                error_details=sync_data.get('error_details'),
                sync_metadata={"manual": True}
            )
            session.add(sync_record)
            await session.commit()
            await session.refresh(sync_record)
            return sync_record
    
    @staticmethod
    async def get_sync_history(limit: int = 10) -> List[SyncHistoryModel]:
        """Get sync history records (alias for get_recent_syncs)"""
        return await SyncHistoryService.get_recent_syncs(limit)

# AsyncSessionLocal is imported at the top of the file