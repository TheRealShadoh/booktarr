#!/usr/bin/env python3
"""
Test fetching complete Bleach series information from Google Books API
"""
import sys
sys.path.insert(0, '.')
import asyncio
import json
from services.series_metadata import SeriesMetadataService

async def test_bleach_complete_series():
    print("🧪 Testing complete Bleach series fetch from Google Books...")
    
    metadata_service = SeriesMetadataService()
    
    try:
        # Test different search approaches for Bleach
        print("\n📚 Searching for Bleach manga series...")
        
        # Direct Google Books API test
        google_client = metadata_service.google_client
        
        # Try different search queries
        queries = [
            "Bleach manga volume",
            "Bleach Tite Kubo volume",
            "subject:Bleach inauthor:Kubo",
            "Bleach manga series"
        ]
        
        all_volumes = []
        
        for query in queries:
            print(f"\n🔍 Query: {query}")
            try:
                results = await google_client.search_by_title(query)
                print(f"   Found {len(results)} results")
                
                for book in results[:5]:  # Show first 5 results
                    title = book.get('title', 'No title')
                    volume_num = metadata_service._extract_series_position(title, 'Bleach')
                    print(f"   - {title} (Volume: {volume_num})")
                    
                    if volume_num:
                        all_volumes.append((volume_num, title))
                        
            except Exception as e:
                print(f"   Error: {e}")
        
        # Show unique volumes found
        unique_volumes = {}
        for vol_num, title in all_volumes:
            if vol_num not in unique_volumes:
                unique_volumes[vol_num] = title
        
        print(f"\n📊 Found {len(unique_volumes)} unique Bleach volumes:")
        for vol_num in sorted(unique_volumes.keys()):
            print(f"   Volume {vol_num}: {unique_volumes[vol_num]}")
        
        print(f"\n💡 Bleach actually has {len(unique_volumes)} volumes, not just the 4 you own!")
        
    finally:
        await metadata_service.close()

if __name__ == "__main__":
    asyncio.run(test_bleach_complete_series())