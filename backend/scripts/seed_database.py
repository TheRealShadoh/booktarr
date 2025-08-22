"""
P0-003: Database Seeding Script

Loads HandyLib.csv data into the database for development and testing.
Features:
- Idempotent operation (can be run multiple times safely)
- Handles duplicates gracefully
- Preserves existing data
- Provides progress feedback
- Can be used for both development setup and test data
"""

import asyncio
import os
import sys
import csv
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add backend to path for imports
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

try:
    from sqlmodel import Session, select, create_engine, SQLModel
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress
    from models.series import Series, SeriesVolume
    from services.csv_import import CSVImportService
    from services.series_validation import SeriesValidationService
    from services.book_search import BookSearchService
    from database import get_engine, get_session
except ImportError as e:
    print(f"Import error: {e}")
    print("Please run this script from the backend directory")
    sys.exit(1)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseSeeder:
    """Database seeding utility for HandyLib.csv data"""
    
    def __init__(self, csv_file_path: str, session: Session):
        self.csv_file_path = csv_file_path
        self.session = session
        self.csv_import_service = CSVImportService()
        self.series_validation_service = SeriesValidationService()
        self.book_search_service = BookSearchService()
        
        # Seeding statistics
        self.stats = {
            'total_rows': 0,
            'books_created': 0,
            'books_updated': 0,
            'books_skipped': 0,
            'series_created': 0,
            'volumes_created': 0,
            'reading_progress_created': 0,
            'errors': []
        }
    
    async def seed_database(
        self, 
        limit: Optional[int] = None,
        skip_duplicates: bool = True,
        enrich_metadata: bool = False,
        create_series: bool = True,
        create_reading_progress: bool = True
    ) -> Dict[str, Any]:
        """
        Seed the database with HandyLib.csv data
        
        Args:
            limit: Maximum number of rows to process (None for all)
            skip_duplicates: Skip books that already exist
            enrich_metadata: Fetch additional metadata from external APIs
            create_series: Create series and volume records
            create_reading_progress: Create reading progress from ratings
        """
        logger.info(f"Starting database seeding from {self.csv_file_path}")
        
        if not os.path.exists(self.csv_file_path):
            raise FileNotFoundError(f"CSV file not found: {self.csv_file_path}")
        
        # Read and validate CSV
        rows = self._load_csv_data()
        if limit:
            rows = rows[:limit]
            logger.info(f"Processing limited to {limit} rows")
        
        self.stats['total_rows'] = len(rows)
        logger.info(f"Processing {len(rows)} rows from CSV")
        
        # Process each row
        for i, row in enumerate(rows, 1):
            try:
                await self._process_row(
                    row, i, 
                    skip_duplicates=skip_duplicates,
                    enrich_metadata=enrich_metadata,
                    create_reading_progress=create_reading_progress
                )
                
                # Progress feedback
                if i % 50 == 0:
                    logger.info(f"Processed {i}/{len(rows)} rows")
                    
            except Exception as e:
                error_msg = f"Row {i}: {str(e)}"
                self.stats['errors'].append(error_msg)
                logger.error(error_msg)
        
        # Create series if requested
        if create_series:
            await self._create_series_records()
        
        # Final statistics
        logger.info("Database seeding completed")
        self._log_final_stats()
        
        return {
            'success': True,
            'stats': self.stats
        }
    
    def _load_csv_data(self) -> List[Dict[str, str]]:
        """Load and validate CSV data"""
        rows = []
        
        with open(self.csv_file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Validate headers
            required_headers = ['Title', 'Author', 'Series', 'Volume', 'ISBN']
            missing_headers = [h for h in required_headers if h not in reader.fieldnames]
            if missing_headers:
                raise ValueError(f"Missing required headers: {missing_headers}")
            
            rows = list(reader)
        
        logger.info(f"Loaded {len(rows)} rows from CSV")
        return rows
    
    async def _process_row(
        self, 
        row: Dict[str, str], 
        row_num: int,
        skip_duplicates: bool = True,
        enrich_metadata: bool = False,
        create_reading_progress: bool = True
    ) -> None:
        """Process a single CSV row"""
        
        # Extract book data
        book_data = self._extract_book_data(row)
        if not book_data.get('title'):
            self.stats['books_skipped'] += 1
            return
        
        # Check for existing book
        existing_book = await self._find_existing_book(book_data)
        
        if existing_book and skip_duplicates:
            self.stats['books_skipped'] += 1
            logger.debug(f"Skipping duplicate: {book_data['title']}")
            return
        
        if existing_book:
            # Update existing book
            book = await self._update_book(existing_book, book_data)
            self.stats['books_updated'] += 1
        else:
            # Create new book
            book = await self._create_book(book_data, enrich_metadata)
            self.stats['books_created'] += 1
        
        # Create reading progress if rating exists
        if create_reading_progress and book_data.get('rating'):
            await self._create_reading_progress(book, book_data)
    
    def _extract_book_data(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Extract and normalize book data from CSV row"""
        
        # Handle multiple authors
        authors_str = row.get('Author', '').strip()
        authors = []
        if authors_str:
            # Split by common delimiters and clean up
            author_parts = authors_str.replace(';', ',').split(',')
            authors = [a.strip() for a in author_parts if a.strip()]
        
        # Handle series volume
        volume_str = row.get('Volume', '').strip()
        series_position = None
        if volume_str:
            try:
                series_position = int(volume_str)
            except ValueError:
                # Handle cases like "Vol. 1" or "Volume 1"
                import re
                match = re.search(r'\d+', volume_str)
                if match:
                    series_position = int(match.group())
        
        # Handle rating
        rating = None
        rating_str = row.get('Rating', '').strip()
        if rating_str:
            try:
                rating_float = float(rating_str)
                rating = round(rating_float)  # Convert to 1-5 scale
                if rating > 5:
                    rating = 5
                elif rating < 1:
                    rating = 1
            except ValueError:
                pass
        
        # Handle pages
        pages = None
        pages_str = row.get('Pages', '').strip()
        if pages_str:
            try:
                pages = int(pages_str)
            except ValueError:
                pass
        
        # Handle price
        price = None
        price_str = row.get('Price', '').strip()
        if price_str:
            try:
                # Remove currency symbols
                price_clean = price_str.replace('$', '').replace(',', '')
                price = float(price_clean)
            except ValueError:
                pass
        
        # Handle dates
        published_date = None
        published_str = row.get('Published Date', '').strip()
        if published_str:
            try:
                published_date = datetime.strptime(published_str, '%Y-%m-%d').date()
            except ValueError:
                try:
                    published_date = datetime.strptime(published_str, '%m/%d/%Y').date()
                except ValueError:
                    pass
        
        return {
            'title': row.get('Title', '').strip(),
            'authors': authors,
            'series_name': row.get('Series', '').strip() or None,
            'series_position': series_position,
            'isbn': row.get('ISBN', '').strip() or None,
            'publisher': row.get('Publisher', '').strip() or None,
            'published_date': published_date,
            'format': row.get('Format', '').strip() or None,
            'pages': pages,
            'language': row.get('Language', '').strip() or None,
            'summary': row.get('Summary', '').strip() or None,
            'genres': row.get('Genres', '').strip() or None,
            'rating': rating,
            'price': price,
            'image_url': row.get('Image Url', '').strip() or None,
            'added_date': row.get('Added Date', '').strip() or None
        }
    
    async def _find_existing_book(self, book_data: Dict[str, Any]) -> Optional[Book]:
        """Find existing book by ISBN or title+author"""
        
        # Try by ISBN first
        if book_data.get('isbn'):
            edition = self.session.exec(
                select(Edition).where(
                    (Edition.isbn_10 == book_data['isbn']) | 
                    (Edition.isbn_13 == book_data['isbn'])
                )
            ).first()
            
            if edition:
                return self.session.exec(
                    select(Book).where(Book.id == edition.book_id)
                ).first()
        
        # Try by title
        if book_data.get('title'):
            return self.session.exec(
                select(Book).where(Book.title == book_data['title'])
            ).first()
        
        return None
    
    async def _create_book(self, book_data: Dict[str, Any], enrich_metadata: bool = False) -> Book:
        """Create a new book with edition and ownership status"""
        
        # Create book
        book = Book(
            title=book_data['title'],
            authors=json.dumps(book_data['authors']),
            series_name=book_data['series_name'],
            series_position=book_data['series_position'],
            description=book_data.get('summary')
        )
        
        self.session.add(book)
        self.session.commit()
        self.session.refresh(book)
        
        # Create edition if ISBN provided
        if book_data.get('isbn'):
            edition = Edition(
                book_id=book.id,
                isbn_13=book_data['isbn'] if len(book_data['isbn']) == 13 else None,
                isbn_10=book_data['isbn'] if len(book_data['isbn']) == 10 else None,
                book_format=book_data.get('format'),
                publisher=book_data.get('publisher'),
                release_date=book_data.get('published_date'),
                cover_url=book_data.get('image_url'),
                price=book_data.get('price'),
                source='handylib_import'
            )
            
            self.session.add(edition)
            self.session.commit()
            self.session.refresh(edition)
            
            # Mark as owned
            ownership = UserEditionStatus(
                user_id=1,  # Default user
                edition_id=edition.id,
                status='own',
                notes='Imported from HandyLib CSV'
            )
            self.session.add(ownership)
            self.session.commit()
        
        # Enrich metadata if requested (limit to avoid rate limits)
        if enrich_metadata and book_data.get('isbn') and self.stats['books_created'] <= 5:
            try:
                await self._enrich_book_metadata(book, book_data['isbn'])
                logger.debug(f"Enriched metadata for: {book.title}")
            except Exception as e:
                logger.warning(f"Failed to enrich {book.title}: {e}")
        
        return book
    
    async def _update_book(self, book: Book, book_data: Dict[str, Any]) -> Book:
        """Update existing book with new data"""
        
        # Update fields if they're missing
        if not book.description and book_data.get('summary'):
            book.description = book_data['summary']
        
        if not book.series_name and book_data.get('series_name'):
            book.series_name = book_data['series_name']
        
        if not book.series_position and book_data.get('series_position'):
            book.series_position = book_data['series_position']
        
        self.session.add(book)
        self.session.commit()
        
        return book
    
    async def _create_reading_progress(self, book: Book, book_data: Dict[str, Any]) -> None:
        """Create reading progress record from rating data"""
        
        # Find edition for this book
        edition = self.session.exec(
            select(Edition).where(Edition.book_id == book.id)
        ).first()
        
        if not edition:
            return
        
        # Check if progress already exists
        existing_progress = self.session.exec(
            select(ReadingProgress).where(
                (ReadingProgress.user_id == 1) &
                (ReadingProgress.edition_id == edition.id)
            )
        ).first()
        
        if existing_progress:
            return
        
        # Create reading progress
        progress = ReadingProgress(
            user_id=1,
            edition_id=edition.id,
            status='finished',  # Assume finished if rated
            rating=book_data['rating'],
            progress_percentage=100.0,
            finish_date=datetime.now(),
            notes=f"Imported from HandyLib (original rating: {book_data.get('rating')})"
        )
        
        self.session.add(progress)
        self.session.commit()
        
        self.stats['reading_progress_created'] += 1
    
    async def _enrich_book_metadata(self, book: Book, isbn: str) -> None:
        """Enrich book metadata using external APIs"""
        try:
            # Use the book search service to get metadata
            google_data = await self.book_search_service.google_client.search_by_isbn(isbn)
            if google_data:
                # Update book with additional metadata
                if google_data.get('description') and not book.description:
                    book.description = google_data['description']
                
                # Update edition if exists
                edition = self.session.exec(
                    select(Edition).where(
                        Edition.book_id == book.id
                    )
                ).first()
                
                if edition and not edition.cover_url:
                    edition.cover_url = google_data.get('thumbnail_url')
                    self.session.add(edition)
                
                self.session.add(book)
                self.session.commit()
                
        except Exception as e:
            logger.warning(f"Metadata enrichment failed for {isbn}: {e}")
    
    async def _create_series_records(self) -> None:
        """Create series and volume records from imported books"""
        logger.info("Creating series records...")
        
        # Get all books with series information
        books_with_series = self.session.exec(
            select(Book).where(Book.series_name.is_not(None))
        ).all()
        
        # Group by series
        series_books = {}
        for book in books_with_series:
            if book.series_name not in series_books:
                series_books[book.series_name] = []
            series_books[book.series_name].append(book)
        
        # Create series records
        for series_name, books in series_books.items():
            await self._create_series_record(series_name, books)
    
    async def _create_series_record(self, series_name: str, books: List[Book]) -> None:
        """Create a series record and its volumes"""
        
        # Check if series already exists
        existing_series = self.session.exec(
            select(Series).where(Series.name == series_name)
        ).first()
        
        if existing_series:
            return
        
        # Create series
        max_volume = max((book.series_position or 0) for book in books)
        
        series = Series(
            name=series_name,
            total_volumes=max_volume,
            description=f"Imported series with {len(books)} volumes",
            ongoing=True  # Assume ongoing unless we know otherwise
        )
        
        self.session.add(series)
        self.session.commit()
        self.session.refresh(series)
        
        self.stats['series_created'] += 1
        
        # Create volume records
        for book in books:
            if book.series_position:
                volume = SeriesVolume(
                    series_id=series.id,
                    position=book.series_position,
                    title=book.title,
                    book_id=book.id,
                    status='owned'  # Assume owned since it's in our library
                )
                
                self.session.add(volume)
                self.stats['volumes_created'] += 1
        
        self.session.commit()
        logger.debug(f"Created series: {series_name} with {len(books)} volumes")
    
    def _log_final_stats(self) -> None:
        """Log final seeding statistics"""
        logger.info("=== Database Seeding Complete ===")
        logger.info(f"Total rows processed: {self.stats['total_rows']}")
        logger.info(f"Books created: {self.stats['books_created']}")
        logger.info(f"Books updated: {self.stats['books_updated']}")
        logger.info(f"Books skipped: {self.stats['books_skipped']}")
        logger.info(f"Series created: {self.stats['series_created']}")
        logger.info(f"Volumes created: {self.stats['volumes_created']}")
        logger.info(f"Reading progress created: {self.stats['reading_progress_created']}")
        logger.info(f"Errors: {len(self.stats['errors'])}")
        
        if self.stats['errors']:
            logger.error("Errors encountered:")
            for error in self.stats['errors'][:10]:  # Show first 10 errors
                logger.error(f"  {error}")


async def main():
    """Main seeding function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Seed database with HandyLib.csv data')
    parser.add_argument('--csv-file', default='../../sample_data/HandyLib.csv',
                      help='Path to HandyLib.csv file')
    parser.add_argument('--limit', type=int, default=None,
                      help='Limit number of rows to process')
    parser.add_argument('--no-skip-duplicates', action='store_true',
                      help='Update existing books instead of skipping')
    parser.add_argument('--enrich-metadata', action='store_true',
                      help='Fetch metadata from external APIs (slow)')
    parser.add_argument('--no-series', action='store_true',
                      help='Skip creating series records')
    parser.add_argument('--no-reading-progress', action='store_true',
                      help='Skip creating reading progress records')
    
    args = parser.parse_args()
    
    # Resolve CSV file path
    csv_path = Path(args.csv_file)
    if not csv_path.is_absolute():
        csv_path = Path(__file__).parent.parent.parent / args.csv_file
    
    if not csv_path.exists():
        logger.error(f"CSV file not found: {csv_path}")
        return
    
    # Get database session
    engine = get_engine()
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        seeder = DatabaseSeeder(str(csv_path), session)
        
        try:
            result = await seeder.seed_database(
                limit=args.limit,
                skip_duplicates=not args.no_skip_duplicates,
                enrich_metadata=args.enrich_metadata,
                create_series=not args.no_series,
                create_reading_progress=not args.no_reading_progress
            )
            
            if result['success']:
                logger.info("Database seeding completed successfully!")
            else:
                logger.error("Database seeding failed")
                
        except Exception as e:
            logger.error(f"Seeding failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())