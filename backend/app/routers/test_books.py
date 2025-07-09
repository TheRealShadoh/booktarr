from fastapi import APIRouter, HTTPException
from typing import List, Dict
from datetime import datetime
from ..models import Book, BooksResponse, MetadataSource
from ..services.metadata_service import MetadataService

router = APIRouter()

@router.get("/books/test", response_model=BooksResponse)
async def get_test_books():
    """Get test books for demonstration"""
    
    # Create some test books
    current_time = datetime.now()
    
    test_books = [
        Book(
            isbn="9780439139595",
            title="Harry Potter and the Goblet of Fire",
            authors=["J.K. Rowling"],
            series="Harry Potter",
            series_position=4,
            publisher="Scholastic",
            page_count=734,
            language="en",
            description="The fourth book in the Harry Potter series.",
            categories=["Fantasy", "Young Adult"],
            metadata_source=MetadataSource.GOOGLE_BOOKS,
            added_date=current_time,
            last_updated=current_time
        ),
        Book(
            isbn="9780439358071",
            title="Harry Potter and the Order of the Phoenix",
            authors=["J.K. Rowling"],
            series="Harry Potter",
            series_position=5,
            publisher="Scholastic",
            page_count=870,
            language="en",
            description="The fifth book in the Harry Potter series.",
            categories=["Fantasy", "Young Adult"],
            metadata_source=MetadataSource.GOOGLE_BOOKS,
            added_date=current_time,
            last_updated=current_time
        ),
        Book(
            isbn="9780345391803",
            title="The Hitchhiker's Guide to the Galaxy",
            authors=["Douglas Adams"],
            publisher="Del Rey",
            page_count=216,
            language="en",
            description="A comedy science fiction series.",
            categories=["Science Fiction", "Comedy"],
            metadata_source=MetadataSource.OPEN_LIBRARY,
            added_date=current_time,
            last_updated=current_time
        )
    ]
    
    # Group books by series
    series_dict = {}
    for book in test_books:
        series_name = book.series or "Standalone"
        if series_name not in series_dict:
            series_dict[series_name] = []
        series_dict[series_name].append(book)
    
    # Sort books within series
    for series_name, books in series_dict.items():
        books.sort(key=lambda x: (x.series_position or 999, x.title))
    
    return BooksResponse(
        series=series_dict,
        total_books=len(test_books),
        total_series=len(series_dict),
        last_sync=current_time
    )

@router.get("/books/enrich/{isbn}")
async def test_metadata_enrichment(isbn: str):
    """Test metadata enrichment for a specific ISBN"""
    try:
        async with MetadataService() as service:
            metadata = await service.enrich_book(isbn)
            
            if metadata:
                return {
                    "isbn": isbn,
                    "status": "success",
                    "metadata": metadata
                }
            else:
                return {
                    "isbn": isbn,
                    "status": "not_found",
                    "message": "No metadata found for this ISBN"
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enriching metadata: {str(e)}")