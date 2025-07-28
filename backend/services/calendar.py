from typing import List, Dict, Any
from datetime import date, datetime
from collections import defaultdict
from sqlmodel import Session, select
import json

try:
    from backend.models import Book, Edition, UserEditionStatus
except ImportError:
    from models import Book, Edition, UserEditionStatus
try:
    from backend.database import get_db_session, get_session
except ImportError:
    from database import get_db_session, get_session


class ReleaseCalendarService:
    
    def get_release_calendar(self, user_id: int) -> Dict[str, List[Dict[str, Any]]]:
        """
        Returns a calendar of upcoming releases and recently released books
        that the user doesn't own or wants.
        """
        with get_db_session() as session:
            # Get current date
            today = date.today()
            
            # Get all editions with release dates
            editions = session.exec(
                select(Edition).where(Edition.release_date != None)
            ).all()
            
            calendar = defaultdict(list)
            
            for edition in editions:
                # Skip if release date is too far in the past (more than 6 months)
                if edition.release_date < today - timedelta(days=180):
                    continue
                
                # Check user ownership status
                user_status = session.exec(
                    select(UserEditionStatus).where(
                        UserEditionStatus.user_id == user_id,
                        UserEditionStatus.edition_id == edition.id
                    )
                ).first()
                
                # Include if:
                # 1. Not owned (no status or status != 'own')
                # 2. Marked as wanted
                # 3. Future release
                include = False
                status = "missing"
                
                if not user_status:
                    include = True
                elif user_status.status == "want":
                    include = True
                    status = "want"
                elif user_status.status != "own" and edition.release_date >= today:
                    include = True
                    status = user_status.status
                
                if include:
                    book = edition.book
                    
                    # Format month key as YYYY-MM
                    month_key = edition.release_date.strftime("%Y-%m")
                    
                    calendar[month_key].append({
                        "title": book.title,
                        "authors": json.loads(book.authors) if book.authors else [],
                        "series_name": book.series_name,
                        "series_position": book.series_position,
                        "release_date": edition.release_date.isoformat(),
                        "format": edition.book_format,
                        "isbn_13": edition.isbn_13,
                        "isbn_10": edition.isbn_10,
                        "publisher": edition.publisher,
                        "cover_url": edition.cover_url,
                        "price": edition.price,
                        "owned": False,
                        "wanted": status == "want",
                        "status": status,
                        "is_future_release": edition.release_date >= today
                    })
            
            # Sort entries within each month by release date
            for month in calendar:
                calendar[month].sort(key=lambda x: x["release_date"])
            
            return dict(calendar)
    
    def get_upcoming_series_releases(self, user_id: int, series_name: str) -> List[Dict[str, Any]]:
        """
        Get upcoming releases for a specific series.
        """
        with get_db_session() as session:
            today = date.today()
            
            # Get all books in the series
            books = session.exec(
                select(Book).where(Book.series_name == series_name)
            ).all()
            
            upcoming = []
            
            for book in books:
                for edition in book.editions:
                    # Only future releases
                    if edition.release_date and edition.release_date >= today:
                        # Check user status
                        user_status = session.exec(
                            select(UserEditionStatus).where(
                                UserEditionStatus.user_id == user_id,
                                UserEditionStatus.edition_id == edition.id
                            )
                        ).first()
                        
                        status = "missing"
                        if user_status:
                            status = user_status.status
                        
                        upcoming.append({
                            "title": book.title,
                            "series_position": book.series_position,
                            "release_date": edition.release_date.isoformat(),
                            "format": edition.book_format,
                            "isbn_13": edition.isbn_13,
                            "isbn_10": edition.isbn_10,
                            "publisher": edition.publisher,
                            "cover_url": edition.cover_url,
                            "price": edition.price,
                            "status": status,
                            "days_until_release": (edition.release_date - today).days
                        })
            
            # Sort by release date
            upcoming.sort(key=lambda x: x["release_date"])
            
            return upcoming
    
    def get_recent_releases(self, user_id: int, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get books released in the last N days that the user doesn't own.
        """
        with get_db_session() as session:
            today = date.today()
            cutoff_date = today - timedelta(days=days)
            
            # Get editions released recently
            recent_editions = session.exec(
                select(Edition).where(
                    Edition.release_date >= cutoff_date,
                    Edition.release_date <= today
                )
            ).all()
            
            recent_releases = []
            
            for edition in recent_editions:
                # Check user status
                user_status = session.exec(
                    select(UserEditionStatus).where(
                        UserEditionStatus.user_id == user_id,
                        UserEditionStatus.edition_id == edition.id
                    )
                ).first()
                
                # Only include if not owned
                if not user_status or user_status.status != "own":
                    book = edition.book
                    
                    recent_releases.append({
                        "title": book.title,
                        "authors": json.loads(book.authors) if book.authors else [],
                        "series_name": book.series_name,
                        "series_position": book.series_position,
                        "release_date": edition.release_date.isoformat(),
                        "format": edition.book_format,
                        "isbn_13": edition.isbn_13,
                        "isbn_10": edition.isbn_10,
                        "publisher": edition.publisher,
                        "cover_url": edition.cover_url,
                        "price": edition.price,
                        "status": user_status.status if user_status else "missing",
                        "days_since_release": (today - edition.release_date).days
                    })
            
            # Sort by release date (most recent first)
            recent_releases.sort(key=lambda x: x["release_date"], reverse=True)
            
            return recent_releases
    
    def get_author_upcoming_releases(self, user_id: int, author_name: str) -> List[Dict[str, Any]]:
        """
        Get upcoming releases from a specific author.
        """
        with get_db_session() as session:
            today = date.today()
            
            # Get all books
            books = session.exec(select(Book)).all()
            
            # Filter by author
            author_books = []
            for book in books:
                authors = json.loads(book.authors) if book.authors else []
                if any(author_name.lower() in author.lower() for author in authors):
                    author_books.append(book)
            
            upcoming = []
            
            for book in author_books:
                for edition in book.editions:
                    # Only future releases
                    if edition.release_date and edition.release_date >= today:
                        # Check user status
                        user_status = session.exec(
                            select(UserEditionStatus).where(
                                UserEditionStatus.user_id == user_id,
                                UserEditionStatus.edition_id == edition.id
                            )
                        ).first()
                        
                        status = "missing"
                        if user_status:
                            status = user_status.status
                        
                        upcoming.append({
                            "title": book.title,
                            "series_name": book.series_name,
                            "series_position": book.series_position,
                            "release_date": edition.release_date.isoformat(),
                            "format": edition.book_format,
                            "isbn_13": edition.isbn_13,
                            "isbn_10": edition.isbn_10,
                            "publisher": edition.publisher,
                            "cover_url": edition.cover_url,
                            "price": edition.price,
                            "status": status,
                            "days_until_release": (edition.release_date - today).days
                        })
            
            # Sort by release date
            upcoming.sort(key=lambda x: x["release_date"])
            
            return upcoming


from datetime import timedelta