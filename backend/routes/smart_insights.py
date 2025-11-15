"""
Smart Insights API Routes

Endpoints for accessing advanced analytics and insights about the book collection
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from database import get_session
from services.smart_insights import (
    SeriesHealthCheck,
    BacklogAnalysis,
    CollectionValue,
    ReadingTimeline
)

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("/summary")
async def get_insights_summary(session: Session = Depends(get_session)):
    """
    Get all insights combined

    Returns:
        {
            "series_health": {...},
            "backlog": {...},
            "collection_value": {...},
            "reading_timeline": {...},
            "last_updated": datetime
        }
    """
    from datetime import datetime

    health = await SeriesHealthCheck.check_series_health(session)
    backlog = await BacklogAnalysis.analyze_backlog(session)
    value = await CollectionValue.analyze_collection_value(session)
    timeline = await ReadingTimeline.analyze_reading_timeline(session)

    return {
        "series_health": health,
        "backlog": backlog,
        "collection_value": value,
        "reading_timeline": timeline,
        "last_updated": datetime.utcnow().isoformat()
    }


@router.get("/series-health")
async def get_series_health(session: Session = Depends(get_session)):
    """
    Get series health check data

    Returns:
        {
            "abandoned_series": [...],
            "incomplete_series": [...],
            "healthy_series": int,
            "summary": {...}
        }
    """
    return await SeriesHealthCheck.check_series_health(session)


@router.get("/backlog")
async def get_backlog_analysis(session: Session = Depends(get_session)):
    """
    Get backlog analysis with unread books and catch-up suggestions

    Returns:
        {
            "total_unread": int,
            "total_in_progress": int,
            "unread_by_series": [...],
            "recommendations": [...]
        }
    """
    return await BacklogAnalysis.analyze_backlog(session)


@router.get("/collection-value")
async def get_collection_value(session: Session = Depends(get_session)):
    """
    Get collection value analysis

    Returns:
        {
            "total_collection_value": float,
            "average_book_value": float,
            "books_with_price": int,
            "books_without_price": int,
            "value_by_format": {...},
            "most_valuable_items": [...]
        }
    """
    return await CollectionValue.analyze_collection_value(session)


@router.get("/reading-timeline")
async def get_reading_timeline(session: Session = Depends(get_session)):
    """
    Get reading timeline and pace analysis

    Returns:
        {
            "reading_pace": {...},
            "current_reads": [...],
            "series_timelines": [...]
        }
    """
    return await ReadingTimeline.analyze_reading_timeline(session)
