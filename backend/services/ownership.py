from typing import List, Dict, Any, Optional
from sqlmodel import Session, select
from datetime import date
import json

try:
    from backend.models import Book, Edition, UserEditionStatus
except ImportError:
    from models import Book, Edition, UserEditionStatus
try:
    from backend.database import get_db_session, get_session
except ImportError:
    from database import get_db_session, get_session


class OwnershipService:
    
    def mark_edition_status(self, user_id: int, edition_id: int, status: str, notes: Optional[str] = None) -> Dict[str, Any]:
        if status not in ["own", "want", "missing"]:
            raise ValueError("Status must be 'own', 'want', or 'missing'")
        
        with get_db_session() as session:
            # Check if edition exists
            edition = session.get(Edition, edition_id)
            if not edition:
                return {"error": f"Edition with id {edition_id} not found"}
            
            # Check if user status already exists
            existing_status = session.exec(
                select(UserEditionStatus).where(
                    UserEditionStatus.user_id == user_id,
                    UserEditionStatus.edition_id == edition_id
                )
            ).first()
            
            if existing_status:
                # Update existing status
                existing_status.status = status
                existing_status.notes = notes
            else:
                # Create new status
                new_status = UserEditionStatus(
                    user_id=user_id,
                    edition_id=edition_id,
                    status=status,
                    notes=notes
                )
                session.add(new_status)
            
            session.commit()
            
            return {
                "success": True,
                "edition_id": edition_id,
                "status": status,
                "notes": notes
            }
    
    def get_missing_from_series(self, user_id: int, series_name: str) -> List[Dict[str, Any]]:
        with get_db_session() as session:
            # Get all books in the series
            books = session.exec(
                select(Book).where(Book.series_name == series_name)
            ).all()
            
            missing_editions = []
            
            for book in books:
                for edition in book.editions:
                    # Check user status
                    user_status = session.exec(
                        select(UserEditionStatus).where(
                            UserEditionStatus.user_id == user_id,
                            UserEditionStatus.edition_id == edition.id
                        )
                    ).first()
                    
                    # If no status or status is not 'own', it's missing
                    if not user_status or user_status.status != "own":
                        missing_editions.append({
                            "title": book.title,
                            "series_position": book.series_position,
                            "edition_id": edition.id,
                            "isbn_13": edition.isbn_13,
                            "isbn_10": edition.isbn_10,
                            "format": edition.book_format,
                            "publisher": edition.publisher,
                            "release_date": edition.release_date.isoformat() if edition.release_date else None,
                            "cover_url": edition.cover_url,
                            "status": user_status.status if user_status else "missing"
                        })
            
            # Sort by series position
            missing_editions.sort(key=lambda x: x.get("series_position") or 0)
            
            return missing_editions
    
    def get_missing_from_author(self, user_id: int, author_name: str) -> List[Dict[str, Any]]:
        with get_db_session() as session:
            # Get all books by author
            books = session.exec(select(Book)).all()
            
            # Filter books by author (since authors is stored as JSON)
            author_books = []
            for book in books:
                authors = json.loads(book.authors) if book.authors else []
                if any(author_name.lower() in author.lower() for author in authors):
                    author_books.append(book)
            
            missing_editions = []
            
            for book in author_books:
                for edition in book.editions:
                    # Check user status
                    user_status = session.exec(
                        select(UserEditionStatus).where(
                            UserEditionStatus.user_id == user_id,
                            UserEditionStatus.edition_id == edition.id
                        )
                    ).first()
                    
                    # If no status or status is not 'own', it's missing
                    if not user_status or user_status.status != "own":
                        missing_editions.append({
                            "title": book.title,
                            "series_name": book.series_name,
                            "series_position": book.series_position,
                            "edition_id": edition.id,
                            "isbn_13": edition.isbn_13,
                            "isbn_10": edition.isbn_10,
                            "format": edition.book_format,
                            "publisher": edition.publisher,
                            "release_date": edition.release_date.isoformat() if edition.release_date else None,
                            "cover_url": edition.cover_url,
                            "status": user_status.status if user_status else "missing"
                        })
            
            return missing_editions
    
    def get_wanted_books(self, user_id: int) -> List[Dict[str, Any]]:
        with get_db_session() as session:
            # Get all editions marked as 'want'
            wanted_statuses = session.exec(
                select(UserEditionStatus).where(
                    UserEditionStatus.user_id == user_id,
                    UserEditionStatus.status == "want"
                )
            ).all()
            
            wanted_editions = []
            
            for status in wanted_statuses:
                edition = status.edition
                book = edition.book
                
                wanted_editions.append({
                    "title": book.title,
                    "authors": json.loads(book.authors) if book.authors else [],
                    "series_name": book.series_name,
                    "series_position": book.series_position,
                    "edition_id": edition.id,
                    "isbn_13": edition.isbn_13,
                    "isbn_10": edition.isbn_10,
                    "format": edition.book_format,
                    "publisher": edition.publisher,
                    "release_date": edition.release_date.isoformat() if edition.release_date else None,
                    "cover_url": edition.cover_url,
                    "price": edition.price,
                    "notes": status.notes
                })
            
            return wanted_editions
    
    def get_owned_books(self, user_id: int) -> List[Dict[str, Any]]:
        with get_db_session() as session:
            # Get all editions marked as 'own'
            owned_statuses = session.exec(
                select(UserEditionStatus).where(
                    UserEditionStatus.user_id == user_id,
                    UserEditionStatus.status == "own"
                )
            ).all()
            
            owned_editions = []
            
            for status in owned_statuses:
                edition = status.edition
                book = edition.book
                
                owned_editions.append({
                    "title": book.title,
                    "authors": json.loads(book.authors) if book.authors else [],
                    "series_name": book.series_name,
                    "series_position": book.series_position,
                    "edition_id": edition.id,
                    "isbn_13": edition.isbn_13,
                    "isbn_10": edition.isbn_10,
                    "format": edition.book_format,
                    "publisher": edition.publisher,
                    "release_date": edition.release_date.isoformat() if edition.release_date else None,
                    "cover_url": edition.cover_url,
                    "notes": status.notes
                })
            
            return owned_editions
    
    def add_note_to_edition(self, user_id: int, edition_id: int, note: str) -> Dict[str, Any]:
        with get_db_session() as session:
            # Check if user status exists
            user_status = session.exec(
                select(UserEditionStatus).where(
                    UserEditionStatus.user_id == user_id,
                    UserEditionStatus.edition_id == edition_id
                )
            ).first()
            
            if user_status:
                user_status.notes = note
                session.commit()
                
                return {
                    "success": True,
                    "edition_id": edition_id,
                    "notes": note
                }
            else:
                return {
                    "error": f"No status found for user {user_id} and edition {edition_id}. Please set a status first."
                }