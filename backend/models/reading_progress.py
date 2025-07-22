from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import datetime, date


class ReadingProgress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(default=1)  # Default user for now
    edition_id: int = Field(foreign_key="edition.id")
    status: str = Field(default="want_to_read")  # want_to_read, currently_reading, finished
    current_page: Optional[int] = None
    total_pages: Optional[int] = None
    progress_percentage: Optional[float] = None
    start_date: Optional[datetime] = None
    finish_date: Optional[datetime] = None
    rating: Optional[int] = None  # 1-5 stars
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    edition: Optional["Edition"] = Relationship(back_populates="reading_progress")


class ReadingStats(SQLModel):
    books_read: int = 0
    books_reading: int = 0
    books_want_to_read: int = 0
    total_pages_read: int = 0
    average_rating: float = 0.0
    reading_streak_days: int = 0
    books_read_this_month: int = 0
    books_read_this_year: int = 0