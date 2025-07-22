#!/usr/bin/env python3
"""
Test series extraction from Google Books and OpenLibrary clients
"""
import sys
sys.path.insert(0, '.')
import asyncio
from clients import GoogleBooksClient, OpenLibraryClient

async def test_series_extraction():
    print("🧪 Testing series information extraction from API clients")
    
    # Test titles that should have series info
    test_cases = [
        "Bleach, Vol. 1",
        "Bleach Volume 2",
        "One Piece #3", 
        "Naruto: Volume 4",
        "Attack on Titan (Volume 5)",
        "Jujutsu Kaisen Vol. 6",
        "呪術廻戦 [Jujutsu Kaisen] Vol. 7",
        "Spy x Family, Vol. 8"
    ]
    
    google_client = GoogleBooksClient()
    openlibrary_client = OpenLibraryClient()
    
    try:
        print("\n📚 Testing Google Books series extraction:")
        for title in test_cases:
            # Test the series extraction method directly
            series_name, series_position = google_client._extract_series_info({"title": title})
            print(f"   '{title}' -> Series: '{series_name}', Position: {series_position}")
        
        print("\n📚 Testing OpenLibrary series extraction:")
        for title in test_cases:
            # Test the series extraction method directly
            series_name, series_position = openlibrary_client._extract_series_info(title)
            print(f"   '{title}' -> Series: '{series_name}', Position: {series_position}")
        
        # Test a real API call (if we want to avoid API limits, we can skip this)
        print(f"\n🌐 Testing real API call (skipping to avoid rate limits)")
        # google_result = await google_client.search_by_title("Bleach Vol 1")
        # if google_result:
        #     book = google_result[0]
        #     print(f"   Real API result: {book.get('title')} -> Series: {book.get('series_name')}, Position: {book.get('series_position')}")
        
    finally:
        await google_client.close()
        await openlibrary_client.close()
    
    print(f"\n✅ Series extraction testing completed!")

if __name__ == "__main__":
    asyncio.run(test_series_extraction())