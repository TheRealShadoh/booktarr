try:
    from backend.models.book import Book, Edition, UserEditionStatus
    from backend.models.reading_progress import ReadingProgress, ReadingStats
    from backend.models.series import Series, SeriesVolume
    from backend.models.wishlist import (
        Wishlist, WishlistItem, PriceTracking, PreOrder,
        AcquisitionPreference, WishlistStats
    )
except ImportError:
    from .book import Book, Edition, UserEditionStatus
    from .reading_progress import ReadingProgress, ReadingStats
    from .series import Series, SeriesVolume
    from .wishlist import (
        Wishlist, WishlistItem, PriceTracking, PreOrder,
        AcquisitionPreference, WishlistStats
    )

__all__ = [
    "Book", "Edition", "UserEditionStatus",
    "ReadingProgress", "ReadingStats",
    "Series", "SeriesVolume",
    "Wishlist", "WishlistItem", "PriceTracking", "PreOrder",
    "AcquisitionPreference", "WishlistStats"
]