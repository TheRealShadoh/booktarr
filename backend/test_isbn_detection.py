#!/usr/bin/env python3
"""Test ISBN detection logic."""

def test_isbn_detection():
    query = "9781646093038"
    print(f"Testing query: {query}")
    print(f"Is digit after replace(-): {query.replace('-', '').isdigit()}")
    print(f"Length after replace(-): {len(query.replace('-', ''))}")
    print(f"Length in [10, 13]: {len(query.replace('-', '')) in [10, 13]}")
    
    # Test the exact condition from the search endpoint
    if query.replace("-", "").isdigit() and len(query.replace("-", "")) in [10, 13]:
        print("✅ This would be detected as ISBN search")
    else:
        print("❌ This would be detected as title search")

if __name__ == "__main__":
    test_isbn_detection()