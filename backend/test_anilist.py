#!/usr/bin/env python3
"""Test AniList API integration"""
import asyncio
from clients.anilist import AniListClient

async def test_anilist():
    client = AniListClient()
    
    # Test search for Bleach
    print("Searching for Bleach manga...")
    result = await client.search_manga_series("Bleach")
    
    if result:
        print(f"Found: {result['name']}")
        print(f"Author: {result['author']}")
        print(f"Total volumes: {result['total_volumes']}")
        print(f"Status: {result['status']}")
        print(f"Description: {result['description'][:200]}..." if result['description'] else "No description")
        
        # Test getting volumes
        if result['total_volumes'] > 0:
            print(f"\nGenerating {result['total_volumes']} volumes...")
            volumes = await client.get_manga_volumes(result['name'], result['total_volumes'])
            print(f"Generated {len(volumes)} volumes")
            
            # Show first and last few volumes
            for vol in volumes[:3]:
                print(f"  Vol {vol['position']}: {vol['title']}")
            print("  ...")
            for vol in volumes[-3:]:
                print(f"  Vol {vol['position']}: {vol['title']}")
    else:
        print("No results found")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(test_anilist())