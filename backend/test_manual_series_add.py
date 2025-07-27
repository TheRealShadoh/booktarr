#!/usr/bin/env python3
"""
Test script to add a book with manual series information
"""
import requests
import json

def test_manual_book_add_with_series():
    """Test adding a book with manual series information"""
    
    print(f"🧪 Testing manual book addition with series information...")
    
    # Add a Harry Potter book with manual series info
    book_data = {
        "title": "Harry Potter and the Prisoner of Azkaban",
        "authors": ["J.K. Rowling"],
        "series": "Harry Potter",
        "series_position": 3,
        "isbn13": "9780439136365",
        "publisher": "Scholastic",
        "published_date": "1999-09-08",
        "description": "Harry Potter's third year at Hogwarts."
    }
    
    # Make the API call to manual add endpoint
    response = requests.post(
        "http://localhost:8000/api/books/add",
        json=book_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"📊 Response Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Success: {result.get('message', 'Unknown message')}")
        print(f"📚 Book ID: {result.get('book_id')}")
        print(f"📄 Edition ID: {result.get('edition_id')}")
        
        # Check if series was created by checking the book
        if result.get('book_id'):
            book_response = requests.get(f"http://localhost:8000/api/books/{result['book_id']}")
            if book_response.status_code == 200:
                book_info = book_response.json()
                series_name = book_info.get('series')
                print(f"📖 Book series: {series_name}")
                
                if series_name:
                    # Check if series exists
                    series_response = requests.get(f"http://localhost:8000/api/series/{series_name}")
                    if series_response.status_code == 200:
                        series_data = series_response.json()
                        print(f"✅ Series '{series_name}' found!")
                        print(f"📈 Series stats: {series_data.get('stats', {})}")
                    else:
                        print(f"❌ Series '{series_name}' not found (Status: {series_response.status_code})")
    else:
        print(f"❌ Failed: {response.status_code}")
        try:
            error_data = response.json()
            print(f"Error: {error_data.get('detail', 'Unknown error')}")
        except:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    test_manual_book_add_with_series()