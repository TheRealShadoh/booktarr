#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database import init_db, get_db_session
from backend.services.csv_import import CSVImportService

async def test_small_import():
    """Test CSV import with just Bleach books to see metadata fetch logs"""
    
    print("Starting small CSV import test...")
    
    # Initialize database
    init_db()
    
    # Create a small CSV with just Bleach books
    csv_content = '''Title,Author,Publisher,Published Date,Format,Pages,Series,Volume,Language,ISBN,Page Read,Item Url,Icon Path,Photo Path,Image Url,Summary,Location,Price,Genres,Rating,Added Date,Copy Index,Read,Started Reading Date,Finished Reading Date,Favorite,Comments,Tags,BookShelf,Settings
Bleach, Vol. 1,Kubo; Tite,VIZ Media LLC,2011-07-05,paperback,216,Bleach,1,English,9781421506050,216,,,,"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1388544374l/487811.jpg","When Ichigo Kurosaki meets Rukia Kuchiki...",Bookshelf,9.99,Adventure|Action|Manga,4.0,2022-01-01,1,FALSE,,,FALSE,,Tag1|Tag2,Bookshelf1,
Bleach, Vol. 2,Kubo; Tite,VIZ Media LLC,2011-07-05,paperback,200,Bleach,2,English,9781421506067,200,,,,"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1336631829l/487813.jpg","Ichigo Kurosaki's battles continue...",Bookshelf,9.99,Adventure|Action|Manga,4.0,2022-01-02,1,FALSE,,,FALSE,,Tag1|Tag2,Bookshelf1,
Bleach, Vol. 3,Kubo; Tite,VIZ Media LLC,2011-07-05,paperback,208,Bleach,3,English,9781421506074,208,,,,"https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1356009892l/487814.jpg","The story of Ichigo continues...",Bookshelf,9.99,Adventure|Action|Manga,4.0,2022-01-03,1,FALSE,,,FALSE,,Tag1|Tag2,Bookshelf1,
'''
    
    # Write the CSV content to a temporary file
    with open('test_bleach_small.csv', 'w', encoding='utf-8') as f:
        f.write(csv_content)
    
    try:
        # Test the CSV import
        service = CSVImportService()
        print("Testing CSV import with Bleach books...")
        
        result = await service.import_handylib_csv('test_bleach_small.csv', user_id=1)
        
        print(f"Import result: {result['imported']} imported, {len(result['errors'])} errors")
        if result['errors']:
            print("Errors:", result['errors'])
            
        # Check the series data in database
        with get_db_session() as session:
            from sqlmodel import select
            from backend.models import Series
            
            stmt = select(Series).where(Series.name == "Bleach")
            bleach_series = session.exec(stmt).first()
            
            if bleach_series:
                print(f"RESULT: Bleach series total_books={bleach_series.total_books}, status={bleach_series.status}")
            else:
                print("ERROR: Bleach series not found in database")
        
        await service.close()
        
    except Exception as e:
        print(f"Error during import: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up
        if os.path.exists('test_bleach_small.csv'):
            os.remove('test_bleach_small.csv')

if __name__ == "__main__":
    asyncio.run(test_small_import())