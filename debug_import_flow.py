#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database import init_db, get_db_session
from backend.services.csv_import import CSVImportService

async def test_import_flow():
    """Test CSV import flow with detailed debugging"""
    
    print("Starting import flow debugging...")
    
    # Initialize database
    init_db()
    
    # Create a CSV with just the first few entries to see the flow
    csv_content = '''Title,Author,Publisher,Published Date,Format,Pages,Series,Volume,Language,ISBN,Page Read,Item Url,Icon Path,Photo Path,Image Url,Summary,Location,Price,Genres,Rating,Added Date,Copy Index,Read,Started Reading Date,Finished Reading Date,Favorite,Comments,Tags,BookShelf,Settings
"[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)","Akasaka, Aka; Yokoyari, Mengo; Yokoyari, Mengo; Blackman, Abigail","Yen Press","2023-01-17","Paperback","228","推しの子 [Oshi no Ko]","1","English","9781975363178","","https://www.amazon.com/dp/1975363175?tag=handylibrarya-20&linkCode=osi&th=1&psc=1","","","https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg","In show business, lies are a weapon.","","9.99","Manga","4.5","2023-01-17","","","","","","","","",""
"Bleach, Vol. 1","Kubo, Tite","VIZ Media LLC","2004-07-06","Paperback","192","Bleach","1","English","9781591164418","","https://www.amazon.com/dp/1591164419?tag=handylibrarya-20&linkCode=osi&th=1&psc=1","","","https://m.media-amazon.com/images/I/516WLV8lFCL._SL500_.jpg","Part-time student, full-time Soul Reaper, Ichigo is one of the chosen few guardians of the afterlife.","","9.99","Fantasy","4.26","07/18/2025","","","","","","","","Bleach",""
"Bleach, Vol. 2","Kubo, Tite","VIZ Media LLC","2004-07-06","Paperback","190","Bleach","2","English","9781591164425","","https://www.amazon.com/dp/1591164427?tag=handylibrarya-20&linkCode=osi&th=1&psc=1","","","https://m.media-amazon.com/images/I/51P9J8J8JL._SL500_.jpg","Ichigo Kurosaki never asked for the ability to see ghosts...","","9.99","Fantasy","4.20","07/18/2025","","","","","","","","Bleach",""
'''
    
    # Write the CSV content to a temporary file
    with open('debug_import_flow.csv', 'w', encoding='utf-8') as f:
        f.write(csv_content)
    
    try:
        # Test the CSV import with detailed debugging
        service = CSVImportService()
        print("=" * 60)
        print("STARTING CSV IMPORT WITH DEBUG OUTPUT")
        print("=" * 60)
        
        result = await service.import_handylib_csv('debug_import_flow.csv', user_id=1)
        
        print("=" * 60)
        print("IMPORT COMPLETED")
        print("=" * 60)
        print(f"Import result: {result['imported']} imported, {len(result['errors'])} errors")
        if result['errors']:
            print("Errors:", result['errors'])
        
        await service.close()
        
        # Check series data after import
        print("=" * 60)
        print("CHECKING SERIES DATA AFTER IMPORT")
        print("=" * 60)
        
        with get_db_session() as session:
            from sqlmodel import select
            from backend.models import Series
            
            stmt = select(Series)
            all_series = session.exec(stmt).all()
            
            for series in all_series:
                print(f"Series: {series.name}")
                print(f"  - total_books: {series.total_books}")
                print(f"  - status: {series.status}")
                print(f"  - author: {series.author}")
                print()
        
    except Exception as e:
        print(f"Error during import: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up
        if os.path.exists('debug_import_flow.csv'):
            os.remove('debug_import_flow.csv')

if __name__ == "__main__":
    asyncio.run(test_import_flow())