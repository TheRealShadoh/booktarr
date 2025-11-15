"""
Manga-Specific Metadata Service for handling manga, light novels, manhwa, etc.
"""
from typing import Dict, Any, Optional, List
from datetime import date
from sqlmodel import Session, select
import json

try:
    from backend.models import Book, Series, Serialization, Edition
    from backend.database import get_db_session
except ImportError:
    from models import Book, Series, Serialization, Edition
    from database import get_db_session


class MangaMetadataService:
    """Service for managing manga-specific metadata"""

    # Format type constants
    MANGA = "manga"
    LIGHT_NOVEL = "light_novel"
    MANHWA = "manhwa"
    MANHUA = "manhua"
    WEB_NOVEL = "web_novel"
    TRADITIONAL_NOVEL = "traditional_novel"
    GRAPHIC_NOVEL = "graphic_novel"

    BOOK_TYPES = [MANGA, LIGHT_NOVEL, MANHWA, MANHUA, WEB_NOVEL, TRADITIONAL_NOVEL, GRAPHIC_NOVEL]

    # Translation status constants
    OFFICIAL_TRANSLATION = "official"
    FAN_TRANSLATION = "fan_translation"
    SCANLATION = "scanlation"

    TRANSLATION_STATUSES = [OFFICIAL_TRANSLATION, FAN_TRANSLATION, SCANLATION]

    @staticmethod
    def get_book_format_icon(book_type: Optional[str]) -> str:
        """
        Get icon/emoji for book format for UI display

        Args:
            book_type: Type of book (manga, light_novel, etc.)

        Returns:
            Icon string for UI display
        """
        icon_map = {
            "manga": "📖",
            "light_novel": "📚",
            "manhwa": "🇰🇷",
            "manhua": "🇨🇳",
            "web_novel": "💻",
            "traditional_novel": "📕",
            "graphic_novel": "🎨"
        }
        return icon_map.get(book_type, "📕")

    @staticmethod
    def get_book_format_label(book_type: Optional[str]) -> str:
        """
        Get human-readable label for book format

        Args:
            book_type: Type of book

        Returns:
            Human-readable label
        """
        label_map = {
            "manga": "Manga",
            "light_novel": "Light Novel",
            "manhwa": "Manhwa",
            "manhua": "Manhua",
            "web_novel": "Web Novel",
            "traditional_novel": "Novel",
            "graphic_novel": "Graphic Novel"
        }
        return label_map.get(book_type, "Book")

    @staticmethod
    def get_translation_status_label(status: Optional[str]) -> str:
        """
        Get human-readable label for translation status

        Args:
            status: Translation status (official, fan_translation, scanlation)

        Returns:
            Human-readable label
        """
        label_map = {
            "official": "Official Translation",
            "fan_translation": "Fan Translation",
            "scanlation": "Scanlation"
        }
        return label_map.get(status, "Unknown")

    @staticmethod
    def add_serialization(series_id: int, magazine_name: str, start_date: Optional[date] = None,
                         end_date: Optional[date] = None, region: Optional[str] = None,
                         notes: Optional[str] = None, session: Session = None) -> Serialization:
        """
        Add serialization information for a series

        Args:
            series_id: ID of the series
            magazine_name: Name of the magazine (e.g., "Weekly Shonen Jump")
            start_date: When serialization started
            end_date: When serialization ended
            region: Country/region (Japan, USA, Korea, etc.)
            notes: Additional info
            session: Database session
        """
        use_existing_session = session is not None

        if not use_existing_session:
            session = get_db_session()

        try:
            serialization = Serialization(
                series_id=series_id,
                magazine_name=magazine_name,
                start_date=start_date,
                end_date=end_date,
                region=region,
                notes=notes
            )
            session.add(serialization)

            if not use_existing_session:
                session.commit()
                session.close()

            return serialization
        except Exception as e:
            if not use_existing_session:
                session.close()
            raise e

    @staticmethod
    def get_serializations(series_id: int, session: Session = None) -> List[Serialization]:
        """Get all serialization info for a series"""
        use_existing_session = session is not None

        if not use_existing_session:
            session = get_db_session()

        try:
            statement = select(Serialization).where(Serialization.series_id == series_id)
            serializations = session.exec(statement).all()
            return serializations
        finally:
            if not use_existing_session:
                session.close()

    @staticmethod
    def update_book_manga_metadata(book_id: int, book_type: Optional[str] = None,
                                  original_title: Optional[str] = None,
                                  original_language: Optional[str] = None,
                                  anilist_id: Optional[int] = None,
                                  session: Session = None) -> Book:
        """
        Update manga-specific metadata for a book

        Args:
            book_id: ID of the book
            book_type: Type of book (manga, light_novel, etc.)
            original_title: Original title in native language
            original_language: Language code (ja, ko, zh, etc.)
            anilist_id: AniList ID if available
            session: Database session
        """
        use_existing_session = session is not None

        if not use_existing_session:
            session = get_db_session()

        try:
            statement = select(Book).where(Book.id == book_id)
            book = session.exec(statement).first()

            if not book:
                raise ValueError(f"Book with ID {book_id} not found")

            if book_type:
                book.book_type = book_type
            if original_title:
                book.original_title = original_title
            if original_language:
                book.original_language = original_language
            if anilist_id:
                book.anilist_id = anilist_id

            session.add(book)

            if not use_existing_session:
                session.commit()
                session.refresh(book)
                session.close()

            return book
        except Exception as e:
            if not use_existing_session:
                session.close()
            raise e

    @staticmethod
    def update_edition_manga_metadata(edition_id: int, language: Optional[str] = None,
                                     translation_status: Optional[str] = None,
                                     translator: Optional[str] = None,
                                     is_color: Optional[bool] = None,
                                     chapter_count: Optional[int] = None,
                                     format_variant: Optional[str] = None,
                                     session: Session = None) -> Edition:
        """
        Update manga-specific metadata for an edition

        Args:
            edition_id: ID of the edition
            language: Language of this edition
            translation_status: Translation status (official, fan_translation, scanlation)
            translator: Name of translator(s)
            is_color: Whether manga is in color
            chapter_count: Number of chapters
            format_variant: Edition variant (deluxe, box set, omnibus, etc.)
            session: Database session
        """
        use_existing_session = session is not None

        if not use_existing_session:
            session = get_db_session()

        try:
            statement = select(Edition).where(Edition.id == edition_id)
            edition = session.exec(statement).first()

            if not edition:
                raise ValueError(f"Edition with ID {edition_id} not found")

            if language:
                edition.language = language
            if translation_status:
                edition.translation_status = translation_status
            if translator:
                edition.translator = translator
            if is_color is not None:
                edition.is_color = is_color
            if chapter_count:
                edition.chapter_count = chapter_count
            if format_variant:
                edition.format_variant = format_variant

            session.add(edition)

            if not use_existing_session:
                session.commit()
                session.refresh(edition)
                session.close()

            return edition
        except Exception as e:
            if not use_existing_session:
                session.close()
            raise e

    @staticmethod
    def format_book_with_metadata(book: Book, include_creators: bool = False) -> Dict[str, Any]:
        """
        Format book data for API response with manga-specific metadata

        Args:
            book: Book object
            include_creators: Whether to include creator information

        Returns:
            Formatted book dict
        """
        result = {
            "id": book.id,
            "title": book.title,
            "original_title": book.original_title,
            "authors": json.loads(book.authors) if isinstance(book.authors, str) else book.authors,
            "book_type": book.book_type,
            "original_language": book.original_language,
            "series_name": book.series_name,
            "series_position": book.series_position,
            "anilist_id": book.anilist_id,
            "external_ids": {
                "google_books": book.google_books_id,
                "openlibrary": book.openlibrary_id
            }
        }

        if include_creators and book.creators:
            result["creators"] = [
                {
                    "name": creator.name,
                    "role": creator.role,
                    "language": creator.language,
                    "notes": creator.notes
                }
                for creator in book.creators
            ]

        return result
