"""
P0-004: Import API Endpoints Verification Tests

Tests that the existing import API endpoints work correctly:
- /api/import/csv - CSV upload and import
- /api/import/status/{import_id} - Import status tracking  
- /api/import/preview - CSV preview functionality
- /api/import/history - Import job history
"""

import pytest
import asyncio
import tempfile
import os
import csv
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, SQLModel
from io import BytesIO

# Import models and services
try:
    from backend.models.book import Book, Edition, UserEditionStatus
    from backend.models.reading_progress import ReadingProgress
    from backend.database import get_session
    from backend.main import app
    from backend.routes.import_route import import_status_store
except ImportError:
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress
    from database import get_session
    from main import app
    from routes.import_route import import_status_store


class TestImportAPIEndpoints:
    """Test import API endpoints functionality"""
    
    @pytest.fixture
    def test_db(self):
        """Create a test database"""
        engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(engine)
        return engine
    
    @pytest.fixture
    def test_session(self, test_db):
        """Create a test session"""
        with Session(test_db) as session:
            yield session
    
    @pytest.fixture
    def client(self, test_session):
        """Create a test client with dependency override"""
        def get_test_session():
            return test_session
        
        app.dependency_overrides[get_session] = get_test_session
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()
    
    @pytest.fixture
    def sample_csv_data(self):
        """Sample CSV data for testing"""
        return [
            ['Title', 'Author', 'Publisher', 'Published Date', 'Format', 'Pages', 'Series', 'Volume', 'Language', 'ISBN', 'Rating'],
            ['Test Book 1', 'Author One', 'Test Publisher', '2023-01-01', 'Paperback', '200', 'Test Series', '1', 'English', '9781234567890', '4.5'],
            ['Test Book 2', 'Author Two', 'Test Publisher', '2023-02-01', 'Hardcover', '250', 'Test Series', '2', 'English', '9781234567891', '4.2'],
            ['Single Book', 'Author Three', 'Another Publisher', '2023-03-01', 'Paperback', '180', '', '', 'English', '9781234567892', '3.8']
        ]
    
    @pytest.fixture
    def create_csv_file(self, sample_csv_data):
        """Create a temporary CSV file with sample data"""
        def _create_csv(data=None):
            if data is None:
                data = sample_csv_data
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
                writer = csv.writer(f)
                for row in data:
                    writer.writerow(row)
                f.flush()
                return f.name
        
        return _create_csv
    
    def test_csv_preview_endpoint(self, client, create_csv_file):
        """Test CSV preview endpoint"""
        csv_file_path = create_csv_file()
        
        try:
            with open(csv_file_path, 'rb') as f:
                response = client.post(
                    "/api/import/preview",
                    files={"file": ("test.csv", f, "text/csv")}
                )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data['success'] is True
            assert 'preview' in data
            
            preview = data['preview']
            assert 'headers' in preview
            assert 'sample_rows' in preview
            assert 'total_rows' in preview
            assert 'detected_columns' in preview
            
            # Verify headers
            assert 'Title' in preview['headers']
            assert 'Author' in preview['headers']
            assert 'ISBN' in preview['headers']
            
            # Verify sample rows
            assert len(preview['sample_rows']) > 0
            assert preview['total_rows'] == 3  # 3 data rows
            
            # Verify column detection
            assert 'title' in preview['detected_columns']
            assert 'authors' in preview['detected_columns']
            
            print("✓ CSV preview endpoint working correctly")
            
        finally:
            os.unlink(csv_file_path)
    
    def test_csv_import_endpoint(self, client, create_csv_file):
        """Test CSV import endpoint"""
        csv_file_path = create_csv_file()
        
        try:
            with open(csv_file_path, 'rb') as f:
                response = client.post(
                    "/api/import/csv",
                    files={"file": ("test.csv", f, "text/csv")}
                )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data['success'] is True
            assert 'import_id' in data
            assert 'stats' in data
            
            # Verify import statistics
            stats = data['stats']
            assert 'total_rows' in stats
            assert 'success_count' in stats
            assert 'error_count' in stats
            
            import_id = data['import_id']
            assert import_id in import_status_store
            
            print(f"✓ CSV import endpoint working. Import ID: {import_id}")
            
        finally:
            os.unlink(csv_file_path)
    
    def test_import_status_endpoint(self, client, create_csv_file):
        """Test import status tracking endpoint"""
        csv_file_path = create_csv_file()
        
        try:
            # First, start an import
            with open(csv_file_path, 'rb') as f:
                import_response = client.post(
                    "/api/import/csv",
                    files={"file": ("test.csv", f, "text/csv")}
                )
            
            assert import_response.status_code == 200
            import_data = import_response.json()
            import_id = import_data['import_id']
            
            # Check import status
            status_response = client.get(f"/api/import/status/{import_id}")
            assert status_response.status_code == 200
            
            status_data = status_response.json()
            assert status_data['success'] is True
            assert 'import_status' in status_data
            
            import_status = status_data['import_status']
            assert import_status['id'] == import_id
            assert import_status['status'] in ['processing', 'completed', 'failed']
            assert 'progress' in import_status
            assert 'total_rows' in import_status
            assert 'processed_rows' in import_status
            
            print(f"✓ Import status endpoint working. Status: {import_status['status']}")
            
        finally:
            os.unlink(csv_file_path)
    
    def test_import_status_not_found(self, client):
        """Test import status endpoint with non-existent import ID"""
        response = client.get("/api/import/status/nonexistent-id")
        assert response.status_code == 404
        
        data = response.json()
        assert "Import job not found" in data['detail']
        
        print("✓ Import status endpoint handles missing IDs correctly")
    
    def test_import_history_endpoint(self, client, create_csv_file):
        """Test import history endpoint"""
        csv_file_path = create_csv_file()
        
        try:
            # Create a couple of imports
            for i in range(2):
                with open(csv_file_path, 'rb') as f:
                    client.post(
                        "/api/import/csv",
                        files={"file": (f"test{i}.csv", f, "text/csv")}
                    )
            
            # Get import history
            response = client.get("/api/import/history")
            assert response.status_code == 200
            
            data = response.json()
            assert data['success'] is True
            assert 'imports' in data
            assert 'count' in data
            
            # Should have at least 2 imports
            assert data['count'] >= 2
            assert len(data['imports']) >= 2
            
            # Check import record structure
            import_record = data['imports'][0]
            assert 'id' in import_record
            assert 'status' in import_record
            assert 'started_at' in import_record
            assert 'total_rows' in import_record
            
            print(f"✓ Import history endpoint working. Found {data['count']} imports")
            
        finally:
            os.unlink(csv_file_path)
    
    def test_csv_preview_only_mode(self, client, create_csv_file):
        """Test CSV import in preview-only mode"""
        csv_file_path = create_csv_file()
        
        try:
            with open(csv_file_path, 'rb') as f:
                response = client.post(
                    "/api/import/csv",
                    files={"file": ("test.csv", f, "text/csv")},
                    data={"preview_only": "true"}
                )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data['success'] is True
            assert 'preview' in data
            assert 'import_id' not in data  # Should not create import job in preview mode
            
            print("✓ Preview-only mode working correctly")
            
        finally:
            os.unlink(csv_file_path)
    
    def test_invalid_file_upload(self, client):
        """Test invalid file upload handling"""
        # Test with non-CSV file
        response = client.post(
            "/api/import/csv",
            files={"file": ("test.txt", BytesIO(b"not a csv file"), "text/plain")}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "File must be a CSV file" in data['detail']
        
        print("✓ Invalid file upload handled correctly")
    
    def test_empty_csv_handling(self, client):
        """Test handling of empty CSV files"""
        # Create empty CSV
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write("Title,Author\n")  # Headers only
            f.flush()
            
            try:
                with open(f.name, 'rb') as csv_file:
                    response = client.post(
                        "/api/import/csv",
                        files={"file": ("empty.csv", csv_file, "text/csv")}
                    )
                
                assert response.status_code == 200
                data = response.json()
                
                assert data['success'] is True
                assert data['stats']['total_rows'] == 0
                
                print("✓ Empty CSV file handled correctly")
                
            finally:
                os.unlink(f.name)
    
    def test_malformed_csv_handling(self, client):
        """Test handling of malformed CSV files"""
        # Create malformed CSV
        malformed_data = 'Title,Author\n"Unclosed quote,Author\nAnother"Book",Author2\n'
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(malformed_data)
            f.flush()
            
            try:
                with open(f.name, 'rb') as csv_file:
                    response = client.post(
                        "/api/import/csv",
                        files={"file": ("malformed.csv", csv_file, "text/csv")}
                    )
                
                # Should either handle gracefully or return proper error
                if response.status_code == 200:
                    data = response.json()
                    # If successful, check for error reporting in stats
                    if 'stats' in data:
                        assert 'error_count' in data['stats']
                elif response.status_code == 500:
                    # If failed, should return proper error message
                    data = response.json()
                    assert 'detail' in data
                
                print("✓ Malformed CSV handled appropriately")
                
            finally:
                os.unlink(f.name)
    
    def test_column_detection_accuracy(self, client, sample_csv_data):
        """Test accuracy of column detection"""
        # Create CSV with various column formats
        varied_headers = [
            ['Book Title', 'Book Author', 'ISBN Number', 'Series Name', 'Volume Number', 'Publication Date', 'Page Count'],
            ['Test Book', 'Test Author', '9781234567890', 'Test Series', '1', '2023-01-01', '200']
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            writer = csv.writer(f)
            for row in varied_headers:
                writer.writerow(row)
            f.flush()
            
            try:
                with open(f.name, 'rb') as csv_file:
                    response = client.post(
                        "/api/import/preview",
                        files={"file": ("varied.csv", csv_file, "text/csv")}
                    )
                
                assert response.status_code == 200
                data = response.json()
                
                detected = data['preview']['detected_columns']
                
                # Should detect title variations
                assert 'title' in detected
                assert detected['title'] == 'Book Title'
                
                # Should detect author variations
                assert 'authors' in detected
                assert detected['authors'] == 'Book Author'
                
                # Should detect ISBN variations
                assert 'isbn' in detected
                assert detected['isbn'] == 'ISBN Number'
                
                print("✓ Column detection working accurately")
                
            finally:
                os.unlink(f.name)
    
    def test_concurrent_imports(self, client, create_csv_file):
        """Test handling of concurrent import requests"""
        csv_file_path = create_csv_file()
        
        try:
            import_ids = []
            
            # Start multiple imports simultaneously
            for i in range(3):
                with open(csv_file_path, 'rb') as f:
                    response = client.post(
                        "/api/import/csv",
                        files={"file": (f"concurrent{i}.csv", f, "text/csv")}
                    )
                
                assert response.status_code == 200
                data = response.json()
                import_ids.append(data['import_id'])
            
            # Verify all imports are tracked
            assert len(set(import_ids)) == 3  # All should have unique IDs
            
            for import_id in import_ids:
                status_response = client.get(f"/api/import/status/{import_id}")
                assert status_response.status_code == 200
            
            print("✓ Concurrent imports handled correctly")
            
        finally:
            os.unlink(csv_file_path)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])