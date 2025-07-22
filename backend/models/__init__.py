try:
    from backend.models.book import Book, Edition, UserEditionStatus
    from backend.models.reading_progress import ReadingProgress, ReadingStats
    from backend.models.series import Series, SeriesVolume
except ImportError:
    from .book import Book, Edition, UserEditionStatus
    from .reading_progress import ReadingProgress, ReadingStats
    from .series import Series, SeriesVolume

__all__ = ["Book", "Edition", "UserEditionStatus", "ReadingProgress", "ReadingStats", "Series", "SeriesVolume"]