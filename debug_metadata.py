#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database import init_db, get_db_session
from backend.services.series_metadata import SeriesMetadataService

async def test_metadata_fetch():
    """Test metadata fetching for Bleach series"""
    
    print("Starting metadata fetch test...")
    
    # Initialize database
    init_db()
    
    # Test the metadata service directly
    metadata_service = SeriesMetadataService()
    
    try:
        print("Testing Bleach metadata fetch...")
        
        # Test with session parameter (simulate CSV import behavior)
        with get_db_session() as session:
            print("Fetching Bleach metadata with session...")
            result = await metadata_service.fetch_and_update_series(
                series_name="Bleach", 
                author="Kubo, Tite", 
                force_external=True,  # Force external lookup
                session=session
            )
            
            print(f"Metadata fetch result: {result}")
            
            # Verify the series was updated
            from sqlmodel import select
            from backend.models import Series
            
            stmt = select(Series).where(Series.name == "Bleach")
            bleach_series = session.exec(stmt).first()
            
            if bleach_series:
                print(f"Bleach series in database: total_books={bleach_series.total_books}, status={bleach_series.status}")
            else:
                print("Bleach series not found in database")
                
    except Exception as e:
        print(f"Error during metadata fetch: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await metadata_service.close()

if __name__ == "__main__":
    asyncio.run(test_metadata_fetch())