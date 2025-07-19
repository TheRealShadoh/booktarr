#!/usr/bin/env python3
"""
Test script to search for Harry Potter books using real Google Books API
"""
import sys
import os
import asyncio
import httpx

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_real_google_books_search():
    """Test searching for Harry Potter books using real Google Books API"""
    print("Testing REAL Harry Potter search with Google Books API...")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        # Test different search strategies
        search_queries = [
            {"q": "Harry Potter", "maxResults": 40},
            {"q": "inauthor:J.K. Rowling", "maxResults": 40},
            {"q": "Harry Potter series", "maxResults": 20},
            {"q": "intitle:Harry Potter", "maxResults": 20}
        ]
        
        for query_params in search_queries:
            print(f"\nSearching with: {query_params}")
            print("-" * 50)
            
            try:
                response = await client.get(
                    "https://www.googleapis.com/books/v1/volumes",
                    params=query_params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    total_items = data.get('totalItems', 0)
                    items = data.get('items', [])
                    
                    print(f"Total items in database: {total_items}")
                    print(f"Items returned: {len(items)}")
                    print()
                    
                    # Analyze the results
                    harry_potter_books = []
                    other_books = []
                    
                    for item in items:
                        volume_info = item.get('volumeInfo', {})
                        title = volume_info.get('title', '')
                        authors = volume_info.get('authors', [])
                        
                        # Check if it's a main Harry Potter book
                        if any(phrase in title.lower() for phrase in [
                            "philosopher's stone", "sorcerer's stone",
                            "chamber of secrets",
                            "prisoner of azkaban",
                            "goblet of fire",
                            "order of the phoenix",
                            "half-blood prince",
                            "deathly hallows"
                        ]):
                            harry_potter_books.append({
                                'title': title,
                                'authors': authors,
                                'type': 'main_series'
                            })
                        elif 'harry potter' in title.lower():
                            other_books.append({
                                'title': title,
                                'authors': authors,
                                'type': 'related'
                            })
                        else:
                            other_books.append({
                                'title': title,
                                'authors': authors,
                                'type': 'other'
                            })
                    
                    # Display main Harry Potter books
                    if harry_potter_books:
                        print(f"MAIN HARRY POTTER BOOKS FOUND: {len(harry_potter_books)}")
                        for i, book in enumerate(harry_potter_books, 1):
                            print(f"  {i}. {book['title']}")
                            if book['authors']:
                                print(f"     Authors: {', '.join(book['authors'])}")
                        print()
                    
                    # Display other Harry Potter related books
                    hp_related = [b for b in other_books if b['type'] == 'related']
                    if hp_related:
                        print(f"OTHER HARRY POTTER BOOKS: {len(hp_related)}")
                        for i, book in enumerate(hp_related[:10], 1):  # Show first 10
                            print(f"  {i}. {book['title']}")
                            if book['authors']:
                                print(f"     Authors: {', '.join(book['authors'])}")
                        if len(hp_related) > 10:
                            print(f"  ... and {len(hp_related) - 10} more")
                        print()
                    
                    # Display other books by J.K. Rowling or related
                    other_jk = [b for b in other_books if b['type'] == 'other']
                    if other_jk:
                        print(f"OTHER BOOKS (by J.K. Rowling or related): {len(other_jk)}")
                        for i, book in enumerate(other_jk[:5], 1):  # Show first 5
                            print(f"  {i}. {book['title']}")
                            if book['authors']:
                                print(f"     Authors: {', '.join(book['authors'])}")
                        if len(other_jk) > 5:
                            print(f"  ... and {len(other_jk) - 5} more")
                        print()
                    
                else:
                    print(f"Error: {response.status_code} - {response.text}")
                    
            except Exception as e:
                print(f"Error: {str(e)}")
        
        # Now test specific ISBN searches for known Harry Potter books
        print("\nTesting specific ISBN searches:")
        print("-" * 50)
        
        known_isbns = [
            "9780439708180",  # Philosopher's Stone
            "9780439064873",  # Chamber of Secrets  
            "9780439136358",  # Prisoner of Azkaban
            "9780439139595",  # Goblet of Fire
            "9780439358064",  # Order of the Phoenix
            "9780439784542",  # Half-Blood Prince
            "9780545010221",  # Deathly Hallows
        ]
        
        found_books = []
        for isbn in known_isbns:
            try:
                response = await client.get(
                    "https://www.googleapis.com/books/v1/volumes",
                    params={"q": f"isbn:{isbn}", "maxResults": 1}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    items = data.get('items', [])
                    
                    if items:
                        volume_info = items[0].get('volumeInfo', {})
                        title = volume_info.get('title', '')
                        authors = volume_info.get('authors', [])
                        found_books.append({
                            'isbn': isbn,
                            'title': title,
                            'authors': authors
                        })
                        
            except Exception as e:
                print(f"Error searching ISBN {isbn}: {str(e)}")
        
        print(f"Found {len(found_books)} books by specific ISBN:")
        for book in found_books:
            print(f"  - {book['title']} (ISBN: {book['isbn']})")
            if book['authors']:
                print(f"    Authors: {', '.join(book['authors'])}")

if __name__ == "__main__":
    asyncio.run(test_real_google_books_search())