#!/usr/bin/env python3
"""
Debug script to test API connectivity
"""
import sys
import os
import asyncio
import httpx

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_api_connectivity():
    """Test basic API connectivity"""
    print("Testing API connectivity...")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        # Test Google Books API
        print("1. Testing Google Books API:")
        try:
            response = await client.get(
                "https://www.googleapis.com/books/v1/volumes",
                params={"q": "Harry Potter", "maxResults": 5}
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                total_items = data.get('totalItems', 0)
                print(f"   Total items found: {total_items}")
                
                if total_items > 0:
                    print("   First few results:")
                    for i, item in enumerate(data.get('items', [])[:3], 1):
                        volume_info = item.get('volumeInfo', {})
                        title = volume_info.get('title', 'No Title')
                        authors = volume_info.get('authors', [])
                        print(f"     {i}. {title}")
                        if authors:
                            print(f"        Authors: {', '.join(authors)}")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"   Connection error: {str(e)}")
        
        print()
        
        # Test OpenLibrary API
        print("2. Testing OpenLibrary API:")
        try:
            response = await client.get(
                "https://openlibrary.org/search.json",
                params={"title": "Harry Potter", "limit": 5}
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                num_found = data.get('numFound', 0)
                print(f"   Number found: {num_found}")
                
                if num_found > 0:
                    print("   First few results:")
                    for i, doc in enumerate(data.get('docs', [])[:3], 1):
                        title = doc.get('title', 'No Title')
                        authors = doc.get('author_name', [])
                        print(f"     {i}. {title}")
                        if authors:
                            print(f"        Authors: {', '.join(authors)}")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"   Connection error: {str(e)}")
        
        print()
        
        # Test with different query
        print("3. Testing OpenLibrary with author query:")
        try:
            response = await client.get(
                "https://openlibrary.org/search.json",
                params={"author": "J.K. Rowling", "limit": 10}
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                num_found = data.get('numFound', 0)
                print(f"   Number found: {num_found}")
                
                if num_found > 0:
                    print("   Harry Potter books found:")
                    harry_potter_count = 0
                    for doc in data.get('docs', []):
                        title = doc.get('title', '')
                        if 'harry potter' in title.lower():
                            harry_potter_count += 1
                            print(f"     - {title}")
                    print(f"   Total Harry Potter books: {harry_potter_count}")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"   Connection error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_api_connectivity())