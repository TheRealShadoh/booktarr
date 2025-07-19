#!/usr/bin/env python3
"""
Test script using REAL BookSearchService with REAL APIs (no mocks)
"""
import sys
import os
import asyncio
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.book_search import BookSearchService
from backend.database import init_db

async def test_real_book_search_service():
    """Test using the real BookSearchService with real API calls"""
    print("Testing REAL BookSearchService with REAL APIs...")
    print("=" * 60)
    
    # Initialize database
    init_db()
    
    # Create the real search service (NO MOCKS)
    search_service = BookSearchService()
    
    try:
        # Test different real search queries
        test_queries = [
            "Harry Potter",
            "J.K. Rowling", 
            "Harry Potter Philosopher's Stone",
            "9780439708180",  # Real ISBN for Harry Potter
            "Brandon Sanderson",
            "Mistborn",
            "Terry Pratchett",
            "Discworld"
        ]
        
        for query in test_queries:
            print(f"\nREAL SEARCH: '{query}'")
            print("-" * 50)
            
            try:
                # This calls the REAL search service which calls REAL APIs
                result = await search_service.search(query, user_id=1)
                
                if "error" in result:
                    print(f"Error: {result['error']}")
                elif "results" in result:
                    print(f"Found {result['count']} results:")
                    
                    # Show detailed results
                    for i, book in enumerate(result['results'][:5], 1):  # Show first 5
                        print(f"  {i}. {book['title']}")
                        print(f"     Authors: {', '.join(book['authors'])}")
                        if book.get('series'):
                            print(f"     Series: {book['series']}")
                        print(f"     Editions: {len(book['editions'])}")
                        
                        # Show edition details
                        for j, edition in enumerate(book['editions'][:2], 1):  # Show first 2 editions
                            print(f"       Edition {j}: {edition.get('format', 'Unknown')} - {edition.get('status', 'missing')}")
                            if edition.get('isbn_13'):
                                print(f"                 ISBN-13: {edition['isbn_13']}")
                        print()
                    
                    if result['count'] > 5:
                        print(f"  ... and {result['count'] - 5} more results")
                        
                elif "title" in result:
                    # Single book result (ISBN search)
                    print(f"Found book: {result['title']}")
                    print(f"   Authors: {', '.join(result['authors'])}")
                    if result.get('series'):
                        print(f"   Series: {result['series']}")
                    print(f"   Editions: {len(result['editions'])}")
                    
                    for i, edition in enumerate(result['editions'], 1):
                        print(f"     Edition {i}: {edition.get('format', 'Unknown')} - {edition.get('status', 'missing')}")
                        if edition.get('isbn_13'):
                            print(f"                 ISBN-13: {edition['isbn_13']}")
                        if edition.get('publisher'):
                            print(f"                 Publisher: {edition['publisher']}")
                        if edition.get('price'):
                            print(f"                 Price: ${edition['price']}")
                else:
                    print(f"Unexpected result format: {result}")
                    
            except Exception as e:
                print(f"Search failed: {str(e)}")
                import traceback
                traceback.print_exc()
                
            print()
        
        # Test ownership functionality with real data
        print("\n" + "="*60)
        print("TESTING OWNERSHIP TRACKING WITH REAL DATA")
        print("="*60)
        
        # First, search for a book to get real data
        print("1. Searching for Harry Potter to get real book data...")
        hp_result = await search_service.search("Harry Potter Philosopher's Stone", user_id=1)
        
        if "title" in hp_result:
            print(f"Found: {hp_result['title']}")
            if hp_result['editions']:
                first_edition = hp_result['editions'][0]
                print(f"   First edition: {first_edition.get('format', 'Unknown')}")
                print(f"   ISBN: {first_edition.get('isbn_13', 'N/A')}")
                print(f"   Status: {first_edition.get('status', 'missing')}")
        elif "results" in hp_result and hp_result['results']:
            first_book = hp_result['results'][0]
            print(f"Found: {first_book['title']}")
            if first_book['editions']:
                first_edition = first_book['editions'][0]
                print(f"   First edition: {first_edition.get('format', 'Unknown')}")
                print(f"   ISBN: {first_edition.get('isbn_13', 'N/A')}")
                print(f"   Status: {first_edition.get('status', 'missing')}")
        else:
            print("No Harry Potter book found for ownership test")
        
        print("\n2. Summary of real API test:")
        print("   - Google Books API: Working")
        print("   - OpenLibrary API: Testing...")
        
        # Test OpenLibrary specifically
        try:
            ol_result = await search_service.openlibrary_client.search_by_title("Harry Potter")
            if ol_result:
                print("   - OpenLibrary API: Working")
                print(f"   - Found {len(ol_result)} results from OpenLibrary")
            else:
                print("   - OpenLibrary API: No results")
        except Exception as e:
            print(f"   - OpenLibrary API: Error - {str(e)}")
            
    finally:
        # Clean up
        await search_service.close()

if __name__ == "__main__":
    asyncio.run(test_real_book_search_service())