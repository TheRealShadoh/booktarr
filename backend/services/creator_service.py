"""
Creator Service for managing authors, artists, illustrators, and translators
"""
import json
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select

try:
    from backend.models import Creator, Book
    from backend.database import get_db_session
except ImportError:
    from models import Creator, Book
    from database import get_db_session


class CreatorService:
    """Service for managing creators and their roles"""

    @staticmethod
    def add_creator(book_id: int, name: str, role: str, language: Optional[str] = None,
                   notes: Optional[str] = None, session: Session = None) -> Creator:
        """
        Add a creator (author, artist, translator, etc.) to a book

        Args:
            book_id: ID of the book
            name: Creator's name
            role: Creator's role (author, artist, mangaka, illustrator, translator, adapter, etc.)
            language: Language they are credited in (important for translators)
            notes: Additional context
            session: Database session (creates new if not provided)
        """
        use_existing_session = session is not None

        if not use_existing_session:
            session = get_db_session()

        try:
            creator = Creator(
                book_id=book_id,
                name=name,
                role=role,
                language=language,
                notes=notes
            )
            session.add(creator)

            if not use_existing_session:
                session.commit()
                session.close()

            return creator
        except Exception as e:
            if not use_existing_session:
                session.close()
            raise e

    @staticmethod
    def get_creators_by_book(book_id: int, role: Optional[str] = None, session: Session = None) -> List[Creator]:
        """
        Get creators for a book, optionally filtered by role

        Args:
            book_id: ID of the book
            role: Optional role filter (e.g., 'author', 'artist', 'translator')
            session: Database session (creates new if not provided)
        """
        use_existing_session = session is not None

        if not use_existing_session:
            session = get_db_session()

        try:
            if role:
                statement = select(Creator).where(
                    Creator.book_id == book_id,
                    Creator.role == role
                )
            else:
                statement = select(Creator).where(Creator.book_id == book_id)

            creators = session.exec(statement).all()
            return creators
        finally:
            if not use_existing_session:
                session.close()

    @staticmethod
    def get_creators_by_role(book_id: int, role: str) -> List[Creator]:
        """Get creators by specific role"""
        return CreatorService.get_creators_by_book(book_id, role=role)

    @staticmethod
    def get_authors(book_id: int) -> List[str]:
        """Get list of author names for a book"""
        creators = CreatorService.get_creators_by_role(book_id, "author")
        return [c.name for c in creators]

    @staticmethod
    def get_artists(book_id: int) -> List[str]:
        """Get list of artist names for a book"""
        creators = CreatorService.get_creators_by_book(book_id, role=None)
        artists = [c for c in creators if c.role in ["artist", "mangaka", "illustrator"]]
        return [a.name for a in artists]

    @staticmethod
    def get_translators(book_id: int) -> List[Dict[str, str]]:
        """Get list of translators with their language info"""
        creators = CreatorService.get_creators_by_role(book_id, "translator")
        return [{"name": c.name, "language": c.language} for c in creators]

    @staticmethod
    def parse_creators_from_anilist(creators_data: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Parse creator data from AniList API response

        Args:
            creators_data: List of creator dicts with 'name' and 'role' keys

        Returns:
            List of Creator-ready dicts
        """
        processed = []
        for creator in creators_data:
            processed.append({
                "name": creator.get("name"),
                "role": creator.get("role"),
                "language": "ja",  # AniList is primarily Japanese
                "notes": None
            })
        return processed

    @staticmethod
    def update_book_creators(book_id: int, creators_data: List[Dict[str, Any]], session: Session = None):
        """
        Update all creators for a book

        Args:
            book_id: ID of the book
            creators_data: List of creator dicts
            session: Database session
        """
        use_existing_session = session is not None

        if not use_existing_session:
            session = get_db_session()

        try:
            # Delete existing creators for this book
            statement = select(Creator).where(Creator.book_id == book_id)
            existing_creators = session.exec(statement).all()
            for creator in existing_creators:
                session.delete(creator)

            # Add new creators
            for creator_data in creators_data:
                creator = Creator(
                    book_id=book_id,
                    name=creator_data.get("name"),
                    role=creator_data.get("role"),
                    language=creator_data.get("language"),
                    notes=creator_data.get("notes")
                )
                session.add(creator)

            if not use_existing_session:
                session.commit()
                session.close()
        except Exception as e:
            if not use_existing_session:
                session.close()
            raise e
