try:
    from backend.models.book import Book, Edition, UserEditionStatus
    from backend.models.reading_progress import ReadingProgress, ReadingStats
    from backend.models.series import Series, SeriesVolume
    from backend.models.reading_goal import ReadingGoal, GoalProgress, MonthlyGoal, GoalType, GoalStatus
except ImportError:
    from .book import Book, Edition, UserEditionStatus
    from .reading_progress import ReadingProgress, ReadingStats
    from .series import Series, SeriesVolume
    from .reading_goal import ReadingGoal, GoalProgress, MonthlyGoal, GoalType, GoalStatus

__all__ = ["Book", "Edition", "UserEditionStatus", "ReadingProgress", "ReadingStats", "Series", "SeriesVolume", "ReadingGoal", "GoalProgress", "MonthlyGoal", "GoalType", "GoalStatus"]