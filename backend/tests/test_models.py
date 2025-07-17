import pytest
from datetime import date
from sqlmodel import Session, create_engine, SQLModel
import json

from backend.models import Book, Edition, UserEditionStatus


@pytest.fixture
def engine():
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        yield session


def test_create_book(session):
    book = Book(
        title="Test Book",
        authors=json.dumps(["Author One", "Author Two"]),
        series_name="Test Series",
        series_position=1,
        google_books_id="test_google_id",
        openlibrary_id="test_ol_id"
    )
    
    session.add(book)
    session.commit()
    session.refresh(book)
    
    assert book.id is not None
    assert book.title == "Test Book"
    assert json.loads(book.authors) == ["Author One", "Author Two"]
    assert book.series_name == "Test Series"
    assert book.series_position == 1
    assert book.google_books_id == "test_google_id"
    assert book.openlibrary_id == "test_ol_id"


def test_create_edition(session):
    # Create a book first
    book = Book(
        title="Test Book",
        authors=json.dumps(["Author One"])
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    
    # Create an edition
    edition = Edition(
        book_id=book.id,
        isbn_10="1234567890",
        isbn_13="9781234567890",
        book_format="hardcover",
        publisher="Test Publisher",
        release_date=date(2023, 1, 1),
        cover_url="https://example.com/cover.jpg",
        price=29.99,
        source="google_books"
    )
    
    session.add(edition)
    session.commit()
    session.refresh(edition)
    
    assert edition.id is not None
    assert edition.book_id == book.id
    assert edition.isbn_10 == "1234567890"
    assert edition.isbn_13 == "9781234567890"
    assert edition.book_format == "hardcover"
    assert edition.publisher == "Test Publisher"
    assert edition.release_date == date(2023, 1, 1)
    assert edition.cover_url == "https://example.com/cover.jpg"
    assert edition.price == 29.99
    assert edition.source == "google_books"


def test_create_user_edition_status(session):
    # Create a book and edition first
    book = Book(
        title="Test Book",
        authors=json.dumps(["Author One"])
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    
    edition = Edition(
        book_id=book.id,
        isbn_13="9781234567890"
    )
    session.add(edition)
    session.commit()
    session.refresh(edition)
    
    # Create user status
    user_status = UserEditionStatus(
        user_id=1,
        edition_id=edition.id,
        status="own",
        notes="Signed copy"
    )
    
    session.add(user_status)
    session.commit()
    session.refresh(user_status)
    
    assert user_status.id is not None
    assert user_status.user_id == 1
    assert user_status.edition_id == edition.id
    assert user_status.status == "own"
    assert user_status.notes == "Signed copy"


def test_book_edition_relationship(session):
    # Create a book
    book = Book(
        title="Test Book",
        authors=json.dumps(["Author One"])
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    
    # Create multiple editions
    edition1 = Edition(
        book_id=book.id,
        isbn_13="9781234567890",
        book_format="hardcover"
    )
    edition2 = Edition(
        book_id=book.id,
        isbn_13="9781234567891",
        book_format="paperback"
    )
    
    session.add(edition1)
    session.add(edition2)
    session.commit()
    
    # Test relationship
    session.refresh(book)
    assert len(book.editions) == 2
    assert edition1 in book.editions
    assert edition2 in book.editions
    
    # Test back reference
    assert edition1.book == book
    assert edition2.book == book


def test_edition_user_status_relationship(session):
    # Create a book and edition
    book = Book(
        title="Test Book",
        authors=json.dumps(["Author One"])
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    
    edition = Edition(
        book_id=book.id,
        isbn_13="9781234567890"
    )
    session.add(edition)
    session.commit()
    session.refresh(edition)
    
    # Create user statuses
    status1 = UserEditionStatus(
        user_id=1,
        edition_id=edition.id,
        status="own"
    )
    status2 = UserEditionStatus(
        user_id=2,
        edition_id=edition.id,
        status="want"
    )
    
    session.add(status1)
    session.add(status2)
    session.commit()
    
    # Test relationship
    session.refresh(edition)
    assert len(edition.user_statuses) == 2
    assert status1 in edition.user_statuses
    assert status2 in edition.user_statuses
    
    # Test back reference
    assert status1.edition == edition
    assert status2.edition == edition


def test_book_minimal_fields(session):
    book = Book(
        title="Minimal Book",
        authors=json.dumps(["Author"])
    )
    
    session.add(book)
    session.commit()
    session.refresh(book)
    
    assert book.id is not None
    assert book.title == "Minimal Book"
    assert book.series_name is None
    assert book.series_position is None
    assert book.google_books_id is None
    assert book.openlibrary_id is None


def test_edition_minimal_fields(session):
    # Create a book first
    book = Book(
        title="Test Book",
        authors=json.dumps(["Author One"])
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    
    # Create minimal edition
    edition = Edition(
        book_id=book.id
    )
    
    session.add(edition)
    session.commit()
    session.refresh(edition)
    
    assert edition.id is not None
    assert edition.book_id == book.id
    assert edition.isbn_10 is None
    assert edition.isbn_13 is None
    assert edition.book_format is None
    assert edition.publisher is None
    assert edition.release_date is None
    assert edition.cover_url is None
    assert edition.price is None
    assert edition.source is None