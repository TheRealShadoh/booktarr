#!/usr/bin/env python3
"""
Mock test script to demonstrate Harry Potter search functionality
"""
import sys
import os
import asyncio
from unittest.mock import AsyncMock, patch

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.book_search import BookSearchService
from backend.database import init_db

async def test_harry_potter_search_mock():
    """Test searching for Harry Potter books with mocked API responses"""
    print("Testing Harry Potter search with mock data...")
    
    # Initialize database
    init_db()
    
    # Create search service
    search_service = BookSearchService()
    
    # Mock Google Books API response for Harry Potter
    mock_google_response = {
        "title": "Harry Potter and the Philosopher's Stone",
        "authors": ["J.K. Rowling"],
        "series_name": "Harry Potter",
        "series_position": 1,
        "isbn_13": "9780439708180",
        "isbn_10": "0439708184",
        "publisher": "Scholastic",
        "release_date": "1997-06-26",
        "cover_url": "https://books.google.com/books/content?id=wrOQLV6xB-wC&printsec=frontcover&img=1&zoom=1&source=gbs_api",
        "price": 8.99,
        "format": "book",
        "source": "google_books",
        "google_books_id": "wrOQLV6xB-wC"
    }
    
    # Mock OpenLibrary API response
    mock_openlibrary_response = {
        "title": "Harry Potter and the Chamber of Secrets",
        "authors": ["J.K. Rowling"],
        "series_name": "Harry Potter",
        "series_position": 2,
        "isbn_13": "9780439064873",
        "isbn_10": "0439064872",
        "publisher": "Arthur A. Levine Books",
        "release_date": "1998-07-02",
        "cover_url": "https://covers.openlibrary.org/b/id/240726-M.jpg",
        "format": "book",
        "source": "openlibrary",
        "openlibrary_id": "/books/OL7353617M"
    }
    
    try:
        # Test different search queries with mocked responses
        test_cases = [
            {
                "query": "Harry Potter",
                "mock_google": [mock_google_response],
                "mock_openlibrary": [mock_openlibrary_response]
            },
            {
                "query": "J.K. Rowling",
                "mock_google": [mock_google_response],
                "mock_openlibrary": [mock_openlibrary_response]
            },
            {
                "query": "9780439708180",
                "mock_google": mock_google_response,
                "mock_openlibrary": None
            }
        ]
        
        for test_case in test_cases:
            query = test_case["query"]
            print(f"\nSearching for: '{query}'")
            print("-" * 50)
            
            try:
                # Mock the API clients
                with patch.object(search_service.google_client, 'search_by_title', new_callable=AsyncMock) as mock_google_title:
                    with patch.object(search_service.google_client, 'search_by_author', new_callable=AsyncMock) as mock_google_author:
                        with patch.object(search_service.google_client, 'search_by_isbn', new_callable=AsyncMock) as mock_google_isbn:
                            with patch.object(search_service.openlibrary_client, 'search_by_title', new_callable=AsyncMock) as mock_ol_title:
                                with patch.object(search_service.openlibrary_client, 'search_by_author', new_callable=AsyncMock) as mock_ol_author:
                                    with patch.object(search_service.openlibrary_client, 'search_by_isbn', new_callable=AsyncMock) as mock_ol_isbn:
                                        
                                        # Configure mocks based on query type
                                        if query.replace("-", "").isdigit():
                                            # ISBN search
                                            mock_google_isbn.return_value = test_case["mock_google"]
                                            mock_ol_isbn.return_value = test_case["mock_openlibrary"]
                                        else:
                                            # Title/author search
                                            mock_google_title.return_value = test_case["mock_google"]
                                            mock_google_author.return_value = test_case["mock_google"]
                                            mock_ol_title.return_value = test_case["mock_openlibrary"]
                                            mock_ol_author.return_value = test_case["mock_openlibrary"]
                                        
                                        # Perform search
                                        result = await search_service.search(query, user_id=1)
                                        
                                        # Display results
                                        if "error" in result:
                                            print(f"Error: {result['error']}")
                                        elif "results" in result:
                                            print(f"Found {result['count']} results:")
                                            for i, book in enumerate(result['results'][:3], 1):
                                                print(f"  {i}. {book['title']}")
                                                print(f"     Authors: {', '.join(book['authors'])}")
                                                if book.get('series'):
                                                    print(f"     Series: {book['series']}")
                                                print(f"     Editions: {len(book['editions'])}")
                                        elif "title" in result:
                                            print(f"Found book: {result['title']}")
                                            print(f"   Authors: {', '.join(result['authors'])}")
                                            if result.get('series'):
                                                print(f"   Series: {result['series']}")
                                            print(f"   Editions: {len(result['editions'])}")
                                        else:
                                            print("Unexpected result format")
                                            print(f"Result: {result}")
                                            
            except Exception as e:
                print(f"Search failed: {str(e)}")
                import traceback
                traceback.print_exc()
                
    finally:
        # Clean up
        await search_service.close()

if __name__ == "__main__":
    asyncio.run(test_harry_potter_search_mock())