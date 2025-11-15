from datetime import datetime, date
from typing import List, Optional, Dict
from sqlmodel import Session, select
from sqlalchemy import func
import json

try:
    from backend.models import Edition, ReadingProgress, ReadingStats, Book
    from backend.database import get_db_session
except ImportError:
    from models import Edition, ReadingProgress, ReadingStats, Book
    from database import get_db_session


class ReadingProgressService:
    def __init__(self):
        pass

    def update_progress(self, edition_id: int, current_page: int, total_pages: int) -> ReadingProgress:
        """Update reading progress for a book"""
        with get_db_session() as session:
            progress = session.exec(
                select(ReadingProgress).where(
                    ReadingProgress.edition_id == edition_id,
                    ReadingProgress.user_id == 1
                )
            ).first()
            
            if not progress:
                progress = ReadingProgress(
                    user_id=1,
                    edition_id=edition_id,
                    status="currently_reading"
                )
                session.add(progress)
            
            progress.current_page = current_page
            progress.total_pages = total_pages
            progress.progress_percentage = (current_page / total_pages * 100) if total_pages > 0 else 0
            progress.updated_at = datetime.utcnow()
            
            # If book wasn't being read, set start date
            if progress.status != "currently_reading":
                progress.status = "currently_reading"
                progress.start_date = datetime.utcnow()
            
            session.commit()
            session.refresh(progress)
            return progress

    def get_reading_stats(self) -> ReadingStats:
        """Get reading statistics for the user"""
        with get_db_session() as session:
            stats = ReadingStats()

            # Count books by status
            stats.books_read = session.exec(
                select(func.count(ReadingProgress.id)).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == "finished"
                )
            ).first() or 0

            stats.books_reading = session.exec(
                select(func.count(ReadingProgress.id)).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == "currently_reading"
                )
            ).first() or 0

            stats.books_want_to_read = session.exec(
                select(func.count(ReadingProgress.id)).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == "want_to_read"
                )
            ).first() or 0

            # Calculate total pages read
            finished_books = session.exec(
                select(ReadingProgress).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == "finished",
                    ReadingProgress.total_pages.isnot(None)
                )
            ).all()

            stats.total_pages_read = sum(book.total_pages for book in finished_books if book.total_pages)

            # Calculate average rating
            ratings = session.exec(
                select(ReadingProgress.rating).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.rating.isnot(None)
                )
            ).all()

            if ratings:
                stats.average_rating = sum(ratings) / len(ratings)

            # Books read this month and year
            current_date = date.today()
            month_start = date(current_date.year, current_date.month, 1)
            year_start = date(current_date.year, 1, 1)

            stats.books_read_this_month = session.exec(
                select(func.count(ReadingProgress.id)).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == "finished",
                    ReadingProgress.finish_date >= month_start
                )
            ).first() or 0

            stats.books_read_this_year = session.exec(
                select(func.count(ReadingProgress.id)).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == "finished",
                    ReadingProgress.finish_date >= year_start
                )
            ).first() or 0

            # Calculate genre breakdown
            stats.genre_breakdown, stats.genre_percentages = self._calculate_genre_breakdown(session, finished_books)

            return stats

    def get_books_by_status(self, status: str) -> List[ReadingProgress]:
        """Get all books with a specific reading status"""
        with get_db_session() as session:
            return session.exec(
                select(ReadingProgress).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == status
                )
            ).all()

    def start_reading(self, edition_id: int) -> ReadingProgress:
        """Mark a book as currently reading"""
        with get_db_session() as session:
            progress = session.exec(
                select(ReadingProgress).where(
                    ReadingProgress.edition_id == edition_id,
                    ReadingProgress.user_id == 1
                )
            ).first()
            
            if not progress:
                progress = ReadingProgress(
                    user_id=1,
                    edition_id=edition_id
                )
                session.add(progress)
            
            progress.status = "currently_reading"
            progress.start_date = datetime.utcnow()
            progress.updated_at = datetime.utcnow()
            
            session.commit()
            session.refresh(progress)
            return progress

    def finish_reading(self, edition_id: int, rating: Optional[int] = None) -> ReadingProgress:
        """Mark a book as finished"""
        with get_db_session() as session:
            progress = session.exec(
                select(ReadingProgress).where(
                    ReadingProgress.edition_id == edition_id,
                    ReadingProgress.user_id == 1
                )
            ).first()
            
            if not progress:
                progress = ReadingProgress(
                    user_id=1,
                    edition_id=edition_id
                )
                session.add(progress)
            
            progress.status = "finished"
            progress.finish_date = datetime.utcnow()
            progress.updated_at = datetime.utcnow()
            
            if rating:
                progress.rating = rating
            
            # Set progress to 100% if pages are known
            if progress.total_pages:
                progress.current_page = progress.total_pages
                progress.progress_percentage = 100.0
            
            session.commit()
            session.refresh(progress)
            return progress

    def add_to_wishlist(self, edition_id: int) -> ReadingProgress:
        """Add a book to the want-to-read list"""
        with get_db_session() as session:
            progress = session.exec(
                select(ReadingProgress).where(
                    ReadingProgress.edition_id == edition_id,
                    ReadingProgress.user_id == 1
                )
            ).first()

            if not progress:
                progress = ReadingProgress(
                    user_id=1,
                    edition_id=edition_id,
                    status="want_to_read"
                )
                session.add(progress)
            else:
                progress.status = "want_to_read"
                progress.updated_at = datetime.utcnow()

            session.commit()
            session.refresh(progress)
            return progress

    def _calculate_genre_breakdown(self, session: Session, finished_books: List[ReadingProgress]) -> tuple:
        """Calculate genre breakdown from finished books"""
        genre_count: Dict[str, int] = {}

        for progress in finished_books:
            edition = session.exec(
                select(Edition).where(Edition.id == progress.edition_id)
            ).first()

            if not edition:
                continue

            book = session.exec(
                select(Book).where(Book.id == edition.book_id)
            ).first()

            if not book or not book.genres:
                continue

            try:
                genres = json.loads(book.genres) if isinstance(book.genres, str) else book.genres
                if isinstance(genres, list):
                    for genre in genres:
                        genre_str = str(genre).strip()
                        if genre_str:
                            genre_count[genre_str] = genre_count.get(genre_str, 0) + 1
            except (json.JSONDecodeError, TypeError):
                pass

        # Calculate percentages
        genre_percentages: Dict[str, float] = {}
        total_books = len(finished_books)

        if total_books > 0:
            for genre, count in genre_count.items():
                percentage = (count / total_books) * 100
                genre_percentages[genre] = round(percentage, 2)

        return genre_count, genre_percentages