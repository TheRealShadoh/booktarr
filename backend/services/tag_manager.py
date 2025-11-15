"""
Tag Management Service for Smart Collection Features
Handles tags, categories, language filtering, and duplicate detection
"""
import json
from typing import Optional, List, Dict, Any, Set
from sqlmodel import Session, select
from models.book import Book, Edition
from models.series import Series


class TagManager:
    """Service for managing tags, categories, and collection features"""

    @staticmethod
    def add_tag_to_book(session: Session, book_id: int, tag: str) -> Book:
        """Add a single tag to a book"""
        book = session.exec(select(Book).where(Book.id == book_id)).first()
        if not book:
            raise ValueError(f"Book {book_id} not found")

        tags = TagManager.parse_json_list(book.tags) or []
        if tag not in tags:
            tags.append(tag)
            book.tags = json.dumps(tags)
            session.add(book)
            session.commit()
            session.refresh(book)

        return book

    @staticmethod
    def remove_tag_from_book(session: Session, book_id: int, tag: str) -> Book:
        """Remove a tag from a book"""
        book = session.exec(select(Book).where(Book.id == book_id)).first()
        if not book:
            raise ValueError(f"Book {book_id} not found")

        tags = TagManager.parse_json_list(book.tags) or []
        if tag in tags:
            tags.remove(tag)
            book.tags = json.dumps(tags) if tags else None
            session.add(book)
            session.commit()
            session.refresh(book)

        return book

    @staticmethod
    def set_tags_for_book(session: Session, book_id: int, tags: List[str]) -> Book:
        """Set all tags for a book"""
        book = session.exec(select(Book).where(Book.id == book_id)).first()
        if not book:
            raise ValueError(f"Book {book_id} not found")

        # Remove duplicates and filter empty strings
        clean_tags = list(set(t.strip() for t in tags if t.strip()))
        book.tags = json.dumps(clean_tags) if clean_tags else None
        session.add(book)
        session.commit()
        session.refresh(book)

        return book

    @staticmethod
    def add_tag_to_series(session: Session, series_id: int, tag: str) -> Series:
        """Add a single tag to a series"""
        series = session.exec(select(Series).where(Series.id == series_id)).first()
        if not series:
            raise ValueError(f"Series {series_id} not found")

        tags = TagManager.parse_json_list(series.tags) or []
        if tag not in tags:
            tags.append(tag)
            series.tags = json.dumps(tags)
            session.add(series)
            session.commit()
            session.refresh(series)

        return series

    @staticmethod
    def get_all_tags(session: Session) -> List[str]:
        """Get all unique tags used across all books and series"""
        tags_set: Set[str] = set()

        # Get tags from books
        books = session.exec(select(Book)).all()
        for book in books:
            book_tags = TagManager.parse_json_list(book.tags)
            if book_tags:
                tags_set.update(book_tags)

        # Get tags from series
        series_list = session.exec(select(Series)).all()
        for series in series_list:
            series_tags = TagManager.parse_json_list(series.tags)
            if series_tags:
                tags_set.update(series_tags)

        return sorted(list(tags_set))

    @staticmethod
    def get_all_categories(session: Session) -> List[str]:
        """Get all unique categories used across all books"""
        categories_set: Set[str] = set()

        books = session.exec(select(Book)).all()
        for book in books:
            book_categories = TagManager.parse_json_list(book.categories)
            if book_categories:
                categories_set.update(book_categories)

        return sorted(list(categories_set))

    @staticmethod
    def filter_books_by_tag(session: Session, tag: str) -> List[Book]:
        """Get all books with a specific tag"""
        books = session.exec(select(Book)).all()
        return [
            book for book in books
            if tag in (TagManager.parse_json_list(book.tags) or [])
        ]

    @staticmethod
    def filter_books_by_category(session: Session, category: str) -> List[Book]:
        """Get all books with a specific category"""
        books = session.exec(select(Book)).all()
        return [
            book for book in books
            if category in (TagManager.parse_json_list(book.categories) or [])
        ]

    @staticmethod
    def filter_books_by_language(session: Session, language: str) -> List[Book]:
        """Get all books in a specific language (e.g., 'en', 'ja', 'fr')"""
        return session.exec(
            select(Book).where(Book.language == language)
        ).all()

    @staticmethod
    def filter_books_by_multiple_tags(session: Session, tags: List[str], match_all: bool = False) -> List[Book]:
        """Filter books by multiple tags

        Args:
            tags: List of tags to filter by
            match_all: If True, book must have ALL tags. If False, book must have ANY tag
        """
        books = session.exec(select(Book)).all()
        result = []

        for book in books:
            book_tags = set(TagManager.parse_json_list(book.tags) or [])
            tags_set = set(tags)

            if match_all:
                # Book must have all specified tags
                if tags_set.issubset(book_tags):
                    result.append(book)
            else:
                # Book must have at least one specified tag
                if book_tags.intersection(tags_set):
                    result.append(book)

        return result

    @staticmethod
    def find_duplicate_editions(session: Session, isbn: str = None, title: str = None,
                               author: str = None) -> List[List[Book]]:
        """Find potential duplicate books based on ISBN, title, and author

        Returns groups of potentially duplicate books
        """
        duplicates = []

        if isbn:
            # Find editions with same ISBN
            editions = session.exec(
                select(Edition).where(
                    (Edition.isbn_13 == isbn) | (Edition.isbn_10 == isbn)
                )
            ).all()

            book_ids = set(e.book_id for e in editions)
            if len(book_ids) > 1:
                books = [session.get(Book, bid) for bid in book_ids]
                duplicates.append(books)

        if title and author:
            # Find books with similar title and author
            books = session.exec(select(Book)).all()
            grouped: Dict[tuple, List[Book]] = {}

            for book in books:
                if title.lower() in book.title.lower() or book.title.lower() in title.lower():
                    key = (book.title.lower(), book.authors.lower() if book.authors else "")
                    if key not in grouped:
                        grouped[key] = []
                    grouped[key].append(book)

            for group in grouped.values():
                if len(group) > 1:
                    duplicates.append(group)

        return duplicates

    @staticmethod
    def detect_edition_variants(session: Session, title: str, author: str = None) -> Dict[str, List[Edition]]:
        """Detect different editions/formats of the same book

        Returns a dictionary grouped by format (hardcover, paperback, ebook, etc.)
        """
        books = session.exec(select(Book).where(Book.title == title)).all()
        if author:
            books = [b for b in books if author.lower() in (b.authors.lower() if b.authors else "")]

        variants: Dict[str, List[Edition]] = {}

        for book in books:
            for edition in book.editions:
                format_key = edition.book_format or "unknown"
                if format_key not in variants:
                    variants[format_key] = []
                variants[format_key].append(edition)

        return variants

    @staticmethod
    def parse_json_list(json_str: Optional[str]) -> Optional[List[str]]:
        """Parse a JSON string into a list, handling None and empty values"""
        if not json_str:
            return None
        try:
            return json.loads(json_str)
        except (json.JSONDecodeError, TypeError):
            return None

    @staticmethod
    def serialize_json_list(items: Optional[List[str]]) -> Optional[str]:
        """Serialize a list to JSON, handling None and empty values"""
        if not items:
            return None
        # Remove duplicates and empty strings
        clean_items = list(set(item.strip() for item in items if item and item.strip()))
        return json.dumps(clean_items) if clean_items else None

    @staticmethod
    def get_book_collection_stats(session: Session) -> Dict[str, Any]:
        """Get statistics about the collection"""
        books = session.exec(select(Book)).all()
        editions = session.exec(select(Edition)).all()

        # Count by language
        languages: Dict[str, int] = {}
        for book in books:
            if book.language:
                languages[book.language] = languages.get(book.language, 0) + 1

        # Count by format
        formats: Dict[str, int] = {}
        for edition in editions:
            if edition.book_format:
                formats[edition.book_format] = formats.get(edition.book_format, 0) + 1

        # Count by category
        categories: Dict[str, int] = {}
        for book in books:
            book_cats = TagManager.parse_json_list(book.categories) or []
            for cat in book_cats:
                categories[cat] = categories.get(cat, 0) + 1

        # Count by tag
        tags: Dict[str, int] = {}
        for book in books:
            book_tags = TagManager.parse_json_list(book.tags) or []
            for tag in book_tags:
                tags[tag] = tags.get(tag, 0) + 1

        return {
            "total_books": len(books),
            "total_editions": len(editions),
            "languages": languages,
            "formats": formats,
            "categories": categories,
            "tags": tags,
            "unique_languages": len(languages),
            "unique_formats": len(formats),
            "unique_categories": len(categories),
            "unique_tags": len(tags)
        }


class SmartDuplicateDetector:
    """Advanced duplicate detection considering format and language variants"""

    @staticmethod
    def score_similarity(book1: Book, book2: Book) -> float:
        """Score similarity between two books (0-1 scale)"""
        score = 0.0

        # Title similarity (most important)
        if book1.title.lower() == book2.title.lower():
            score += 0.5
        elif book1.title.lower() in book2.title.lower() or book2.title.lower() in book1.title.lower():
            score += 0.3

        # Author similarity
        if book1.authors and book2.authors:
            if book1.authors.lower() == book2.authors.lower():
                score += 0.3
            elif any(a.lower() in book2.authors.lower() for a in book1.authors.split(',')):
                score += 0.15

        # Same series is a strong indicator
        if book1.series_name and book1.series_name.lower() == book2.series_name.lower():
            if book1.series_position == book2.series_position:
                score += 0.2  # Likely same book, different edition

        return min(score, 1.0)

    @staticmethod
    def find_duplicates_with_confidence(session: Session, threshold: float = 0.6) -> List[tuple]:
        """Find duplicate books with confidence score

        Returns list of tuples: (book1, book2, confidence_score)
        """
        books = session.exec(select(Book)).all()
        duplicates = []

        for i, book1 in enumerate(books):
            for book2 in books[i+1:]:
                score = SmartDuplicateDetector.score_similarity(book1, book2)
                if score >= threshold:
                    duplicates.append((book1, book2, score))

        return sorted(duplicates, key=lambda x: x[2], reverse=True)

    @staticmethod
    def merge_duplicate_books(session: Session, primary_id: int, duplicate_ids: List[int]) -> Book:
        """Merge duplicate books into a primary book

        Combines tags, categories, and editions from duplicate books
        """
        primary = session.get(Book, primary_id)
        if not primary:
            raise ValueError(f"Primary book {primary_id} not found")

        # Merge tags
        primary_tags = set(TagManager.parse_json_list(primary.tags) or [])

        # Merge categories
        primary_categories = set(TagManager.parse_json_list(primary.categories) or [])

        # Merge editions from duplicates
        for dup_id in duplicate_ids:
            dup_book = session.get(Book, dup_id)
            if not dup_book:
                continue

            # Merge tags
            dup_tags = TagManager.parse_json_list(dup_book.tags) or []
            primary_tags.update(dup_tags)

            # Merge categories
            dup_categories = TagManager.parse_json_list(dup_book.categories) or []
            primary_categories.update(dup_categories)

            # Move editions to primary book
            for edition in dup_book.editions:
                edition.book_id = primary_id

            # Delete the duplicate book
            session.delete(dup_book)

        # Save merged data
        primary.tags = TagManager.serialize_json_list(list(primary_tags))
        primary.categories = TagManager.serialize_json_list(list(primary_categories))
        session.add(primary)
        session.commit()
        session.refresh(primary)

        return primary
