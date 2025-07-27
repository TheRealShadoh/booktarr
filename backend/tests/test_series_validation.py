"""
Tests for Series Validation Service
"""
import pytest
import asyncio
from datetime import date
from sqlmodel import Session, create_engine, SQLModel, select
import json

from backend.models import Series, SeriesVolume, Book, Edition
from backend.services.series_validation import SeriesValidationService
from backend.database import get_session


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
def sample_series_data(test_session):
    """Create sample series data with inconsistencies"""
    # Create a series with mismatched volume count
    series = Series(
        name="Test Series",
        author="Test Author",
        total_books=5,  # Claims 5 books
        status="ongoing"
    )
    test_session.add(series)
    test_session.commit()
    
    # Create only 3 volumes, but mark 4 as owned
    volumes = [
        SeriesVolume(
            series_id=series.id,
            position=1,
            title="Volume 1",
            status="owned",
            user_id=1
        ),
        SeriesVolume(
            series_id=series.id,
            position=2,
            title="Volume 2",
            status="owned",
            user_id=1
        ),
        SeriesVolume(
            series_id=series.id,
            position=3,
            title="Volume 3",
            status="owned",
            user_id=1
        ),
        # Duplicate position
        SeriesVolume(
            series_id=series.id,
            position=3,
            title="Volume 3 Duplicate",
            status="owned",
            user_id=1
        ),
    ]
    
    for volume in volumes:
        test_session.add(volume)
    
    # Create only 2 actual books
    books = [
        Book(
            title="Test Series Vol 1",
            series_name="Test Series",
            series_position=1,
            authors=json.dumps(["Test Author"])
        ),
        Book(
            title="Test Series Vol 2",
            series_name="Test Series",
            series_position=2,
            authors=json.dumps(["Test Author"])
        ),
    ]
    
    for book in books:
        test_session.add(book)
    
    test_session.commit()
    return series, volumes, books


@pytest.mark.asyncio
async def test_validate_series_detects_issues(test_session, sample_series_data):
    """Test that validation detects various issues"""
    series, volumes, books = sample_series_data
    
    # Mock get_session to return our test session
    def mock_get_session():
        yield test_session
    
    # Patch the get_session function
    import backend.services.series_validation
    backend.services.series_validation.get_session = mock_get_session
    
    service = SeriesValidationService()
    report = await service.validate_series("Test Series")
    
    assert not report["valid"]
    assert len(report["errors"]) > 0
    
    # Check specific errors
    errors = report["errors"]
    assert any("Owned volume count" in error for error in errors)
    assert any("Duplicate volume positions" in error for error in errors)


@pytest.mark.asyncio
async def test_reconcile_series_fixes_issues(test_session, sample_series_data):
    """Test that reconciliation fixes issues"""
    series, volumes, books = sample_series_data
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.series_validation
    backend.services.series_validation.get_session = mock_get_session
    
    service = SeriesValidationService()
    result = await service.reconcile_series("Test Series", fix_errors=True)
    
    assert result["success"]
    assert len(result["fixes_applied"]) > 0
    
    # Validate again to ensure issues are fixed
    report = await service.validate_series("Test Series")
    assert len(report["errors"]) < len(result["fixes_applied"])


@pytest.mark.asyncio
async def test_fix_volume_count(test_session):
    """Test fixing volume count specifically"""
    # Create series with wrong total_books
    series = Series(
        name="Count Test",
        author="Test",
        total_books=10,  # Way too high
        status="ongoing"
    )
    test_session.add(series)
    test_session.commit()
    
    # Add 3 volumes
    for i in range(1, 4):
        volume = SeriesVolume(
            series_id=series.id,
            position=i,
            title=f"Volume {i}",
            status="owned" if i <= 2 else "missing",
            user_id=1
        )
        test_session.add(volume)
    
    test_session.commit()
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.series_validation
    backend.services.series_validation.get_session = mock_get_session
    
    service = SeriesValidationService()
    result = await service.reconcile_series("Count Test", fix_errors=True)
    
    # Refresh and check
    test_session.refresh(series)
    assert series.total_books == 3  # Should be corrected to actual volume count


@pytest.mark.asyncio 
async def test_fix_orphaned_volumes(test_session):
    """Test fixing volumes marked as owned but with no book"""
    series = Series(
        name="Orphan Test",
        author="Test",
        total_books=3,
        status="ongoing"
    )
    test_session.add(series)
    test_session.commit()
    
    # Create volume marked as owned but no corresponding book
    volume = SeriesVolume(
        series_id=series.id,
        position=1,
        title="Orphaned Volume",
        status="owned",
        user_id=1
    )
    test_session.add(volume)
    test_session.commit()
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.series_validation
    backend.services.series_validation.get_session = mock_get_session
    
    service = SeriesValidationService()
    result = await service.reconcile_series("Orphan Test", fix_errors=True)
    
    # Check that status was changed
    test_session.refresh(volume)
    assert volume.status == "missing"


@pytest.mark.asyncio
async def test_remove_duplicate_volumes(test_session):
    """Test removing duplicate volumes"""
    series = Series(
        name="Duplicate Test",
        author="Test",
        total_books=3,
        status="ongoing"
    )
    test_session.add(series)
    test_session.commit()
    
    # Create duplicate volumes at position 1
    volume1 = SeriesVolume(
        series_id=series.id,
        position=1,
        title="Volume 1",
        status="missing",
        user_id=1
    )
    volume2 = SeriesVolume(
        series_id=series.id,
        position=1,
        title="Volume 1 Better",
        status="owned",
        isbn_13="1234567890123",
        cover_url="http://example.com/cover.jpg",
        user_id=1
    )
    
    test_session.add(volume1)
    test_session.add(volume2)
    test_session.commit()
    
    # Mock get_session
    def mock_get_session():
        yield test_session
    
    import backend.services.series_validation
    backend.services.series_validation.get_session = mock_get_session
    
    service = SeriesValidationService()
    result = await service.reconcile_series("Duplicate Test", fix_errors=True)
    
    # Check that only one volume remains
    stmt = select(SeriesVolume).where(
        SeriesVolume.series_id == series.id,
        SeriesVolume.position == 1
    )
    remaining_volumes = test_session.exec(stmt).all()
    assert len(remaining_volumes) == 1
    assert remaining_volumes[0].status == "owned"  # Should keep the better one