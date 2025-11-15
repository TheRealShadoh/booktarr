from datetime import datetime, date
from typing import List, Optional, Dict
from sqlmodel import Session, select
from sqlalchemy import func, desc

try:
    from backend.models import (
        Wishlist, WishlistItem, PriceTracking, PreOrder,
        AcquisitionPreference, WishlistStats, Edition
    )
    from backend.database import get_db_session
except ImportError:
    from models import (
        Wishlist, WishlistItem, PriceTracking, PreOrder,
        AcquisitionPreference, WishlistStats, Edition
    )
    from database import get_db_session


class WishlistService:
    """Service for managing user wishlists and acquisition tracking"""

    def __init__(self):
        self.user_id = 1  # Default user for now

    # ============= WISHLIST MANAGEMENT =============

    def get_or_create_default_wishlist(self) -> Wishlist:
        """Get the user's default wishlist or create if doesn't exist"""
        with get_db_session() as session:
            wishlist = session.exec(
                select(Wishlist).where(
                    Wishlist.user_id == self.user_id,
                    Wishlist.is_default == True
                )
            ).first()

            if not wishlist:
                wishlist = Wishlist(
                    user_id=self.user_id,
                    name="My Wishlist",
                    is_default=True
                )
                session.add(wishlist)
                session.commit()
                session.refresh(wishlist)

            return wishlist

    def get_wishlists(self) -> List[Wishlist]:
        """Get all wishlists for the user"""
        with get_db_session() as session:
            wishlists = session.exec(
                select(Wishlist).where(Wishlist.user_id == self.user_id)
            ).all()
            return wishlists

    def create_wishlist(self, name: str, description: Optional[str] = None) -> Wishlist:
        """Create a new wishlist"""
        with get_db_session() as session:
            wishlist = Wishlist(
                user_id=self.user_id,
                name=name,
                description=description,
                is_default=False
            )
            session.add(wishlist)
            session.commit()
            session.refresh(wishlist)
            return wishlist

    # ============= WISHLIST ITEM MANAGEMENT =============

    def add_to_wishlist(
        self,
        title: str,
        isbn_13: Optional[str] = None,
        isbn_10: Optional[str] = None,
        author: Optional[str] = None,
        edition_id: Optional[int] = None,
        priority: str = "medium",
        target_price: Optional[float] = None,
        notes: Optional[str] = None,
        purchase_source: Optional[str] = None,
        date_needed_by: Optional[date] = None,
        wishlist_id: Optional[int] = None
    ) -> WishlistItem:
        """Add an item to the wishlist"""
        with get_db_session() as session:
            # Use default wishlist if not specified
            if not wishlist_id:
                default_wishlist = self.get_or_create_default_wishlist()
                wishlist_id = default_wishlist.id

            # Check if already in wishlist
            existing = session.exec(
                select(WishlistItem).where(
                    WishlistItem.wishlist_id == wishlist_id,
                    (WishlistItem.isbn_13 == isbn_13 if isbn_13 else False) |
                    (WishlistItem.isbn_10 == isbn_10 if isbn_10 else False) |
                    (WishlistItem.edition_id == edition_id if edition_id else False)
                )
            ).first()

            if existing:
                return existing

            item = WishlistItem(
                wishlist_id=wishlist_id,
                title=title,
                isbn_13=isbn_13,
                isbn_10=isbn_10,
                author=author,
                edition_id=edition_id,
                priority=priority,
                target_price=target_price,
                notes=notes,
                purchase_source=purchase_source,
                date_needed_by=date_needed_by
            )
            session.add(item)
            session.commit()
            session.refresh(item)
            return item

    def get_wishlist_items(self, wishlist_id: Optional[int] = None) -> List[WishlistItem]:
        """Get all items in a wishlist"""
        with get_db_session() as session:
            if not wishlist_id:
                default_wishlist = self.get_or_create_default_wishlist()
                wishlist_id = default_wishlist.id

            items = session.exec(
                select(WishlistItem).where(
                    WishlistItem.wishlist_id == wishlist_id
                )
            ).all()
            return items

    def update_wishlist_item(
        self,
        item_id: int,
        priority: Optional[str] = None,
        target_price: Optional[float] = None,
        notes: Optional[str] = None,
        purchase_source: Optional[str] = None,
        date_needed_by: Optional[date] = None,
        acquisition_status: Optional[str] = None,
        purchase_url: Optional[str] = None,
        purchased_date: Optional[date] = None,
        purchased_price: Optional[float] = None
    ) -> WishlistItem:
        """Update a wishlist item"""
        with get_db_session() as session:
            item = session.exec(
                select(WishlistItem).where(WishlistItem.id == item_id)
            ).first()

            if not item:
                raise ValueError(f"Wishlist item {item_id} not found")

            if priority is not None:
                item.priority = priority
            if target_price is not None:
                item.target_price = target_price
            if notes is not None:
                item.notes = notes
            if purchase_source is not None:
                item.purchase_source = purchase_source
            if date_needed_by is not None:
                item.date_needed_by = date_needed_by
            if acquisition_status is not None:
                item.acquisition_status = acquisition_status
            if purchase_url is not None:
                item.purchase_url = purchase_url
            if purchased_date is not None:
                item.purchased_date = purchased_date
            if purchased_price is not None:
                item.purchased_price = purchased_price

            item.updated_at = datetime.utcnow()
            session.add(item)
            session.commit()
            session.refresh(item)
            return item

    def remove_from_wishlist(self, item_id: int) -> bool:
        """Remove an item from the wishlist"""
        with get_db_session() as session:
            item = session.exec(
                select(WishlistItem).where(WishlistItem.id == item_id)
            ).first()

            if not item:
                return False

            session.delete(item)
            session.commit()
            return True

    def get_wishlist_item(self, item_id: int) -> Optional[WishlistItem]:
        """Get a specific wishlist item"""
        with get_db_session() as session:
            item = session.exec(
                select(WishlistItem).where(WishlistItem.id == item_id)
            ).first()
            return item

    # ============= WISHLIST FILTERING & SORTING =============

    def get_items_by_priority(self, wishlist_id: Optional[int] = None) -> Dict[str, List[WishlistItem]]:
        """Get wishlist items grouped by priority"""
        items = self.get_wishlist_items(wishlist_id)
        return {
            "high": [i for i in items if i.priority == "high"],
            "medium": [i for i in items if i.priority == "medium"],
            "low": [i for i in items if i.priority == "low"]
        }

    def get_items_by_status(self, status: str, wishlist_id: Optional[int] = None) -> List[WishlistItem]:
        """Get wishlist items by acquisition status"""
        with get_db_session() as session:
            if not wishlist_id:
                default_wishlist = self.get_or_create_default_wishlist()
                wishlist_id = default_wishlist.id

            items = session.exec(
                select(WishlistItem).where(
                    WishlistItem.wishlist_id == wishlist_id,
                    WishlistItem.acquisition_status == status
                )
            ).all()
            return items

    def get_items_watching_price(self, wishlist_id: Optional[int] = None) -> List[WishlistItem]:
        """Get items being watched for price drops"""
        return self.get_items_by_status("watching", wishlist_id)

    def get_items_ready_to_buy(self, wishlist_id: Optional[int] = None) -> List[WishlistItem]:
        """Get items ready to purchase (within budget)"""
        return self.get_items_by_status("ready_to_buy", wishlist_id)

    def get_items_pre_ordered(self, wishlist_id: Optional[int] = None) -> List[WishlistItem]:
        """Get pre-ordered items"""
        return self.get_items_by_status("pre_ordered", wishlist_id)

    def get_overdue_items(self, wishlist_id: Optional[int] = None) -> List[WishlistItem]:
        """Get items past their needed-by date"""
        items = self.get_wishlist_items(wishlist_id)
        today = date.today()
        return [i for i in items if i.date_needed_by and i.date_needed_by < today]

    # ============= STATISTICS =============

    def get_wishlist_stats(self, wishlist_id: Optional[int] = None) -> WishlistStats:
        """Get comprehensive wishlist statistics"""
        items = self.get_wishlist_items(wishlist_id)
        stats = WishlistStats()

        stats.total_items = len(items)
        stats.high_priority_items = len([i for i in items if i.priority == "high"])
        stats.medium_priority_items = len([i for i in items if i.priority == "medium"])
        stats.low_priority_items = len([i for i in items if i.priority == "low"])
        stats.watching_count = len([i for i in items if i.acquisition_status == "watching"])
        stats.ready_to_buy_count = len([i for i in items if i.acquisition_status == "ready_to_buy"])
        stats.pre_ordered_count = len([i for i in items if i.acquisition_status == "pre_ordered"])
        stats.acquired_count = len([i for i in items if i.acquisition_status == "acquired"])

        # Calculate costs
        prices_with_targets = [i.target_price for i in items if i.target_price]
        prices_with_actual = [i.purchased_price for i in items if i.purchased_price]

        if prices_with_targets:
            stats.estimated_total_cost = sum(prices_with_targets)
            stats.average_item_cost = stats.estimated_total_cost / len(prices_with_targets)

        if prices_with_actual:
            stats.estimated_total_cost += sum(prices_with_actual)

        return stats

    # ============= ACQUISITION PREFERENCES =============

    def get_or_create_preference(self) -> AcquisitionPreference:
        """Get user's acquisition preferences or create defaults"""
        with get_db_session() as session:
            pref = session.exec(
                select(AcquisitionPreference).where(
                    AcquisitionPreference.user_id == self.user_id
                )
            ).first()

            if not pref:
                pref = AcquisitionPreference(user_id=self.user_id)
                session.add(pref)
                session.commit()
                session.refresh(pref)

            return pref

    def update_preference(
        self,
        preferred_format: Optional[str] = None,
        max_acceptable_price: Optional[float] = None,
        preferred_retailers: Optional[List[str]] = None,
        price_drop_threshold_percent: Optional[float] = None,
        notify_new_releases: Optional[bool] = None,
        notify_pre_orders: Optional[bool] = None
    ) -> AcquisitionPreference:
        """Update user's acquisition preferences"""
        with get_db_session() as session:
            pref = self.get_or_create_preference()

            if preferred_format is not None:
                pref.preferred_format = preferred_format
            if max_acceptable_price is not None:
                pref.max_acceptable_price = max_acceptable_price
            if price_drop_threshold_percent is not None:
                pref.price_drop_threshold_percent = price_drop_threshold_percent
            if preferred_retailers is not None:
                pref.set_preferred_retailers(preferred_retailers)
            if notify_new_releases is not None:
                pref.notify_new_releases = notify_new_releases
            if notify_pre_orders is not None:
                pref.notify_pre_orders = notify_pre_orders

            pref.updated_at = datetime.utcnow()
            session.add(pref)
            session.commit()
            session.refresh(pref)
            return pref


class PriceTrackingService:
    """Service for tracking and analyzing price history"""

    def __init__(self):
        pass

    def record_price(
        self,
        price: float,
        source: str,
        isbn: Optional[str] = None,
        title: Optional[str] = None,
        edition_id: Optional[int] = None,
        wishlist_item_id: Optional[int] = None,
        source_url: Optional[str] = None,
        currency: str = "USD"
    ) -> PriceTracking:
        """Record a price point for tracking"""
        with get_db_session() as session:
            # Get previous price for comparison
            previous_record = session.exec(
                select(PriceTracking).where(
                    PriceTracking.is_current == True,
                    (PriceTracking.edition_id == edition_id if edition_id else False) |
                    (PriceTracking.wishlist_item_id == wishlist_item_id if wishlist_item_id else False)
                )
            ).first()

            # Mark previous as non-current
            if previous_record:
                previous_record.is_current = False
                session.add(previous_record)

            # Create new price record
            tracking = PriceTracking(
                price=price,
                source=source,
                isbn=isbn,
                title=title,
                edition_id=edition_id,
                wishlist_item_id=wishlist_item_id,
                source_url=source_url,
                currency=currency,
                is_current=True
            )

            if previous_record:
                tracking.update_price_change(previous_record.price)

            session.add(tracking)
            session.commit()
            session.refresh(tracking)
            return tracking

    def get_price_history(
        self,
        edition_id: Optional[int] = None,
        wishlist_item_id: Optional[int] = None,
        limit: int = 50
    ) -> List[PriceTracking]:
        """Get price history for an item"""
        with get_db_session() as session:
            query = select(PriceTracking)

            if edition_id:
                query = query.where(PriceTracking.edition_id == edition_id)
            elif wishlist_item_id:
                query = query.where(PriceTracking.wishlist_item_id == wishlist_item_id)

            records = session.exec(
                query.order_by(desc(PriceTracking.recorded_at)).limit(limit)
            ).all()
            return records

    def get_current_price(
        self,
        edition_id: Optional[int] = None,
        wishlist_item_id: Optional[int] = None
    ) -> Optional[PriceTracking]:
        """Get the current/latest price for an item"""
        with get_db_session() as session:
            query = select(PriceTracking).where(PriceTracking.is_current == True)

            if edition_id:
                query = query.where(PriceTracking.edition_id == edition_id)
            elif wishlist_item_id:
                query = query.where(PriceTracking.wishlist_item_id == wishlist_item_id)

            record = session.exec(query).first()
            return record

    def detect_price_drops(self, threshold_percent: float = 10.0) -> List[PriceTracking]:
        """Find items with significant price drops"""
        with get_db_session() as session:
            drops = session.exec(
                select(PriceTracking).where(
                    PriceTracking.is_current == True,
                    PriceTracking.price_change_percent.isnot(None),
                    PriceTracking.price_change_percent <= -threshold_percent
                )
            ).all()
            return drops

    def get_price_trend(
        self,
        edition_id: Optional[int] = None,
        wishlist_item_id: Optional[int] = None
    ) -> Dict:
        """Get price trend analysis for an item"""
        history = self.get_price_history(edition_id, wishlist_item_id)

        if not history:
            return {"status": "no_data"}

        prices = [h.price for h in history]
        current_price = prices[0] if prices else None
        lowest_price = min(prices)
        highest_price = max(prices)
        avg_price = sum(prices) / len(prices)

        return {
            "current_price": current_price,
            "lowest_price": lowest_price,
            "highest_price": highest_price,
            "average_price": avg_price,
            "price_range": highest_price - lowest_price,
            "trend": "up" if len(prices) > 1 and prices[0] > prices[-1] else "down" if len(prices) > 1 else "stable",
            "records_count": len(prices)
        }


class PreOrderService:
    """Service for managing pre-orders"""

    def __init__(self):
        pass

    def create_pre_order(
        self,
        title: str,
        expected_release_date: date,
        isbn: Optional[str] = None,
        author: Optional[str] = None,
        format: Optional[str] = None,
        pre_order_price: Optional[float] = None,
        retailer: Optional[str] = None,
        pre_order_url: Optional[str] = None,
        edition_id: Optional[int] = None,
        wishlist_item_id: Optional[int] = None
    ) -> PreOrder:
        """Create a new pre-order"""
        with get_db_session() as session:
            pre_order = PreOrder(
                title=title,
                expected_release_date=expected_release_date,
                isbn=isbn,
                author=author,
                format=format,
                pre_order_price=pre_order_price,
                retailer=retailer,
                pre_order_url=pre_order_url,
                edition_id=edition_id,
                wishlist_item_id=wishlist_item_id
            )
            session.add(pre_order)
            session.commit()
            session.refresh(pre_order)
            return pre_order

    def get_active_pre_orders(self) -> List[PreOrder]:
        """Get all active pre-orders"""
        with get_db_session() as session:
            pre_orders = session.exec(
                select(PreOrder).where(
                    PreOrder.status.in_(["active", "delayed"])
                )
            ).all()
            return pre_orders

    def get_upcoming_releases(self, days_ahead: int = 30) -> List[PreOrder]:
        """Get pre-orders releasing within the specified days"""
        with get_db_session() as session:
            from datetime import timedelta
            cutoff_date = date.today() + timedelta(days=days_ahead)
            pre_orders = session.exec(
                select(PreOrder).where(
                    PreOrder.status == "active",
                    PreOrder.expected_release_date <= cutoff_date,
                    PreOrder.expected_release_date >= date.today()
                )
            ).all()
            return pre_orders

    def update_pre_order_status(
        self,
        pre_order_id: int,
        status: str,
        estimated_delivery_date: Optional[date] = None
    ) -> PreOrder:
        """Update pre-order status"""
        with get_db_session() as session:
            pre_order = session.exec(
                select(PreOrder).where(PreOrder.id == pre_order_id)
            ).first()

            if not pre_order:
                raise ValueError(f"Pre-order {pre_order_id} not found")

            pre_order.status = status
            if estimated_delivery_date:
                pre_order.estimated_delivery_date = estimated_delivery_date
            pre_order.updated_at = datetime.utcnow()

            session.add(pre_order)
            session.commit()
            session.refresh(pre_order)
            return pre_order

    def cancel_pre_order(self, pre_order_id: int) -> PreOrder:
        """Cancel a pre-order"""
        return self.update_pre_order_status(pre_order_id, "cancelled")
