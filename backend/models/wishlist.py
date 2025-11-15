from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, date
import json


class Wishlist(SQLModel, table=True):
    """User's main wishlist collection"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(default=1)  # Default user for now
    name: str = Field(default="My Wishlist")
    description: Optional[str] = None
    is_default: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    items: List["WishlistItem"] = Relationship(back_populates="wishlist")


class WishlistItem(SQLModel, table=True):
    """Individual wishlist entry with acquisition tracking"""
    id: Optional[int] = Field(default=None, primary_key=True)
    wishlist_id: int = Field(foreign_key="wishlist.id")
    edition_id: Optional[int] = Field(default=None, foreign_key="edition.id")

    # Item identification (for items not yet in database)
    isbn_13: Optional[str] = None
    isbn_10: Optional[str] = None
    title: str
    author: Optional[str] = None

    # Wishlist metadata
    priority: str = Field(default="medium")  # low, medium, high
    target_price: Optional[float] = None  # Max price user wants to pay
    date_added: datetime = Field(default_factory=datetime.utcnow)
    date_needed_by: Optional[date] = None
    notes: Optional[str] = None

    # Acquisition tracking
    acquisition_status: str = Field(default="watching")  # watching, ready_to_buy, pre_ordered, acquired
    purchase_source: Optional[str] = None  # amazon, audible, local_bookstore, etc.
    purchase_url: Optional[str] = None
    purchased_date: Optional[date] = None
    purchased_price: Optional[float] = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    wishlist: Optional["Wishlist"] = Relationship(back_populates="items")


class PriceTracking(SQLModel, table=True):
    """Price history for monitoring and analytics"""
    id: Optional[int] = Field(default=None, primary_key=True)
    edition_id: Optional[int] = Field(default=None, foreign_key="edition.id")
    wishlist_item_id: Optional[int] = Field(default=None, foreign_key="wishlistitem.id")

    # Price information
    isbn: Optional[str] = None
    title: Optional[str] = None
    price: float
    currency: str = Field(default="USD")
    source: str  # amazon, audible, google_books, openlibrary, etc.
    source_url: Optional[str] = None

    # Tracking metadata
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    is_current: bool = Field(default=True)  # Is this the latest price record?

    # Price change tracking
    previous_price: Optional[float] = None
    price_change_percent: Optional[float] = None

    def update_price_change(self, previous_price: Optional[float]):
        """Calculate price change percentage"""
        if previous_price and previous_price > 0:
            self.previous_price = previous_price
            self.price_change_percent = ((self.price - previous_price) / previous_price) * 100


class PreOrder(SQLModel, table=True):
    """Pre-order tracking for upcoming releases"""
    id: Optional[int] = Field(default=None, primary_key=True)
    edition_id: Optional[int] = Field(default=None, foreign_key="edition.id")
    wishlist_item_id: Optional[int] = Field(default=None, foreign_key="wishlistitem.id")

    # Pre-order details
    isbn: Optional[str] = None
    title: str
    author: Optional[str] = None
    expected_release_date: date
    format: Optional[str] = None  # hardcover, paperback, ebook, audiobook

    # Pre-order status
    status: str = Field(default="active")  # active, cancelled, fulfilled, delayed
    pre_order_price: Optional[float] = None
    estimated_delivery_date: Optional[date] = None
    retailer: Optional[str] = None  # amazon, audible, bookshop.org, etc.
    pre_order_url: Optional[str] = None

    # Notifications
    notify_on_release: bool = Field(default=True)
    notify_on_price_drop: bool = Field(default=True)

    # Tracking
    ordered_date: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AcquisitionPreference(SQLModel, table=True):
    """User preferences for book acquisition and purchasing"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(default=1)

    # Format preferences
    preferred_format: str = Field(default="hardcover")  # hardcover, paperback, ebook, audiobook, any
    allow_alternate_formats: bool = Field(default=True)

    # Price preferences
    max_acceptable_price: Optional[float] = None
    preferred_currency: str = Field(default="USD")
    watch_price_drops: bool = Field(default=True)
    price_drop_threshold_percent: float = Field(default=10.0)  # Alert if price drops >10%

    # Retailer preferences (JSON string)
    preferred_retailers: str = Field(default='["amazon", "audible", "bookshop.org"]')  # JSON array
    avoid_retailers: str = Field(default='[]')  # JSON array

    # Purchase behavior
    auto_purchase_below_price: Optional[float] = None
    bundle_purchases: bool = Field(default=True)

    # Notifications
    notify_new_releases: bool = Field(default=True)
    notify_pre_orders: bool = Field(default=True)
    notify_availability: bool = Field(default=True)

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def get_preferred_retailers(self) -> List[str]:
        """Parse JSON string to list"""
        try:
            return json.loads(self.preferred_retailers)
        except:
            return []

    def set_preferred_retailers(self, retailers: List[str]):
        """Convert list to JSON string"""
        self.preferred_retailers = json.dumps(retailers)

    def get_avoid_retailers(self) -> List[str]:
        """Parse JSON string to list"""
        try:
            return json.loads(self.avoid_retailers)
        except:
            return []

    def set_avoid_retailers(self, retailers: List[str]):
        """Convert list to JSON string"""
        self.avoid_retailers = json.dumps(retailers)


class WishlistStats(SQLModel):
    """Statistics for wishlist analysis (non-database model)"""
    total_items: int = 0
    high_priority_items: int = 0
    medium_priority_items: int = 0
    low_priority_items: int = 0
    watching_count: int = 0
    ready_to_buy_count: int = 0
    pre_ordered_count: int = 0
    acquired_count: int = 0
    estimated_total_cost: float = 0.0
    average_item_cost: float = 0.0
    items_with_price_drops: int = 0
    upcoming_releases: int = 0
