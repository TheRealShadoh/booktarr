try:
    from backend.models.book import Book, Edition, UserEditionStatus, Creator
    from backend.models.reading_progress import ReadingProgress, ReadingStats
    from backend.models.series import Series, SeriesVolume, Serialization
    from backend.models.reading_goal import ReadingGoal, GoalProgress, MonthlyGoal, GoalType, GoalStatus
except ImportError:
    from .book import Book, Edition, UserEditionStatus, Creator
    from .reading_progress import ReadingProgress, ReadingStats
    from .series import Series, SeriesVolume, Serialization
    from .reading_goal import ReadingGoal, GoalProgress, MonthlyGoal, GoalType, GoalStatus

__all__ = ["Book", "Edition", "UserEditionStatus", "Creator", "ReadingProgress", "ReadingStats", "Series", "SeriesVolume", "Serialization", "ReadingGoal", "GoalProgress", "MonthlyGoal", "GoalType", "GoalStatus"]
