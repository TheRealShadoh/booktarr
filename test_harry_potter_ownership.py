#!/usr/bin/env python3
"""
Test script to demonstrate Harry Potter ownership tracking
"""
import sys
import os
import asyncio
from unittest.mock import patch
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.services.ownership import OwnershipService
from backend.models import Book, Edition, UserEditionStatus
from backend.database import init_db, get_session

async def test_harry_potter_ownership():
    """Test Harry Potter ownership tracking"""
    print("Testing Harry Potter ownership tracking...")
    
    # Initialize database
    init_db()
    
    # Create some Harry Potter books and editions in the database
    with get_session() as session:
        # Create Harry Potter books
        hp1 = Book(
            title="Harry Potter and the Philosopher's Stone",
            authors=json.dumps(["J.K. Rowling"]),
            series_name="Harry Potter",
            series_position=1,
            google_books_id="wrOQLV6xB-wC"
        )
        
        hp2 = Book(
            title="Harry Potter and the Chamber of Secrets",
            authors=json.dumps(["J.K. Rowling"]),
            series_name="Harry Potter",
            series_position=2,
            google_books_id="5iTebBW-w7QC"
        )
        
        hp3 = Book(
            title="Harry Potter and the Prisoner of Azkaban",
            authors=json.dumps(["J.K. Rowling"]),
            series_name="Harry Potter",
            series_position=3,
            google_books_id="lbukygAACAAJ"
        )
        
        session.add_all([hp1, hp2, hp3])
        session.commit()
        session.refresh(hp1)
        session.refresh(hp2)
        session.refresh(hp3)
        
        # Create editions
        hp1_hardcover = Edition(
            book_id=hp1.id,
            isbn_13="9780439708180",
            isbn_10="0439708184",
            book_format="hardcover",
            publisher="Scholastic",
            source="google_books"
        )
        
        hp1_paperback = Edition(
            book_id=hp1.id,
            isbn_13="9780439362139",
            isbn_10="0439362139",
            book_format="paperback",
            publisher="Scholastic",
            source="google_books"
        )
        
        hp2_hardcover = Edition(
            book_id=hp2.id,
            isbn_13="9780439064873",
            isbn_10="0439064872",
            book_format="hardcover",
            publisher="Arthur A. Levine Books",
            source="google_books"
        )
        
        hp3_hardcover = Edition(
            book_id=hp3.id,
            isbn_13="9780439136358",
            isbn_10="0439136350",
            book_format="hardcover",
            publisher="Arthur A. Levine Books",
            source="google_books"
        )
        
        session.add_all([hp1_hardcover, hp1_paperback, hp2_hardcover, hp3_hardcover])
        session.commit()
        session.refresh(hp1_hardcover)
        session.refresh(hp1_paperback)
        session.refresh(hp2_hardcover)
        session.refresh(hp3_hardcover)
        
        # Test ownership service
        ownership_service = OwnershipService()
        
        print("\n1. Setting ownership status...")
        print("-" * 40)
        
        # Mark some books as owned
        result1 = ownership_service.mark_edition_status(
            user_id=1, 
            edition_id=hp1_hardcover.id, 
            status="own", 
            notes="Hardcover first edition"
        )
        print(f"Marked HP1 hardcover as owned: {result1['success']}")
        
        result2 = ownership_service.mark_edition_status(
            user_id=1, 
            edition_id=hp2_hardcover.id, 
            status="own"
        )
        print(f"Marked HP2 hardcover as owned: {result2['success']}")
        
        # Mark one as wanted
        result3 = ownership_service.mark_edition_status(
            user_id=1, 
            edition_id=hp1_paperback.id, 
            status="want", 
            notes="Want paperback for travel"
        )
        print(f"Marked HP1 paperback as wanted: {result3['success']}")
        
        print("\n2. Getting owned books...")
        print("-" * 40)
        
        owned_books = ownership_service.get_owned_books(user_id=1)
        print(f"Owned books: {len(owned_books)}")
        for book in owned_books:
            print(f"  - {book['book_title']} ({book['format']})")
            if book['notes']:
                print(f"    Notes: {book['notes']}")
        
        print("\n3. Getting wanted books...")
        print("-" * 40)
        
        wanted_books = ownership_service.get_wanted_books(user_id=1)
        print(f"Wanted books: {len(wanted_books)}")
        for book in wanted_books:
            print(f"  - {book['book_title']} ({book['format']})")
            if book['notes']:
                print(f"    Notes: {book['notes']}")
        
        print("\n4. Getting missing books from Harry Potter series...")
        print("-" * 40)
        
        missing_books = ownership_service.get_missing_from_series(user_id=1, series_name="Harry Potter")
        print(f"Missing from Harry Potter series: {len(missing_books)}")
        for book in missing_books:
            print(f"  - {book['book_title']} ({book['format']}) - Status: {book['status']}")

if __name__ == "__main__":
    asyncio.run(test_harry_potter_ownership())