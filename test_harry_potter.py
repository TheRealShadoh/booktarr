#!/usr/bin/env python3
"""
Test script to search for Harry Potter books
"""
import sys
import os
import asyncio
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.book_search import BookSearchService
from backend.database import init_db

async def test_harry_potter_search():
    """Test searching for Harry Potter books"""
    print("Testing Harry Potter search...")
    
    # Initialize database
    init_db()
    
    # Create search service
    search_service = BookSearchService()
    
    try:
        # Test different search queries
        test_queries = [
            "Harry Potter",
            "J.K. Rowling",
            "Harry Potter and the Philosopher's Stone",
            "9780439708180"  # ISBN for Harry Potter book
        ]
        
        for query in test_queries:
            print(f"\nSearching for: '{query}'")
            print("-" * 50)
            
            try:
                result = await search_service.search(query, user_id=1)
                
                if "error" in result:
                    print(f"Error: {result['error']}")
                elif "results" in result:
                    print(f"Found {result['count']} results:")
                    for i, book in enumerate(result['results'][:3], 1):  # Show first 3 results
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
                    
            except Exception as e:
                print(f"Search failed: {str(e)}")
                
    finally:
        # Clean up
        await search_service.close()

if __name__ == "__main__":
    asyncio.run(test_harry_potter_search())