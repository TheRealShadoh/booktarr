#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database import init_db, get_db_session
from backend.services.csv_import import CSVImportService
from backend.models import Series
from sqlmodel import select

async def debug_csv_import():
    """Debug CSV import process to see if metadata is fetched properly"""
    
    print("Starting CSV import debug test...")
    
    # Initialize database
    init_db()
    
    # Check existing Bleach series
    with get_db_session() as session:
        existing_bleach = session.exec(select(Series).where(Series.name == "Bleach")).all()
        if existing_bleach:
            print(f"Found existing Bleach series: {[s.id for s in existing_bleach]}")
        else:
            print("No existing Bleach series found")
    
    # Create a CSV with just one Bleach book to trigger series creation
    csv_content = '''Title,Author,Publisher,Published Date,Format,Pages,Series,Volume,Language,ISBN,Page Read,Item Url,Icon Path,Photo Path,Image Url,Summary,Location,Price,Genres,Rating,Added Date,Copy Index,Read,Started Reading Date,Finished Reading Date,Favorite,Comments,Tags,BookShelf,Settings
"Bleach, Vol. 1","Kubo, Tite","VIZ Media LLC","2004-07-06","Paperback","192","Bleach","1","English","9781591164418","","","","","","","","9.99","Fantasy","4.26","07/18/2025","","","","","","","","Bleach",""
'''
    
    # Write the CSV content to a temporary file
    with open('debug_csv_import.csv', 'w', encoding='utf-8') as f:
        f.write(csv_content)
    
    try:
        print("=" * 60)
        print("STARTING CSV IMPORT")
        print("=" * 60)
        
        # Test the CSV import with debug output
        service = CSVImportService()
        result = await service.import_handylib_csv('debug_csv_import.csv', user_id=1)
        await service.close()
        
        print("=" * 60)
        print("IMPORT COMPLETED")
        print("=" * 60)
        print(f"Import result: {result['imported']} imported, {len(result['errors'])} errors")
        if result['errors']:
            print("Errors:", result['errors'])
        
        # Check the final state of the Bleach series
        print("=" * 60)
        print("FINAL SERIES STATE")
        print("=" * 60)
        
        with get_db_session() as session:
            bleach_series = session.exec(select(Series).where(Series.name == "Bleach")).first()
            if bleach_series:
                print(f"RESULT: Bleach series total_books={bleach_series.total_books}, status={bleach_series.status}")
            else:
                print("ERROR: No Bleach series found after import")
        
    except Exception as e:
        print(f"Error during import: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up
        if os.path.exists('debug_csv_import.csv'):
            os.remove('debug_csv_import.csv')

if __name__ == "__main__":
    asyncio.run(debug_csv_import())