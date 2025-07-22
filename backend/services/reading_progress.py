from datetime import datetime, date
from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy import func

try:
    from backend.models import Edition, ReadingProgress, ReadingStats
    from backend.database import get_session
except ImportError:
    from models import Edition, ReadingProgress, ReadingStats
    from database import get_session


class ReadingProgressService:
    def __init__(self):
        pass

    def update_progress(self, edition_id: int, current_page: int, total_pages: int) -> ReadingProgress:
        """Update reading progress for a book"""
        with get_session() as session:
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
        with get_session() as session:
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
            
            return stats

    def get_books_by_status(self, status: str) -> List[ReadingProgress]:
        """Get all books with a specific reading status"""
        with get_session() as session:
            return session.exec(
                select(ReadingProgress).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == status
                )
            ).all()

    def start_reading(self, edition_id: int) -> ReadingProgress:
        """Mark a book as currently reading"""
        with get_session() as session:
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
        with get_session() as session:
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
        with get_session() as session:
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