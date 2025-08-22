"""
MF-005: Bulk Operations API

API endpoints for performing bulk operations on books, series, and user data.
Features:
- Mass status updates (mark as read, owned, wanted)
- Bulk metadata editing
- Batch deletions
- Series-wide operations
- Author-based operations
- Efficient handling of large datasets
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select, and_, or_, func
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime
import json
import asyncio
import uuid

try:
    from database import get_session
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress
    from models.series import Series, SeriesVolume
    from services.book_search import BookSearchService
    from services.metadata_refresh import MetadataRefreshService
except ImportError:
    from database import get_session
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress
    from models.series import Series, SeriesVolume
    from services.book_search import BookSearchService
    from services.metadata_refresh import MetadataRefreshService


router = APIRouter(prefix="/bulk", tags=["bulk_operations"])


# Request Models
class BulkStatusUpdate(BaseModel):
    """Bulk status update request"""
    book_ids: Optional[List[int]] = None
    isbns: Optional[List[str]] = None
    series_names: Optional[List[str]] = None
    author_names: Optional[List[str]] = None
    new_status: str = Field(..., pattern="^(own|want|missing)$")
    user_id: int = 1
    notes: Optional[str] = None


class BulkMetadataUpdate(BaseModel):
    """Bulk metadata update request"""
    book_ids: List[int]
    updates: Dict[str, Any]  # Fields to update
    user_id: int = 1


class BulkReadingProgressUpdate(BaseModel):
    """Bulk reading progress update"""
    items: List[Dict[str, Any]]  # List of {book_id/isbn, status, rating, etc.}
    user_id: int = 1


class BulkDeletion(BaseModel):
    """Bulk deletion request"""
    book_ids: Optional[List[int]] = None
    isbns: Optional[List[str]] = None
    series_names: Optional[List[str]] = None
    delete_reading_progress: bool = True
    delete_user_status: bool = True
    user_id: int = 1


class SeriesOperation(BaseModel):
    """Series-wide operation request"""
    series_name: str
    operation: str  # mark_all_read, mark_all_owned, update_metadata, etc.
    parameters: Optional[Dict[str, Any]] = None
    user_id: int = 1


# Response Models
class BulkOperationResult(BaseModel):
    """Bulk operation result"""
    success: bool
    operation_id: str
    operation_type: str
    total_items: int
    processed_items: int
    success_count: int
    error_count: int
    errors: List[str]
    started_at: str
    completed_at: Optional[str] = None
    status: str  # "processing", "completed", "failed"


# In-memory store for operation tracking (use Redis in production)
operation_store: Dict[str, Dict[str, Any]] = {}


class BulkOperationsService:
    """Service for handling bulk operations"""
    
    def __init__(self, session: Session):
        self.session = session
        self.metadata_service = MetadataRefreshService()
    
    async def bulk_status_update(self, request: BulkStatusUpdate) -> BulkOperationResult:
        """Perform bulk status update"""
        operation_id = str(uuid.uuid4())
        
        # Initialize operation tracking
        operation_store[operation_id] = {
            "id": operation_id,
            "type": "status_update",
            "status": "processing",
            "total_items": 0,
            "processed_items": 0,
            "success_count": 0,
            "error_count": 0,
            "errors": [],
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        try:
            # Get target books/editions
            target_editions = await self._get_target_editions(request)
            operation_store[operation_id]["total_items"] = len(target_editions)
            
            # Process each edition
            for edition in target_editions:
                try:
                    await self._update_edition_status(
                        edition, request.new_status, request.user_id, request.notes
                    )
                    operation_store[operation_id]["success_count"] += 1
                except Exception as e:
                    operation_store[operation_id]["errors"].append(f"Edition {edition.id}: {str(e)}")
                    operation_store[operation_id]["error_count"] += 1
                
                operation_store[operation_id]["processed_items"] += 1
            
            operation_store[operation_id]["status"] = "completed"
            operation_store[operation_id]["completed_at"] = datetime.now().isoformat()
            
        except Exception as e:
            operation_store[operation_id]["status"] = "failed"
            operation_store[operation_id]["errors"].append(f"Operation failed: {str(e)}")
        
        return BulkOperationResult(**operation_store[operation_id])
    
    async def bulk_metadata_update(self, request: BulkMetadataUpdate) -> BulkOperationResult:
        """Perform bulk metadata update"""
        operation_id = str(uuid.uuid4())
        
        operation_store[operation_id] = {
            "id": operation_id,
            "type": "metadata_update",
            "status": "processing",
            "total_items": len(request.book_ids),
            "processed_items": 0,
            "success_count": 0,
            "error_count": 0,
            "errors": [],
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        try:
            for book_id in request.book_ids:
                try:
                    book = self.session.exec(
                        select(Book).where(Book.id == book_id)
                    ).first()
                    
                    if book:
                        # Apply updates
                        for field, value in request.updates.items():
                            if hasattr(book, field):
                                setattr(book, field, value)
                        
                        self.session.add(book)
                        operation_store[operation_id]["success_count"] += 1
                    else:
                        operation_store[operation_id]["errors"].append(f"Book {book_id} not found")
                        operation_store[operation_id]["error_count"] += 1
                
                except Exception as e:
                    operation_store[operation_id]["errors"].append(f"Book {book_id}: {str(e)}")
                    operation_store[operation_id]["error_count"] += 1
                
                operation_store[operation_id]["processed_items"] += 1
            
            self.session.commit()
            operation_store[operation_id]["status"] = "completed"
            operation_store[operation_id]["completed_at"] = datetime.now().isoformat()
            
        except Exception as e:
            operation_store[operation_id]["status"] = "failed"
            operation_store[operation_id]["errors"].append(f"Operation failed: {str(e)}")
            self.session.rollback()
        
        return BulkOperationResult(**operation_store[operation_id])
    
    async def bulk_reading_progress_update(self, request: BulkReadingProgressUpdate) -> BulkOperationResult:
        """Perform bulk reading progress update"""
        operation_id = str(uuid.uuid4())
        
        operation_store[operation_id] = {
            "id": operation_id,
            "type": "reading_progress_update",
            "status": "processing",
            "total_items": len(request.items),
            "processed_items": 0,
            "success_count": 0,
            "error_count": 0,
            "errors": [],
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        try:
            for item in request.items:
                try:
                    # Find edition
                    edition = None
                    if "book_id" in item:
                        edition = self.session.exec(
                            select(Edition).where(Edition.book_id == item["book_id"])
                        ).first()
                    elif "isbn" in item:
                        edition = self.session.exec(
                            select(Edition).where(
                                or_(Edition.isbn_10 == item["isbn"], Edition.isbn_13 == item["isbn"])
                            )
                        ).first()
                    
                    if edition:
                        # Update or create reading progress
                        progress = self.session.exec(
                            select(ReadingProgress).where(
                                and_(
                                    ReadingProgress.user_id == request.user_id,
                                    ReadingProgress.edition_id == edition.id
                                )
                            )
                        ).first()
                        
                        if progress:
                            # Update existing
                            for field, value in item.items():
                                if field not in ["book_id", "isbn"] and hasattr(progress, field):
                                    setattr(progress, field, value)
                            progress.updated_at = datetime.now()
                        else:
                            # Create new
                            progress = ReadingProgress(
                                user_id=request.user_id,
                                edition_id=edition.id,
                                **{k: v for k, v in item.items() if k not in ["book_id", "isbn"]}
                            )
                            self.session.add(progress)
                        
                        operation_store[operation_id]["success_count"] += 1
                    else:
                        operation_store[operation_id]["errors"].append(f"Edition not found for: {item}")
                        operation_store[operation_id]["error_count"] += 1
                
                except Exception as e:
                    operation_store[operation_id]["errors"].append(f"Item {item}: {str(e)}")
                    operation_store[operation_id]["error_count"] += 1
                
                operation_store[operation_id]["processed_items"] += 1
            
            self.session.commit()
            operation_store[operation_id]["status"] = "completed"
            operation_store[operation_id]["completed_at"] = datetime.now().isoformat()
            
        except Exception as e:
            operation_store[operation_id]["status"] = "failed"
            operation_store[operation_id]["errors"].append(f"Operation failed: {str(e)}")
            self.session.rollback()
        
        return BulkOperationResult(**operation_store[operation_id])
    
    async def bulk_deletion(self, request: BulkDeletion) -> BulkOperationResult:
        """Perform bulk deletion"""
        operation_id = str(uuid.uuid4())
        
        operation_store[operation_id] = {
            "id": operation_id,
            "type": "deletion",
            "status": "processing",
            "total_items": 0,
            "processed_items": 0,
            "success_count": 0,
            "error_count": 0,
            "errors": [],
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        try:
            # Get target books
            target_books = await self._get_target_books(request)
            operation_store[operation_id]["total_items"] = len(target_books)
            
            for book in target_books:
                try:
                    # Delete related data first
                    if request.delete_reading_progress:
                        # Delete reading progress for all editions of this book
                        editions = self.session.exec(
                            select(Edition).where(Edition.book_id == book.id)
                        ).all()
                        
                        for edition in editions:
                            progress_records = self.session.exec(
                                select(ReadingProgress).where(
                                    and_(
                                        ReadingProgress.edition_id == edition.id,
                                        ReadingProgress.user_id == request.user_id
                                    )
                                )
                            ).all()
                            
                            for progress in progress_records:
                                self.session.delete(progress)
                    
                    if request.delete_user_status:
                        # Delete user edition status
                        editions = self.session.exec(
                            select(Edition).where(Edition.book_id == book.id)
                        ).all()
                        
                        for edition in editions:
                            statuses = self.session.exec(
                                select(UserEditionStatus).where(
                                    and_(
                                        UserEditionStatus.edition_id == edition.id,
                                        UserEditionStatus.user_id == request.user_id
                                    )
                                )
                            ).all()
                            
                            for status in statuses:
                                self.session.delete(status)
                    
                    # Note: We don't delete the book itself, just user-specific data
                    # To actually delete books, uncomment the following:
                    # self.session.delete(book)
                    
                    operation_store[operation_id]["success_count"] += 1
                
                except Exception as e:
                    operation_store[operation_id]["errors"].append(f"Book {book.id}: {str(e)}")
                    operation_store[operation_id]["error_count"] += 1
                
                operation_store[operation_id]["processed_items"] += 1
            
            self.session.commit()
            operation_store[operation_id]["status"] = "completed"
            operation_store[operation_id]["completed_at"] = datetime.now().isoformat()
            
        except Exception as e:
            operation_store[operation_id]["status"] = "failed"
            operation_store[operation_id]["errors"].append(f"Operation failed: {str(e)}")
            self.session.rollback()
        
        return BulkOperationResult(**operation_store[operation_id])
    
    async def series_operation(self, request: SeriesOperation) -> BulkOperationResult:
        """Perform series-wide operation"""
        operation_id = str(uuid.uuid4())
        
        operation_store[operation_id] = {
            "id": operation_id,
            "type": f"series_{request.operation}",
            "status": "processing",
            "total_items": 0,
            "processed_items": 0,
            "success_count": 0,
            "error_count": 0,
            "errors": [],
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        try:
            # Get all books in series
            books = self.session.exec(
                select(Book).where(Book.series_name == request.series_name)
            ).all()
            
            operation_store[operation_id]["total_items"] = len(books)
            
            if request.operation == "mark_all_read":
                for book in books:
                    try:
                        await self._mark_book_as_read(book, request.user_id, request.parameters)
                        operation_store[operation_id]["success_count"] += 1
                    except Exception as e:
                        operation_store[operation_id]["errors"].append(f"Book {book.id}: {str(e)}")
                        operation_store[operation_id]["error_count"] += 1
                    
                    operation_store[operation_id]["processed_items"] += 1
            
            elif request.operation == "mark_all_owned":
                for book in books:
                    try:
                        await self._mark_book_as_owned(book, request.user_id, request.parameters)
                        operation_store[operation_id]["success_count"] += 1
                    except Exception as e:
                        operation_store[operation_id]["errors"].append(f"Book {book.id}: {str(e)}")
                        operation_store[operation_id]["error_count"] += 1
                    
                    operation_store[operation_id]["processed_items"] += 1
            
            elif request.operation == "refresh_metadata":
                for book in books:
                    try:
                        await self._refresh_book_metadata(book)
                        operation_store[operation_id]["success_count"] += 1
                    except Exception as e:
                        operation_store[operation_id]["errors"].append(f"Book {book.id}: {str(e)}")
                        operation_store[operation_id]["error_count"] += 1
                    
                    operation_store[operation_id]["processed_items"] += 1
            
            self.session.commit()
            operation_store[operation_id]["status"] = "completed"
            operation_store[operation_id]["completed_at"] = datetime.now().isoformat()
            
        except Exception as e:
            operation_store[operation_id]["status"] = "failed"
            operation_store[operation_id]["errors"].append(f"Operation failed: {str(e)}")
            self.session.rollback()
        
        return BulkOperationResult(**operation_store[operation_id])
    
    # Helper methods
    async def _get_target_editions(self, request: BulkStatusUpdate) -> List[Edition]:
        """Get target editions based on request criteria"""
        editions = []
        
        if request.book_ids:
            editions.extend(
                self.session.exec(
                    select(Edition).where(Edition.book_id.in_(request.book_ids))
                ).all()
            )
        
        if request.isbns:
            editions.extend(
                self.session.exec(
                    select(Edition).where(
                        or_(
                            Edition.isbn_10.in_(request.isbns),
                            Edition.isbn_13.in_(request.isbns)
                        )
                    )
                ).all()
            )
        
        if request.series_names:
            books = self.session.exec(
                select(Book).where(Book.series_name.in_(request.series_names))
            ).all()
            
            for book in books:
                book_editions = self.session.exec(
                    select(Edition).where(Edition.book_id == book.id)
                ).all()
                editions.extend(book_editions)
        
        if request.author_names:
            # Search in JSON authors field
            for author_name in request.author_names:
                books = self.session.exec(
                    select(Book).where(
                        func.lower(Book.authors).contains(author_name.lower())
                    )
                ).all()
                
                for book in books:
                    try:
                        authors = json.loads(book.authors) if book.authors else []
                        if any(author_name.lower() in author.lower() for author in authors):
                            book_editions = self.session.exec(
                                select(Edition).where(Edition.book_id == book.id)
                            ).all()
                            editions.extend(book_editions)
                    except json.JSONDecodeError:
                        continue
        
        # Remove duplicates
        unique_editions = []
        seen_ids = set()
        for edition in editions:
            if edition.id not in seen_ids:
                unique_editions.append(edition)
                seen_ids.add(edition.id)
        
        return unique_editions
    
    async def _get_target_books(self, request: BulkDeletion) -> List[Book]:
        """Get target books based on deletion request criteria"""
        books = []
        
        if request.book_ids:
            books.extend(
                self.session.exec(
                    select(Book).where(Book.id.in_(request.book_ids))
                ).all()
            )
        
        if request.isbns:
            editions = self.session.exec(
                select(Edition).where(
                    or_(
                        Edition.isbn_10.in_(request.isbns),
                        Edition.isbn_13.in_(request.isbns)
                    )
                )
            ).all()
            
            for edition in editions:
                book = self.session.exec(
                    select(Book).where(Book.id == edition.book_id)
                ).first()
                if book:
                    books.append(book)
        
        if request.series_names:
            books.extend(
                self.session.exec(
                    select(Book).where(Book.series_name.in_(request.series_names))
                ).all()
            )
        
        # Remove duplicates
        unique_books = []
        seen_ids = set()
        for book in books:
            if book.id not in seen_ids:
                unique_books.append(book)
                seen_ids.add(book.id)
        
        return unique_books
    
    async def _update_edition_status(self, edition: Edition, new_status: str, user_id: int, notes: str):
        """Update status for a single edition"""
        existing_status = self.session.exec(
            select(UserEditionStatus).where(
                and_(
                    UserEditionStatus.user_id == user_id,
                    UserEditionStatus.edition_id == edition.id
                )
            )
        ).first()
        
        if existing_status:
            existing_status.status = new_status
            if notes:
                existing_status.notes = notes
        else:
            new_user_status = UserEditionStatus(
                user_id=user_id,
                edition_id=edition.id,
                status=new_status,
                notes=notes or f"Bulk update to {new_status}"
            )
            self.session.add(new_user_status)
    
    async def _mark_book_as_read(self, book: Book, user_id: int, parameters: Optional[Dict[str, Any]]):
        """Mark a book as read with optional rating"""
        edition = self.session.exec(
            select(Edition).where(Edition.book_id == book.id)
        ).first()
        
        if edition:
            # Create or update reading progress
            progress = self.session.exec(
                select(ReadingProgress).where(
                    and_(
                        ReadingProgress.user_id == user_id,
                        ReadingProgress.edition_id == edition.id
                    )
                )
            ).first()
            
            if progress:
                progress.status = "finished"
                progress.progress_percentage = 100.0
                progress.finish_date = datetime.now()
            else:
                progress = ReadingProgress(
                    user_id=user_id,
                    edition_id=edition.id,
                    status="finished",
                    progress_percentage=100.0,
                    finish_date=datetime.now()
                )
                self.session.add(progress)
            
            # Add rating if provided
            if parameters and "rating" in parameters:
                progress.rating = parameters["rating"]
    
    async def _mark_book_as_owned(self, book: Book, user_id: int, parameters: Optional[Dict[str, Any]]):
        """Mark a book as owned"""
        edition = self.session.exec(
            select(Edition).where(Edition.book_id == book.id)
        ).first()
        
        if edition:
            await self._update_edition_status(
                edition, "own", user_id, 
                parameters.get("notes", "Bulk marked as owned") if parameters else "Bulk marked as owned"
            )
    
    async def _refresh_book_metadata(self, book: Book):
        """Refresh metadata for a book"""
        # This would use the metadata refresh service
        # Implementation depends on the specific metadata refresh logic
        pass


@router.post("/status", response_model=BulkOperationResult)
async def bulk_update_status(
    request: BulkStatusUpdate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
) -> BulkOperationResult:
    """
    Bulk update ownership/reading status for multiple books
    
    Can target books by:
    - Book IDs
    - ISBNs  
    - Series names
    - Author names
    """
    service = BulkOperationsService(session)
    return await service.bulk_status_update(request)


@router.post("/metadata", response_model=BulkOperationResult)
async def bulk_update_metadata(
    request: BulkMetadataUpdate,
    session: Session = Depends(get_session)
) -> BulkOperationResult:
    """
    Bulk update metadata for multiple books
    """
    service = BulkOperationsService(session)
    return await service.bulk_metadata_update(request)


@router.post("/reading-progress", response_model=BulkOperationResult)
async def bulk_update_reading_progress(
    request: BulkReadingProgressUpdate,
    session: Session = Depends(get_session)
) -> BulkOperationResult:
    """
    Bulk update reading progress for multiple books
    """
    service = BulkOperationsService(session)
    return await service.bulk_reading_progress_update(request)


@router.delete("/books", response_model=BulkOperationResult)
async def bulk_delete_books(
    request: BulkDeletion,
    session: Session = Depends(get_session)
) -> BulkOperationResult:
    """
    Bulk delete user data for books (doesn't delete books themselves)
    """
    service = BulkOperationsService(session)
    return await service.bulk_deletion(request)


@router.post("/series", response_model=BulkOperationResult)
async def series_bulk_operation(
    request: SeriesOperation,
    session: Session = Depends(get_session)
) -> BulkOperationResult:
    """
    Perform bulk operations on entire series
    
    Available operations:
    - mark_all_read: Mark all books in series as read
    - mark_all_owned: Mark all books in series as owned  
    - refresh_metadata: Refresh metadata for all books in series
    """
    service = BulkOperationsService(session)
    return await service.series_operation(request)


@router.get("/operation/{operation_id}")
async def get_operation_status(operation_id: str) -> Dict[str, Any]:
    """
    Get status of a bulk operation
    """
    if operation_id not in operation_store:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    return {
        "success": True,
        "operation": operation_store[operation_id]
    }


@router.get("/operations")
async def list_operations() -> Dict[str, Any]:
    """
    List all bulk operations (recent)
    """
    operations = list(operation_store.values())
    
    # Sort by start time, most recent first
    operations.sort(key=lambda x: x["started_at"], reverse=True)
    
    return {
        "success": True,
        "operations": operations[:20],  # Last 20 operations
        "count": len(operations)
    }


@router.post("/mark-series-read/{series_name}")
async def mark_series_as_read(
    series_name: str,
    rating: Optional[int] = None,
    user_id: int = 1,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Quick operation to mark entire series as read
    """
    request = SeriesOperation(
        series_name=series_name,
        operation="mark_all_read",
        parameters={"rating": rating} if rating else None,
        user_id=user_id
    )
    
    service = BulkOperationsService(session)
    result = await service.series_operation(request)
    
    return {
        "success": result.success,
        "operation_id": result.operation_id,
        "message": f"Marked {result.success_count} books as read in series '{series_name}'"
    }


@router.post("/mark-author-books-owned/{author_name}")
async def mark_author_books_owned(
    author_name: str,
    user_id: int = 1,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Quick operation to mark all books by an author as owned
    """
    request = BulkStatusUpdate(
        author_names=[author_name],
        new_status="own",
        user_id=user_id,
        notes=f"Bulk marked as owned - author: {author_name}"
    )
    
    service = BulkOperationsService(session)
    result = await service.bulk_status_update(request)
    
    return {
        "success": result.success,
        "operation_id": result.operation_id,
        "message": f"Marked {result.success_count} books as owned by author '{author_name}'"
    }