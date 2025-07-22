#!/usr/bin/env python3
"""
Simple test to verify series functionality works
"""
from database import get_session
from models import Series, SeriesVolume
from sqlmodel import select

def test_series_query():
    """Test that we can query series data"""
    with get_session() as session:
        # Test getting Bleach series
        series = session.exec(select(Series).where(Series.name == "Bleach")).first()
        if series:
            print(f"✅ Found series: {series.name}")
            print(f"   ID: {series.id}")
            print(f"   Author: {series.author}")
            print(f"   Total books: {series.total_books}")
            
            # Get volumes
            volumes = session.exec(select(SeriesVolume).where(SeriesVolume.series_id == series.id)).all()
            print(f"   Volumes: {len(volumes)}")
            
            # Create response format
            volume_data = []
            for volume in sorted(volumes, key=lambda x: x.position):
                volume_data.append({
                    "position": volume.position,
                    "title": volume.title,
                    "isbn_13": volume.isbn_13,
                    "status": volume.status,
                    "cover_url": volume.cover_url
                })
            
            response = {
                "series": {
                    "id": series.id,
                    "name": series.name,
                    "author": series.author,
                    "total_books": series.total_books
                },
                "volumes": volume_data,
                "stats": {
                    "total_volumes": len(volume_data),
                    "owned_volumes": len([v for v in volume_data if v["status"] == "owned"]),
                    "completion_percentage": 100
                }
            }
            
            print("✅ Successfully created response format")
            print(f"   Response has {len(response['volumes'])} volumes")
            return response
        else:
            print("❌ Bleach series not found")
            return None

if __name__ == "__main__":
    result = test_series_query()
    if result:
        print("\n🎉 Series query test PASSED")
    else:
        print("\n❌ Series query test FAILED")