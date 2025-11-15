"""
Smart Insights Service - Advanced analytics for book collections

Provides detailed insights into:
1. Series Health Check - identify abandoned or incomplete series
2. Backlog Analysis - track unread volumes and catch-up recommendations
3. Collection Value - estimate market value and identify most valuable items
4. Reading Timeline - predict completion dates based on reading pace
"""

from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Tuple
from sqlmodel import Session, select
import statistics
import json

from models.series import Series, SeriesVolume
from models.book import Edition, Book
from models.reading_progress import ReadingProgress


class SeriesHealthCheck:
    """Analyze series status to identify abandoned and incomplete series"""

    @staticmethod
    async def check_series_health(session: Session) -> Dict:
        """
        Check health of all series in the library

        Returns:
            {
                "abandoned_series": [
                    {
                        "name": str,
                        "last_volume_date": date,
                        "years_since_publication": int,
                        "owned_count": int,
                        "total_count": int
                    }
                ],
                "incomplete_series": [
                    {
                        "name": str,
                        "owned_count": int,
                        "total_count": int,
                        "missing_count": int,
                        "missing_volumes": [int, ...]
                    }
                ],
                "healthy_series": int,
                "summary": {
                    "total_series": int,
                    "abandoned_count": int,
                    "incomplete_count": int,
                    "complete_and_ongoing": int
                }
            }
        """
        # Get all series
        series_list = session.exec(select(Series)).all()

        abandoned = []
        incomplete = []
        healthy = 0

        cutoff_date = datetime.now() - timedelta(days=365 * 2)  # 2 years ago

        for series in series_list:
            # Get all volumes for this series
            volumes = session.exec(
                select(SeriesVolume).where(SeriesVolume.series_id == series.id)
            ).all()

            if not volumes:
                continue

            owned_volumes = [v for v in volumes if v.status == "owned"]
            total_owned = len(owned_volumes)

            # Find last published volume
            published_dates = [v.published_date for v in volumes if v.published_date]

            if not published_dates:
                # Use series last_published as fallback
                last_pub_date = series.last_published
                if not last_pub_date:
                    continue
            else:
                last_pub_date = max(published_dates)

            # Check if abandoned (no publications in 2+ years)
            if isinstance(last_pub_date, date) and not isinstance(last_pub_date, datetime):
                last_pub_datetime = datetime.combine(last_pub_date, datetime.min.time())
            else:
                last_pub_datetime = last_pub_date

            if last_pub_datetime < cutoff_date:
                years_since = (datetime.now() - last_pub_datetime).days / 365.25
                abandoned.append({
                    "name": series.name,
                    "last_volume_date": last_pub_date,
                    "years_since_publication": round(years_since, 1),
                    "owned_count": total_owned,
                    "total_count": series.total_books or len(volumes)
                })
            # Check if incomplete
            elif total_owned < (series.total_books or len(volumes)):
                total = series.total_books or len(volumes)
                missing_positions = set(v.position for v in volumes if v.status != "owned")
                incomplete.append({
                    "name": series.name,
                    "owned_count": total_owned,
                    "total_count": total,
                    "missing_count": total - total_owned,
                    "missing_volumes": sorted(list(missing_positions))
                })
            else:
                healthy += 1

        return {
            "abandoned_series": sorted(abandoned, key=lambda x: x["years_since_publication"], reverse=True),
            "incomplete_series": sorted(incomplete, key=lambda x: x["missing_count"], reverse=True),
            "healthy_series": healthy,
            "summary": {
                "total_series": len(series_list),
                "abandoned_count": len(abandoned),
                "incomplete_count": len(incomplete),
                "complete_and_ongoing": healthy
            }
        }


class BacklogAnalysis:
    """Analyze unread books and provide catch-up recommendations"""

    @staticmethod
    async def analyze_backlog(session: Session) -> Dict:
        """
        Analyze unread/in-progress books and series

        Returns:
            {
                "total_unread": int,
                "total_in_progress": int,
                "unread_by_series": [
                    {
                        "series_name": str,
                        "unread_count": int,
                        "in_progress_count": int,
                        "owned_count": int,
                        "priority": "high" | "medium" | "low",
                        "next_to_read": {
                            "volume": int,
                            "title": str
                        }
                    }
                ],
                "recommendations": [
                    {
                        "reason": "You're 50% through this series",
                        "series_name": str,
                        "next_volume": int,
                        "action": "Continue reading"
                    }
                ]
            }
        """
        # Get all reading progress entries
        all_progress = session.exec(select(ReadingProgress)).all()

        unread = [p for p in all_progress if p.status == "want_to_read"]
        in_progress = [p for p in all_progress if p.status == "currently_reading"]

        # Group by series
        series_backlog = {}

        for progress in all_progress:
            if progress.edition:
                edition = progress.edition
                if edition.book:
                    book = edition.book
                    series_name = book.series_name

                    if series_name:
                        if series_name not in series_backlog:
                            series_backlog[series_name] = {
                                "unread": [],
                                "in_progress": [],
                                "all_positions": []
                            }

                        series_backlog[series_name]["all_positions"].append(book.series_position or 0)

                        if progress.status == "want_to_read":
                            series_backlog[series_name]["unread"].append({
                                "position": book.series_position or 0,
                                "title": book.title,
                                "edition_id": edition.id
                            })
                        elif progress.status == "currently_reading":
                            series_backlog[series_name]["in_progress"].append({
                                "position": book.series_position or 0,
                                "title": book.title,
                                "edition_id": edition.id
                            })

        # Generate recommendations
        recommendations = []
        unread_by_series = []

        for series_name, data in series_backlog.items():
            unread_count = len(data["unread"])
            in_progress_count = len(data["in_progress"])
            owned_count = len(data["all_positions"])

            if unread_count + in_progress_count > 0:
                # Determine priority
                completion_ratio = in_progress_count / owned_count if owned_count > 0 else 0
                unread_ratio = unread_count / owned_count if owned_count > 0 else 0

                if completion_ratio >= 0.5:
                    priority = "high"
                elif completion_ratio >= 0.25:
                    priority = "medium"
                else:
                    priority = "low"

                # Find next to read (lowest unread position)
                next_to_read = None
                if data["unread"]:
                    next_vol = min(data["unread"], key=lambda x: x["position"])
                    next_to_read = {
                        "volume": next_vol["position"],
                        "title": next_vol["title"]
                    }

                unread_by_series.append({
                    "series_name": series_name,
                    "unread_count": unread_count,
                    "in_progress_count": in_progress_count,
                    "owned_count": owned_count,
                    "completion_ratio": round(completion_ratio, 2),
                    "priority": priority,
                    "next_to_read": next_to_read
                })

                # Add recommendations
                if priority == "high" and next_to_read:
                    recommendations.append({
                        "reason": f"You're {int(completion_ratio * 100)}% through this series",
                        "series_name": series_name,
                        "next_volume": next_to_read["volume"],
                        "action": "Continue reading"
                    })

        # Sort by priority and unread count
        priority_order = {"high": 0, "medium": 1, "low": 2}
        unread_by_series.sort(key=lambda x: (priority_order[x["priority"]], -x["unread_count"]))

        return {
            "total_unread": len(unread),
            "total_in_progress": len(in_progress),
            "unread_by_series": unread_by_series,
            "recommendations": sorted(recommendations, key=lambda x: x["series_name"])
        }


class CollectionValue:
    """Analyze monetary value of the book collection"""

    @staticmethod
    async def analyze_collection_value(session: Session) -> Dict:
        """
        Calculate collection value based on edition prices

        Returns:
            {
                "total_collection_value": float,
                "average_book_value": float,
                "books_with_price": int,
                "books_without_price": int,
                "value_by_format": {
                    "hardcover": float,
                    "paperback": float,
                    "ebook": float,
                    "audiobook": float
                },
                "most_valuable_items": [
                    {
                        "title": str,
                        "authors": str,
                        "format": str,
                        "price": float,
                        "series_position": int | null
                    }
                ]
            }
        """
        # Get all reading progress (represents owned books)
        owned_progress = session.exec(
            select(ReadingProgress).where(ReadingProgress.status != "want_to_read")
        ).all()

        total_value = 0.0
        books_with_price = 0
        books_without_price = 0
        value_by_format = {}
        item_values = []

        for progress in owned_progress:
            if progress.edition:
                edition = progress.edition
                price = edition.price or 0.0

                if price > 0:
                    books_with_price += 1
                    total_value += price
                else:
                    books_without_price += 1

                # Track by format
                format_key = edition.book_format or "unknown"
                if format_key not in value_by_format:
                    value_by_format[format_key] = 0.0
                value_by_format[format_key] += price

                # Collect valuable items
                if edition.book:
                    book = edition.book
                    item_values.append({
                        "title": book.title,
                        "authors": book.authors,
                        "format": edition.book_format or "unknown",
                        "price": price,
                        "series_name": book.series_name,
                        "series_position": book.series_position
                    })

        # Sort and get top 20 most valuable
        item_values.sort(key=lambda x: x["price"], reverse=True)
        most_valuable = item_values[:20]

        # Clean up format names in most_valuable
        for item in most_valuable:
            if isinstance(item["authors"], str):
                try:
                    authors = json.loads(item["authors"])
                    item["authors"] = ", ".join(authors) if isinstance(authors, list) else item["authors"]
                except:
                    pass

        average_value = total_value / books_with_price if books_with_price > 0 else 0.0

        return {
            "total_collection_value": round(total_value, 2),
            "average_book_value": round(average_value, 2),
            "books_with_price": books_with_price,
            "books_without_price": books_without_price,
            "total_books": books_with_price + books_without_price,
            "value_by_format": {k: round(v, 2) for k, v in value_by_format.items()},
            "most_valuable_items": most_valuable
        }


class ReadingTimeline:
    """Predict reading completion dates based on reading pace"""

    @staticmethod
    async def analyze_reading_timeline(session: Session) -> Dict:
        """
        Analyze reading pace and predict completion dates

        Returns:
            {
                "reading_pace": {
                    "books_per_month": float,
                    "pages_per_day": float,
                    "average_days_per_book": float,
                    "confidence": float  # 0-1, based on data points
                },
                "current_reads": [
                    {
                        "title": str,
                        "series_name": str,
                        "progress_percentage": float,
                        "estimated_finish_date": date,
                        "days_until_completion": int
                    }
                ],
                "series_timelines": [
                    {
                        "series_name": str,
                        "unread_in_series": int,
                        "estimated_series_completion": date,
                        "months_until_completion": float
                    }
                ]
            }
        """
        # Calculate reading pace
        finished_progress = session.exec(
            select(ReadingProgress).where(
                ReadingProgress.status == "finished",
                ReadingProgress.finish_date != None
            )
        ).all()

        # Calculate metrics
        books_completed = len(finished_progress)
        total_pages_read = 0
        days_tracked = 0
        days_per_book_list = []

        for progress in finished_progress:
            if progress.total_pages:
                total_pages_read += progress.total_pages

            if progress.start_date and progress.finish_date:
                days = (progress.finish_date - progress.start_date).days
                if days > 0:
                    days_per_book_list.append(days)

        # Calculate pace metrics
        books_per_month = 0.0
        pages_per_day = 0.0
        average_days_per_book = 0.0
        confidence = 0.0

        if books_completed > 5:  # Need at least 5 completed books for confidence
            # Calculate books per month (from oldest to newest finish date)
            if finished_progress:
                dates = sorted([p.finish_date for p in finished_progress if p.finish_date])
                if len(dates) > 1:
                    days_span = (dates[-1] - dates[0]).days
                    if days_span > 0:
                        months_span = days_span / 30.44
                        books_per_month = books_completed / months_span
                        confidence = min(books_completed / 20, 1.0)  # Cap at 1.0

            if days_per_book_list:
                average_days_per_book = statistics.median(days_per_book_list)

            if days_span > 0:
                pages_per_day = total_pages_read / days_span

        # Get current reads
        current_reads = []
        in_progress = session.exec(
            select(ReadingProgress).where(ReadingProgress.status == "currently_reading")
        ).all()

        for progress in in_progress:
            if progress.edition and progress.edition.book:
                book = progress.edition.book

                # Estimate finish date
                finish_date = None
                days_remaining = 0

                if progress.total_pages and progress.current_page and pages_per_day > 0:
                    pages_remaining = max(0, progress.total_pages - progress.current_page)
                    days_remaining = int(pages_remaining / pages_per_day)
                    finish_date = date.today() + timedelta(days=days_remaining)
                elif average_days_per_book > 0:
                    finish_date = date.today() + timedelta(days=int(average_days_per_book))
                    days_remaining = int(average_days_per_book)

                progress_pct = 0.0
                if progress.total_pages and progress.current_page:
                    progress_pct = (progress.current_page / progress.total_pages) * 100

                current_reads.append({
                    "title": book.title,
                    "series_name": book.series_name,
                    "series_position": book.series_position,
                    "progress_percentage": round(progress_pct, 1),
                    "current_page": progress.current_page,
                    "total_pages": progress.total_pages,
                    "estimated_finish_date": finish_date,
                    "days_until_completion": days_remaining
                })

        # Get series timelines
        series_timelines = []

        # Get unique series from in-progress books
        series_set = set()
        for read in current_reads:
            if read["series_name"]:
                series_set.add(read["series_name"])

        # Also check for incomplete series
        all_series = session.exec(select(Series)).all()

        for series in all_series:
            if series.name in series_set or True:  # Include all series for timeline
                volumes = session.exec(
                    select(SeriesVolume).where(SeriesVolume.series_id == series.id)
                ).all()

                unread_volumes = [v for v in volumes if v.status != "owned"]

                if unread_volumes and books_per_month > 0:
                    estimated_months = (len(unread_volumes) / books_per_month)
                    estimated_completion = date.today() + timedelta(days=estimated_months * 30.44)

                    if estimated_completion < date.today() + timedelta(days=365 * 5):  # Skip if > 5 years out
                        series_timelines.append({
                            "series_name": series.name,
                            "unread_in_series": len(unread_volumes),
                            "estimated_series_completion": estimated_completion,
                            "months_until_completion": round(estimated_months, 1)
                        })

        # Sort by estimated completion
        series_timelines.sort(key=lambda x: x["estimated_series_completion"])

        return {
            "reading_pace": {
                "books_per_month": round(books_per_month, 2),
                "pages_per_day": round(pages_per_day, 2),
                "average_days_per_book": round(average_days_per_book, 1),
                "books_completed_tracked": books_completed,
                "confidence": round(confidence, 2)
            },
            "current_reads": current_reads,
            "series_timelines": series_timelines
        }
