"""
P0-002: Real Data CSV Import Tests

Tests CSV import functionality using actual HandyLib.csv data.
This validates that the import system works with real-world data including:
- Complex series with multiple volumes
- Reading progress and ratings
- Complete metadata fields
- Special characters and formatting
"""

import pytest
import asyncio
import json
import os
import tempfile
import shutil
from sqlmodel import Session, select, create_engine, SQLModel
from fastapi.testclient import TestClient
from fastapi import UploadFile
from io import BytesIO
import csv

# Import models and services
from models.book import Book, Edition, UserEditionStatus
from models.reading_progress import ReadingProgress
from models.series import Series, SeriesVolume
from services.csv_import import CSVImportService


class TestCSVImportRealData:
    """Test CSV import functionality with real HandyLib.csv data"""
        def get_test_session():
            return test_session
        
        app.dependency_overrides[get_session] = get_test_session
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()
    
    @pytest.fixture
    def handylib_csv_path(self):
        """Get path to real HandyLib.csv file"""
        # Get the project root directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(current_dir))
        csv_path = os.path.join(project_root, "sample_data", "HandyLib.csv")
        
        if not os.path.exists(csv_path):
            pytest.skip(f"HandyLib.csv not found at {csv_path}")
        
        return csv_path
    
    @pytest.fixture
    def sample_handylib_data(self, handylib_csv_path):
        """Load sample data from HandyLib.csv (first 10 rows for testing)"""
        with open(handylib_csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = []
            for i, row in enumerate(reader):
                if i >= 10:  # Only take first 10 rows for testing
                    break
                rows.append(row)
        return rows
    
    def test_csv_structure_validation(self, handylib_csv_path):
        """Test that HandyLib.csv has expected structure"""
        with open(handylib_csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            
        # Expected core fields from HandyLib export
        expected_fields = [
            'Title', 'Author', 'Publisher', 'Published Date', 'Format', 
            'Pages', 'Series', 'Volume', 'Language', 'ISBN', 'Rating',
            'Added Date', 'Read', 'Started Reading Date', 'Finished Reading Date',
            'Summary', 'Genres', 'Price', 'Image Url'
        ]
        
        for field in expected_fields:
            assert field in headers, f"Expected field '{field}' not found in CSV headers"
        
        print(f"✓ CSV has all expected fields. Total fields: {len(headers)}")
    
    def test_sample_data_parsing(self, sample_handylib_data):
        """Test parsing of sample HandyLib data"""
        assert len(sample_handylib_data) > 0, "No sample data loaded"
        
        # Check first row (Oshi No Ko Vol. 1)
        first_book = sample_handylib_data[0]
        assert 'Oshi No Ko' in first_book['Title']
        assert first_book['Series'] == '推しの子 [Oshi no Ko]'
        assert first_book['Volume'] == '1'
        assert first_book['ISBN'] == '9781975363178'
        assert 'Akasaka, Aka' in first_book['Author']
        assert first_book['Rating'] == '4.24'
        
        print(f"✓ Sample data parsing successful. First book: {first_book['Title']}")
    
    @pytest.mark.asyncio
    async def test_csv_import_service_with_real_data(self, test_session, sample_handylib_data):
        """Test CSVImportService with real HandyLib data"""
        import_service = CSVImportService()
        
        # Create a temporary CSV file with sample data
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as temp_file:
            if sample_handylib_data:
                # Write headers
                headers = list(sample_handylib_data[0].keys())
                writer = csv.DictWriter(temp_file, fieldnames=headers)
                writer.writeheader()
                
                # Write sample data (first 3 books to keep test fast)
                for row in sample_handylib_data[:3]:
                    writer.writerow(row)
                
                temp_file.flush()
                
                # Test import
                try:
                    result = await import_service.import_handylib_csv(
                        csv_file_path=temp_file.name,
                        session=test_session,
                        skip_duplicates=True,
                        enrich_metadata=False  # Skip enrichment for test speed
                    )
                    
                    assert result['success'] is True
                    assert result['imported_count'] == 3
                    assert result['skipped_count'] == 0
                    
                    # Verify books were created
                    books = test_session.exec(select(Book)).all()
                    assert len(books) == 3
                    
                    # Check first book details
                    oshi_book = test_session.exec(
                        select(Book).where(Book.title.contains("Oshi No Ko"))
                    ).first()
                    assert oshi_book is not None
                    assert oshi_book.series_name == '推しの子 [Oshi no Ko]'
                    assert oshi_book.series_position == 1
                    
                    # Check that editions were created
                    editions = test_session.exec(select(Edition)).all()
                    assert len(editions) == 3
                    
                    # Check that ISBN was stored correctly
                    isbn_edition = test_session.exec(
                        select(Edition).where(Edition.isbn_13 == '9781975363178')
                    ).first()
                    assert isbn_edition is not None
                    
                    print(f"✓ Successfully imported {result['imported_count']} books from real data")
                    
                finally:
                    # Clean up temp file
                    os.unlink(temp_file.name)
    
    @pytest.mark.asyncio
    async def test_series_detection_with_real_data(self, test_session, sample_handylib_data):
        """Test that series are properly detected and created from real data"""
        import_service = CSVImportService()
        
        # Filter sample data for Oshi No Ko series only
        oshi_books = [book for book in sample_handylib_data if 'Oshi No Ko' in book['Title']]
        assert len(oshi_books) >= 3, "Need at least 3 Oshi No Ko volumes for series test"
        
        # Create temp CSV with Oshi No Ko volumes
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as temp_file:
            headers = list(oshi_books[0].keys())
            writer = csv.DictWriter(temp_file, fieldnames=headers)
            writer.writeheader()
            
            for book in oshi_books[:5]:  # Take first 5 volumes
                writer.writerow(book)
            
            temp_file.flush()
            
            try:
                # Import the series
                result = await import_service.import_handylib_csv(
                    csv_file_path=temp_file.name,
                    session=test_session,
                    skip_duplicates=True,
                    enrich_metadata=False
                )
                
                assert result['success'] is True
                
                # Verify series was created
                series = test_session.exec(
                    select(Series).where(Series.name == '推しの子 [Oshi no Ko]')
                ).first()
                assert series is not None
                assert series.total_volumes >= 5
                
                # Verify series volumes were created
                volumes = test_session.exec(
                    select(SeriesVolume).where(SeriesVolume.series_id == series.id)
                ).all()
                assert len(volumes) >= 5
                
                # Check volume ordering
                volume_positions = [v.position for v in volumes]
                assert 1 in volume_positions
                assert 2 in volume_positions
                assert max(volume_positions) >= 5
                
                print(f"✓ Series detection successful: {series.name} with {len(volumes)} volumes")
                
            finally:
                os.unlink(temp_file.name)
    
    @pytest.mark.asyncio 
    async def test_reading_progress_import(self, test_session, sample_handylib_data):
        """Test that reading progress is imported from real data"""
        import_service = CSVImportService()
        
        # Find books with reading data
        books_with_progress = []
        for book in sample_handylib_data:
            if book.get('Rating') and float(book['Rating']) > 0:
                books_with_progress.append(book)
        
        if not books_with_progress:
            pytest.skip("No books with reading progress in sample data")
        
        # Create temp CSV
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as temp_file:
            headers = list(books_with_progress[0].keys())
            writer = csv.DictWriter(temp_file, fieldnames=headers)
            writer.writeheader()
            
            for book in books_with_progress[:3]:
                writer.writerow(book)
            
            temp_file.flush()
            
            try:
                result = await import_service.import_handylib_csv(
                    csv_file_path=temp_file.name,
                    session=test_session,
                    skip_duplicates=True,
                    enrich_metadata=False
                )
                
                assert result['success'] is True
                
                # Check that reading progress was created
                progress_records = test_session.exec(select(ReadingProgress)).all()
                assert len(progress_records) > 0
                
                # Check rating was stored correctly
                rated_progress = [p for p in progress_records if p.rating is not None]
                assert len(rated_progress) > 0
                
                # Verify rating values are within expected range
                for progress in rated_progress:
                    assert 1 <= progress.rating <= 5
                
                print(f"✓ Reading progress import successful: {len(progress_records)} progress records")
                
            finally:
                os.unlink(temp_file.name)
    
    def test_duplicate_detection(self, test_session, sample_handylib_data):
        """Test that duplicate books are properly detected and handled"""
        # This would test the skip_duplicates functionality
        # Implementation depends on the duplicate detection strategy
        pass
    
    @pytest.mark.asyncio
    async def test_api_endpoint_with_real_data(self, client, handylib_csv_path):
        """Test the API endpoint with real HandyLib.csv file"""
        
        # Read a small sample of the file for API testing
        sample_lines = []
        with open(handylib_csv_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            sample_lines = lines[:11]  # Header + first 10 data rows
        
        # Create a temporary file with sample data
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as temp_file:
            temp_file.writelines(sample_lines)
            temp_file.flush()
            
            try:
                # Test the import endpoint
                with open(temp_file.name, 'rb') as f:
                    response = client.post(
                        "/api/import/csv",
                        files={"file": ("handylib_sample.csv", f, "text/csv")}
                    )
                
                assert response.status_code == 200
                data = response.json()
                assert data['success'] is True
                assert 'import_id' in data
                
                # Check import status
                import_id = data['import_id']
                status_response = client.get(f"/api/import/status/{import_id}")
                assert status_response.status_code == 200
                
                status_data = status_response.json()
                assert status_data['success'] is True
                assert status_data['import_status']['status'] in ['processing', 'completed']
                
                print(f"✓ API endpoint test successful. Import ID: {import_id}")
                
            finally:
                os.unlink(temp_file.name)
    
    def test_error_handling_with_malformed_data(self, test_session):
        """Test error handling with malformed CSV data"""
        import_service = CSVImportService()
        
        # Create CSV with missing required fields
        malformed_data = [
            ['Title', 'Author'],  # Missing other required fields
            ['Test Book', ''],     # Missing author
            ['', 'Test Author'],   # Missing title
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as temp_file:
            writer = csv.writer(temp_file)
            for row in malformed_data:
                writer.writerow(row)
            temp_file.flush()
            
            try:
                # This should handle errors gracefully
                # Implementation depends on error handling strategy
                pass
            finally:
                os.unlink(temp_file.name)
    
    def test_large_dataset_performance(self):
        """Test performance with larger dataset (optional - runs if full CSV available)"""
        # This could test importing larger chunks of data
        # Useful for performance regression testing
        pass


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])