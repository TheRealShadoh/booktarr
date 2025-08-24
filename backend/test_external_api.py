#!/usr/bin/env python3
"""Test external API integration for ISBN search."""

import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from clients.google_books import GoogleBooksClient
from clients.openlibrary import OpenLibraryClient

async def test_isbn_search():
    isbn = "9781646093038"
    print(f"Testing ISBN search for: {isbn}")
    print("=" * 50)
    
    # Test Google Books API
    print("\n1. Testing Google Books API...")
    google_client = GoogleBooksClient()
    try:
        google_result = await google_client.search_by_isbn(isbn)
        if google_result:
            print(f"SUCCESS - Google Books found: {google_result['title']} by {google_result.get('authors', 'Unknown')}")
            print(f"   Publisher: {google_result.get('publisher', 'Unknown')}")
            print(f"   Cover URL: {google_result.get('cover_url', 'None')}")
        else:
            print("FAILED - Google Books: No results found")
    except Exception as e:
        print(f"ERROR - Google Books error: {e}")
    finally:
        await google_client.close()
    
    # Test OpenLibrary API
    print("\n2. Testing OpenLibrary API...")
    ol_client = OpenLibraryClient()
    try:
        ol_result = await ol_client.search_by_isbn(isbn)
        if ol_result:
            print(f"SUCCESS - OpenLibrary found: {ol_result['title']} by {ol_result.get('authors', 'Unknown')}")
            print(f"   Publisher: {ol_result.get('publisher', 'Unknown')}")
            print(f"   Cover URL: {ol_result.get('cover_url', 'None')}")
        else:
            print("FAILED - OpenLibrary: No results found")
    except Exception as e:
        print(f"ERROR - OpenLibrary error: {e}")
    finally:
        await ol_client.close()

if __name__ == "__main__":
    asyncio.run(test_isbn_search())