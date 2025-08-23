#!/usr/bin/env python3

import asyncio
import tempfile
import os
import sys
import logging

# Set up logging to see all debug messages
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from services.csv_import import CSVImportService
from database import init_db

async def test_direct_csv_import():
    print("=== TESTING DIRECT CSV IMPORT ===")
    
    # Initialize database
    init_db()
    
    # Create a temporary CSV file with Bleach data
    csv_content = '''"Title","Author","Publisher","Published Date","Format","Pages","Series","Volume","Language","ISBN","Page Read","Item Url","Icon Path","Photo Path","Image Url","Summary","Location","Price","Genres","Rating","Added Date","Copy Index","Read","Started Reading Date","Finished Reading Date","Favorite","Comments","Tags","BookShelf","Settings"
"Bleach Vol. 1","Tite Kubo","VIZ Media LLC","2004-06-01","paperback","192","Bleach","1","English","9781591164241","192","","","","https://images-na.ssl-images-amazon.com/images/P/1591164249.01.L.jpg","Ichigo Kurosaki has always been able to see ghosts...","","9.99","Action; Adventure; Supernatural","4.5","2020-01-01","1","true","2020-01-01","2020-01-02","true","Great start to series","manga; shonen","Main","{}"
"Bleach Vol. 2","Tite Kubo","VIZ Media LLC","2004-08-01","paperback","192","Bleach","2","English","9781591164265","192","","","","https://images-na.ssl-images-amazon.com/images/P/1591164265.01.L.jpg","Ichigo continues his journey...","","9.99","Action; Adventure; Supernatural","4.0","2020-01-03","1","true","2020-01-03","2020-01-04","false","Good continuation","manga; shonen","Main","{}"'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
        f.write(csv_content)
        temp_csv_path = f.name
    
    try:
        print(f"Created temporary CSV: {temp_csv_path}")
        
        # Create CSV import service
        csv_service = CSVImportService()
        
        print("Starting CSV import...")
        
        # Import the CSV directly
        result = await csv_service.import_handylib_csv(temp_csv_path, user_id=1)
        
        print("=== IMPORT RESULTS ===")
        print(f"Imported: {result['imported']}")
        print(f"Updated: {result['updated']}")
        print(f"Errors: {len(result['errors'])}")
        
        if result['errors']:
            print("Errors:")
            for error in result['errors']:
                print(f"  - {error}")
        
        if result['books']:
            print("Books:")
            for book in result['books']:
                print(f"  - {book['title']} by {book['authors']}")
                if book['series_name']:
                    print(f"    Series: {book['series_name']} #{book['series_position']}")
        
        # Clean up
        await csv_service.close()
        
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_csv_path)
        except:
            pass

if __name__ == "__main__":
    asyncio.run(test_direct_csv_import())