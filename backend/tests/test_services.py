import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import date, timedelta
from sqlmodel import Session, create_engine, SQLModel
import json
import tempfile
import os

from backend.models import Book, Edition, UserEditionStatus
from backend.services import BookSearchService, OwnershipService, ReleaseCalendarService
from backend.services.cache import JsonCache
from backend.services.metadata_refresh import MetadataRefreshService


@pytest.fixture
def engine():
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture
def temp_cache_file():
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
        f.write('{}')
        temp_file = f.name
    
    yield temp_file
    
    # Cleanup
    if os.path.exists(temp_file):
        os.unlink(temp_file)


class TestJsonCache:
    
    @pytest.mark.asyncio
    async def test_cache_isbn_data(self, temp_cache_file):
        cache = JsonCache(temp_cache_file)
        
        test_data = {
            "title": "Test Book",
            "authors": ["Test Author"],
            "isbn_13": "9781234567890"
        }
        
        # Set cache
        await cache.set_isbn_cache("9781234567890", test_data)
        
        # Get cache
        result = await cache.get_by_isbn("9781234567890")
        
        assert result is not None
        assert result["title"] == "Test Book"
        assert result["authors"] == ["Test Author"]
        assert result["isbn_13"] == "9781234567890"
    
    @pytest.mark.asyncio
    async def test_cache_title_author_data(self, temp_cache_file):
        cache = JsonCache(temp_cache_file)
        
        test_data = [{
            "title": "Test Book",
            "authors": ["Test Author"],
            "isbn_13": "9781234567890"
        }]
        
        # Set cache
        await cache.set_title_author_cache("Test Book", "Test Author", test_data)
        
        # Get cache
        result = await cache.get_by_title_author("Test Book", "Test Author")
        
        assert result is not None
        assert len(result) == 1
        assert result[0]["title"] == "Test Book"
    
    @pytest.mark.asyncio
    async def test_cache_expiry(self, temp_cache_file):
        cache = JsonCache(temp_cache_file)
        
        # Mock datetime to simulate old cache
        with patch('backend.services.cache.datetime') as mock_datetime:
            old_date = "2023-01-01T00:00:00"
            mock_datetime.now.return_value.isoformat.return_value = old_date
            
            await cache.set_isbn_cache("9781234567890", {"title": "Old Book"})
            
            # Now mock current time (31 days later)
            from datetime import datetime as real_datetime
            mock_datetime.now.return_value = real_datetime(2023, 2, 1)
            mock_datetime.fromisoformat.return_value = real_datetime(2023, 1, 1)
            
            # Should return None due to expiry
            result = await cache.get_by_isbn("9781234567890")
            assert result is None


class TestOwnershipService:
    
    def test_mark_edition_status_new(self, session):
        # Create test data
        book = Book(title="Test Book", authors=json.dumps(["Test Author"]))
        session.add(book)
        session.commit()
        session.refresh(book)
        
        edition = Edition(book_id=book.id, isbn_13="9781234567890")
        session.add(edition)
        session.commit()
        session.refresh(edition)
        
        # Create service with mocked session
        with patch('backend.services.ownership.get_session') as mock_get_session:
            mock_get_session.return_value.__enter__.return_value = session
            
            service = OwnershipService()
            result = service.mark_edition_status(
                user_id=1,
                edition_id=edition.id,
                status="own",
                notes="Test note"
            )
            
            assert result["success"] is True
            assert result["status"] == "own"
            assert result["notes"] == "Test note"
            
            # Verify in database
            user_status = session.query(UserEditionStatus).filter_by(
                user_id=1, edition_id=edition.id
            ).first()
            assert user_status is not None
            assert user_status.status == "own"
            assert user_status.notes == "Test note"
    
    def test_mark_edition_status_update_existing(self, session):
        # Create test data
        book = Book(title="Test Book", authors=json.dumps(["Test Author"]))
        session.add(book)
        session.commit()
        session.refresh(book)
        
        edition = Edition(book_id=book.id, isbn_13="9781234567890")
        session.add(edition)
        session.commit()
        session.refresh(edition)
        
        # Create existing status
        existing_status = UserEditionStatus(
            user_id=1,
            edition_id=edition.id,
            status="want",
            notes="Old note"
        )
        session.add(existing_status)
        session.commit()
        
        # Update status
        with patch('backend.services.ownership.get_session') as mock_get_session:
            mock_get_session.return_value.__enter__.return_value = session
            
            service = OwnershipService()
            result = service.mark_edition_status(
                user_id=1,
                edition_id=edition.id,
                status="own",
                notes="New note"
            )
            
            assert result["success"] is True
            assert result["status"] == "own"
            assert result["notes"] == "New note"
    
    def test_mark_edition_status_invalid_status(self, session):
        service = OwnershipService()
        
        with pytest.raises(ValueError, match="Status must be"):
            service.mark_edition_status(
                user_id=1,
                edition_id=1,
                status="invalid",
                notes="Test note"
            )
    
    def test_get_wanted_books(self, session):
        # Create test data
        book1 = Book(title="Book 1", authors=json.dumps(["Author 1"]))
        book2 = Book(title="Book 2", authors=json.dumps(["Author 2"]))
        session.add_all([book1, book2])
        session.commit()
        session.refresh(book1)
        session.refresh(book2)
        
        edition1 = Edition(book_id=book1.id, isbn_13="9781234567890")
        edition2 = Edition(book_id=book2.id, isbn_13="9781234567891")
        session.add_all([edition1, edition2])
        session.commit()
        session.refresh(edition1)
        session.refresh(edition2)
        
        # Create user statuses
        status1 = UserEditionStatus(user_id=1, edition_id=edition1.id, status="want")
        status2 = UserEditionStatus(user_id=1, edition_id=edition2.id, status="own")
        session.add_all([status1, status2])
        session.commit()
        
        # Test service
        with patch('backend.services.ownership.get_session') as mock_get_session:
            mock_get_session.return_value.__enter__.return_value = session
            
            service = OwnershipService()
            result = service.get_wanted_books(user_id=1)
            
            assert len(result) == 1
            assert result[0]["book_title"] == "Book 1"
            assert result[0]["isbn_13"] == "9781234567890"


class TestReleaseCalendarService:
    
    def test_get_release_calendar(self, session):
        # Create test data
        book = Book(title="Future Book", authors=json.dumps(["Author"]))
        session.add(book)
        session.commit()
        session.refresh(book)
        
        # Create future and past editions
        future_date = date.today() + timedelta(days=30)
        past_date = date.today() - timedelta(days=30)
        
        future_edition = Edition(
            book_id=book.id,
            isbn_13="9781234567890",
            release_date=future_date,
            book_format="hardcover"
        )
        past_edition = Edition(
            book_id=book.id,
            isbn_13="9781234567891",
            release_date=past_date,
            book_format="paperback"
        )
        session.add_all([future_edition, past_edition])
        session.commit()
        session.refresh(future_edition)
        session.refresh(past_edition)
        
        # Mark past edition as owned
        past_status = UserEditionStatus(
            user_id=1,
            edition_id=past_edition.id,
            status="own"
        )
        session.add(past_status)
        session.commit()
        
        # Test service
        with patch('backend.services.calendar.get_session') as mock_get_session:
            mock_get_session.return_value.__enter__.return_value = session
            
            service = ReleaseCalendarService()
            result = service.get_release_calendar(user_id=1)
            
            # Should only include future edition (not owned past edition)
            assert len(result) == 1
            
            month_key = future_date.strftime("%Y-%m")
            assert month_key in result
            assert len(result[month_key]) == 1
            assert result[month_key][0]["title"] == "Future Book"
            assert result[month_key][0]["format"] == "hardcover"
            assert result[month_key][0]["is_future_release"] is True
    
    def test_get_upcoming_series_releases(self, session):
        # Create test data
        book = Book(
            title="Series Book 2",
            authors=json.dumps(["Author"]),
            series_name="Test Series",
            series_position=2
        )
        session.add(book)
        session.commit()
        session.refresh(book)
        
        future_date = date.today() + timedelta(days=30)
        edition = Edition(
            book_id=book.id,
            isbn_13="9781234567890",
            release_date=future_date,
            book_format="hardcover"
        )
        session.add(edition)
        session.commit()
        
        # Test service
        with patch('backend.services.calendar.get_session') as mock_get_session:
            mock_get_session.return_value.__enter__.return_value = session
            
            service = ReleaseCalendarService()
            result = service.get_upcoming_series_releases(user_id=1, series_name="Test Series")
            
            assert len(result) == 1
            assert result[0]["title"] == "Series Book 2"
            assert result[0]["series_position"] == 2
            assert result[0]["days_until_release"] == 30


class TestBookSearchService:
    
    @pytest.mark.asyncio
    async def test_search_by_isbn(self):
        # Mock the external API clients
        mock_google_client = AsyncMock()
        mock_ol_client = AsyncMock()
        mock_cache = AsyncMock()
        
        # Mock search service
        search_service = BookSearchService()
        search_service.google_client = mock_google_client
        search_service.openlibrary_client = mock_ol_client
        search_service.cache = mock_cache
        
        # Mock cache miss
        mock_cache.get_by_isbn.return_value = None
        
        # Mock Google Books response
        mock_google_response = {
            "title": "Test Book",
            "authors": ["Test Author"],
            "isbn_13": "9781234567890",
            "google_books_id": "test_id"
        }
        mock_google_client.search_by_isbn.return_value = mock_google_response
        
        # Mock database operations
        with patch('backend.services.book_search.get_session') as mock_get_session:
            mock_session = MagicMock()
            mock_get_session.return_value.__enter__.return_value = mock_session
            mock_session.exec.return_value.first.return_value = None
            
            # Mock _save_book_to_db
            with patch.object(search_service, '_save_book_to_db') as mock_save:
                mock_save.return_value = None
                
                result = await search_service._search_by_isbn("9781234567890", user_id=1)
                
                assert result["title"] == "Test Book"
                assert result["authors"] == ["Test Author"]
                assert len(result["editions"]) == 1
                assert result["editions"][0]["isbn_13"] == "9781234567890"
    
    @pytest.mark.asyncio
    async def test_search_apis_deduplication(self):
        search_service = BookSearchService()
        
        # Mock clients
        mock_google_client = AsyncMock()
        mock_ol_client = AsyncMock()
        search_service.google_client = mock_google_client
        search_service.openlibrary_client = mock_ol_client
        
        # Mock responses with same ISBN
        google_response = [{
            "title": "Test Book",
            "authors": ["Test Author"],
            "isbn_13": "9781234567890",
            "source": "google_books"
        }]
        
        ol_response = [{
            "title": "Test Book",
            "authors": ["Test Author"],
            "isbn_13": "9781234567890",
            "source": "openlibrary"
        }]
        
        mock_google_client.search_by_title.return_value = google_response
        mock_ol_client.search_by_title.return_value = ol_response
        
        result = await search_service._search_apis("Test Book")
        
        # Should deduplicate by ISBN
        assert len(result) == 1
        assert result[0]["isbn_13"] == "9781234567890"


class TestMetadataRefreshService:
    
    @pytest.mark.asyncio
    async def test_refresh_isbn(self, temp_cache_file):
        service = MetadataRefreshService()
        
        # Mock clients
        mock_google_client = AsyncMock()
        mock_ol_client = AsyncMock()
        service.google_client = mock_google_client
        service.openlibrary_client = mock_ol_client
        
        # Mock cache
        mock_cache = AsyncMock()
        service.cache = mock_cache
        
        # Mock Google Books response
        mock_response = {
            "title": "Refreshed Book",
            "authors": ["Test Author"],
            "isbn_13": "9781234567890"
        }
        mock_google_client.search_by_isbn.return_value = mock_response
        
        result = await service._refresh_isbn("9781234567890")
        
        assert result is True
        mock_cache.set_isbn_cache.assert_called_once_with("9781234567890", mock_response)
    
    @pytest.mark.asyncio
    async def test_refresh_isbn_not_found(self, temp_cache_file):
        service = MetadataRefreshService()
        
        # Mock clients returning None
        mock_google_client = AsyncMock()
        mock_ol_client = AsyncMock()
        service.google_client = mock_google_client
        service.openlibrary_client = mock_ol_client
        
        mock_google_client.search_by_isbn.return_value = None
        mock_ol_client.search_by_isbn.return_value = None
        
        result = await service._refresh_isbn("9781234567890")
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_batch_refresh(self, temp_cache_file):
        service = MetadataRefreshService()
        
        # Mock _refresh_isbn
        with patch.object(service, '_refresh_isbn') as mock_refresh:
            mock_refresh.side_effect = [True, False, True]
            
            keys = ["isbn_123", "isbn_456", "isbn_789"]
            result = await service.batch_refresh(keys, batch_size=2)
            
            assert result["success_count"] == 2
            assert result["failure_count"] == 1
            assert result["total"] == 3