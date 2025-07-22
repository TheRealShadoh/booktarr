#!/usr/bin/env python3
"""
Test series auto-creation functionality
"""
import sys
sys.path.insert(0, '.')
import asyncio
import json
from database import get_session
from models import Book, Series, SeriesVolume
from sqlmodel import select

def create_test_book():
    """Create a test book with series information"""
    print("📚 Creating test book with series information...")
    
    with get_session() as session:
        # Create a book that's part of a series
        book = Book(
            title="Bleach, Vol. 1",
            authors=json.dumps(["Tite Kubo"]),
            series_name="Bleach",
            series_position=1
        )
        session.add(book)
        session.commit()
        session.refresh(book)
        
        print(f"✅ Created book: {book.title}")
        print(f"   Series: {book.series_name}, Position: {book.series_position}")
        return book

async def test_series_api():
    """Test the series API endpoint"""
    print("\n🌐 Testing series API endpoint...")
    
    import httpx
    
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/series/Bleach")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("error"):
                print(f"   ❌ API Error: {data['error']}")
            else:
                series = data.get("series", {})
                volumes = data.get("volumes", [])
                stats = data.get("stats", {})
                
                print(f"   ✅ Series: {series.get('name')}")
                print(f"   Author: {series.get('author')}")
                print(f"   Volumes: {len(volumes)} total")
                print(f"   Stats: {stats.get('owned_volumes', 0)}/{stats.get('total_volumes', 0)} owned")
        else:
            print(f"   ❌ HTTP Error: {response.status_code}")
            print(f"   Response: {response.text}")

async def main():
    print("🧪 Testing Series Auto-Creation")
    
    # Create test book
    book = create_test_book()
    
    # Test series API
    await test_series_api()
    
    print("\n✅ Test completed!")

if __name__ == "__main__":
    asyncio.run(main())