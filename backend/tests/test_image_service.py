"""
Tests for Image Service
"""
import pytest
import asyncio
from pathlib import Path
import tempfile
import shutil
import json
from unittest.mock import Mock, patch, AsyncMock
import httpx

from backend.services.image_service import ImageService
from backend.models import Series, SeriesVolume, Book, Edition
from sqlmodel import Session, create_engine, SQLModel


@pytest.fixture
def temp_storage():
    """Create temporary storage directory"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def image_service(temp_storage):
    """Create image service with temp storage"""
    return ImageService(storage_path=temp_storage)


@pytest.fixture
def test_db():
    """Create a test database"""
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def test_session(test_db):
    """Create a test session"""
    with Session(test_db) as session:
        yield session


@pytest.fixture
def sample_series_with_books(test_session):
    """Create sample series with books and volumes"""
    # Create series
    series = Series(
        name="Test Manga",
        author="Test Author",
        total_books=3,
        status="ongoing"
    )
    test_session.add(series)
    test_session.commit()
    
    # Create volumes
    volumes = []
    for i in range(1, 4):
        volume = SeriesVolume(
            series_id=series.id,
            position=i,
            title=f"Test Manga Vol {i}",
            isbn_13=f"123456789012{i}",
            status="owned" if i <= 2 else "missing",
            user_id=1
        )
        test_session.add(volume)
        volumes.append(volume)
    
    # Create books with editions
    books = []
    for i in range(1, 3):
        book = Book(
            title=f"Test Manga Vol {i}",
            series_name="Test Manga",
            series_position=i,
            authors=json.dumps(["Test Author"])
        )
        test_session.add(book)
        test_session.commit()
        
        edition = Edition(
            book_id=book.id,
            isbn_13=f"123456789012{i}",
            cover_url=f"http://example.com/cover{i}.jpg"
        )
        test_session.add(edition)
        books.append(book)
    
    test_session.commit()
    return series, volumes, books


def test_get_image_path_for_isbn(image_service):
    """Test getting image path for ISBN"""
    path = image_service.get_image_path(isbn="1234567890123")
    assert path.name == "1234567890123.jpg"
    assert path.parent == image_service.books_path


def test_get_image_path_for_series(image_service):
    """Test getting image path for series volume"""
    path = image_service.get_image_path(series_name="Test Series", volume=1)
    assert "Test_Series_vol1.jpg" in path.name
    assert path.parent == image_service.series_path


def test_sanitize_filename(image_service):
    """Test filename sanitization"""
    safe_name = image_service._sanitize_filename("Test: Series / Name\\")
    assert ":" not in safe_name
    assert "/" not in safe_name
    assert "\\" not in safe_name


@pytest.mark.asyncio
async def test_download_image_success(image_service):
    """Test successful image download"""
    # Mock httpx response
    mock_response = Mock()
    mock_response.content = b"fake image data"
    mock_response.raise_for_status = Mock()
    
    with patch('httpx.AsyncClient') as mock_client:
        mock_async_client = AsyncMock()
        mock_async_client.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_async_client
        
        path = await image_service.download_image(
            "http://example.com/cover.jpg",
            isbn="1234567890123"
        )
        
        assert path is not None
        assert Path(path).exists()
        assert Path(path).read_bytes() == b"fake image data"


@pytest.mark.asyncio
async def test_download_image_already_exists(image_service):
    """Test download when image already exists"""
    # Create existing file
    isbn = "1234567890123"
    existing_path = image_service.get_image_path(isbn=isbn)
    existing_path.parent.mkdir(parents=True, exist_ok=True)
    existing_path.write_text("existing")
    
    # Should return path without downloading
    with patch('httpx.AsyncClient') as mock_client:
        path = await image_service.download_image(
            "http://example.com/cover.jpg",
            isbn=isbn
        )
        
        assert path == str(existing_path)
        mock_client.assert_not_called()


@pytest.mark.asyncio
async def test_match_existing_covers_to_volumes(test_session, image_service, sample_series_with_books):
    """Test matching existing covers to volumes"""
    series, volumes, books = sample_series_with_books
    
    # Create some existing cover files
    for i in range(1, 3):
        cover_path = image_service.get_image_path(isbn=f"123456789012{i}")
        cover_path.parent.mkdir(parents=True, exist_ok=True)
        cover_path.write_text(f"cover{i}")
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.image_service
    backend.services.image_service.get_session = mock_get_session
    
    matches = await image_service.match_existing_covers_to_volumes("Test Manga")
    
    assert len(matches) == 2
    assert 1 in matches
    assert 2 in matches
    assert 3 not in matches  # No cover for volume 3


@pytest.mark.asyncio
async def test_download_missing_volume_covers(test_session, image_service, sample_series_with_books):
    """Test downloading missing covers for volumes"""
    series, volumes, books = sample_series_with_books
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.image_service
    backend.services.image_service.get_session = mock_get_session
    
    # Mock download_image
    async def mock_download(url, series_name=None, volume=None, isbn=None):
        if volume == 3:
            return f"/fake/path/vol{volume}.jpg"
        return None
    
    image_service.download_image = mock_download
    
    # Add cover URL to volume 3
    vol3 = next(v for v in volumes if v.position == 3)
    vol3.cover_url = "http://example.com/vol3.jpg"
    test_session.add(vol3)
    test_session.commit()
    
    downloaded = await image_service.download_missing_volume_covers(series.id)
    
    assert len(downloaded) == 1
    assert 3 in downloaded


def test_get_cover_url_for_volume_series_cover(image_service):
    """Test getting cover URL when series-specific cover exists"""
    # Create series cover file
    series_path = image_service.get_image_path(series_name="Test Series", volume=1)
    series_path.parent.mkdir(parents=True, exist_ok=True)
    series_path.write_text("series cover")
    
    url = image_service.get_cover_url_for_volume("Test Series", 1)
    assert url == "/api/images/series/Test Series/1"


@pytest.mark.asyncio
async def test_sync_all_series_covers(test_session, image_service):
    """Test syncing covers for all series"""
    # Create multiple series
    for i in range(1, 3):
        series = Series(
            name=f"Series {i}",
            author=f"Author {i}",
            total_books=2,
            status="ongoing"
        )
        test_session.add(series)
    test_session.commit()
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.image_service
    backend.services.image_service.get_session = mock_get_session
    
    # Mock the sync methods
    async def mock_match(*args):
        return {1: "path1", 2: "path2"}
    
    async def mock_download(*args):
        return {}
    
    image_service.match_existing_covers_to_volumes = mock_match
    image_service.download_missing_volume_covers = mock_download
    
    results = await image_service.sync_all_series_covers()
    
    assert results["series_processed"] == 2
    assert results["covers_matched"] == 4  # 2 per series
    assert results["covers_downloaded"] == 0
    assert len(results["errors"]) == 0