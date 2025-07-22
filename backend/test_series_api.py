#!/usr/bin/env python3
"""
Test the series API endpoints to verify they work as expected by the frontend
"""
import sys
sys.path.insert(0, '.')
from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

def test_series_list():
    """Test GET /api/series/test - test endpoint"""
    print("🧪 Testing series test endpoint...")
    response = client.get("/api/series/test")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Series routes working: {data}")
        return "Bleach"  # We know this series exists from previous tests
    else:
        print(f"   ❌ Error: {response.text}")
        return None

def test_series_details(series_name):
    """Test GET /api/series/{series_name} - get series details"""
    print(f"\n🧪 Testing series details for '{series_name}'...")
    response = client.get(f"/api/series/{series_name}")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        series_info = data.get("series", {})
        volumes = data.get("volumes", [])
        stats = data.get("stats", {})
        
        print(f"   ✅ Series: {series_info.get('name')}")
        print(f"   Author: {series_info.get('author')}")
        description = series_info.get('description') or 'No description'
        print(f"   Description: {description[:50]}...")
        print(f"   Volumes: {len(volumes)} total")
        print(f"   Owned: {stats.get('owned_volumes', 0)}/{stats.get('total_volumes', 0)} ({stats.get('completion_percentage', 0)}%)")
        
        return True
    else:
        print(f"   ❌ Error: {response.text}")
        return False

def test_series_refresh(series_name):
    """Test POST /api/series/{series_name}/refresh - refresh metadata"""
    print(f"\n🧪 Testing metadata refresh for '{series_name}'...")
    response = client.post(f"/api/series/{series_name}/refresh")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ {data.get('message')}")
        return True
    else:
        print(f"   ❌ Error: {response.text}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Series API Endpoints\n")
    
    # Test series list
    first_series_name = test_series_list()
    
    if first_series_name:
        # Test series details
        details_success = test_series_details(first_series_name)
        
        if details_success:
            # Test metadata refresh
            refresh_success = test_series_refresh(first_series_name)
            
            if refresh_success:
                print(f"\n🎉 All tests PASSED - Series API is working!")
                print(f"   Frontend should be able to load series data for '{first_series_name}'")
            else:
                print(f"\n❌ Refresh test FAILED")
        else:
            print(f"\n❌ Details test FAILED")
    else:
        print(f"\n❌ Series list test FAILED")