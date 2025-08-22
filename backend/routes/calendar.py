"""
MF-002: Release Calendar API

API endpoints for tracking upcoming book releases and managing release calendars.
Features:
- Monthly release calendar
- Series-specific upcoming releases
- Author-specific upcoming releases
- Recent releases (newly published)
- Personalized based on user's reading preferences and wishlist
"""

from fastapi import APIRouter, Query, Depends, HTTPException
from sqlmodel import Session, select, and_, or_
from typing import Dict, Any, List, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel
import json
from collections import defaultdict

try:
    from database import get_session
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress
    from models.series import Series, SeriesVolume
    from services.calendar import ReleaseCalendarService
    from clients.google_books import GoogleBooksClient
    from clients.openlibrary import OpenLibraryClient
except ImportError:
    from database import get_session
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress
    from models.series import Series, SeriesVolume
    from services.calendar import ReleaseCalendarService
    from clients.google_books import GoogleBooksClient
    from clients.openlibrary import OpenLibraryClient


router = APIRouter(prefix="/calendar", tags=["release_calendar"])


class ReleaseItem(BaseModel):
    """Individual release item"""
    title: str
    authors: List[str]
    series_name: Optional[str] = None
    series_position: Optional[int] = None
    release_date: str
    format: Optional[str] = None
    isbn_13: Optional[str] = None
    isbn_10: Optional[str] = None
    publisher: Optional[str] = None
    cover_url: Optional[str] = None
    price: Optional[float] = None
    owned: bool = False
    wanted: bool = False
    status: str = "missing"
    is_future_release: bool = True
    days_until_release: Optional[int] = None
    days_since_release: Optional[int] = None
    source: str = "local"  # local, external, predicted


class MonthlyCalendar(BaseModel):
    """Monthly calendar response"""
    success: bool
    user_id: int
    calendar: Dict[str, List[ReleaseItem]]
    total_releases: int
    upcoming_count: int
    recent_count: int
    wanted_count: int


class UpcomingReleases(BaseModel):
    """Upcoming releases response"""
    success: bool
    releases: List[ReleaseItem]
    total_count: int
    next_release_date: Optional[str] = None
    filter_type: str
    filter_value: Optional[str] = None


class EnhancedReleaseCalendarService:
    """Enhanced release calendar service with external data integration"""
    
    def __init__(self, session: Session):
        self.session = session
        self.base_service = ReleaseCalendarService()
        self.google_client = GoogleBooksClient()
        self.openlibrary_client = OpenLibraryClient()
    
    async def get_comprehensive_calendar(
        self, 
        user_id: int, 
        months_ahead: int = 6,
        months_behind: int = 3,
        include_external: bool = False
    ) -> MonthlyCalendar:
        """Get comprehensive release calendar with local and optionally external data"""
        
        today = date.today()
        start_date = today - timedelta(days=months_behind * 30)
        end_date = today + timedelta(days=months_ahead * 30)
        
        # Get local releases
        local_calendar = self._get_local_releases(user_id, start_date, end_date)
        
        # Enhance with external data if requested
        if include_external:
            await self._enhance_with_external_releases(local_calendar, user_id)
        
        # Add predicted releases based on series patterns
        await self._add_predicted_releases(local_calendar, user_id, end_date)
        
        # Calculate statistics
        total_releases = sum(len(releases) for releases in local_calendar.values())
        upcoming_count = 0
        recent_count = 0
        wanted_count = 0
        
        for month_releases in local_calendar.values():
            for release in month_releases:
                if release.is_future_release:
                    upcoming_count += 1
                else:
                    recent_count += 1
                if release.wanted:
                    wanted_count += 1
        
        return MonthlyCalendar(
            success=True,
            user_id=user_id,
            calendar=local_calendar,
            total_releases=total_releases,
            upcoming_count=upcoming_count,
            recent_count=recent_count,
            wanted_count=wanted_count
        )
    
    def _get_local_releases(self, user_id: int, start_date: date, end_date: date) -> Dict[str, List[ReleaseItem]]:
        """Get releases from local database"""
        
        # Get all editions with release dates in range
        editions = self.session.exec(
            select(Edition).where(
                and_(
                    Edition.release_date.is_not(None),
                    Edition.release_date >= start_date,
                    Edition.release_date <= end_date
                )
            )
        ).all()
        
        calendar = defaultdict(list)
        today = date.today()
        
        for edition in editions:
            # Get book info
            book = self.session.exec(
                select(Book).where(Book.id == edition.book_id)
            ).first()
            
            if not book:
                continue
            
            # Get user status
            user_status = self.session.exec(
                select(UserEditionStatus).where(
                    and_(
                        UserEditionStatus.user_id == user_id,
                        UserEditionStatus.edition_id == edition.id
                    )
                )
            ).first()
            
            # Determine if we should include this release
            owned = user_status and user_status.status == 'own'
            wanted = user_status and user_status.status == 'want'
            status = user_status.status if user_status else 'missing'
            
            # Include unowned books and wanted books
            if not owned or wanted:
                try:
                    authors = json.loads(book.authors) if book.authors else []
                except json.JSONDecodeError:
                    authors = [book.authors] if book.authors else []
                
                is_future = edition.release_date >= today
                days_diff = (edition.release_date - today).days if is_future else (today - edition.release_date).days
                
                release_item = ReleaseItem(
                    title=book.title,
                    authors=authors,
                    series_name=book.series_name,
                    series_position=book.series_position,
                    release_date=edition.release_date.isoformat(),
                    format=edition.book_format,
                    isbn_13=edition.isbn_13,
                    isbn_10=edition.isbn_10,
                    publisher=edition.publisher,
                    cover_url=edition.cover_url,
                    price=edition.price,
                    owned=owned,
                    wanted=wanted,
                    status=status,
                    is_future_release=is_future,
                    days_until_release=days_diff if is_future else None,
                    days_since_release=days_diff if not is_future else None,
                    source="local"
                )
                
                month_key = edition.release_date.strftime("%Y-%m")
                calendar[month_key].append(release_item)
        
        # Sort releases within each month
        for month in calendar:
            calendar[month].sort(key=lambda x: x.release_date)
        
        return dict(calendar)
    
    async def _enhance_with_external_releases(self, calendar: Dict[str, List[ReleaseItem]], user_id: int):
        """Enhance calendar with external API data for series the user follows"""
        
        # Get series the user is interested in (owns books from or has wanted books)
        user_series = self._get_user_followed_series(user_id)
        
        # For each series, try to find upcoming releases from external sources
        for series_name in user_series:
            try:
                external_releases = await self._search_external_upcoming_releases(series_name)
                
                for release in external_releases:
                    # Check if we already have this release locally
                    if not self._is_duplicate_release(release, calendar):
                        month_key = release.release_date[:7]  # YYYY-MM format
                        if month_key not in calendar:
                            calendar[month_key] = []
                        calendar[month_key].append(release)
                        
            except Exception as e:
                print(f"Error fetching external releases for {series_name}: {e}")
    
    def _get_user_followed_series(self, user_id: int) -> List[str]:
        """Get list of series the user follows (owns books from or has wishlist items)"""
        
        # Get books the user owns or wants
        user_books = self.session.exec(
            select(Book).join(Edition).join(UserEditionStatus).where(
                UserEditionStatus.user_id == user_id
            )
        ).all()
        
        # Extract unique series names
        series_names = set()
        for book in user_books:
            if book.series_name:
                series_names.add(book.series_name)
        
        return list(series_names)
    
    async def _search_external_upcoming_releases(self, series_name: str) -> List[ReleaseItem]:
        """Search external APIs for upcoming releases in a series"""
        external_releases = []
        
        try:
            # This would require enhanced external API clients that can search for upcoming releases
            # For now, we'll return empty list
            # Future implementation could search Google Books, Amazon, publisher APIs, etc.
            pass
        except Exception as e:
            print(f"External search error for {series_name}: {e}")
        
        return external_releases
    
    def _is_duplicate_release(self, release: ReleaseItem, calendar: Dict[str, List[ReleaseItem]]) -> bool:
        """Check if a release is already in the calendar"""
        for month_releases in calendar.values():
            for existing_release in month_releases:
                # Check by ISBN or title + date
                if (release.isbn_13 and release.isbn_13 == existing_release.isbn_13) or \
                   (release.title == existing_release.title and release.release_date == existing_release.release_date):
                    return True
        return False
    
    async def _add_predicted_releases(self, calendar: Dict[str, List[ReleaseItem]], user_id: int, end_date: date):
        """Add predicted releases based on series patterns"""
        
        # Get ongoing series the user follows
        ongoing_series = self._get_ongoing_series_with_patterns(user_id)
        
        for series_info in ongoing_series:
            try:
                predicted_releases = self._predict_series_releases(series_info, end_date)
                
                for release in predicted_releases:
                    month_key = release.release_date[:7]
                    if month_key not in calendar:
                        calendar[month_key] = []
                    
                    # Only add if not already present
                    if not self._is_duplicate_release(release, calendar):
                        calendar[month_key].append(release)
                        
            except Exception as e:
                print(f"Error predicting releases for {series_info['name']}: {e}")
    
    def _get_ongoing_series_with_patterns(self, user_id: int) -> List[Dict[str, Any]]:
        """Get ongoing series with release patterns"""
        
        # Get series the user follows
        series_names = self._get_user_followed_series(user_id)
        
        ongoing_series = []
        for series_name in series_names:
            # Get all books in series with release dates
            books_in_series = self.session.exec(
                select(Book).join(Edition).where(
                    and_(
                        Book.series_name == series_name,
                        Edition.release_date.is_not(None)
                    )
                ).order_by(Edition.release_date)
            ).all()
            
            if len(books_in_series) >= 2:  # Need at least 2 books to detect pattern
                release_dates = []
                for book in books_in_series:
                    for edition in book.editions:
                        if edition.release_date:
                            release_dates.append(edition.release_date)
                
                if len(release_dates) >= 2:
                    # Calculate average interval between releases
                    intervals = []
                    for i in range(1, len(release_dates)):
                        interval = (release_dates[i] - release_dates[i-1]).days
                        intervals.append(interval)
                    
                    avg_interval = sum(intervals) / len(intervals)
                    last_volume = max(book.series_position for book in books_in_series if book.series_position)
                    
                    ongoing_series.append({
                        'name': series_name,
                        'last_release_date': max(release_dates),
                        'average_interval_days': avg_interval,
                        'last_volume': last_volume,
                        'sample_book': books_in_series[-1]  # Most recent book for metadata
                    })
        
        return ongoing_series
    
    def _predict_series_releases(self, series_info: Dict[str, Any], end_date: date) -> List[ReleaseItem]:
        """Predict upcoming releases for a series based on patterns"""
        predictions = []
        
        last_date = series_info['last_release_date']
        interval_days = int(series_info['average_interval_days'])
        last_volume = series_info['last_volume']
        sample_book = series_info['sample_book']
        
        # Predict next releases based on pattern
        next_date = last_date + timedelta(days=interval_days)
        next_volume = last_volume + 1
        
        while next_date <= end_date and len(predictions) < 3:  # Limit predictions
            try:
                authors = json.loads(sample_book.authors) if sample_book.authors else []
            except json.JSONDecodeError:
                authors = [sample_book.authors] if sample_book.authors else []
            
            predicted_release = ReleaseItem(
                title=f"{series_info['name']} Vol. {next_volume} (Predicted)",
                authors=authors,
                series_name=series_info['name'],
                series_position=next_volume,
                release_date=next_date.isoformat(),
                format="Unknown",
                owned=False,
                wanted=False,
                status="missing",
                is_future_release=True,
                days_until_release=(next_date - date.today()).days,
                source="predicted"
            )
            
            predictions.append(predicted_release)
            
            # Prepare for next prediction
            next_date += timedelta(days=interval_days)
            next_volume += 1
        
        return predictions
    
    async def get_series_upcoming_releases(self, user_id: int, series_name: str) -> UpcomingReleases:
        """Get upcoming releases for a specific series"""
        
        today = date.today()
        
        # Get local upcoming releases
        books = self.session.exec(
            select(Book).where(Book.series_name == series_name)
        ).all()
        
        upcoming = []
        
        for book in books:
            editions = self.session.exec(
                select(Edition).where(Edition.book_id == book.id)
            ).all()
            
            for edition in editions:
                if edition.release_date and edition.release_date >= today:
                    user_status = self.session.exec(
                        select(UserEditionStatus).where(
                            and_(
                                UserEditionStatus.user_id == user_id,
                                UserEditionStatus.edition_id == edition.id
                            )
                        )
                    ).first()
                    
                    try:
                        authors = json.loads(book.authors) if book.authors else []
                    except json.JSONDecodeError:
                        authors = [book.authors] if book.authors else []
                    
                    owned = user_status and user_status.status == 'own'
                    wanted = user_status and user_status.status == 'want'
                    status = user_status.status if user_status else 'missing'
                    
                    release_item = ReleaseItem(
                        title=book.title,
                        authors=authors,
                        series_name=book.series_name,
                        series_position=book.series_position,
                        release_date=edition.release_date.isoformat(),
                        format=edition.book_format,
                        isbn_13=edition.isbn_13,
                        isbn_10=edition.isbn_10,
                        publisher=edition.publisher,
                        cover_url=edition.cover_url,
                        price=edition.price,
                        owned=owned,
                        wanted=wanted,
                        status=status,
                        is_future_release=True,
                        days_until_release=(edition.release_date - today).days,
                        source="local"
                    )
                    
                    upcoming.append(release_item)
        
        # Sort by release date
        upcoming.sort(key=lambda x: x.release_date)
        
        next_release_date = upcoming[0].release_date if upcoming else None
        
        return UpcomingReleases(
            success=True,
            releases=upcoming,
            total_count=len(upcoming),
            next_release_date=next_release_date,
            filter_type="series",
            filter_value=series_name
        )


@router.get("/monthly", response_model=MonthlyCalendar)
async def get_monthly_calendar(
    user_id: int = Query(1, description="User ID"),
    months_ahead: int = Query(6, ge=1, le=12, description="Months to look ahead"),
    months_behind: int = Query(3, ge=0, le=6, description="Months to look behind"),
    include_external: bool = Query(False, description="Include external API data"),
    session: Session = Depends(get_session)
) -> MonthlyCalendar:
    """
    Get monthly release calendar showing upcoming and recent releases
    """
    service = EnhancedReleaseCalendarService(session)
    return await service.get_comprehensive_calendar(
        user_id=user_id,
        months_ahead=months_ahead,
        months_behind=months_behind,
        include_external=include_external
    )


@router.get("/upcoming")
async def get_upcoming_releases(
    user_id: int = Query(1, description="User ID"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of releases"),
    days_ahead: int = Query(365, ge=1, le=730, description="Days to look ahead"),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get upcoming releases across all series
    """
    service = EnhancedReleaseCalendarService(session)
    
    today = date.today()
    end_date = today + timedelta(days=days_ahead)
    
    calendar = service._get_local_releases(user_id, today, end_date)
    
    # Flatten and sort all upcoming releases
    all_releases = []
    for month_releases in calendar.values():
        for release in month_releases:
            if release.is_future_release:
                all_releases.append(release)
    
    all_releases.sort(key=lambda x: x.release_date)
    limited_releases = all_releases[:limit]
    
    return {
        "success": True,
        "releases": limited_releases,
        "total_count": len(limited_releases),
        "next_release_date": limited_releases[0].release_date if limited_releases else None
    }


@router.get("/series/{series_name}", response_model=UpcomingReleases)
async def get_series_releases(
    series_name: str,
    user_id: int = Query(1, description="User ID"),
    session: Session = Depends(get_session)
) -> UpcomingReleases:
    """
    Get upcoming releases for a specific series
    """
    service = EnhancedReleaseCalendarService(session)
    return await service.get_series_upcoming_releases(user_id, series_name)


@router.get("/recent")
async def get_recent_releases(
    user_id: int = Query(1, description="User ID"),
    days: int = Query(30, ge=1, le=180, description="Days to look back"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of releases"),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get recently released books the user doesn't own
    """
    service = ReleaseCalendarService()
    recent_releases = service.get_recent_releases(user_id, days)
    
    # Convert to ReleaseItem format
    formatted_releases = []
    for release in recent_releases[:limit]:
        formatted_releases.append(ReleaseItem(
            title=release['title'],
            authors=release['authors'],
            series_name=release.get('series_name'),
            series_position=release.get('series_position'),
            release_date=release['release_date'],
            format=release.get('format'),
            isbn_13=release.get('isbn_13'),
            isbn_10=release.get('isbn_10'),
            publisher=release.get('publisher'),
            cover_url=release.get('cover_url'),
            price=release.get('price'),
            owned=False,
            wanted=release['status'] == 'want',
            status=release['status'],
            is_future_release=False,
            days_since_release=release['days_since_release'],
            source="local"
        ))
    
    return {
        "success": True,
        "releases": formatted_releases,
        "total_count": len(formatted_releases),
        "period_days": days
    }


@router.get("/author/{author_name}")
async def get_author_releases(
    author_name: str,
    user_id: int = Query(1, description="User ID"),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get upcoming releases from a specific author
    """
    service = ReleaseCalendarService()
    author_releases = service.get_author_upcoming_releases(user_id, author_name)
    
    return {
        "success": True,
        "releases": author_releases,
        "total_count": len(author_releases),
        "author": author_name
    }


@router.post("/wishlist/{isbn}")
async def add_to_release_wishlist(
    isbn: str,
    user_id: int = Query(1, description="User ID"),
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Add a future release to user's wishlist
    """
    # Find edition by ISBN
    edition = session.exec(
        select(Edition).where(
            or_(Edition.isbn_10 == isbn, Edition.isbn_13 == isbn)
        )
    ).first()
    
    if not edition:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Check if user already has status for this edition
    existing_status = session.exec(
        select(UserEditionStatus).where(
            and_(
                UserEditionStatus.user_id == user_id,
                UserEditionStatus.edition_id == edition.id
            )
        )
    ).first()
    
    if existing_status:
        existing_status.status = 'want'
        existing_status.notes = 'Added to release wishlist'
    else:
        new_status = UserEditionStatus(
            user_id=user_id,
            edition_id=edition.id,
            status='want',
            notes='Added to release wishlist'
        )
        session.add(new_status)
    
    session.commit()
    
    return {
        "success": True,
        "message": "Added to release wishlist",
        "isbn": isbn
    }