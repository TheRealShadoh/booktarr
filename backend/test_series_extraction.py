#!/usr/bin/env python3
"""
Test script to verify series extraction from Google Books API
"""
import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

async def test_series_extraction():
    """Test series extraction with known series books"""
    
    from clients.google_books import GoogleBooksClient
    
    client = GoogleBooksClient()
    
    test_books = [
        ("9780439708180", "Harry Potter and the Sorcerer's Stone"),
        ("9781421533384", "Naruto Vol. 1"),
        ("9781626922419", "Citrus Vol. 1"),
        ("9780765326355", "The Way of Kings")
    ]
    
    for isbn, expected_title in test_books:
        print(f"\n🔍 Testing ISBN: {isbn} ({expected_title})")
        try:
            result = await client.search_by_isbn(isbn)
            
            if result:
                print(f"📖 Title: {result.get('title')}")
                print(f"👥 Authors: {result.get('authors')}")
                print(f"📚 Series: {result.get('series_name')}")
                print(f"🔢 Position: {result.get('series_position')}")
                print(f"📝 Description: {result.get('description', '')[:100]}...")
            else:
                print("❌ No result found")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(test_series_extraction())