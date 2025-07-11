"""
Database integration service for Booktarr
Provides integration between the FastAPI app and the database layer
"""
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, date

from ..database.services import BookService, SettingsService, SyncHistoryService
from ..database.models import BookModel, SettingsModel, SyncHistoryModel
from ..models import Book, Settings, BooksResponse, MetadataSource

logger = logging.getLogger(__name__)

class DatabaseIntegrationService:
    """Service to integrate database operations with the FastAPI app"""
    
    @staticmethod
    async def get_all_books_grouped() -> Dict[str, List[Book]]:
        """Get all books grouped by series, converted to Pydantic models"""
        try:
            books_by_series = await BookService.get_books_grouped_by_series()
            
            # Convert database models to Pydantic models
            result = {}
            for series_name, book_models in books_by_series.items():
                books = []
                for book_model in book_models:
                    book = DatabaseIntegrationService._convert_book_model_to_pydantic(book_model)
                    books.append(book)
                result[series_name] = books
            
            return result
        except Exception as e:
            logger.error(f"Error getting books from database: {e}")
            return {}
    
    @staticmethod
    async def get_books_response() -> BooksResponse:
        """Get books response with statistics"""
        books_by_series = await DatabaseIntegrationService.get_all_books_grouped()
        
        total_books = sum(len(books) for books in books_by_series.values())
        total_series = len(books_by_series)
        
        return BooksResponse(
            series=books_by_series,
            total_books=total_books,
            total_series=total_series,
            last_sync=datetime.utcnow()
        )
    
    @staticmethod
    async def add_book(book: Book) -> Book:
        """Add a new book to the database"""
        try:
            # Convert Pydantic model to database model data
            book_data = DatabaseIntegrationService._convert_pydantic_to_book_data(book)
            
            # Create book in database
            book_model = await BookService.create_book(book_data)
            
            # Convert back to Pydantic model
            return DatabaseIntegrationService._convert_book_model_to_pydantic(book_model)
        except Exception as e:
            logger.error(f"Error adding book to database: {e}")
            raise
    
    @staticmethod
    async def update_book(isbn: str, book: Book) -> Optional[Book]:
        """Update an existing book in the database"""
        try:
            # Convert Pydantic model to database model data
            book_data = DatabaseIntegrationService._convert_pydantic_to_book_data(book)
            
            # Update book in database
            book_model = await BookService.update_book(isbn, book_data)
            
            if book_model:
                return DatabaseIntegrationService._convert_book_model_to_pydantic(book_model)
            return None
        except Exception as e:
            logger.error(f"Error updating book in database: {e}")
            raise
    
    @staticmethod
    async def delete_book(isbn: str) -> bool:
        """Delete a book from the database"""
        try:
            return await BookService.delete_book(isbn)
        except Exception as e:
            logger.error(f"Error deleting book from database: {e}")
            raise
    
    @staticmethod
    async def get_book_by_isbn(isbn: str) -> Optional[Book]:
        """Get a book by ISBN from the database"""
        try:
            book_model = await BookService.get_book_by_isbn(isbn)
            if book_model:
                return DatabaseIntegrationService._convert_book_model_to_pydantic(book_model)
            return None
        except Exception as e:
            logger.error(f"Error getting book by ISBN from database: {e}")
            return None
    
    @staticmethod
    async def create_book(book: Book) -> Book:
        """Create a new book in the database (alias for add_book)"""
        return await DatabaseIntegrationService.add_book(book)
    
    @staticmethod
    async def create_sync_history(source: str, url: str, books_found: int, books_processed: int, 
                                 success: bool, error_details: Optional[List[str]] = None) -> None:
        """Create a sync history record"""
        try:
            sync_data = {
                'source': source,
                'url': url,
                'timestamp': datetime.utcnow(),
                'books_found': books_found,
                'books_processed': books_processed,
                'success': success,
                'error_details': error_details
            }
            await SyncHistoryService.create_sync_record(sync_data)
            logger.info(f"📝 Created sync history record: {source} - {books_processed}/{books_found}")
        except Exception as e:
            logger.error(f"Error creating sync history: {e}")
            # Don't raise exception here as it's not critical for sync operation
    
    @staticmethod
    async def get_sync_history(limit: int = 10) -> List[SyncHistoryModel]:
        """Get sync history records"""
        try:
            return await SyncHistoryService.get_sync_history(limit=limit)
        except Exception as e:
            logger.error(f"Error getting sync history: {e}")
            return []
    
    @staticmethod
    async def get_settings() -> Settings:
        """Get application settings from database"""
        try:
            settings_dict = await SettingsService.get_all_settings()
            
            # Convert string values to appropriate types
            processed_settings = {}
            
            # Handle each setting with appropriate type conversion
            processed_settings['skoolib_url'] = settings_dict.get('skoolib_url')
            processed_settings['google_books_api_key'] = settings_dict.get('google_books_api_key')
            processed_settings['open_library_api_key'] = settings_dict.get('open_library_api_key')
            
            # Handle integer settings
            cache_ttl = settings_dict.get('cache_ttl', '3600')
            processed_settings['cache_ttl'] = int(cache_ttl) if cache_ttl.isdigit() else 3600
            
            # Handle boolean settings
            enable_price_lookup = settings_dict.get('enable_price_lookup', 'true')
            processed_settings['enable_price_lookup'] = enable_price_lookup.lower() == 'true'
            
            # Handle string settings
            processed_settings['default_language'] = settings_dict.get('default_language', 'en')
            
            return Settings(**processed_settings)
        except Exception as e:
            logger.error(f"Error getting settings from database: {e}")
            # Return default settings if database fails
            return Settings(
                cache_ttl=3600,
                enable_price_lookup=True,
                default_language='en'
            )
    
    @staticmethod
    async def update_settings(settings_update: Dict[str, Any]) -> Settings:
        """Update application settings in database"""
        try:
            # Convert values to strings for storage
            for key, value in settings_update.items():
                if value is not None:
                    if isinstance(value, bool):
                        string_value = 'true' if value else 'false'
                    else:
                        string_value = str(value)
                    await SettingsService.set_setting(key, string_value)
            
            # Return updated settings
            return await DatabaseIntegrationService.get_settings()
        except Exception as e:
            logger.error(f"Error updating settings in database: {e}")
            raise
    
    @staticmethod
    def _convert_book_model_to_pydantic(book_model: BookModel) -> Book:
        """Convert database BookModel to Pydantic Book model"""
        # Parse JSON fields back to lists
        authors = book_model.authors or "[]"
        if isinstance(authors, str):
            try:
                authors = json.loads(authors)
            except (json.JSONDecodeError, TypeError):
                authors = []
        
        categories = book_model.categories or "[]"
        if isinstance(categories, str):
            try:
                categories = json.loads(categories)
            except (json.JSONDecodeError, TypeError):
                categories = []
        
        pricing = book_model.pricing or "[]"
        if isinstance(pricing, str):
            try:
                pricing_data = json.loads(pricing)
                # Convert pricing data back to PriceInfo objects if needed
                pricing = pricing_data
            except (json.JSONDecodeError, TypeError):
                pricing = []
        
        metadata_sources_used = getattr(book_model, 'metadata_sources_used', []) or "[]"
        if isinstance(metadata_sources_used, str):
            try:
                metadata_sources_used = json.loads(metadata_sources_used)
            except (json.JSONDecodeError, TypeError):
                metadata_sources_used = []
        
        return Book(
            isbn=book_model.isbn,
            title=book_model.title,
            authors=authors,
            series=book_model.series,
            series_position=book_model.series_position,
            publisher=book_model.publisher,
            published_date=book_model.published_date,
            page_count=book_model.page_count,
            language=book_model.language or 'en',
            thumbnail_url=book_model.thumbnail_url,
            description=book_model.description,
            categories=categories,
            pricing=pricing,
            metadata_source=MetadataSource(book_model.metadata_source or 'skoolib'),
            added_date=book_model.added_date,
            last_updated=book_model.last_updated,
            isbn10=book_model.isbn10,
            isbn13=book_model.isbn13,
            # Add new enhancement fields if they exist
            metadata_enhanced=getattr(book_model, 'metadata_enhanced', False) or False,
            metadata_enhanced_date=getattr(book_model, 'metadata_enhanced_date', None),
            metadata_sources_used=metadata_sources_used,
            # Add reading progress fields
            reading_status=getattr(book_model, 'reading_status', 'unread') or 'unread',
            reading_progress_pages=getattr(book_model, 'reading_progress_pages', None),
            reading_progress_percentage=getattr(book_model, 'reading_progress_percentage', None),
            date_started=getattr(book_model, 'date_started', None),
            date_finished=getattr(book_model, 'date_finished', None),
            personal_rating=getattr(book_model, 'personal_rating', None),
            personal_notes=getattr(book_model, 'personal_notes', None),
            reading_goal_id=getattr(book_model, 'reading_goal_id', None),
            times_read=getattr(book_model, 'times_read', 0) or 0
        )
    
    @staticmethod
    def _convert_pydantic_to_book_data(book: Book) -> Dict[str, Any]:
        """Convert Pydantic Book model to database data dict"""
        data = book.dict()
        
        # Convert datetime objects - keep as datetime objects for SQLAlchemy
        # SQLAlchemy handles datetime conversion automatically
        
        # Convert enum to string
        if isinstance(data.get('metadata_source'), MetadataSource):
            data['metadata_source'] = data['metadata_source'].value
        elif data.get('metadata_source') and hasattr(data['metadata_source'], 'value'):
            data['metadata_source'] = data['metadata_source'].value
        
        # Convert URL objects to strings for database storage
        if data.get('thumbnail_url') and hasattr(data['thumbnail_url'], '__str__'):
            data['thumbnail_url'] = str(data['thumbnail_url'])
        
        # Convert pricing list to JSON-serializable format
        if data.get('pricing'):
            pricing_data = []
            for price_info in data['pricing']:
                if isinstance(price_info, dict):
                    # Convert datetime in pricing data
                    if 'last_updated' in price_info and isinstance(price_info['last_updated'], datetime):
                        price_info = price_info.copy()
                        price_info['last_updated'] = price_info['last_updated'].isoformat()
                    pricing_data.append(price_info)
                else:
                    # Handle PriceInfo objects
                    price_dict = price_info.dict() if hasattr(price_info, 'dict') else price_info
                    if 'last_updated' in price_dict and isinstance(price_dict['last_updated'], datetime):
                        price_dict['last_updated'] = price_dict['last_updated'].isoformat()
                    pricing_data.append(price_dict)
            data['pricing'] = json.dumps(pricing_data)
        else:
            data['pricing'] = json.dumps([])
        
        # Convert other list fields to JSON
        data['authors'] = json.dumps(data.get('authors', []))
        data['categories'] = json.dumps(data.get('categories', []))
        data['metadata_sources_used'] = json.dumps(data.get('metadata_sources_used', []))
        
        return data

    @staticmethod
    async def seed_test_data():
        """Seed the database with test data if empty"""
        try:
            # Check if we already have books
            books = await BookService.get_all_books()
            if books:
                logger.info("Database already has books, skipping seed data")
                return
            
            logger.info("Seeding database with test data...")
            
            # Sample test books with Harry Potter and Game of Thrones series
            test_books = [
                # Harry Potter Series
                {
                    "isbn": "9780439708180",
                    "title": "Harry Potter and the Sorcerer's Stone",
                    "authors": ["J.K. Rowling"],
                    "series": "Harry Potter",
                    "series_position": 1,
                    "publisher": "Scholastic Inc.",
                    "published_date": "1997-06-26",
                    "page_count": 309,
                    "language": "en",
                    "description": "The first book in the beloved Harry Potter series. A young wizard discovers his magical heritage on his 11th birthday.",
                    "categories": ["Fantasy", "Young Adult", "Magic"],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                },
                {
                    "isbn": "9780439064873",
                    "title": "Harry Potter and the Chamber of Secrets",
                    "authors": ["J.K. Rowling"],
                    "series": "Harry Potter",
                    "series_position": 2,
                    "publisher": "Scholastic Inc.",
                    "published_date": "1998-07-02",
                    "page_count": 341,
                    "language": "en",
                    "description": "Harry's second year at Hogwarts School of Witchcraft and Wizardry brings new challenges and dark secrets.",
                    "categories": ["Fantasy", "Young Adult", "Magic"],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                },
                {
                    "isbn": "9780439136365",
                    "title": "Harry Potter and the Prisoner of Azkaban",
                    "authors": ["J.K. Rowling"],
                    "series": "Harry Potter",
                    "series_position": 3,
                    "publisher": "Scholastic Inc.",
                    "published_date": "1999-07-08",
                    "page_count": 435,
                    "language": "en",
                    "description": "Harry learns about his past and faces new dangers as a dangerous prisoner escapes from Azkaban.",
                    "categories": ["Fantasy", "Young Adult", "Magic"],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                },
                {
                    "isbn": "9780439139601",
                    "title": "Harry Potter and the Goblet of Fire",
                    "authors": ["J.K. Rowling"],
                    "series": "Harry Potter",
                    "series_position": 4,
                    "publisher": "Scholastic Inc.",
                    "published_date": "2000-07-08",
                    "page_count": 734,
                    "language": "en",
                    "description": "Harry's fourth year brings the Triwizard Tournament and the return of Lord Voldemort.",
                    "categories": ["Fantasy", "Young Adult", "Magic"],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                },
                
                # Game of Thrones / A Song of Ice and Fire Series
                {
                    "isbn": "9780553103540",
                    "title": "A Game of Thrones",
                    "authors": ["George R. R. Martin"],
                    "series": "A Song of Ice and Fire",
                    "series_position": 1,
                    "publisher": "Bantam",
                    "published_date": "1996-08-01",
                    "page_count": 694,
                    "language": "en",
                    "description": "The first book in the landmark series that has redefined imaginative fiction. In the Seven Kingdoms, summer can last decades and winter a lifetime.",
                    "categories": ["Fantasy", "Fiction", "Epic Fantasy"],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                },
                {
                    "isbn": "9780553108033",
                    "title": "A Clash of Kings",
                    "authors": ["George R. R. Martin"],
                    "series": "A Song of Ice and Fire",
                    "series_position": 2,
                    "publisher": "Bantam",
                    "published_date": "1998-11-16",
                    "page_count": 761,
                    "language": "en",
                    "description": "The second book in A Song of Ice and Fire. The Seven Kingdoms are torn by rival claimants to the Iron Throne.",
                    "categories": ["Fantasy", "Fiction", "Epic Fantasy"],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                },
                {
                    "isbn": "9780553106633",
                    "title": "A Storm of Swords",
                    "authors": ["George R. R. Martin"],
                    "series": "A Song of Ice and Fire",
                    "series_position": 3,
                    "publisher": "Bantam",
                    "published_date": "2000-08-08",
                    "page_count": 973,
                    "language": "en",
                    "description": "The third book in A Song of Ice and Fire. The War of the Five Kings rages on, and shocking events change everything.",
                    "categories": ["Fantasy", "Fiction", "Epic Fantasy"],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                },
                
                # Standalone Books
                {
                    "isbn": "9780547928227",
                    "title": "The Hobbit",
                    "authors": ["J.R.R. Tolkien"],
                    "series": "Middle-earth",
                    "series_position": 1,
                    "publisher": "Mariner Books",
                    "published_date": "1937-09-21",
                    "page_count": 366,
                    "language": "en",
                    "description": "A classic fantasy adventure about Bilbo Baggins' unexpected journey to reclaim the lost Dwarf Kingdom of Erebor.",
                    "categories": ["Fantasy", "Adventure", "Classic"],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                },
                {
                    "isbn": "9780143127741",
                    "title": "The Body Keeps the Score",
                    "authors": ["Bessel van der Kolk"],
                    "series": None,
                    "series_position": None,
                    "publisher": "Penguin Books",
                    "published_date": "2014-09-25",
                    "page_count": 464,
                    "language": "en",
                    "description": "A pioneering researcher transforms our understanding of trauma and offers a bold new paradigm for healing.",
                    "categories": ["Psychology", "Health", "Science"],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                },
                {
                    "isbn": "9780345391803",
                    "title": "The Hitchhiker's Guide to the Galaxy",
                    "authors": ["Douglas Adams"],
                    "series": "Hitchhiker's Guide to the Galaxy",
                    "series_position": 1,
                    "publisher": "Del Rey",
                    "published_date": "1979-10-12",
                    "page_count": 216,
                    "language": "en",
                    "description": "A comic science fiction series that follows the adventures of Arthur Dent, the last human, and his alien friend Ford Prefect.",
                    "categories": ["Science Fiction", "Comedy", "Adventure"],
                    "pricing": [],
                    "metadata_source": "google_books",
                    "added_date": datetime.utcnow(),
                    "last_updated": datetime.utcnow()
                }
            ]
            
            # Add test books to database
            for book_data in test_books:
                await BookService.create_book(book_data)
            
            logger.info(f"✅ Seeded database with {len(test_books)} test books")
            
        except Exception as e:
            logger.error(f"❌ Error seeding test data: {e}")
            raise