from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class GoalType(str, Enum):
    """Types of reading goals"""
    BOOKS = "books"  # Read X books
    PAGES = "pages"  # Read X pages
    STREAK = "streak"  # Read every day for X days
    GENRE = "genre"  # Read X books of a specific genre
    SERIES = "series"  # Complete X series
    AUTHOR = "author"  # Read X books by a specific author


class GoalStatus(str, Enum):
    """Status of a reading goal"""
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class ReadingGoal(SQLModel, table=True):
    """Model for user reading goals/challenges"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(default=1)  # Default user for now
    title: str  # e.g., "Annual Reading Goal", "Mystery Month"
    description: Optional[str] = None
    goal_type: GoalType = Field(default=GoalType.BOOKS)

    # Target metrics
    target_value: int  # e.g., 52 books, 15000 pages
    current_value: int = Field(default=0)  # Current progress

    # Optional filtering
    genre: Optional[str] = None  # For genre-specific goals
    author: Optional[str] = None  # For author-specific goals
    series_id: Optional[int] = None  # For series completion goals

    # Dates
    start_date: date
    end_date: date
    status: GoalStatus = Field(default=GoalStatus.ACTIVE)
    completed_date: Optional[datetime] = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_custom: bool = True  # True for user-created, False for system challenges
    icon: Optional[str] = None  # Icon name for UI display
    color: Optional[str] = None  # Color for UI display

    # Relationships
    progress_entries: List["GoalProgress"] = Relationship(back_populates="goal", cascade_delete=True)


class GoalProgress(SQLModel, table=True):
    """Model for tracking goal progress over time"""
    id: Optional[int] = Field(default=None, primary_key=True)
    goal_id: int = Field(foreign_key="readinggoal.id")

    # Progress data
    value_added: int  # How much progress was added (e.g., 1 book, 250 pages)
    total_value: int  # Total progress at this point

    # Metadata
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    source: str = Field(default="manual")  # "manual", "auto", "import"
    notes: Optional[str] = None

    # Relationships
    goal: Optional[ReadingGoal] = Relationship(back_populates="progress_entries")


class MonthlyGoal(SQLModel, table=True):
    """Model for tracking monthly reading goals"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(default=1)
    year_month: str  # Format: "2025-01"
    target_books: int = Field(default=4)
    target_pages: int = Field(default=1250)
    current_books: int = Field(default=0)
    current_pages: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
