#!/usr/bin/env python3
"""
Test script to verify that adding a book creates the series properly
"""
import requests
import json

def test_book_add_with_series():
    """Test adding a book that should create a series"""
    
    # Test with a known book that has series information
    # Let's try a Harry Potter book
    test_isbn = "9780439708180"  # Harry Potter and the Sorcerer's Stone
    
    print(f"🧪 Testing book addition with series creation...")
    print(f"📖 Adding ISBN: {test_isbn}")
    
    # Make the API call
    response = requests.post(
        "http://localhost:8000/api/library/add",
        json={
            "isbn": test_isbn,
            "source": "test"
        },
        headers={"Content-Type": "application/json"}
    )
    
    print(f"📊 Response Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Success: {result.get('message', 'Unknown message')}")
        print(f"📚 Book data: {json.dumps(result.get('book', {}), indent=2)}")
        
        # Check if series was created
        book_info = result.get('book', {})
        series_name = book_info.get('series')
        
        if series_name:
            print(f"\n🔍 Checking if series '{series_name}' was created...")
            
            # Check series endpoint
            series_response = requests.get(f"http://localhost:8000/api/series/{series_name}")
            
            if series_response.status_code == 200:
                series_data = series_response.json()
                print(f"✅ Series found!")
                print(f"📈 Series stats: {series_data.get('stats', {})}")
                print(f"📋 Total volumes: {len(series_data.get('volumes', []))}")
            else:
                print(f"❌ Series not found (Status: {series_response.status_code})")
        else:
            print("ℹ️  No series information in book data")
    
    else:
        print(f"❌ Failed: {response.status_code}")
        try:
            error_data = response.json()
            print(f"Error: {error_data.get('detail', 'Unknown error')}")
        except:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    test_book_add_with_series()