"""
P0-002: Real Data Book Creation Tests

Tests book creation functionality with real data from HandyLib.csv including:
- Complex series creation and validation
- Reading progress tracking
- Rating systems
- Edition management
- Metadata preservation
"""

import pytest
import asyncio
import json
import os
from datetime import datetime, date
from sqlmodel import Session, select, create_engine, SQLModel
from typing import List, Dict, Any

# Import models and services
try:
    from backend.models.book import Book, Edition, UserEditionStatus
    from backend.models.reading_progress import ReadingProgress, ReadingStats
    from backend.models.series import Series, SeriesVolume
    from backend.services.book_search import BookSearchService
    from backend.services.reading_progress import ReadingProgressService
    from backend.services.ownership import OwnershipService
    from backend.database import get_session
except ImportError:
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress, ReadingStats
    from models.series import Series, SeriesVolume
    from services.book_search import BookSearchService
    from services.reading_progress import ReadingProgressService
    from services.ownership import OwnershipService
    from database import get_session


class TestBookCreationRealData:
    """Test book creation with real data scenarios"""
    
    @pytest.fixture
    def test_db(self):
        """Create a test database"""
        engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(engine)
        return engine
    
    @pytest.fixture
    def test_session(self, test_db):
        """Create a test session"""
        with Session(test_db) as session:
            yield session
    
    @pytest.fixture
    def real_book_data(self):
        """Real book data from HandyLib.csv"""
        return {
            'oshi_no_ko_vol1': {
                'title': '[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)',
                'authors': ['Akasaka, Aka', 'Yokoyari, Mengo', 'Blackman, Abigail'],
                'publisher': 'Yen Press',
                'published_date': '2023-01-17',
                'format': 'Paperback',
                'pages': 228,
                'series': '推しの子 [Oshi no Ko]',
                'volume': 1,
                'language': 'English',
                'isbn': '9781975363178',
                'rating': 4.24,
                'price': 8.59,
                'genres': 'Fantasy',
                'summary': '"In show business, lies are a weapon." Gorou is an ob-gyn with a life far removed from the glitz and glamour of the entertainment industry―the world of his favorite idol, rising star Ai Hoshino.',
                'image_url': 'https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg',
                'added_date': '07/18/2025'
            },
            'oshi_no_ko_vol2': {
                'title': '[Oshi No Ko], Vol. 2 (Volume 2) ([Oshi No Ko], 2)',
                'authors': ['Akasaka, Aka', 'Yokoyari, Mengo', 'Neufeld, Sarah'],
                'publisher': 'Yen Press',
                'published_date': '2023-05-23',
                'format': 'Paperback',
                'pages': 194,
                'series': '推しの子 [Oshi no Ko]',
                'volume': 2,
                'language': 'English',
                'isbn': '9781975363192',
                'rating': 4.23,
                'price': 10.4,
                'genres': 'Fantasy',
                'summary': '"In show business, lies are a weapon." Ten years after the murder of pop idol Ai Hoshino...',
                'image_url': 'https://m.media-amazon.com/images/I/51QoSmYxGwL._SL500_.jpg',
                'added_date': '07/18/2025'
            },
            'citrus_vol1': {
                'title': 'Citrus Vol. 1',
                'authors': ['Saburouta'],
                'publisher': 'Seven Seas',
                'published_date': '2014-05-27',
                'format': 'Paperback',
                'pages': 180,
                'series': 'Citrus',
                'volume': 1,
                'language': 'English',
                'isbn': '9781626920453',
                'rating': 3.8,
                'price': 12.99,
                'genres': 'Romance, Yuri',
                'summary': 'Fashionable Yuzu imagined the first day at her new school...',
                'image_url': 'https://example.com/citrus1.jpg',
                'added_date': '07/15/2025'
            }
        }
    
    def test_create_book_with_complete_metadata(self, test_session, real_book_data):
        """Test creating a book with complete metadata from real data"""
        book_data = real_book_data['oshi_no_ko_vol1']
        
        # Create book
        book = Book(
            title=book_data['title'],
            authors=json.dumps(book_data['authors']),
            series_name=book_data['series'],
            series_position=book_data['volume'],
            description=book_data['summary']
        )
        
        test_session.add(book)
        test_session.commit()
        test_session.refresh(book)
        
        # Verify book creation
        assert book.id is not None
        assert book.title == book_data['title']
        assert json.loads(book.authors) == book_data['authors']
        assert book.series_name == book_data['series']
        assert book.series_position == book_data['volume']
        
        print(f"✓ Created book: {book.title}")
    
    def test_create_edition_with_real_data(self, test_session, real_book_data):
        """Test creating edition with real publishing data"""
        book_data = real_book_data['oshi_no_ko_vol1']
        
        # Create book first
        book = Book(
            title=book_data['title'],
            authors=json.dumps(book_data['authors']),
            series_name=book_data['series'],
            series_position=book_data['volume']
        )
        test_session.add(book)
        test_session.commit()
        test_session.refresh(book)
        
        # Create edition
        edition = Edition(
            book_id=book.id,
            isbn_13=book_data['isbn'],
            book_format=book_data['format'],
            publisher=book_data['publisher'],
            release_date=datetime.strptime(book_data['published_date'], '%Y-%m-%d').date(),
            cover_url=book_data['image_url'],
            price=book_data['price']
        )
        
        test_session.add(edition)
        test_session.commit()
        test_session.refresh(edition)
        
        # Verify edition
        assert edition.id is not None
        assert edition.isbn_13 == book_data['isbn']
        assert edition.book_format == book_data['format']
        assert edition.publisher == book_data['publisher']
        assert edition.price == book_data['price']
        
        print(f"✓ Created edition for ISBN: {edition.isbn_13}")
    
    def test_create_series_from_multiple_volumes(self, test_session, real_book_data):
        """Test creating a series from multiple volume data"""
        oshi_volumes = [
            real_book_data['oshi_no_ko_vol1'],
            real_book_data['oshi_no_ko_vol2']
        ]
        
        series_name = oshi_volumes[0]['series']
        books = []
        
        # Create books for each volume
        for vol_data in oshi_volumes:
            book = Book(
                title=vol_data['title'],
                authors=json.dumps(vol_data['authors']),
                series_name=vol_data['series'],
                series_position=vol_data['volume']
            )
            test_session.add(book)
            books.append(book)
        
        test_session.commit()
        
        # Create series record
        series = Series(
            name=series_name,
            total_volumes=len(oshi_volumes),
            description='Popular manga series',
            ongoing=True
        )
        test_session.add(series)
        test_session.commit()
        test_session.refresh(series)
        
        # Create series volumes
        for i, book in enumerate(books):
            test_session.refresh(book)
            volume = SeriesVolume(
                series_id=series.id,
                position=book.series_position,
                title=book.title,
                book_id=book.id,
                status='owned'
            )
            test_session.add(volume)
        
        test_session.commit()
        
        # Verify series creation
        assert series.id is not None
        assert series.name == series_name
        assert series.total_volumes == 2
        
        # Verify volumes
        volumes = test_session.exec(
            select(SeriesVolume).where(SeriesVolume.series_id == series.id)
        ).all()
        assert len(volumes) == 2
        assert all(v.status == 'owned' for v in volumes)
        
        print(f"✓ Created series: {series.name} with {len(volumes)} volumes")
    
    def test_create_reading_progress_with_ratings(self, test_session, real_book_data):
        """Test creating reading progress with real rating data"""
        book_data = real_book_data['oshi_no_ko_vol1']
        
        # Create book and edition
        book = Book(
            title=book_data['title'],
            authors=json.dumps(book_data['authors']),
            series_name=book_data['series'],
            series_position=book_data['volume']
        )
        test_session.add(book)
        test_session.commit()
        test_session.refresh(book)
        
        edition = Edition(
            book_id=book.id,
            isbn_13=book_data['isbn'],
            book_format=book_data['format']
        )
        test_session.add(edition)
        test_session.commit()
        test_session.refresh(edition)
        
        # Create reading progress with rating
        # Convert rating from 5-star scale to integer
        rating = round(book_data['rating'])  # 4.24 -> 4
        
        progress = ReadingProgress(
            user_id=1,
            edition_id=edition.id,
            status='finished',
            current_page=book_data['pages'],
            total_pages=book_data['pages'],
            progress_percentage=100.0,
            rating=rating,
            finish_date=datetime.now(),
            notes=f"Great book! Original rating: {book_data['rating']}/5"
        )
        
        test_session.add(progress)
        test_session.commit()
        test_session.refresh(progress)
        
        # Verify reading progress
        assert progress.id is not None
        assert progress.status == 'finished'
        assert progress.rating == rating
        assert progress.progress_percentage == 100.0
        
        print(f"✓ Created reading progress with rating: {rating}/5")
    
    def test_user_edition_status_management(self, test_session, real_book_data):
        """Test ownership status management with real data"""
        book_data = real_book_data['citrus_vol1']
        
        # Create book and edition
        book = Book(
            title=book_data['title'],
            authors=json.dumps(book_data['authors']),
            series_name=book_data['series'],
            series_position=book_data['volume']
        )
        test_session.add(book)
        test_session.commit()
        test_session.refresh(book)
        
        edition = Edition(
            book_id=book.id,
            isbn_13=book_data['isbn'],
            book_format=book_data['format'],
            price=book_data['price']
        )
        test_session.add(edition)
        test_session.commit()
        test_session.refresh(edition)
        
        # Create ownership status
        status = UserEditionStatus(
            user_id=1,
            edition_id=edition.id,
            status='own',
            notes=f"Physical copy purchased for ${book_data['price']}"
        )
        
        test_session.add(status)
        test_session.commit()
        test_session.refresh(status)
        
        # Verify ownership
        assert status.id is not None
        assert status.status == 'own'
        assert f"${book_data['price']}" in status.notes
        
        print(f"✓ Created ownership record for: {book.title}")
    
    @pytest.mark.asyncio
    async def test_reading_stats_calculation(self, test_session, real_book_data):
        """Test reading statistics calculation with real data"""
        # Create multiple books with reading progress
        books_data = [
            real_book_data['oshi_no_ko_vol1'],
            real_book_data['oshi_no_ko_vol2'],
            real_book_data['citrus_vol1']
        ]
        
        reading_records = []
        
        for book_data in books_data:
            # Create book and edition
            book = Book(
                title=book_data['title'],
                authors=json.dumps(book_data['authors']),
                series_name=book_data['series'],
                series_position=book_data['volume']
            )
            test_session.add(book)
            test_session.commit()
            test_session.refresh(book)
            
            edition = Edition(
                book_id=book.id,
                isbn_13=book_data['isbn'],
                book_format=book_data['format']
            )
            test_session.add(edition)
            test_session.commit()
            test_session.refresh(edition)
            
            # Create reading progress
            rating = round(book_data['rating'])
            progress = ReadingProgress(
                user_id=1,
                edition_id=edition.id,
                status='finished',
                rating=rating,
                total_pages=book_data['pages'],
                progress_percentage=100.0,
                finish_date=datetime.now()
            )
            test_session.add(progress)
            reading_records.append(progress)
        
        test_session.commit()
        
        # Calculate stats
        stats = await self._calculate_reading_stats(test_session, user_id=1)
        
        assert stats.books_read == 3
        assert stats.total_pages_read == sum(b['pages'] for b in books_data)
        assert stats.average_rating > 0
        
        print(f"✓ Reading stats: {stats.books_read} books, {stats.total_pages_read} pages")
    
    async def _calculate_reading_stats(self, session: Session, user_id: int) -> ReadingStats:
        """Calculate reading statistics for a user"""
        progress_records = session.exec(
            select(ReadingProgress).where(ReadingProgress.user_id == user_id)
        ).all()
        
        finished_books = [p for p in progress_records if p.status == 'finished']
        currently_reading = [p for p in progress_records if p.status == 'currently_reading']
        want_to_read = [p for p in progress_records if p.status == 'want_to_read']
        
        # Calculate total pages
        total_pages = sum(p.total_pages or 0 for p in finished_books)
        
        # Calculate average rating
        rated_books = [p for p in finished_books if p.rating is not None]
        avg_rating = sum(p.rating for p in rated_books) / len(rated_books) if rated_books else 0.0
        
        return ReadingStats(
            books_read=len(finished_books),
            books_reading=len(currently_reading),
            books_want_to_read=len(want_to_read),
            total_pages_read=total_pages,
            average_rating=avg_rating,
            reading_streak_days=0,  # Would need date calculation
            books_read_this_month=len(finished_books),  # Simplified
            books_read_this_year=len(finished_books)    # Simplified
        )
    
    def test_duplicate_book_detection(self, test_session, real_book_data):
        """Test duplicate book detection by ISBN and title"""
        book_data = real_book_data['oshi_no_ko_vol1']
        
        # Create first book
        book1 = Book(
            title=book_data['title'],
            authors=json.dumps(book_data['authors']),
            series_name=book_data['series'],
            series_position=book_data['volume']
        )
        test_session.add(book1)
        test_session.commit()
        test_session.refresh(book1)
        
        edition1 = Edition(
            book_id=book1.id,
            isbn_13=book_data['isbn']
        )
        test_session.add(edition1)
        test_session.commit()
        
        # Try to create duplicate by ISBN
        existing_edition = test_session.exec(
            select(Edition).where(Edition.isbn_13 == book_data['isbn'])
        ).first()
        
        assert existing_edition is not None
        assert existing_edition.book_id == book1.id
        
        # Try to create duplicate by title
        existing_book = test_session.exec(
            select(Book).where(Book.title == book_data['title'])
        ).first()
        
        assert existing_book is not None
        assert existing_book.id == book1.id
        
        print("✓ Duplicate detection working correctly")
    
    def test_complex_series_validation(self, test_session, real_book_data):
        """Test complex series validation with real data patterns"""
        # Test Japanese series names with English titles
        book_data = real_book_data['oshi_no_ko_vol1']
        
        # Create book with complex series naming
        book = Book(
            title=book_data['title'],  # English title with volume info
            authors=json.dumps(book_data['authors']),
            series_name=book_data['series'],  # Japanese series name
            series_position=book_data['volume']
        )
        test_session.add(book)
        test_session.commit()
        
        # Validate series name handling
        assert book.series_name == '推しの子 [Oshi no Ko]'
        assert '[Oshi No Ko]' in book.title
        assert book.series_position == 1
        
        # Test series name normalization
        normalized_name = book.series_name.strip()
        assert len(normalized_name) > 0
        assert '推しの子' in normalized_name
        
        print("✓ Complex series validation successful")
    
    def test_metadata_preservation(self, test_session, real_book_data):
        """Test that all metadata is preserved correctly"""
        book_data = real_book_data['oshi_no_ko_vol1']
        
        # Create book with all available metadata
        book = Book(
            title=book_data['title'],
            authors=json.dumps(book_data['authors']),
            series_name=book_data['series'],
            series_position=book_data['volume'],
            description=book_data['summary']
        )
        test_session.add(book)
        test_session.commit()
        test_session.refresh(book)
        
        edition = Edition(
            book_id=book.id,
            isbn_13=book_data['isbn'],
            book_format=book_data['format'],
            publisher=book_data['publisher'],
            release_date=datetime.strptime(book_data['published_date'], '%Y-%m-%d').date(),
            cover_url=book_data['image_url'],
            price=book_data['price']
        )
        test_session.add(edition)
        test_session.commit()
        test_session.refresh(edition)
        
        # Verify all metadata is preserved
        assert book.title == book_data['title']
        assert json.loads(book.authors) == book_data['authors']
        assert book.series_name == book_data['series']
        assert book.series_position == book_data['volume']
        assert book.description == book_data['summary']
        
        assert edition.isbn_13 == book_data['isbn']
        assert edition.book_format == book_data['format']
        assert edition.publisher == book_data['publisher']
        assert edition.price == book_data['price']
        assert book_data['image_url'] in edition.cover_url
        
        print("✓ All metadata preserved correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])