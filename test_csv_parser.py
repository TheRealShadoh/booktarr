#!/usr/bin/env python3
"""
Test script to demonstrate the CSV parser with the HandyLib export
"""
import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Set up environment variables that the backend might need
os.environ['DATABASE_URL'] = 'sqlite:///./data/booktarr.db'

from services.csv_import import CSVImportService


async def test_csv_parser():
    """Test the CSV parser with the HandyLib file"""
    csv_file_path = "sample_data/HandyLib.csv"
    
    if not os.path.exists(csv_file_path):
        print(f"Error: CSV file not found at {csv_file_path}")
        return
    
    print(f"Testing CSV parser with file: {csv_file_path}")
    print("=" * 60)
    
    import_service = CSVImportService()
    
    try:
        # Import the CSV
        result = await import_service.import_handylib_csv(csv_file_path, user_id=1)
        
        print(f"Import Results:")
        print(f"  - Books imported: {result['imported']}")
        print(f"  - Books updated: {result['updated']}")
        print(f"  - Errors: {len(result['errors'])}")
        print()
        
        if result['errors']:
            print("Errors encountered:")
            for error in result['errors'][:5]:  # Show first 5 errors
                print(f"  - Row {error.get('row', 'N/A')}: {error['error']}")
                print(f"    Title: {error.get('title', 'Unknown')}")
            if len(result['errors']) > 5:
                print(f"  ... and {len(result['errors']) - 5} more errors")
            print()
        
        if result['books']:
            print("Successfully imported books:")
            for book in result['books'][:10]:  # Show first 10 books
                authors = ", ".join(book['authors']) if book['authors'] else "Unknown"
                series_info = f" (Series: {book['series_name']}" + (f" #{book['series_position']}" if book['series_position'] else "") + ")" if book['series_name'] else ""
                print(f"  - {book['title']} by {authors}{series_info}")
            
            if len(result['books']) > 10:
                print(f"  ... and {len(result['books']) - 10} more books")
        
        print()
        print("CSV parsing completed successfully!")
        
    except Exception as e:
        print(f"Error during CSV import: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await import_service.close()


async def demo_parse_first_few_rows():
    """Demo parsing just the first few rows to show the structure"""
    csv_file_path = "sample_data/HandyLib.csv"
    
    if not os.path.exists(csv_file_path):
        print(f"Error: CSV file not found at {csv_file_path}")
        return
    
    print("Demonstrating parsing of first 3 rows:")
    print("=" * 60)
    
    import csv
    import_service = CSVImportService()
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            for i, row in enumerate(csv_reader):
                if i >= 3:  # Only process first 3 rows
                    break
                
                print(f"\nRow {i + 2}:")  # +2 because row 1 is headers
                print(f"  Original CSV data:")
                print(f"    Title: {row.get('Title', '')}")
                print(f"    Author: {row.get('Author', '')}")
                print(f"    Series: {row.get('Series', '')}")
                print(f"    Volume: {row.get('Volume', '')}")
                print(f"    ISBN: {row.get('ISBN', '')}")
                print(f"    Format: {row.get('Format', '')}")
                print(f"    Price: {row.get('Price', '')}")
                
                # Parse the row
                parsed_data = await import_service._parse_handylib_row(row)
                
                print(f"  Parsed data:")
                if parsed_data:
                    print(f"    Title: {parsed_data['title']}")
                    print(f"    Authors: {parsed_data['authors']}")
                    print(f"    Series: {parsed_data['series_name']} #{parsed_data['series_position']}" if parsed_data['series_name'] else "    Series: None")
                    print(f"    ISBN-13: {parsed_data['isbn_13']}")
                    print(f"    Format: {parsed_data['format']}")
                    print(f"    Price: ${parsed_data['price']}" if parsed_data['price'] else "    Price: None")
                    print(f"    Status: {parsed_data['status']}")
                else:
                    print("    Failed to parse row")
    
    finally:
        await import_service.close()


if __name__ == "__main__":
    print("BookTarr CSV Parser Test")
    print("=" * 40)
    
    # First show how the parsing works
    asyncio.run(demo_parse_first_few_rows())
    
    print("\n" + "=" * 60 + "\n")
    
    # Then do the full import
    asyncio.run(test_csv_parser())