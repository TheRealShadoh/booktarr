"""
Kindle library synchronization service
Note: Amazon does not provide a public API for Kindle libraries.
This service provides integration points for manual import and
future scraping/integration methods.
"""
import asyncio
import json
import os
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import AsyncSessionLocal
from app.database.models import BookModel
from app.database.models_amazon import AmazonLibraryItem, BookEdition
from app.services.amazon_auth_service import amazon_auth_service
from app.config.logging import get_logger

logger = get_logger(__name__)


class KindleSyncService:
    """Service for Kindle library integration"""
    
    def __init__(self):
        self.supported_formats = ['azw', 'azw3', 'mobi', 'pdf', 'epub', 'txt']
    
    async def import_kindle_library_csv(
        self,
        csv_content: str,
        user_id: str = "default"
    ) -> Dict[str, Any]:
        """Import Kindle library from CSV export"""
        try:
            import csv
            import io
            
            # Get or create auth entry for Kindle
            auth_data = await amazon_auth_service.get_auth_credentials('kindle', user_id)
            if not auth_data:
                # Create minimal auth entry for CSV import
                auth_id = await amazon_auth_service.store_auth_credentials(
                    service='kindle',
                    auth_data={'method': 'csv_import', 'imported_at': datetime.utcnow().isoformat()},
                    marketplace='us',
                    user_id=user_id
                )
            else:
                auth_id = auth_data['auth_id']
            
            # Create sync job
            job_id = await amazon_auth_service.create_sync_job(
                auth_id=auth_id,
                job_type='csv_import',
                service='kindle'
            )
            
            # Parse CSV
            reader = csv.DictReader(io.StringIO(csv_content))
            items = list(reader)
            
            # Start processing in background
            asyncio.create_task(self._process_kindle_csv_items(job_id, items, user_id))
            
            return {
                'success': True,
                'job_id': job_id,
                'items_found': len(items),
                'message': f'Kindle CSV import started for {len(items)} items'
            }
            
        except Exception as e:
            logger.error(f"Failed to import Kindle CSV: {e}")
            return {'success': False, 'error': str(e)}
    
    async def import_kindle_library_json(
        self,
        json_content: str,
        user_id: str = "default"
    ) -> Dict[str, Any]:
        """Import Kindle library from JSON export"""
        try:
            data = json.loads(json_content)
            items = data if isinstance(data, list) else data.get('items', [])
            
            # Get or create auth entry
            auth_data = await amazon_auth_service.get_auth_credentials('kindle', user_id)
            if not auth_data:
                auth_id = await amazon_auth_service.store_auth_credentials(
                    service='kindle',
                    auth_data={'method': 'json_import', 'imported_at': datetime.utcnow().isoformat()},
                    marketplace='us',
                    user_id=user_id
                )
            else:
                auth_id = auth_data['auth_id']
            
            # Create sync job
            job_id = await amazon_auth_service.create_sync_job(
                auth_id=auth_id,
                job_type='json_import',
                service='kindle'
            )
            
            # Start processing in background
            asyncio.create_task(self._process_kindle_json_items(job_id, items, user_id))
            
            return {
                'success': True,
                'job_id': job_id,
                'items_found': len(items),
                'message': f'Kindle JSON import started for {len(items)} items'
            }
            
        except Exception as e:
            logger.error(f"Failed to import Kindle JSON: {e}")
            return {'success': False, 'error': str(e)}
    
    async def scan_kindle_device(
        self,
        device_path: str,
        user_id: str = "default"
    ) -> Dict[str, Any]:
        """Scan connected Kindle device for books"""
        try:
            if not os.path.exists(device_path):
                return {'success': False, 'error': 'Kindle device not found'}
            
            # Look for Kindle documents folder
            documents_path = os.path.join(device_path, 'documents')
            if not os.path.exists(documents_path):
                return {'success': False, 'error': 'Kindle documents folder not found'}
            
            # Get or create auth entry
            auth_data = await amazon_auth_service.get_auth_credentials('kindle', user_id)
            if not auth_data:
                auth_id = await amazon_auth_service.store_auth_credentials(
                    service='kindle',
                    auth_data={'method': 'device_scan', 'device_path': device_path, 'scanned_at': datetime.utcnow().isoformat()},
                    marketplace='us',
                    user_id=user_id
                )
            else:
                auth_id = auth_data['auth_id']
            
            # Create sync job
            job_id = await amazon_auth_service.create_sync_job(
                auth_id=auth_id,
                job_type='device_scan',
                service='kindle'
            )
            
            # Scan for ebook files
            book_files = []
            for root, dirs, files in os.walk(documents_path):
                for file in files:
                    if any(file.lower().endswith(f'.{fmt}') for fmt in self.supported_formats):
                        file_path = os.path.join(root, file)
                        book_files.append({
                            'filename': file,
                            'path': file_path,
                            'size': os.path.getsize(file_path),
                            'modified': datetime.fromtimestamp(os.path.getmtime(file_path))
                        })
            
            # Start processing in background
            asyncio.create_task(self._process_kindle_device_files(job_id, book_files, user_id))
            
            return {
                'success': True,
                'job_id': job_id,
                'files_found': len(book_files),
                'message': f'Kindle device scan started, found {len(book_files)} ebook files'
            }
            
        except Exception as e:
            logger.error(f"Failed to scan Kindle device: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _process_kindle_csv_items(self, job_id: int, items: List[Dict[str, Any]], user_id: str) -> None:
        """Process Kindle library items from CSV"""
        try:
            await amazon_auth_service.update_sync_job(job_id, 'running')
            
            metrics = {
                'books_found': len(items),
                'books_added': 0,
                'books_updated': 0,
                'books_failed': 0
            }
            
            for item in items:
                try:
                    # Extract book data from CSV row
                    book_data = self._extract_book_data_from_csv(item)
                    
                    # Store raw library item
                    await self._store_kindle_library_item(item, user_id, 'csv')
                    
                    # Find or create book
                    book = await self._find_or_create_kindle_book(book_data)
                    
                    # Create edition
                    edition_data = self._extract_kindle_edition_data(item, 'csv')
                    await self._create_or_update_kindle_edition(book.isbn, edition_data)
                    
                    metrics['books_added'] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to process CSV item: {e}")
                    metrics['books_failed'] += 1
            
            await amazon_auth_service.update_sync_job(job_id, 'completed', metrics)
            logger.info(f"Kindle CSV import completed: {metrics}")
            
        except Exception as e:
            logger.error(f"Kindle CSV processing failed: {e}")
            await amazon_auth_service.update_sync_job(job_id, 'failed', error=str(e))
    
    async def _process_kindle_json_items(self, job_id: int, items: List[Dict[str, Any]], user_id: str) -> None:
        """Process Kindle library items from JSON"""
        try:
            await amazon_auth_service.update_sync_job(job_id, 'running')
            
            metrics = {
                'books_found': len(items),
                'books_added': 0,
                'books_updated': 0,
                'books_failed': 0
            }
            
            for item in items:
                try:
                    # Extract book data from JSON
                    book_data = self._extract_book_data_from_json(item)
                    
                    # Store raw library item
                    await self._store_kindle_library_item(item, user_id, 'json')
                    
                    # Find or create book
                    book = await self._find_or_create_kindle_book(book_data)
                    
                    # Create edition
                    edition_data = self._extract_kindle_edition_data(item, 'json')
                    await self._create_or_update_kindle_edition(book.isbn, edition_data)
                    
                    metrics['books_added'] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to process JSON item: {e}")
                    metrics['books_failed'] += 1
            
            await amazon_auth_service.update_sync_job(job_id, 'completed', metrics)
            logger.info(f"Kindle JSON import completed: {metrics}")
            
        except Exception as e:
            logger.error(f"Kindle JSON processing failed: {e}")
            await amazon_auth_service.update_sync_job(job_id, 'failed', error=str(e))
    
    async def _process_kindle_device_files(self, job_id: int, files: List[Dict[str, Any]], user_id: str) -> None:
        """Process Kindle device files"""
        try:
            await amazon_auth_service.update_sync_job(job_id, 'running')
            
            metrics = {
                'books_found': len(files),
                'books_added': 0,
                'books_updated': 0,
                'books_failed': 0
            }
            
            for file_info in files:
                try:
                    # Extract book data from filename
                    book_data = self._extract_book_data_from_file(file_info)
                    
                    # Store raw library item
                    await self._store_kindle_library_item(file_info, user_id, 'device')
                    
                    # Find or create book
                    book = await self._find_or_create_kindle_book(book_data)
                    
                    # Create edition
                    edition_data = self._extract_kindle_edition_data(file_info, 'device')
                    await self._create_or_update_kindle_edition(book.isbn, edition_data)
                    
                    metrics['books_added'] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to process file {file_info.get('filename')}: {e}")
                    metrics['books_failed'] += 1
            
            await amazon_auth_service.update_sync_job(job_id, 'completed', metrics)
            logger.info(f"Kindle device scan completed: {metrics}")
            
        except Exception as e:
            logger.error(f"Kindle device processing failed: {e}")
            await amazon_auth_service.update_sync_job(job_id, 'failed', error=str(e))
    
    def _extract_book_data_from_csv(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Extract book data from CSV row"""
        title = row.get('Title', row.get('title', 'Unknown Title'))
        authors = row.get('Author', row.get('authors', 'Unknown Author'))
        if isinstance(authors, str):
            authors = [authors]
        
        return {
            'title': title,
            'authors': authors,
            'asin': row.get('ASIN', row.get('asin')),
            'description': row.get('Description', row.get('description', '')),
            'isbn': row.get('ISBN', row.get('isbn'))
        }
    
    def _extract_book_data_from_json(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Extract book data from JSON item"""
        title = item.get('title', 'Unknown Title')
        authors = item.get('authors', ['Unknown Author'])
        if isinstance(authors, str):
            authors = [authors]
        
        return {
            'title': title,
            'authors': authors,
            'asin': item.get('asin'),
            'description': item.get('description', ''),
            'isbn': item.get('isbn')
        }
    
    def _extract_book_data_from_file(self, file_info: Dict[str, Any]) -> Dict[str, Any]:
        """Extract book data from file info"""
        filename = file_info['filename']
        # Remove extension
        title = os.path.splitext(filename)[0]
        
        # Try to extract author from filename if it follows "Author - Title" pattern
        if ' - ' in title:
            parts = title.split(' - ', 1)
            if len(parts) == 2:
                author, title = parts
                authors = [author.strip()]
            else:
                authors = ['Unknown Author']
        else:
            authors = ['Unknown Author']
        
        return {
            'title': title.strip(),
            'authors': authors,
            'filename': filename,
            'file_path': file_info['path']
        }
    
    def _extract_kindle_edition_data(self, item: Dict[str, Any], source_type: str) -> Dict[str, Any]:
        """Extract Kindle edition data"""
        format_ext = None
        file_size = None
        
        if source_type == 'device':
            filename = item.get('filename', '')
            format_ext = os.path.splitext(filename)[1].lstrip('.')
            file_size = item.get('size')
        
        return {
            'edition_type': 'kindle',
            'format': format_ext or 'azw',
            'source': 'kindle',
            'asin': item.get('asin') or item.get('ASIN'),
            'kindle_asin': item.get('asin') or item.get('ASIN'),
            'title': item.get('title') or item.get('Title'),
            'file_size_mb': file_size // (1024 * 1024) if file_size else None,
            'is_owned': True,
            'download_path': item.get('path') if source_type == 'device' else None,
            'is_downloaded': source_type == 'device',
            'amazon_metadata': item,
            'last_synced': datetime.utcnow(),
            'sync_source': f'kindle_{source_type}'
        }
    
    async def _store_kindle_library_item(self, item: Dict[str, Any], user_id: str, source_type: str) -> None:
        """Store raw Kindle library item"""
        try:
            auth_data = await amazon_auth_service.get_auth_credentials('kindle', user_id)
            if not auth_data:
                return
            
            title = item.get('title') or item.get('Title') or item.get('filename', 'Unknown')
            authors = item.get('authors') or item.get('Author') or ['Unknown']
            if isinstance(authors, str):
                authors = [authors]
            
            library_item = AmazonLibraryItem(
                auth_id=auth_data['auth_id'],
                service='kindle',
                asin=item.get('asin') or item.get('ASIN') or f"KINDLE_{title}",
                title=title,
                authors=authors,
                description=item.get('description') or item.get('Description'),
                page_count=item.get('page_count'),
                file_size=item.get('size'),
                raw_data=item
            )
            
            async with AsyncSessionLocal() as session:
                session.add(library_item)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Failed to store Kindle library item: {e}")
    
    async def _find_or_create_kindle_book(self, book_data: Dict[str, Any]) -> BookModel:
        """Find existing book or create new one for Kindle"""
        try:
            async with AsyncSessionLocal() as session:
                # Try to find existing book
                existing_book = None
                
                # Try by ISBN first
                if book_data.get('isbn'):
                    result = await session.execute(
                        select(BookModel).where(BookModel.isbn == book_data['isbn'])
                    )
                    existing_book = result.scalar_one_or_none()
                
                # Try by title and author
                if not existing_book and book_data.get('title') and book_data.get('authors'):
                    result = await session.execute(
                        select(BookModel).where(
                            BookModel.title == book_data['title'],
                            BookModel.authors.contains([book_data['authors'][0]])
                        )
                    )
                    existing_book = result.scalar_one_or_none()
                
                if existing_book:
                    return existing_book
                
                # Create new book
                isbn = book_data.get('isbn') or book_data.get('asin') or f"KINDLE_{book_data['title']}"
                
                new_book = BookModel(
                    isbn=isbn,
                    title=book_data['title'],
                    authors=book_data['authors'],
                    description=book_data.get('description', ''),
                    metadata_source='kindle',
                    added_date=datetime.utcnow(),
                    last_updated=datetime.utcnow()
                )
                
                session.add(new_book)
                await session.commit()
                
                logger.info(f"Created new book from Kindle: {new_book.title}")
                return new_book
                
        except Exception as e:
            logger.error(f"Failed to find or create Kindle book: {e}")
            raise
    
    async def _create_or_update_kindle_edition(self, book_isbn: str, edition_data: Dict[str, Any]) -> None:
        """Create or update Kindle edition"""
        try:
            async with AsyncSessionLocal() as session:
                # Check if edition already exists
                asin = edition_data.get('asin') or edition_data.get('kindle_asin')
                
                existing_edition = None
                if asin:
                    result = await session.execute(
                        select(BookEdition).where(
                            BookEdition.book_isbn == book_isbn,
                            BookEdition.asin == asin
                        )
                    )
                    existing_edition = result.scalar_one_or_none()
                
                if existing_edition:
                    # Update existing edition
                    for key, value in edition_data.items():
                        if hasattr(existing_edition, key):
                            setattr(existing_edition, key, value)
                    existing_edition.updated_at = datetime.utcnow()
                else:
                    # Create new edition
                    edition = BookEdition(
                        book_isbn=book_isbn,
                        **edition_data
                    )
                    session.add(edition)
                
                await session.commit()
                
        except Exception as e:
            logger.error(f"Failed to create/update Kindle edition: {e}")


# Global service instance
kindle_sync_service = KindleSyncService()