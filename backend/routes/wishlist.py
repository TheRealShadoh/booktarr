from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import date
from sqlmodel import Session, select

try:
    from backend.services.wishlist_service import (
        WishlistService, PriceTrackingService, PreOrderService
    )
    from backend.models import (
        Wishlist, WishlistItem, PriceTracking, PreOrder,
        AcquisitionPreference, WishlistStats
    )
    from backend.database import get_session
except ImportError:
    from services.wishlist_service import (
        WishlistService, PriceTrackingService, PreOrderService
    )
    from models import (
        Wishlist, WishlistItem, PriceTracking, PreOrder,
        AcquisitionPreference, WishlistStats
    )
    from database import get_session


router = APIRouter()

# ============= PYDANTIC MODELS (Request/Response) =============


class WishlistItemRequest(BaseModel):
    """Request model for creating/updating wishlist items"""
    title: str
    isbn_13: Optional[str] = None
    isbn_10: Optional[str] = None
    author: Optional[str] = None
    edition_id: Optional[int] = None
    priority: str = "medium"
    target_price: Optional[float] = None
    notes: Optional[str] = None
    purchase_source: Optional[str] = None
    date_needed_by: Optional[date] = None


class WishlistItemUpdate(BaseModel):
    """Request model for updating wishlist items"""
    priority: Optional[str] = None
    target_price: Optional[float] = None
    notes: Optional[str] = None
    purchase_source: Optional[str] = None
    date_needed_by: Optional[date] = None
    acquisition_status: Optional[str] = None
    purchase_url: Optional[str] = None
    purchased_date: Optional[date] = None
    purchased_price: Optional[float] = None


class WishlistResponse(BaseModel):
    """Response model for wishlist items"""
    id: int
    title: str
    isbn_13: Optional[str] = None
    isbn_10: Optional[str] = None
    author: Optional[str] = None
    priority: str
    target_price: Optional[float] = None
    notes: Optional[str] = None
    purchase_source: Optional[str] = None
    date_needed_by: Optional[date] = None
    acquisition_status: str
    purchase_url: Optional[str] = None
    purchased_date: Optional[date] = None
    purchased_price: Optional[float] = None
    date_added: str
    updated_at: str


class AcquisitionPreferenceRequest(BaseModel):
    """Request model for updating acquisition preferences"""
    preferred_format: Optional[str] = None
    max_acceptable_price: Optional[float] = None
    preferred_retailers: Optional[List[str]] = None
    price_drop_threshold_percent: Optional[float] = None
    notify_new_releases: Optional[bool] = None
    notify_pre_orders: Optional[bool] = None


class PriceTrackingResponse(BaseModel):
    """Response model for price tracking data"""
    id: int
    price: float
    currency: str
    source: str
    recorded_at: str
    is_current: bool
    previous_price: Optional[float] = None
    price_change_percent: Optional[float] = None


class PreOrderRequest(BaseModel):
    """Request model for pre-orders"""
    title: str
    expected_release_date: date
    isbn: Optional[str] = None
    author: Optional[str] = None
    format: Optional[str] = None
    pre_order_price: Optional[float] = None
    retailer: Optional[str] = None
    pre_order_url: Optional[str] = None


# ============= WISHLIST ENDPOINTS =============


@router.get("/")
async def get_wishlists(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get all wishlists for the user"""
    service = WishlistService()
    try:
        wishlists = service.get_wishlists()
        return {
            "success": True,
            "wishlists": [
                {
                    "id": w.id,
                    "name": w.name,
                    "description": w.description,
                    "is_default": w.is_default,
                    "item_count": len(w.items) if w.items else 0
                }
                for w in wishlists
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items")
async def add_to_wishlist(item: WishlistItemRequest, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Add an item to the wishlist"""
    service = WishlistService()
    try:
        result = service.add_to_wishlist(
            title=item.title,
            isbn_13=item.isbn_13,
            isbn_10=item.isbn_10,
            author=item.author,
            edition_id=item.edition_id,
            priority=item.priority,
            target_price=item.target_price,
            notes=item.notes,
            purchase_source=item.purchase_source,
            date_needed_by=item.date_needed_by
        )
        return {
            "success": True,
            "message": "Item added to wishlist",
            "item": {
                "id": result.id,
                "title": result.title,
                "priority": result.priority,
                "target_price": result.target_price,
                "acquisition_status": result.acquisition_status
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items")
async def get_wishlist_items(wishlist_id: Optional[int] = None, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get all items in a wishlist"""
    service = WishlistService()
    try:
        items = service.get_wishlist_items(wishlist_id)
        return {
            "success": True,
            "items": [
                {
                    "id": i.id,
                    "title": i.title,
                    "isbn_13": i.isbn_13,
                    "author": i.author,
                    "priority": i.priority,
                    "target_price": i.target_price,
                    "notes": i.notes,
                    "purchase_source": i.purchase_source,
                    "date_needed_by": i.date_needed_by,
                    "acquisition_status": i.acquisition_status,
                    "purchased_price": i.purchased_price,
                    "purchased_date": i.purchased_date,
                    "date_added": i.date_added.isoformat()
                }
                for i in items
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items/{item_id}")
async def get_wishlist_item(item_id: int, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get a specific wishlist item"""
    service = WishlistService()
    try:
        item = service.get_wishlist_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Wishlist item not found")

        return {
            "success": True,
            "item": {
                "id": item.id,
                "title": item.title,
                "isbn_13": item.isbn_13,
                "isbn_10": item.isbn_10,
                "author": item.author,
                "priority": item.priority,
                "target_price": item.target_price,
                "notes": item.notes,
                "purchase_source": item.purchase_source,
                "date_needed_by": item.date_needed_by,
                "acquisition_status": item.acquisition_status,
                "purchase_url": item.purchase_url,
                "purchased_price": item.purchased_price,
                "purchased_date": item.purchased_date,
                "date_added": item.date_added.isoformat(),
                "updated_at": item.updated_at.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/items/{item_id}")
async def update_wishlist_item(item_id: int, update: WishlistItemUpdate, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Update a wishlist item"""
    service = WishlistService()
    try:
        result = service.update_wishlist_item(
            item_id=item_id,
            priority=update.priority,
            target_price=update.target_price,
            notes=update.notes,
            purchase_source=update.purchase_source,
            date_needed_by=update.date_needed_by,
            acquisition_status=update.acquisition_status,
            purchase_url=update.purchase_url,
            purchased_date=update.purchased_date,
            purchased_price=update.purchased_price
        )
        return {
            "success": True,
            "message": "Wishlist item updated",
            "item": {
                "id": result.id,
                "title": result.title,
                "priority": result.priority,
                "acquisition_status": result.acquisition_status
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/items/{item_id}")
async def remove_from_wishlist(item_id: int, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Remove an item from the wishlist"""
    service = WishlistService()
    try:
        if not service.remove_from_wishlist(item_id):
            raise HTTPException(status_code=404, detail="Wishlist item not found")

        return {
            "success": True,
            "message": "Item removed from wishlist"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= WISHLIST FILTERING ENDPOINTS =============


@router.get("/items/by-priority/all")
async def get_items_by_priority(wishlist_id: Optional[int] = None, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get wishlist items grouped by priority"""
    service = WishlistService()
    try:
        items_by_priority = service.get_items_by_priority(wishlist_id)
        return {
            "success": True,
            "high_priority": len(items_by_priority["high"]),
            "medium_priority": len(items_by_priority["medium"]),
            "low_priority": len(items_by_priority["low"]),
            "items": {
                "high": [
                    {"id": i.id, "title": i.title, "target_price": i.target_price}
                    for i in items_by_priority["high"]
                ],
                "medium": [
                    {"id": i.id, "title": i.title, "target_price": i.target_price}
                    for i in items_by_priority["medium"]
                ],
                "low": [
                    {"id": i.id, "title": i.title, "target_price": i.target_price}
                    for i in items_by_priority["low"]
                ]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items/status/{status}")
async def get_items_by_status(status: str, wishlist_id: Optional[int] = None, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get wishlist items by acquisition status"""
    service = WishlistService()
    try:
        items = service.get_items_by_status(status, wishlist_id)
        return {
            "success": True,
            "status": status,
            "count": len(items),
            "items": [
                {
                    "id": i.id,
                    "title": i.title,
                    "priority": i.priority,
                    "target_price": i.target_price,
                    "purchase_source": i.purchase_source
                }
                for i in items
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items/watching/all")
async def get_watching_items(wishlist_id: Optional[int] = None, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get items being watched for price drops"""
    service = WishlistService()
    try:
        items = service.get_items_watching_price(wishlist_id)
        return {
            "success": True,
            "count": len(items),
            "items": [
                {
                    "id": i.id,
                    "title": i.title,
                    "target_price": i.target_price,
                    "purchase_source": i.purchase_source
                }
                for i in items
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items/ready-to-buy/all")
async def get_ready_to_buy(wishlist_id: Optional[int] = None, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get items ready to purchase"""
    service = WishlistService()
    try:
        items = service.get_items_ready_to_buy(wishlist_id)
        return {
            "success": True,
            "count": len(items),
            "items": [
                {
                    "id": i.id,
                    "title": i.title,
                    "target_price": i.target_price,
                    "purchase_url": i.purchase_url
                }
                for i in items
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items/pre-ordered/all")
async def get_pre_ordered(wishlist_id: Optional[int] = None, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get pre-ordered items"""
    service = WishlistService()
    try:
        items = service.get_items_pre_ordered(wishlist_id)
        return {
            "success": True,
            "count": len(items),
            "items": [
                {
                    "id": i.id,
                    "title": i.title,
                    "purchase_source": i.purchase_source
                }
                for i in items
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items/overdue/all")
async def get_overdue_items(wishlist_id: Optional[int] = None, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get items past their needed-by date"""
    service = WishlistService()
    try:
        items = service.get_overdue_items(wishlist_id)
        return {
            "success": True,
            "count": len(items),
            "items": [
                {
                    "id": i.id,
                    "title": i.title,
                    "date_needed_by": i.date_needed_by.isoformat() if i.date_needed_by else None,
                    "priority": i.priority
                }
                for i in items
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= WISHLIST STATISTICS ENDPOINTS =============


@router.get("/stats")
async def get_wishlist_stats(wishlist_id: Optional[int] = None, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get comprehensive wishlist statistics"""
    service = WishlistService()
    try:
        stats = service.get_wishlist_stats(wishlist_id)
        return {
            "success": True,
            "stats": {
                "total_items": stats.total_items,
                "high_priority": stats.high_priority_items,
                "medium_priority": stats.medium_priority_items,
                "low_priority": stats.low_priority_items,
                "watching": stats.watching_count,
                "ready_to_buy": stats.ready_to_buy_count,
                "pre_ordered": stats.pre_ordered_count,
                "acquired": stats.acquired_count,
                "estimated_total_cost": stats.estimated_total_cost,
                "average_item_cost": stats.average_item_cost,
                "items_with_price_drops": stats.items_with_price_drops,
                "upcoming_releases": stats.upcoming_releases
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= ACQUISITION PREFERENCE ENDPOINTS =============


@router.get("/preferences")
async def get_acquisition_preferences(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get user's acquisition preferences"""
    service = WishlistService()
    try:
        pref = service.get_or_create_preference()
        return {
            "success": True,
            "preferences": {
                "preferred_format": pref.preferred_format,
                "max_acceptable_price": pref.max_acceptable_price,
                "preferred_retailers": pref.get_preferred_retailers(),
                "price_drop_threshold_percent": pref.price_drop_threshold_percent,
                "notify_new_releases": pref.notify_new_releases,
                "notify_pre_orders": pref.notify_pre_orders
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/preferences")
async def update_acquisition_preferences(pref: AcquisitionPreferenceRequest, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Update acquisition preferences"""
    service = WishlistService()
    try:
        result = service.update_preference(
            preferred_format=pref.preferred_format,
            max_acceptable_price=pref.max_acceptable_price,
            preferred_retailers=pref.preferred_retailers,
            price_drop_threshold_percent=pref.price_drop_threshold_percent,
            notify_new_releases=pref.notify_new_releases,
            notify_pre_orders=pref.notify_pre_orders
        )
        return {
            "success": True,
            "message": "Preferences updated",
            "preferences": {
                "preferred_format": result.preferred_format,
                "max_acceptable_price": result.max_acceptable_price
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= PRICE TRACKING ENDPOINTS =============


@router.post("/prices/track")
async def track_price(
    price: float,
    source: str,
    isbn: Optional[str] = None,
    title: Optional[str] = None,
    edition_id: Optional[int] = None,
    wishlist_item_id: Optional[int] = None,
    source_url: Optional[str] = None,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Record a price point for tracking"""
    service = PriceTrackingService()
    try:
        result = service.record_price(
            price=price,
            source=source,
            isbn=isbn,
            title=title,
            edition_id=edition_id,
            wishlist_item_id=wishlist_item_id,
            source_url=source_url
        )
        return {
            "success": True,
            "message": "Price recorded",
            "price_tracking": {
                "id": result.id,
                "price": result.price,
                "source": result.source,
                "price_change_percent": result.price_change_percent
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prices/history")
async def get_price_history(
    edition_id: Optional[int] = None,
    wishlist_item_id: Optional[int] = None,
    limit: int = 50,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get price history for an item"""
    service = PriceTrackingService()
    try:
        history = service.get_price_history(edition_id, wishlist_item_id, limit)
        return {
            "success": True,
            "history": [
                {
                    "id": h.id,
                    "price": h.price,
                    "source": h.source,
                    "recorded_at": h.recorded_at.isoformat(),
                    "price_change_percent": h.price_change_percent
                }
                for h in history
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prices/current")
async def get_current_price(
    edition_id: Optional[int] = None,
    wishlist_item_id: Optional[int] = None,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get the current price for an item"""
    service = PriceTrackingService()
    try:
        price = service.get_current_price(edition_id, wishlist_item_id)
        if not price:
            raise HTTPException(status_code=404, detail="No price data found")

        return {
            "success": True,
            "price": {
                "id": price.id,
                "price": price.price,
                "source": price.source,
                "currency": price.currency,
                "recorded_at": price.recorded_at.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prices/drops")
async def detect_price_drops(
    threshold_percent: float = 10.0,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Find items with significant price drops"""
    service = PriceTrackingService()
    try:
        drops = service.detect_price_drops(threshold_percent)
        return {
            "success": True,
            "threshold_percent": threshold_percent,
            "count": len(drops),
            "items": [
                {
                    "id": d.id,
                    "price": d.price,
                    "previous_price": d.previous_price,
                    "price_change_percent": d.price_change_percent,
                    "source": d.source
                }
                for d in drops
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prices/trend")
async def get_price_trend(
    edition_id: Optional[int] = None,
    wishlist_item_id: Optional[int] = None,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Get price trend analysis for an item"""
    service = PriceTrackingService()
    try:
        trend = service.get_price_trend(edition_id, wishlist_item_id)
        return {
            "success": True,
            "trend": trend
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= PRE-ORDER ENDPOINTS =============


@router.post("/preorders")
async def create_pre_order(
    order: PreOrderRequest,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Create a new pre-order"""
    service = PreOrderService()
    try:
        result = service.create_pre_order(
            title=order.title,
            expected_release_date=order.expected_release_date,
            isbn=order.isbn,
            author=order.author,
            format=order.format,
            pre_order_price=order.pre_order_price,
            retailer=order.retailer,
            pre_order_url=order.pre_order_url
        )
        return {
            "success": True,
            "message": "Pre-order created",
            "pre_order": {
                "id": result.id,
                "title": result.title,
                "expected_release_date": result.expected_release_date.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preorders/active")
async def get_active_pre_orders(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get all active pre-orders"""
    service = PreOrderService()
    try:
        pre_orders = service.get_active_pre_orders()
        return {
            "success": True,
            "count": len(pre_orders),
            "pre_orders": [
                {
                    "id": p.id,
                    "title": p.title,
                    "expected_release_date": p.expected_release_date.isoformat(),
                    "status": p.status,
                    "retailer": p.retailer
                }
                for p in pre_orders
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preorders/upcoming")
async def get_upcoming_releases(days_ahead: int = 30, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get pre-orders releasing within the specified days"""
    service = PreOrderService()
    try:
        pre_orders = service.get_upcoming_releases(days_ahead)
        return {
            "success": True,
            "days_ahead": days_ahead,
            "count": len(pre_orders),
            "pre_orders": [
                {
                    "id": p.id,
                    "title": p.title,
                    "expected_release_date": p.expected_release_date.isoformat(),
                    "pre_order_price": p.pre_order_price,
                    "retailer": p.retailer
                }
                for p in pre_orders
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/preorders/{preorder_id}/status")
async def update_pre_order_status(
    preorder_id: int,
    status: str,
    estimated_delivery_date: Optional[date] = None,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Update pre-order status"""
    service = PreOrderService()
    try:
        result = service.update_pre_order_status(
            preorder_id,
            status,
            estimated_delivery_date
        )
        return {
            "success": True,
            "message": "Pre-order status updated",
            "pre_order": {
                "id": result.id,
                "status": result.status
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/preorders/{preorder_id}")
async def cancel_pre_order(preorder_id: int, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Cancel a pre-order"""
    service = PreOrderService()
    try:
        service.cancel_pre_order(preorder_id)
        return {
            "success": True,
            "message": "Pre-order cancelled"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
