#!/usr/bin/env python3
"""
Test script to search for Harry Potter books using real API calls
"""
import sys
import os
import asyncio
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.clients.google_books import GoogleBooksClient
from backend.clients.openlibrary import OpenLibraryClient

async def test_real_harry_potter_search():
    """Test searching for Harry Potter books using real API calls"""
    print("Testing REAL Harry Potter search with live APIs...")
    print("=" * 60)
    
    # Create API clients
    google_client = GoogleBooksClient()
    openlibrary_client = OpenLibraryClient()
    
    try:
        # Test different search queries
        search_queries = [
            "Harry Potter",
            "J.K. Rowling",
            "Harry Potter Philosopher's Stone",
            "Harry Potter Deathly Hallows"
        ]
        
        for query in search_queries:
            print(f"\nSearching for: '{query}'")
            print("-" * 50)
            
            # Search Google Books
            print("Google Books API results:")
            try:
                google_results = await google_client.search_by_title(query)
                if google_results:
                    print(f"  Found {len(google_results)} results")
                    for i, book in enumerate(google_results[:5], 1):  # Show first 5
                        print(f"    {i}. {book.get('title', 'No Title')}")
                        authors = book.get('authors', [])
                        if authors:
                            print(f"       Authors: {', '.join(authors)}")
                        if book.get('isbn_13'):
                            print(f"       ISBN-13: {book['isbn_13']}")
                        print()
                else:
                    print("  No results found")
            except Exception as e:
                print(f"  Error: {str(e)}")
            
            # Search OpenLibrary
            print("OpenLibrary API results:")
            try:
                ol_results = await openlibrary_client.search_by_title(query)
                if ol_results:
                    print(f"  Found {len(ol_results)} results")
                    for i, book in enumerate(ol_results[:5], 1):  # Show first 5
                        print(f"    {i}. {book.get('title', 'No Title')}")
                        authors = book.get('authors', [])
                        if authors:
                            print(f"       Authors: {', '.join(authors)}")
                        if book.get('isbn_13'):
                            print(f"       ISBN-13: {book['isbn_13']}")
                        elif book.get('isbn_10'):
                            print(f"       ISBN-10: {book['isbn_10']}")
                        print()
                else:
                    print("  No results found")
            except Exception as e:
                print(f"  Error: {str(e)}")
            
            print()
        
        # Test specific author search
        print("\nTesting author-specific search:")
        print("-" * 50)
        
        print("Google Books - J.K. Rowling:")
        try:
            author_results = await google_client.search_by_author("J.K. Rowling")
            if author_results:
                print(f"  Found {len(author_results)} books by J.K. Rowling")
                # Group by series if possible
                harry_potter_books = []
                other_books = []
                
                for book in author_results:
                    title = book.get('title', '').lower()
                    if 'harry potter' in title:
                        harry_potter_books.append(book)
                    else:
                        other_books.append(book)
                
                if harry_potter_books:
                    print(f"  Harry Potter books: {len(harry_potter_books)}")
                    for book in harry_potter_books:
                        print(f"    - {book.get('title')}")
                
                if other_books:
                    print(f"  Other books: {len(other_books)}")
                    for book in other_books[:5]:  # Show first 5 others
                        print(f"    - {book.get('title')}")
            else:
                print("  No results found")
        except Exception as e:
            print(f"  Error: {str(e)}")
        
        print("\nOpenLibrary - J.K. Rowling:")
        try:
            ol_author_results = await openlibrary_client.search_by_author("J.K. Rowling")
            if ol_author_results:
                print(f"  Found {len(ol_author_results)} books by J.K. Rowling")
                # Group by series if possible
                harry_potter_books = []
                other_books = []
                
                for book in ol_author_results:
                    title = book.get('title', '').lower()
                    if 'harry potter' in title:
                        harry_potter_books.append(book)
                    else:
                        other_books.append(book)
                
                if harry_potter_books:
                    print(f"  Harry Potter books: {len(harry_potter_books)}")
                    for book in harry_potter_books:
                        print(f"    - {book.get('title')}")
                
                if other_books:
                    print(f"  Other books: {len(other_books)}")
                    for book in other_books[:5]:  # Show first 5 others
                        print(f"    - {book.get('title')}")
            else:
                print("  No results found")
        except Exception as e:
            print(f"  Error: {str(e)}")
        
    finally:
        # Clean up
        await google_client.close()
        await openlibrary_client.close()

if __name__ == "__main__":
    asyncio.run(test_real_harry_potter_search())