#!/usr/bin/env python3
"""
Script to populate Series table from existing books with series information
"""
import json
from database import get_session
from models import Book, Series, SeriesVolume
from sqlmodel import select
from datetime import date
from collections import defaultdict

def populate_series_from_books():
    """Create Series and SeriesVolume records from existing books"""
    
    with get_session() as session:
        # Get all books with series information
        books_with_series = session.exec(select(Book).where(Book.series_name.is_not(None))).all()
        
        # Group books by series
        series_books = defaultdict(list)
        for book in books_with_series:
            series_books[book.series_name].append(book)
        
        print(f"Found {len(series_books)} unique series from {len(books_with_series)} books")
        
        # Create series records
        for series_name, books in series_books.items():
            print(f"\nProcessing series: {series_name}")
            print(f"  Books in series: {len(books)}")
            
            # Check if series already exists
            existing_series = session.exec(select(Series).where(Series.name == series_name)).first()
            
            if existing_series:
                print(f"  Series already exists: {existing_series.id}")
                series = existing_series
            else:
                # Get author from first book
                first_book = books[0]
                authors = json.loads(first_book.authors) if first_book.authors else []
                author = authors[0] if authors else None
                
                # Create series record
                series = Series(
                    name=series_name,
                    author=author,
                    total_books=len(books),
                    status="unknown",
                    created_date=date.today(),
                    last_updated=date.today()
                )
                session.add(series)
                session.commit()
                session.refresh(series)
                print(f"  Created series: {series.id}")
            
            # Create volume records for each book
            volumes_created = 0
            for book in books:
                # Check if volume already exists
                existing_volume = session.exec(
                    select(SeriesVolume).where(
                        SeriesVolume.series_id == series.id,
                        SeriesVolume.position == (book.series_position or 999)
                    )
                ).first()
                
                if not existing_volume:
                    # Get edition details if available
                    isbn_13 = None
                    isbn_10 = None
                    publisher = None
                    release_date = None
                    cover_url = None
                    
                    if book.editions:
                        first_edition = book.editions[0]
                        isbn_13 = first_edition.isbn_13
                        isbn_10 = first_edition.isbn_10
                        publisher = first_edition.publisher
                        release_date = first_edition.release_date
                        cover_url = first_edition.cover_url
                    
                    volume = SeriesVolume(
                        series_id=series.id,
                        position=book.series_position or 999,
                        title=book.title,
                        isbn_13=isbn_13,
                        isbn_10=isbn_10,
                        publisher=publisher,
                        published_date=release_date,
                        cover_url=cover_url,
                        status="owned",  # These are owned books
                        user_id=1
                    )
                    session.add(volume)
                    volumes_created += 1
            
            if volumes_created > 0:
                session.commit()
                print(f"  Created {volumes_created} volume records")
            else:
                print(f"  All volumes already exist")
        
        print(f"\nSeries population completed!")
        
        # Show summary
        total_series = session.exec(select(Series)).all()
        total_volumes = session.exec(select(SeriesVolume)).all()
        print(f"Total series in database: {len(total_series)}")
        print(f"Total volumes in database: {len(total_volumes)}")

if __name__ == "__main__":
    populate_series_from_books()