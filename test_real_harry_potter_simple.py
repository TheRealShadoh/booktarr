#!/usr/bin/env python3
"""
Simple test script using REAL APIs to search for Harry Potter
"""
import sys
import os
import asyncio

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.book_search import BookSearchService
from backend.database import init_db

async def test_harry_potter_real_apis():
    """Test Harry Potter search using real APIs"""
    print("Testing Harry Potter search with REAL APIs...")
    print("=" * 50)
    
    # Initialize database
    init_db()
    
    # Create search service (no mocks)
    search_service = BookSearchService()
    
    try:
        # Test 1: Search for Harry Potter
        print("\n1. Searching for 'Harry Potter'...")
        result = await search_service.search("Harry Potter", user_id=1)
        
        if "error" in result:
            print(f"Error: {result['error']}")
        elif "results" in result:
            print(f"SUCCESS: Found {result['count']} results")
            for i, book in enumerate(result['results'][:3], 1):
                print(f"  {i}. {book['title']}")
                print(f"     Authors: {', '.join(book['authors'])}")
                print(f"     Editions: {len(book['editions'])}")
        elif "title" in result:
            print(f"SUCCESS: Found book: {result['title']}")
            print(f"   Authors: {', '.join(result['authors'])}")
            print(f"   Editions: {len(result['editions'])}")
        
        # Test 2: Search by specific ISBN
        print("\n2. Searching by ISBN '9780439708180'...")
        isbn_result = await search_service.search("9780439708180", user_id=1)
        
        if "error" in isbn_result:
            print(f"Error: {isbn_result['error']}")
        elif "title" in isbn_result:
            print(f"SUCCESS: Found book: {isbn_result['title']}")
            print(f"   Authors: {', '.join(isbn_result['authors'])}")
            print(f"   Editions: {len(isbn_result['editions'])}")
        
        # Test 3: Search by author
        print("\n3. Searching for 'J.K. Rowling'...")
        author_result = await search_service.search("J.K. Rowling", user_id=1)
        
        if "error" in author_result:
            print(f"Error: {author_result['error']}")
        elif "results" in author_result:
            print(f"SUCCESS: Found {author_result['count']} books by J.K. Rowling")
            hp_books = [book for book in author_result['results'] if 'harry potter' in book['title'].lower()]
            print(f"   Harry Potter books: {len(hp_books)}")
            for book in hp_books[:5]:  # Show first 5
                print(f"     - {book['title']}")
        
        # Test API sources
        print("\n4. Testing individual API sources...")
        
        # Test Google Books directly
        try:
            google_result = await search_service.google_client.search_by_title("Harry Potter")
            if google_result:
                print(f"   Google Books: Found {len(google_result)} results")
            else:
                print("   Google Books: No results")
        except Exception as e:
            print(f"   Google Books: Error - {str(e)}")
        
        # Test OpenLibrary directly
        try:
            ol_result = await search_service.openlibrary_client.search_by_title("Harry Potter")
            if ol_result:
                print(f"   OpenLibrary: Found {len(ol_result)} results")
            else:
                print("   OpenLibrary: No results")
        except Exception as e:
            print(f"   OpenLibrary: Error - {str(e)}")
        
        print("\n" + "="*50)
        print("REAL API TEST COMPLETE")
        print("All searches above used REAL external APIs")
        print("No mocks were used in this test")
        print("="*50)
        
    except Exception as e:
        print(f"Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        await search_service.close()

if __name__ == "__main__":
    asyncio.run(test_harry_potter_real_apis())