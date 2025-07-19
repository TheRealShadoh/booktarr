#!/usr/bin/env python3
"""
Test script to demonstrate finding all Harry Potter books
"""
import sys
import os
import asyncio
from unittest.mock import AsyncMock, patch
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.book_search import BookSearchService
from backend.database import init_db

async def test_all_harry_potter_books():
    """Test finding all Harry Potter books with comprehensive mock data"""
    print("Testing search for ALL Harry Potter books...")
    
    # Initialize database
    init_db()
    
    # Create search service
    search_service = BookSearchService()
    
    # Comprehensive mock data for all 7 main Harry Potter books
    all_harry_potter_books = [
        {
            "title": "Harry Potter and the Philosopher's Stone",
            "authors": ["J.K. Rowling"],
            "series_name": "Harry Potter",
            "series_position": 1,
            "isbn_13": "9780439708180",
            "publisher": "Scholastic",
            "release_date": "1997-06-26",
            "source": "google_books"
        },
        {
            "title": "Harry Potter and the Chamber of Secrets",
            "authors": ["J.K. Rowling"],
            "series_name": "Harry Potter",
            "series_position": 2,
            "isbn_13": "9780439064873",
            "publisher": "Scholastic",
            "release_date": "1998-07-02",
            "source": "google_books"
        },
        {
            "title": "Harry Potter and the Prisoner of Azkaban",
            "authors": ["J.K. Rowling"],
            "series_name": "Harry Potter",
            "series_position": 3,
            "isbn_13": "9780439136358",
            "publisher": "Scholastic",
            "release_date": "1999-07-08",
            "source": "google_books"
        },
        {
            "title": "Harry Potter and the Goblet of Fire",
            "authors": ["J.K. Rowling"],
            "series_name": "Harry Potter",
            "series_position": 4,
            "isbn_13": "9780439139595",
            "publisher": "Scholastic",
            "release_date": "2000-07-08",
            "source": "google_books"
        },
        {
            "title": "Harry Potter and the Order of the Phoenix",
            "authors": ["J.K. Rowling"],
            "series_name": "Harry Potter",
            "series_position": 5,
            "isbn_13": "9780439358064",
            "publisher": "Scholastic",
            "release_date": "2003-06-21",
            "source": "google_books"
        },
        {
            "title": "Harry Potter and the Half-Blood Prince",
            "authors": ["J.K. Rowling"],
            "series_name": "Harry Potter",
            "series_position": 6,
            "isbn_13": "9780439784542",
            "publisher": "Scholastic",
            "release_date": "2005-07-16",
            "source": "google_books"
        },
        {
            "title": "Harry Potter and the Deathly Hallows",
            "authors": ["J.K. Rowling"],
            "series_name": "Harry Potter",
            "series_position": 7,
            "isbn_13": "9780545010221",
            "publisher": "Scholastic",
            "release_date": "2007-07-21",
            "source": "google_books"
        }
    ]
    
    # Additional books (companion books, etc.)
    additional_hp_books = [
        {
            "title": "The Tales of Beedle the Bard",
            "authors": ["J.K. Rowling"],
            "series_name": "Harry Potter Universe",
            "isbn_13": "9780545128285",
            "publisher": "Scholastic",
            "release_date": "2008-12-04",
            "source": "google_books"
        },
        {
            "title": "Fantastic Beasts and Where to Find Them",
            "authors": ["J.K. Rowling"],
            "series_name": "Harry Potter Universe",
            "isbn_13": "9780439295000",
            "publisher": "Scholastic",
            "release_date": "2001-03-01",
            "source": "google_books"
        },
        {
            "title": "Quidditch Through the Ages",
            "authors": ["J.K. Rowling"],
            "series_name": "Harry Potter Universe",
            "isbn_13": "9780439295017",
            "publisher": "Scholastic",
            "release_date": "2001-03-01",
            "source": "google_books"
        }
    ]
    
    try:
        # Test with comprehensive mock data
        print(f"\nSearching for: 'Harry Potter' (comprehensive results)")
        print("-" * 60)
        
        # Mock the API clients to return all Harry Potter books
        with patch.object(search_service.google_client, 'search_by_title', new_callable=AsyncMock) as mock_google_title:
            with patch.object(search_service.openlibrary_client, 'search_by_title', new_callable=AsyncMock) as mock_ol_title:
                
                # Return all main books from Google Books
                mock_google_title.return_value = all_harry_potter_books
                
                # Return additional books from OpenLibrary
                mock_ol_title.return_value = additional_hp_books
                
                # Perform search
                result = await search_service.search("Harry Potter", user_id=1)
                
                # Display results
                if "error" in result:
                    print(f"Error: {result['error']}")
                elif "results" in result:
                    print(f"Found {result['count']} Harry Potter books:")
                    print()
                    
                    # Group by series
                    main_series = []
                    universe_books = []
                    
                    for book in result['results']:
                        if book.get('series') == "Harry Potter":
                            main_series.append(book)
                        elif book.get('series') == "Harry Potter Universe":
                            universe_books.append(book)
                    
                    # Sort main series by position
                    main_series.sort(key=lambda x: x.get('series_position', 0))
                    
                    print("MAIN SERIES:")
                    for i, book in enumerate(main_series, 1):
                        print(f"  {i}. {book['title']}")
                        print(f"     Authors: {', '.join(book['authors'])}")
                        print(f"     Series Position: {book.get('series_position', 'N/A')}")
                        print(f"     Editions: {len(book['editions'])}")
                        print()
                    
                    if universe_books:
                        print("COMPANION BOOKS:")
                        for i, book in enumerate(universe_books, 1):
                            print(f"  {i}. {book['title']}")
                            print(f"     Authors: {', '.join(book['authors'])}")
                            print(f"     Series: {book.get('series')}")
                            print(f"     Editions: {len(book['editions'])}")
                            print()
                    
                    print(f"TOTAL BOOKS FOUND: {len(result['results'])}")
                    print(f"Main Series: {len(main_series)}")
                    print(f"Companion Books: {len(universe_books)}")
                    
                else:
                    print("Unexpected result format")
                    
        # Now demonstrate what happens with real API limitations
        print(f"\n" + "="*60)
        print("REAL-WORLD SCENARIO:")
        print("="*60)
        print("In reality, API results depend on:")
        print("1. API rate limits and availability")
        print("2. Search query specificity")
        print("3. Database coverage of different APIs")
        print("4. ISBN availability in API responses")
        print()
        print("To get ALL Harry Potter books, you would typically:")
        print("- Search for 'Harry Potter' (gets main series)")
        print("- Search for 'J.K. Rowling' (gets all her books)")
        print("- Search for specific ISBNs if known")
        print("- Search for 'Fantastic Beasts' (gets companion books)")
        print("- Use series completion features to find missing books")
                    
    except Exception as e:
        print(f"Search failed: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Clean up
        await search_service.close()

if __name__ == "__main__":
    asyncio.run(test_all_harry_potter_books())