"""
Tests for Volume Sync Service
"""
import pytest
import asyncio
from datetime import date
from sqlmodel import Session, create_engine, SQLModel, select
import json

from backend.models import Series, SeriesVolume, Book, Edition
from backend.services.volume_sync_service import VolumeSyncService


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
def sample_data_for_sync(test_session):
    """Create sample data for sync testing"""
    # Create series
    series = Series(
        name="Sync Test Series",
        author="Test Author",
        total_books=3,
        status="ongoing"
    )
    test_session.add(series)
    test_session.commit()
    
    # Create books with editions
    books = []
    for i in range(1, 4):
        book = Book(
            title=f"Sync Test Vol {i}",
            series_name="Sync Test Series",
            series_position=i,
            authors=json.dumps(["Test Author"])
        )
        test_session.add(book)
        test_session.commit()
        
        edition = Edition(
            book_id=book.id,
            isbn_13=f"978000000000{i}",
            publisher="Test Publisher",
            cover_url=f"http://example.com/cover{i}.jpg"
        )
        test_session.add(edition)
        books.append(book)
    
    # Create only 2 volumes (missing one)
    volumes = []
    for i in range(1, 3):
        volume = SeriesVolume(
            series_id=series.id,
            position=i,
            title=f"Old Title {i}",  # Different from book title
            status="missing",  # Wrong status
            user_id=1
        )
        test_session.add(volume)
        volumes.append(volume)
    
    test_session.commit()
    return series, books, volumes


@pytest.mark.asyncio
async def test_sync_series_with_books(test_session, sample_data_for_sync):
    """Test syncing series volumes with books"""
    series, books, volumes = sample_data_for_sync
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.volume_sync_service
    backend.services.volume_sync_service.get_session = mock_get_session
    
    service = VolumeSyncService()
    result = await service.sync_series_with_books("Sync Test Series")
    
    assert result["success"]
    assert result["report"]["volumes_created"] == 1  # Volume 3 should be created
    assert result["report"]["volumes_updated"] == 2  # Volumes 1 and 2 should be updated
    assert result["report"]["status_changes"] == 3  # All should be marked as owned
    
    # Verify changes
    stmt = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
    all_volumes = test_session.exec(stmt).all()
    
    assert len(all_volumes) == 3  # Should have all 3 volumes now
    
    for volume in all_volumes:
        assert volume.status == "owned"
        assert volume.title.startswith("Sync Test Vol")  # Updated titles


@pytest.mark.asyncio
async def test_sync_book_to_volume_updates_metadata(test_session):
    """Test that syncing updates volume metadata from book"""
    # Create series
    series = Series(
        name="Metadata Test",
        author="Test Author",
        total_books=1,
        status="ongoing"
    )
    test_session.add(series)
    test_session.commit()
    
    # Create book with edition
    book = Book(
        title="Complete Book Title",
        series_name="Metadata Test",
        series_position=1,
        authors=json.dumps(["Test Author"])
    )
    test_session.add(book)
    test_session.commit()
    
    edition = Edition(
        book_id=book.id,
        isbn_13="9781234567890",
        isbn_10="1234567890",
        publisher="New Publisher",
        release_date=date(2023, 1, 1),
        cover_url="http://example.com/newcover.jpg"
    )
    test_session.add(edition)
    
    # Create volume with minimal data
    volume = SeriesVolume(
        series_id=series.id,
        position=1,
        title="Incomplete Title",
        status="missing",
        user_id=1
    )
    test_session.add(volume)
    test_session.commit()
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.volume_sync_service
    backend.services.volume_sync_service.get_session = mock_get_session
    
    service = VolumeSyncService()
    await service.sync_series_with_books("Metadata Test")
    
    # Check that volume was updated
    test_session.refresh(volume)
    assert volume.title == "Complete Book Title"
    assert volume.isbn_13 == "9781234567890"
    assert volume.isbn_10 == "1234567890"
    assert volume.publisher == "New Publisher"
    assert volume.published_date == date(2023, 1, 1)
    assert volume.cover_url == "http://example.com/newcover.jpg"
    assert volume.status == "owned"


@pytest.mark.asyncio
async def test_sync_creates_missing_volumes(test_session):
    """Test that sync creates volumes for books without volumes"""
    # Create series
    series = Series(
        name="Missing Volume Test",
        author="Test Author",
        total_books=2,
        status="ongoing"
    )
    test_session.add(series)
    test_session.commit()
    
    # Create books but no volumes
    for i in range(1, 3):
        book = Book(
            title=f"Book {i}",
            series_name="Missing Volume Test",
            series_position=i,
            authors=json.dumps(["Test Author"])
        )
        test_session.add(book)
    
    test_session.commit()
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.volume_sync_service
    backend.services.volume_sync_service.get_session = mock_get_session
    
    service = VolumeSyncService()
    result = await service.sync_series_with_books("Missing Volume Test")
    
    assert result["success"]
    assert result["report"]["volumes_created"] == 2
    
    # Verify volumes were created
    stmt = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
    volumes = test_session.exec(stmt).all()
    
    assert len(volumes) == 2
    for volume in volumes:
        assert volume.status == "owned"


@pytest.mark.asyncio
async def test_update_volume_statuses_by_isbn(test_session):
    """Test status updates using ISBN matching"""
    # Create series
    series = Series(
        name="ISBN Test",
        author="Test Author",
        total_books=2,
        status="ongoing"
    )
    test_session.add(series)
    test_session.commit()
    
    # Create book with edition
    book = Book(
        title="ISBN Book",
        series_name="ISBN Test",
        series_position=1,
        authors=json.dumps(["Test Author"])
    )
    test_session.add(book)
    test_session.commit()
    
    edition = Edition(
        book_id=book.id,
        isbn_13="9781111111111"
    )
    test_session.add(edition)
    
    # Create volume with same ISBN but different position
    volume = SeriesVolume(
        series_id=series.id,
        position=2,  # Different position
        title="Volume with ISBN",
        isbn_13="9781111111111",  # Same ISBN
        status="missing",
        user_id=1
    )
    test_session.add(volume)
    test_session.commit()
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.volume_sync_service
    backend.services.volume_sync_service.get_session = mock_get_session
    
    service = VolumeSyncService()
    await service.sync_series_with_books("ISBN Test")
    
    # Volume should be marked as owned due to ISBN match
    test_session.refresh(volume)
    assert volume.status == "owned"


@pytest.mark.asyncio
async def test_find_orphaned_volumes(test_session):
    """Test finding orphaned volumes"""
    # Create series
    series = Series(
        name="Orphan Test",
        author="Test Author",
        total_books=2,
        status="ongoing"
    )
    test_session.add(series)
    test_session.commit()
    
    # Create owned volume with no corresponding book
    orphaned_volume = SeriesVolume(
        series_id=series.id,
        position=1,
        title="Orphaned Volume",
        status="owned",
        user_id=1
    )
    test_session.add(orphaned_volume)
    
    # Create valid volume with book
    valid_book = Book(
        title="Valid Book",
        series_name="Orphan Test",
        series_position=2,
        authors=json.dumps(["Test Author"])
    )
    test_session.add(valid_book)
    test_session.commit()
    
    valid_volume = SeriesVolume(
        series_id=series.id,
        position=2,
        title="Valid Volume",
        status="owned",
        user_id=1
    )
    test_session.add(valid_volume)
    test_session.commit()
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.volume_sync_service
    backend.services.volume_sync_service.get_session = mock_get_session
    
    service = VolumeSyncService()
    orphaned = await service.find_orphaned_volumes()
    
    assert len(orphaned) == 1
    assert orphaned[0]["position"] == 1
    assert orphaned[0]["series"] == "Orphan Test"


@pytest.mark.asyncio
async def test_sync_all_series(test_session):
    """Test syncing all series"""
    # Create multiple series with books
    for i in range(1, 3):
        series = Series(
            name=f"Series {i}",
            author=f"Author {i}",
            total_books=1,
            status="ongoing"
        )
        test_session.add(series)
        test_session.commit()
        
        book = Book(
            title=f"Series {i} Book",
            series_name=f"Series {i}",
            series_position=1,
            authors=json.dumps([f"Author {i}"])
        )
        test_session.add(book)
    
    test_session.commit()
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.volume_sync_service
    backend.services.volume_sync_service.get_session = mock_get_session
    
    service = VolumeSyncService()
    result = await service.sync_all_series()
    
    assert result["series_processed"] == 2
    assert result["total_volumes_created"] == 2
    assert len(result["series_errors"]) == 0