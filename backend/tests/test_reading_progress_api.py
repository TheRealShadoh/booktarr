"""
P1-003: Reading Progress API Tests

Tests the reading progress API endpoints including:
- PUT /api/reading/progress - Update reading progress
- GET /api/reading/stats - Get reading statistics
- GET /api/reading/books/status/{status} - Get books by reading status
- POST /api/reading/books/{isbn}/start-reading - Mark book as currently reading
- POST /api/reading/books/{isbn}/finish-reading - Mark book as finished
- POST /api/reading/books/{isbn}/add-to-wishlist - Add book to wishlist
"""

import pytest
import json
from datetime import datetime, date
from fastapi.testclient import TestClient
from sqlmodel import Session, select, create_engine, SQLModel

# Import models and services
try:
    from backend.models.book import Book, Edition, UserEditionStatus
    from backend.models.reading_progress import ReadingProgress, ReadingStats
    from backend.database import get_session
    from backend.main import app
    from backend.services.reading_progress import ReadingProgressService
except ImportError:
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress, ReadingStats
    from database import get_session
    from main import app
    from services.reading_progress import ReadingProgressService


class TestReadingProgressAPI:
    """Test reading progress API endpoints"""
    
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
    def client(self, test_session):
        """Create a test client with dependency override"""
        def get_test_session():
            return test_session
        
        app.dependency_overrides[get_session] = get_test_session
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()
    
    @pytest.fixture
    def sample_books(self, test_session):
        """Create sample books for testing"""
        books_data = [
            {
                'title': 'Test Book 1',
                'authors': ['Author One'],
                'isbn': '9781234567890',
                'series_name': 'Test Series',
                'series_position': 1,
                'pages': 200
            },
            {
                'title': 'Test Book 2',
                'authors': ['Author Two'],
                'isbn': '9781234567891',
                'series_name': 'Test Series',
                'series_position': 2,
                'pages': 250
            },
            {
                'title': 'Standalone Book',
                'authors': ['Author Three'],
                'isbn': '9781234567892',
                'series_name': None,
                'series_position': None,
                'pages': 300
            }
        ]
        
        books = []
        for book_data in books_data:
            # Create book
            book = Book(
                title=book_data['title'],
                authors=json.dumps(book_data['authors']),
                series_name=book_data['series_name'],
                series_position=book_data['series_position']
            )
            test_session.add(book)
            test_session.commit()
            test_session.refresh(book)
            
            # Create edition
            edition = Edition(
                book_id=book.id,
                isbn_13=book_data['isbn'],
                book_format='Paperback',
                publisher='Test Publisher'
            )
            test_session.add(edition)
            test_session.commit()
            test_session.refresh(edition)
            
            # Create ownership status
            ownership = UserEditionStatus(
                user_id=1,
                edition_id=edition.id,
                status='own'
            )
            test_session.add(ownership)
            
            books.append({
                'book': book,
                'edition': edition,
                'isbn': book_data['isbn'],
                'pages': book_data['pages']
            })
        
        test_session.commit()
        return books
    
    def test_update_reading_progress(self, client, sample_books):
        """Test updating reading progress for a book"""
        book_data = sample_books[0]
        isbn = book_data['isbn']
        
        # Update reading progress
        progress_data = {
            'isbn': isbn,
            'status': 'currently_reading',
            'current_page': 50,
            'total_pages': 200,
            'progress_percentage': 25.0,
            'notes': 'Really enjoying this book!'
        }
        
        response = client.put("/api/reading/progress", json=progress_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] is True
        assert 'progress' in data
        
        progress = data['progress']
        assert progress['status'] == 'currently_reading'
        assert progress['current_page'] == 50
        assert progress['progress_percentage'] == 25.0
        assert progress['notes'] == 'Really enjoying this book!'
        
        print("✓ Reading progress update successful")
    
    def test_start_reading_book(self, client, sample_books):
        """Test starting to read a book"""
        book_data = sample_books[1]
        isbn = book_data['isbn']
        
        response = client.post(f"/api/reading/books/{isbn}/start-reading")
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] is True
        assert 'progress' in data
        
        progress = data['progress']
        assert progress['status'] == 'currently_reading'
        assert progress['current_page'] is None or progress['current_page'] == 0
        assert progress['start_date'] is not None
        
        print("✓ Start reading book successful")
    
    def test_finish_reading_book_with_rating(self, client, sample_books):
        """Test finishing a book with rating"""
        book_data = sample_books[2]
        isbn = book_data['isbn']
        
        # First start reading
        client.post(f"/api/reading/books/{isbn}/start-reading")
        
        # Then finish with rating
        finish_data = {
            'rating': 4,
            'review': 'Great book! Highly recommend.',
            'finish_date': datetime.now().isoformat()
        }
        
        response = client.post(f"/api/reading/books/{isbn}/finish-reading", json=finish_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] is True
        assert 'progress' in data
        
        progress = data['progress']
        assert progress['status'] == 'finished'
        assert progress['rating'] == 4
        assert progress['notes'] == 'Great book! Highly recommend.'
        assert progress['finish_date'] is not None
        assert progress['progress_percentage'] == 100.0
        
        print("✓ Finish reading book with rating successful")
    
    def test_add_book_to_wishlist(self, client, sample_books):
        """Test adding a book to wishlist"""
        book_data = sample_books[0]
        isbn = book_data['isbn']
        
        response = client.post(f"/api/reading/books/{isbn}/add-to-wishlist")
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] is True
        assert 'progress' in data
        
        progress = data['progress']
        assert progress['status'] == 'want_to_read'
        
        print("✓ Add to wishlist successful")
    
    def test_get_reading_statistics(self, client, sample_books):
        """Test getting reading statistics"""
        # Set up some reading progress
        for i, book_data in enumerate(sample_books):
            isbn = book_data['isbn']
            
            if i == 0:
                # Currently reading
                client.post(f"/api/reading/books/{isbn}/start-reading")
            elif i == 1:
                # Finished with rating
                client.post(f"/api/reading/books/{isbn}/start-reading")
                finish_data = {'rating': 5, 'review': 'Excellent!'}
                client.post(f"/api/reading/books/{isbn}/finish-reading", json=finish_data)
            else:
                # Want to read
                client.post(f"/api/reading/books/{isbn}/add-to-wishlist")
        
        # Get statistics
        response = client.get("/api/reading/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data['success'] is True
        assert 'stats' in data
        
        stats = data['stats']
        assert 'books_read' in stats
        assert 'books_reading' in stats
        assert 'books_want_to_read' in stats
        assert 'total_pages_read' in stats
        assert 'average_rating' in stats
        
        # Verify counts
        assert stats['books_read'] >= 1
        assert stats['books_reading'] >= 1
        assert stats['books_want_to_read'] >= 1
        
        print(f"✓ Reading statistics: {stats['books_read']} read, {stats['books_reading']} reading")
    
    def test_get_books_by_status(self, client, sample_books):
        """Test getting books by reading status"""
        # Set up different statuses
        isbn1 = sample_books[0]['isbn']
        isbn2 = sample_books[1]['isbn']
        isbn3 = sample_books[2]['isbn']
        
        client.post(f"/api/reading/books/{isbn1}/start-reading")
        client.post(f"/api/reading/books/{isbn2}/start-reading")
        finish_data = {'rating': 4}
        client.post(f"/api/reading/books/{isbn2}/finish-reading", json=finish_data)
        client.post(f"/api/reading/books/{isbn3}/add-to-wishlist")
        
        # Test different status queries
        test_cases = [
            ('currently_reading', 1),
            ('finished', 1),
            ('want_to_read', 1)
        ]
        
        for status, expected_count in test_cases:
            response = client.get(f"/api/reading/books/status/{status}")
            assert response.status_code == 200
            
            data = response.json()
            assert data['success'] is True
            assert 'books' in data
            
            books = data['books']
            assert len(books) >= expected_count
            
            # Verify all books have the correct status
            for book in books:
                assert book['reading_status'] == status
            
            print(f"✓ Found {len(books)} books with status '{status}'")
    
    def test_reading_progress_validation(self, client, sample_books):
        """Test validation of reading progress data"""
        isbn = sample_books[0]['isbn']
        
        # Test invalid progress percentage
        invalid_data = {
            'isbn': isbn,
            'status': 'currently_reading',
            'progress_percentage': 150.0  # Invalid - over 100%
        }
        
        response = client.put("/api/reading/progress", json=invalid_data)
        # Should either accept and clamp, or return validation error
        assert response.status_code in [200, 400, 422]
        
        if response.status_code == 200:
            data = response.json()
            # If accepted, should clamp to valid range
            assert data['progress']['progress_percentage'] <= 100.0
        
        # Test invalid rating
        invalid_rating_data = {
            'isbn': isbn,
            'status': 'finished',
            'rating': 10  # Invalid - should be 1-5
        }
        
        response = client.put("/api/reading/progress", json=invalid_rating_data)
        assert response.status_code in [200, 400, 422]
        
        print("✓ Reading progress validation working")
    
    def test_reading_progress_for_nonexistent_book(self, client):
        """Test reading progress operations on non-existent books"""
        fake_isbn = '9999999999999'
        
        # Try to start reading non-existent book
        response = client.post(f"/api/reading/books/{fake_isbn}/start-reading")
        assert response.status_code == 404
        
        data = response.json()
        assert 'not found' in data['detail'].lower()
        
        # Try to update progress for non-existent book
        progress_data = {
            'isbn': fake_isbn,
            'status': 'currently_reading',
            'current_page': 50
        }
        
        response = client.put("/api/reading/progress", json=progress_data)
        assert response.status_code == 404
        
        print("✓ Non-existent book handling working correctly")
    
    def test_reading_progress_history(self, client, sample_books):
        """Test reading progress history tracking"""
        isbn = sample_books[0]['isbn']
        
        # Start reading
        client.post(f"/api/reading/books/{isbn}/start-reading")
        
        # Update progress multiple times
        for page in [25, 50, 75, 100]:
            progress_data = {
                'isbn': isbn,
                'status': 'currently_reading' if page < 100 else 'finished',
                'current_page': page,
                'total_pages': 100,
                'progress_percentage': page
            }
            
            if page == 100:
                progress_data['rating'] = 4
                progress_data['status'] = 'finished'
            
            response = client.put("/api/reading/progress", json=progress_data)
            assert response.status_code == 200
        
        # Verify final state
        response = client.get(f"/api/reading/books/status/finished")
        assert response.status_code == 200
        
        data = response.json()
        finished_books = [b for b in data['books'] if b['isbn'] == isbn]
        assert len(finished_books) == 1
        
        book = finished_books[0]
        assert book['reading_status'] == 'finished'
        assert book['current_page'] == 100
        assert book['rating'] == 4
        
        print("✓ Reading progress history tracking working")
    
    def test_batch_reading_status_update(self, client, sample_books):
        """Test updating reading status for multiple books"""
        # This tests if the API can handle multiple operations efficiently
        
        # Mark all books as want to read
        for book_data in sample_books:
            isbn = book_data['isbn']
            response = client.post(f"/api/reading/books/{isbn}/add-to-wishlist")
            assert response.status_code == 200
        
        # Start reading some books
        for book_data in sample_books[:2]:
            isbn = book_data['isbn']
            response = client.post(f"/api/reading/books/{isbn}/start-reading")
            assert response.status_code == 200
        
        # Finish one book
        isbn = sample_books[0]['isbn']
        finish_data = {'rating': 5, 'review': 'Loved it!'}
        response = client.post(f"/api/reading/books/{isbn}/finish-reading", json=finish_data)
        assert response.status_code == 200
        
        # Verify final statistics
        response = client.get("/api/reading/stats")
        assert response.status_code == 200
        
        stats = response.json()['stats']
        assert stats['books_read'] >= 1
        assert stats['books_reading'] >= 1
        assert stats['books_want_to_read'] >= 1
        
        print("✓ Batch reading status updates working correctly")
    
    def test_reading_streak_calculation(self, client, sample_books):
        """Test reading streak calculation in statistics"""
        # This would test daily reading streak functionality
        # Implementation depends on how streaks are calculated
        
        response = client.get("/api/reading/stats")
        assert response.status_code == 200
        
        data = response.json()
        stats = data['stats']
        
        # Should have streak field
        assert 'reading_streak_days' in stats
        assert isinstance(stats['reading_streak_days'], int)
        assert stats['reading_streak_days'] >= 0
        
        print(f"✓ Reading streak: {stats['reading_streak_days']} days")
    
    def test_reading_goals_integration(self, client, sample_books):
        """Test reading goals integration with progress tracking"""
        # Test monthly/yearly reading goals
        
        response = client.get("/api/reading/stats")
        assert response.status_code == 200
        
        stats = response.json()['stats']
        
        # Should have time-based reading counts
        assert 'books_read_this_month' in stats
        assert 'books_read_this_year' in stats
        
        assert isinstance(stats['books_read_this_month'], int)
        assert isinstance(stats['books_read_this_year'], int)
        
        print(f"✓ Reading goals: {stats['books_read_this_month']} this month, {stats['books_read_this_year']} this year")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])