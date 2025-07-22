try:
    from backend.models.book import Book, Edition, UserEditionStatus
    from backend.models.reading_progress import ReadingProgress, ReadingStats
except ImportError:
    from .book import Book, Edition, UserEditionStatus
    from .reading_progress import ReadingProgress, ReadingStats

__all__ = ["Book", "Edition", "UserEditionStatus", "ReadingProgress", "ReadingStats"]