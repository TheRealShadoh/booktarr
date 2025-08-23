#!/usr/bin/env python3

import asyncio
import httpx
import tempfile
import os

async def test_api_import():
    """Test the import API directly like the Playwright test does"""
    
    print("Testing API import process...")
    
    # Create the same CSV content as the Playwright test uses
    csv_content = '''Title,Author,Publisher,Published Date,Format,Pages,Series,Volume,Language,ISBN,Page Read,Item Url,Icon Path,Photo Path,Image Url,Summary,Location,Price,Genres,Rating,Added Date,Copy Index,Read,Started Reading Date,Finished Reading Date,Favorite,Comments,Tags,BookShelf,Settings
"Bleach, Vol. 1","Kubo, Tite","VIZ Media LLC","2004-07-06","Paperback","192","Bleach","1","English","9781591164418","","","","","","","","9.99","Fantasy","4.26","07/18/2025","","","","","","","","Bleach",""
"Bleach, Vol. 2","Kubo, Tite","VIZ Media LLC","2004-07-06","Paperback","200","Bleach","2","English","9781591164425","","","","","","","","9.99","Fantasy","4.20","07/18/2025","","","","","","","","Bleach",""
'''
    
    # Write to a temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as temp_file:
        temp_file.write(csv_content)
        temp_file_path = temp_file.name
    
    try:
        async with httpx.AsyncClient() as client:
            # Step 1: Clear existing data (like the test does)
            print("Clearing existing data...")
            try:
                clear_response = await client.post('http://localhost:8001/api/settings/remove-all-data', 
                                                 json={"confirmation": "DELETE"})
                print(f"Clear response: {clear_response.status_code}")
            except Exception as e:
                print(f"Could not clear data: {e}")
            
            # Step 2: Import CSV using the same endpoint as the test
            print("Importing CSV via API...")
            with open(temp_file_path, 'rb') as file:
                import_response = await client.post('http://localhost:8001/api/books/import', files={
                    'file': ('test.csv', file, 'text/csv')
                }, data={
                    'format': 'handylib',
                    'field_mapping': '{}',
                    'skip_duplicates': 'true',
                    'enrich_metadata': 'true'
                })
            
            print(f"Import response status: {import_response.status_code}")
            if import_response.status_code == 200:
                import_result = import_response.json()
                print(f"Import completed: {import_result.get('imported', 0)} books imported, {len(import_result.get('errors', []))} errors")
            else:
                print(f"Import failed: {import_response.text}")
                return
            
            # Step 3: Wait for processing
            await asyncio.sleep(5)
            
            # Step 4: Check series data
            print("Checking series metadata via API...")
            series_response = await client.get('http://localhost:8001/api/series/')
            
            if series_response.status_code == 200:
                series_result = series_response.json()
                series_data = series_result.get('series', [])
                print(f"Found {len(series_data)} series")
                
                # Find Bleach series
                bleach_series = next((s for s in series_data if 'bleach' in s.get('name', '').lower()), None)
                if bleach_series:
                    print(f"Bleach series data: {bleach_series}")
                    print(f"Result: Bleach has total_books={bleach_series.get('total_books', 'unknown')}")
                else:
                    print("No Bleach series found in API response")
            else:
                print(f"Series API failed: {series_response.status_code} - {series_response.text}")
    
    finally:
        # Clean up
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    asyncio.run(test_api_import())