from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select
from sqlalchemy import func

try:
    from backend.models import ReadingGoal, GoalProgress, MonthlyGoal, ReadingProgress, Edition, Book, GoalStatus, GoalType
    from backend.database import get_db_session
except ImportError:
    from models import ReadingGoal, GoalProgress, MonthlyGoal, ReadingProgress, Edition, Book, GoalStatus, GoalType
    from database import get_db_session


class ReadingGoalService:
    """Service for managing reading goals and challenges"""

    def __init__(self):
        pass

    # ============ Goal CRUD Operations ============

    def create_goal(
        self,
        title: str,
        goal_type: GoalType,
        target_value: int,
        start_date: date,
        end_date: date,
        description: Optional[str] = None,
        genre: Optional[str] = None,
        author: Optional[str] = None,
        series_id: Optional[int] = None,
        is_custom: bool = True,
        icon: Optional[str] = None,
        color: Optional[str] = None,
    ) -> ReadingGoal:
        """Create a new reading goal"""
        with get_db_session() as session:
            goal = ReadingGoal(
                user_id=1,
                title=title,
                description=description,
                goal_type=goal_type,
                target_value=target_value,
                current_value=0,
                genre=genre,
                author=author,
                series_id=series_id,
                start_date=start_date,
                end_date=end_date,
                is_custom=is_custom,
                icon=icon,
                color=color,
            )
            session.add(goal)
            session.commit()
            session.refresh(goal)
            return goal

    def get_goal(self, goal_id: int) -> Optional[ReadingGoal]:
        """Get a goal by ID"""
        with get_db_session() as session:
            return session.exec(select(ReadingGoal).where(ReadingGoal.id == goal_id)).first()

    def get_active_goals(self) -> List[ReadingGoal]:
        """Get all active goals for the user"""
        with get_db_session() as session:
            return session.exec(
                select(ReadingGoal).where(
                    ReadingGoal.user_id == 1,
                    ReadingGoal.status == GoalStatus.ACTIVE,
                )
            ).all()

    def get_all_goals(self) -> List[ReadingGoal]:
        """Get all goals for the user"""
        with get_db_session() as session:
            return session.exec(
                select(ReadingGoal).where(ReadingGoal.user_id == 1)
            ).all()

    def get_goals_by_status(self, status: GoalStatus) -> List[ReadingGoal]:
        """Get goals by status"""
        with get_db_session() as session:
            return session.exec(
                select(ReadingGoal).where(
                    ReadingGoal.user_id == 1,
                    ReadingGoal.status == status,
                )
            ).all()

    def update_goal(
        self,
        goal_id: int,
        title: Optional[str] = None,
        target_value: Optional[int] = None,
        description: Optional[str] = None,
        end_date: Optional[date] = None,
    ) -> Optional[ReadingGoal]:
        """Update a goal"""
        with get_db_session() as session:
            goal = session.exec(select(ReadingGoal).where(ReadingGoal.id == goal_id)).first()
            if not goal:
                return None

            if title:
                goal.title = title
            if target_value:
                goal.target_value = target_value
            if description:
                goal.description = description
            if end_date:
                goal.end_date = end_date

            goal.updated_at = datetime.utcnow()
            session.add(goal)
            session.commit()
            session.refresh(goal)
            return goal

    def delete_goal(self, goal_id: int) -> bool:
        """Delete a goal"""
        with get_db_session() as session:
            goal = session.exec(select(ReadingGoal).where(ReadingGoal.id == goal_id)).first()
            if not goal:
                return False

            session.delete(goal)
            session.commit()
            return True

    # ============ Goal Progress Tracking ============

    def add_goal_progress(
        self, goal_id: int, value_added: int, notes: Optional[str] = None
    ) -> Optional[GoalProgress]:
        """Record progress toward a goal"""
        with get_db_session() as session:
            goal = session.exec(select(ReadingGoal).where(ReadingGoal.id == goal_id)).first()
            if not goal:
                return None

            new_total = goal.current_value + value_added
            progress_entry = GoalProgress(
                goal_id=goal_id,
                value_added=value_added,
                total_value=new_total,
                notes=notes,
            )

            goal.current_value = new_total
            goal.updated_at = datetime.utcnow()

            # Check if goal is completed
            if new_total >= goal.target_value:
                goal.status = GoalStatus.COMPLETED
                goal.completed_date = datetime.utcnow()

            session.add(progress_entry)
            session.add(goal)
            session.commit()
            session.refresh(progress_entry)
            return progress_entry

    def get_goal_progress(self, goal_id: int) -> List[GoalProgress]:
        """Get all progress entries for a goal"""
        with get_db_session() as session:
            return session.exec(
                select(GoalProgress).where(GoalProgress.goal_id == goal_id)
            ).all()

    # ============ Goal Completion & Status ============

    def complete_goal(self, goal_id: int) -> Optional[ReadingGoal]:
        """Mark a goal as completed"""
        with get_db_session() as session:
            goal = session.exec(select(ReadingGoal).where(ReadingGoal.id == goal_id)).first()
            if not goal:
                return None

            goal.status = GoalStatus.COMPLETED
            goal.completed_date = datetime.utcnow()
            goal.updated_at = datetime.utcnow()
            session.add(goal)
            session.commit()
            session.refresh(goal)
            return goal

    def abandon_goal(self, goal_id: int) -> Optional[ReadingGoal]:
        """Mark a goal as abandoned"""
        with get_db_session() as session:
            goal = session.exec(select(ReadingGoal).where(ReadingGoal.id == goal_id)).first()
            if not goal:
                return None

            goal.status = GoalStatus.ABANDONED
            goal.updated_at = datetime.utcnow()
            session.add(goal)
            session.commit()
            session.refresh(goal)
            return goal

    # ============ Goal Calculations ============

    def get_goal_progress_percentage(self, goal_id: int) -> float:
        """Calculate the progress percentage of a goal"""
        goal = self.get_goal(goal_id)
        if not goal or goal.target_value == 0:
            return 0.0

        percentage = (goal.current_value / goal.target_value) * 100
        return min(percentage, 100.0)  # Cap at 100%

    def get_days_remaining(self, goal_id: int) -> int:
        """Get days remaining until goal deadline"""
        goal = self.get_goal(goal_id)
        if not goal:
            return 0

        remaining = (goal.end_date - date.today()).days
        return max(remaining, 0)

    def get_reading_pace_for_goal(self, goal_id: int) -> float:
        """Calculate required reading pace to complete goal on time"""
        goal = self.get_goal(goal_id)
        if not goal:
            return 0.0

        days_remaining = self.get_days_remaining(goal_id)
        if days_remaining == 0:
            return 0.0

        remaining_value = goal.target_value - goal.current_value
        if remaining_value <= 0:
            return 0.0

        return remaining_value / days_remaining

    # ============ Monthly Goals ============

    def get_or_create_monthly_goal(
        self, year: int, month: int, target_books: int = 4, target_pages: int = 1250
    ) -> MonthlyGoal:
        """Get or create a monthly goal"""
        year_month = f"{year:04d}-{month:02d}"
        with get_db_session() as session:
            monthly_goal = session.exec(
                select(MonthlyGoal).where(
                    MonthlyGoal.user_id == 1,
                    MonthlyGoal.year_month == year_month,
                )
            ).first()

            if not monthly_goal:
                monthly_goal = MonthlyGoal(
                    user_id=1,
                    year_month=year_month,
                    target_books=target_books,
                    target_pages=target_pages,
                )
                session.add(monthly_goal)
                session.commit()
                session.refresh(monthly_goal)

            return monthly_goal

    def update_monthly_goal_progress(self, year: int, month: int, books: int, pages: int) -> MonthlyGoal:
        """Update monthly goal progress"""
        monthly_goal = self.get_or_create_monthly_goal(year, month)
        with get_db_session() as session:
            goal = session.exec(
                select(MonthlyGoal).where(MonthlyGoal.id == monthly_goal.id)
            ).first()
            if goal:
                goal.current_books = books
                goal.current_pages = pages
                goal.updated_at = datetime.utcnow()
                session.add(goal)
                session.commit()
                session.refresh(goal)
                return goal
            return monthly_goal

    def get_current_month_goal(self) -> MonthlyGoal:
        """Get the current month's goal"""
        today = date.today()
        return self.get_or_create_monthly_goal(today.year, today.month)

    # ============ Default Challenges ============

    def create_default_challenges(self):
        """Create default system challenges"""
        today = date.today()
        year_start = date(today.year, 1, 1)
        year_end = date(today.year, 12, 31)

        challenges = [
            {
                "title": "Annual Reading Goal",
                "description": "Read 52 books this year",
                "goal_type": GoalType.BOOKS,
                "target_value": 52,
                "start_date": year_start,
                "end_date": year_end,
                "is_custom": False,
                "icon": "📚",
                "color": "blue",
            },
            {
                "title": "Page Marathon",
                "description": "Read 15,000 pages this year",
                "goal_type": GoalType.PAGES,
                "target_value": 15000,
                "start_date": year_start,
                "end_date": year_end,
                "is_custom": False,
                "icon": "📖",
                "color": "green",
            },
            {
                "title": "Author Explorer",
                "description": "Read books by 25 different authors this year",
                "goal_type": GoalType.AUTHOR,
                "target_value": 25,
                "start_date": year_start,
                "end_date": year_end,
                "is_custom": False,
                "icon": "✍️",
                "color": "purple",
            },
            {
                "title": "Genre Voyager",
                "description": "Read books in 10 different genres this year",
                "goal_type": GoalType.GENRE,
                "target_value": 10,
                "start_date": year_start,
                "end_date": year_end,
                "is_custom": False,
                "icon": "🎭",
                "color": "pink",
            },
            {
                "title": "Series Completionist",
                "description": "Complete 3 series this year",
                "goal_type": GoalType.SERIES,
                "target_value": 3,
                "start_date": year_start,
                "end_date": year_end,
                "is_custom": False,
                "icon": "🏆",
                "color": "gold",
            },
        ]

        with get_db_session() as session:
            for challenge_data in challenges:
                # Check if challenge already exists
                existing = session.exec(
                    select(ReadingGoal).where(
                        ReadingGoal.user_id == 1,
                        ReadingGoal.title == challenge_data["title"],
                        ReadingGoal.is_custom == False,
                    )
                ).first()

                if not existing:
                    goal = ReadingGoal(**challenge_data, user_id=1)
                    session.add(goal)

            session.commit()

    # ============ Analytics ============

    def calculate_monthly_stats(self, year: int, month: int) -> Dict[str, Any]:
        """Calculate reading statistics for a specific month"""
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year, month + 1, 1) - timedelta(days=1)

        with get_db_session() as session:
            books_read = session.exec(
                select(func.count(ReadingProgress.id)).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == "finished",
                    ReadingProgress.finish_date >= month_start,
                    ReadingProgress.finish_date <= month_end,
                )
            ).first() or 0

            pages_read = session.exec(
                select(func.sum(ReadingProgress.total_pages)).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == "finished",
                    ReadingProgress.finish_date >= month_start,
                    ReadingProgress.finish_date <= month_end,
                    ReadingProgress.total_pages.isnot(None),
                )
            ).first() or 0

            return {
                "year": year,
                "month": month,
                "books_read": books_read,
                "pages_read": pages_read,
                "avg_pages_per_book": (pages_read / books_read) if books_read > 0 else 0,
            }

    def calculate_reading_velocity(self, months: int = 12) -> float:
        """Calculate average books read per month over the last N months"""
        with get_db_session() as session:
            total_books = session.exec(
                select(func.count(ReadingProgress.id)).where(
                    ReadingProgress.user_id == 1,
                    ReadingProgress.status == "finished",
                    ReadingProgress.finish_date
                    >= (date.today() - timedelta(days=months * 30)),
                )
            ).first() or 0

            return total_books / max(months, 1)

    def calculate_time_to_catch_up(
        self, series_id: int, current_reading_velocity: Optional[float] = None
    ) -> Optional[int]:
        """
        Calculate how many months it would take to catch up on a series
        given current reading pace
        """
        # This would require series volume data which isn't fully in the current schema
        # For now, return None as placeholder
        return None
