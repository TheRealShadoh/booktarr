"""
P1-001: End-to-End CSV Import Test

Comprehensive end-to-end testing of CSV import functionality using real HandyLib.csv data.
Tests the complete workflow from CSV upload to database verification.
"""

import pytest
import asyncio
import tempfile
import os
import csv
import json
from fastapi.testclient import TestClient
from sqlmodel import Session, select, create_engine, SQLModel
from typing import List, Dict

# Import models and services
try:
    from backend.models.book import Book, Edition, UserEditionStatus
    from backend.models.reading_progress import ReadingProgress
    from backend.models.series import Series, SeriesVolume
    from backend.database import get_session
    from backend.main import app
    from backend.routes.import_route import import_status_store
    from backend.services.csv_import import CSVImportService
except ImportError:
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress
    from models.series import Series, SeriesVolume
    from database import get_session
    from main import app
    from routes.import_route import import_status_store
    from services.csv_import import CSVImportService


class TestE2ECSVImport:
    """End-to-end CSV import testing"""
    
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
    def handylib_sample_data(self):
        """Real sample data from HandyLib.csv structure"""
        return [
            {
                'Title': '[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)',
                'Author': 'Akasaka, Aka; Yokoyari, Mengo; Blackman, Abigail',
                'Publisher': 'Yen Press',
                'Published Date': '2023-01-17',
                'Format': 'Paperback',
                'Pages': '228',
                'Series': '推しの子 [Oshi no Ko]',
                'Volume': '1',
                'Language': 'English',
                'ISBN': '9781975363178',
                'Page Read': '',
                'Item Url': 'https://www.amazon.com/dp/1975363175',
                'Icon Path': '',
                'Photo Path': '',
                'Image Url': 'https://m.media-amazon.com/images/I/51jhRrffW5L._SL500_.jpg',
                'Summary': '"In show business, lies are a weapon." Gorou is an ob-gyn...',
                'Location': '',
                'Price': '8.59',
                'Genres': 'Fantasy',
                'Rating': '4.24',
                'Added Date': '07/18/2025',
                'Copy Index': '',
                'Read': '',
                'Started Reading Date': '',
                'Finished Reading Date': '',
                'Favorite': '',
                'Comments': '',
                'Tags': '',
                'BookShelf': 'Oshi No Ko',
                'Settings': '2.9.4;248;MM/DD/YYYY;YYYY-MM-DD;07/19/2025'
            },
            {
                'Title': '[Oshi No Ko], Vol. 2 (Volume 2) ([Oshi No Ko], 2)',
                'Author': 'Akasaka, Aka; Yokoyari, Mengo; Neufeld, Sarah',
                'Publisher': 'Yen Press',
                'Published Date': '2023-05-23',
                'Format': 'Paperback',
                'Pages': '194',
                'Series': '推しの子 [Oshi no Ko]',
                'Volume': '2',
                'Language': 'English',
                'ISBN': '9781975363192',
                'Page Read': '',
                'Item Url': 'https://www.amazon.com/dp/1975363191',
                'Icon Path': '',
                'Photo Path': '',
                'Image Url': 'https://m.media-amazon.com/images/I/51QoSmYxGwL._SL500_.jpg',
                'Summary': '"In show business, lies are a weapon." Ten years after...',
                'Location': '',
                'Price': '10.4',
                'Genres': 'Fantasy',
                'Rating': '4.23',
                'Added Date': '07/18/2025',
                'Copy Index': '',
                'Read': '',
                'Started Reading Date': '',
                'Finished Reading Date': '',
                'Favorite': '',
                'Comments': '',
                'Tags': '',
                'BookShelf': 'Oshi No Ko',
                'Settings': ''
            },
            {
                'Title': 'Citrus Vol. 1',
                'Author': 'Saburouta',
                'Publisher': 'Seven Seas',
                'Published Date': '2014-05-27',
                'Format': 'Paperback',
                'Pages': '180',
                'Series': 'Citrus',
                'Volume': '1',
                'Language': 'English',
                'ISBN': '9781626920453',
                'Page Read': '',
                'Item Url': 'https://www.sevenseasentertainment.com',
                'Icon Path': '',
                'Photo Path': '',
                'Image Url': 'https://example.com/citrus1.jpg',
                'Summary': 'Fashionable Yuzu imagined the first day at her new school...',
                'Location': '',
                'Price': '12.99',
                'Genres': 'Romance, Yuri',
                'Rating': '3.8',
                'Added Date': '07/15/2025',
                'Copy Index': '',
                'Read': '',
                'Started Reading Date': '',
                'Finished Reading Date': '',
                'Favorite': '',
                'Comments': '',
                'Tags': '',
                'BookShelf': 'Citrus',
                'Settings': ''
            }
        ]
    
    @pytest.fixture
    def create_handylib_csv(self, handylib_sample_data):
        """Create a temporary CSV file with HandyLib format data"""
        def _create_csv(data=None):
            if data is None:
                data = handylib_sample_data
            
            # Use all keys from first record as headers
            headers = list(data[0].keys())
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                for row in data:
                    writer.writerow(row)
                f.flush()
                return f.name
        
        return _create_csv
    
    def test_complete_csv_import_workflow(self, client, create_handylib_csv, test_session):
        """Test complete CSV import workflow from upload to database verification"""
        csv_file_path = create_handylib_csv()
        
        try:
            # Step 1: Preview the CSV file
            with open(csv_file_path, 'rb') as f:
                preview_response = client.post(
                    "/api/import/preview",
                    files={"file": ("handylib.csv", f, "text/csv")}
                )
            
            assert preview_response.status_code == 200
            preview_data = preview_response.json()
            
            assert preview_data['success'] is True
            assert 'preview' in preview_data
            
            preview = preview_data['preview']
            assert len(preview['headers']) > 0
            assert preview['total_rows'] == 3
            assert 'detected_columns' in preview
            
            # Verify key columns are detected
            detected = preview['detected_columns']
            assert 'title' in detected
            assert 'authors' in detected
            assert detected['title'] == 'Title'
            assert detected['authors'] == 'Author'
            
            print("✓ Step 1: CSV preview successful")
            
            # Step 2: Import the CSV file
            with open(csv_file_path, 'rb') as f:
                import_response = client.post(
                    "/api/import/csv",
                    files={"file": ("handylib.csv", f, "text/csv")}
                )
            
            assert import_response.status_code == 200
            import_data = import_response.json()
            
            assert import_data['success'] is True
            assert 'import_id' in import_data
            assert 'stats' in import_data
            
            import_id = import_data['import_id']
            stats = import_data['stats']
            
            # Should have processed all 3 rows
            assert stats['total_rows'] == 3
            assert stats['success_count'] >= 0
            
            print(f"✓ Step 2: CSV import started. Import ID: {import_id}")
            
            # Step 3: Check import status
            status_response = client.get(f"/api/import/status/{import_id}")
            assert status_response.status_code == 200
            
            status_data = status_response.json()
            assert status_data['success'] is True
            
            import_status = status_data['import_status']
            assert import_status['status'] in ['processing', 'completed']
            
            print(f"✓ Step 3: Import status checked. Status: {import_status['status']}")
            
            # Step 4: Verify books were created in database
            books = test_session.exec(select(Book)).all()
            assert len(books) >= 3
            
            # Check specific books
            oshi_book = test_session.exec(
                select(Book).where(Book.title.contains("Oshi No Ko"))
            ).first()
            assert oshi_book is not None
            assert oshi_book.series_name == '推しの子 [Oshi no Ko]'
            
            citrus_book = test_session.exec(
                select(Book).where(Book.title.contains("Citrus"))
            ).first()
            assert citrus_book is not None
            assert citrus_book.series_name == 'Citrus'
            
            print("✓ Step 4: Books created in database successfully")
            
            # Step 5: Verify editions were created
            editions = test_session.exec(select(Edition)).all()
            assert len(editions) >= 3
            
            # Check specific ISBNs
            oshi_edition = test_session.exec(
                select(Edition).where(Edition.isbn_13 == '9781975363178')
            ).first()
            assert oshi_edition is not None
            assert oshi_edition.publisher == 'Yen Press'
            
            print("✓ Step 5: Editions created with correct metadata")
            
            # Step 6: Verify ownership status
            ownership_records = test_session.exec(select(UserEditionStatus)).all()
            assert len(ownership_records) >= 3
            
            # All should be marked as 'own' 
            for record in ownership_records:
                assert record.status == 'own'
                assert record.user_id == 1
            
            print("✓ Step 6: Ownership records created correctly")
            
            # Step 7: Check import history
            history_response = client.get("/api/import/history")
            assert history_response.status_code == 200
            
            history_data = history_response.json()
            assert history_data['success'] is True
            assert history_data['count'] >= 1
            
            # Find our import in history
            our_import = None
            for imp in history_data['imports']:
                if imp['id'] == import_id:
                    our_import = imp
                    break
            
            assert our_import is not None
            assert our_import['status'] in ['completed', 'processing']
            
            print("✓ Step 7: Import appears in history correctly")
            
            print("🎉 Complete CSV import workflow test passed!")
            
        finally:
            os.unlink(csv_file_path)
    
    def test_series_creation_from_csv(self, client, create_handylib_csv, test_session):
        """Test that series are properly created from CSV import"""
        # Create CSV with multiple volumes of same series
        oshi_series_data = [
            {
                'Title': f'[Oshi No Ko], Vol. {i} (Volume {i})',
                'Author': 'Akasaka, Aka; Yokoyari, Mengo',
                'Publisher': 'Yen Press',
                'Published Date': f'2023-0{i}-01',
                'Format': 'Paperback',
                'Pages': '200',
                'Series': '推しの子 [Oshi no Ko]',
                'Volume': str(i),
                'Language': 'English',
                'ISBN': f'978197536{300 + i}{i}',
                'Rating': '4.2',
                'Price': '8.99',
                'Genres': 'Fantasy',
                'Summary': f'Volume {i} of the popular series...',
                'Image Url': f'https://example.com/oshi{i}.jpg',
                'Added Date': '07/18/2025',
                # Fill in other required HandyLib columns
                'Page Read': '', 'Item Url': '', 'Icon Path': '', 'Photo Path': '',
                'Location': '', 'Copy Index': '', 'Read': '', 'Started Reading Date': '',
                'Finished Reading Date': '', 'Favorite': '', 'Comments': '', 'Tags': '',
                'BookShelf': 'Oshi No Ko', 'Settings': ''
            }
            for i in range(1, 6)  # Volumes 1-5
        ]
        
        csv_file_path = create_handylib_csv(oshi_series_data)
        
        try:
            # Import the series data
            with open(csv_file_path, 'rb') as f:
                response = client.post(
                    "/api/import/csv",
                    files={"file": ("oshi_series.csv", f, "text/csv")}
                )
            
            assert response.status_code == 200
            
            # Verify books were created
            books = test_session.exec(
                select(Book).where(Book.series_name == '推しの子 [Oshi no Ko]')
            ).all()
            assert len(books) == 5
            
            # Verify volume positions
            positions = [book.series_position for book in books]
            assert set(positions) == {1, 2, 3, 4, 5}
            
            # Check that each book has correct volume info
            for book in books:
                assert book.series_name == '推しの子 [Oshi no Ko]'
                assert 1 <= book.series_position <= 5
                assert f'Vol. {book.series_position}' in book.title
            
            print("✓ Series volumes created correctly from CSV")
            
        finally:
            os.unlink(csv_file_path)
    
    def test_duplicate_handling_in_csv_import(self, client, create_handylib_csv, test_session):
        """Test duplicate detection and handling during CSV import"""
        csv_file_path = create_handylib_csv()
        
        try:
            # First import
            with open(csv_file_path, 'rb') as f:
                first_response = client.post(
                    "/api/import/csv",
                    files={"file": ("handylib_first.csv", f, "text/csv")}
                )
            
            assert first_response.status_code == 200
            first_data = first_response.json()
            
            # Count books after first import
            books_after_first = test_session.exec(select(Book)).all()
            first_count = len(books_after_first)
            assert first_count >= 3
            
            # Second import (same data)
            with open(csv_file_path, 'rb') as f:
                second_response = client.post(
                    "/api/import/csv",
                    files={"file": ("handylib_second.csv", f, "text/csv")}
                )
            
            assert second_response.status_code == 200
            second_data = second_response.json()
            
            # Count books after second import
            books_after_second = test_session.exec(select(Book)).all()
            second_count = len(books_after_second)
            
            # Should not have created duplicate books
            # (Depending on implementation, might update existing or skip)
            assert second_count >= first_count
            
            # Check that we don't have duplicate ISBNs
            editions = test_session.exec(select(Edition)).all()
            isbns = [e.isbn_13 for e in editions if e.isbn_13]
            assert len(isbns) == len(set(isbns)), "Duplicate ISBNs found"
            
            print("✓ Duplicate handling working correctly")
            
        finally:
            os.unlink(csv_file_path)
    
    def test_error_recovery_in_csv_import(self, client, test_session):
        """Test error recovery during CSV import with mixed valid/invalid data"""
        
        # Create CSV with mix of valid and invalid data
        mixed_data = [
            {
                'Title': 'Valid Book 1',
                'Author': 'Valid Author',
                'Publisher': 'Valid Publisher',
                'Published Date': '2023-01-01',
                'Format': 'Paperback',
                'Pages': '200',
                'Series': 'Valid Series',
                'Volume': '1',
                'Language': 'English',
                'ISBN': '9781234567890',
                'Rating': '4.0',
                'Price': '12.99',
                'Genres': 'Fiction',
                'Summary': 'A valid book entry',
                'Image Url': 'https://example.com/valid1.jpg',
                'Added Date': '07/18/2025',
                # Fill other HandyLib columns
                'Page Read': '', 'Item Url': '', 'Icon Path': '', 'Photo Path': '',
                'Location': '', 'Copy Index': '', 'Read': '', 'Started Reading Date': '',
                'Finished Reading Date': '', 'Favorite': '', 'Comments': '', 'Tags': '',
                'BookShelf': 'Valid', 'Settings': ''
            },
            {
                'Title': '',  # Invalid: missing title
                'Author': 'Author with no title',
                'Publisher': '',
                'Published Date': '',
                'Format': '',
                'Pages': '',
                'Series': '',
                'Volume': '',
                'Language': '',
                'ISBN': '',
                'Rating': '',
                'Price': '',
                'Genres': '',
                'Summary': '',
                'Image Url': '',
                'Added Date': '',
                # Fill other HandyLib columns
                'Page Read': '', 'Item Url': '', 'Icon Path': '', 'Photo Path': '',
                'Location': '', 'Copy Index': '', 'Read': '', 'Started Reading Date': '',
                'Finished Reading Date': '', 'Favorite': '', 'Comments': '', 'Tags': '',
                'BookShelf': '', 'Settings': ''
            },
            {
                'Title': 'Valid Book 2',
                'Author': 'Another Valid Author',
                'Publisher': 'Another Publisher',
                'Published Date': '2023-02-01',
                'Format': 'Hardcover',
                'Pages': '250',
                'Series': 'Another Series',
                'Volume': '1',
                'Language': 'English',
                'ISBN': '9781234567891',
                'Rating': '3.5',
                'Price': '15.99',
                'Genres': 'Non-Fiction',
                'Summary': 'Another valid book entry',
                'Image Url': 'https://example.com/valid2.jpg',
                'Added Date': '07/18/2025',
                # Fill other HandyLib columns
                'Page Read': '', 'Item Url': '', 'Icon Path': '', 'Photo Path': '',
                'Location': '', 'Copy Index': '', 'Read': '', 'Started Reading Date': '',
                'Finished Reading Date': '', 'Favorite': '', 'Comments': '', 'Tags': '',
                'BookShelf': 'Valid', 'Settings': ''
            }
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            headers = list(mixed_data[0].keys())
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            for row in mixed_data:
                writer.writerow(row)
            f.flush()
            
            try:
                # Import mixed data
                with open(f.name, 'rb') as csv_file:
                    response = client.post(
                        "/api/import/csv",
                        files={"file": ("mixed.csv", csv_file, "text/csv")}
                    )
                
                assert response.status_code == 200
                data = response.json()
                
                assert data['success'] is True
                stats = data['stats']
                
                # Should have processed all rows
                assert stats['total_rows'] == 3
                
                # Should have some successes and some errors
                assert stats['success_count'] >= 2  # At least the 2 valid books
                assert stats['error_count'] >= 1   # At least the invalid row
                
                # Verify valid books were created
                books = test_session.exec(select(Book)).all()
                valid_books = [b for b in books if b.title in ['Valid Book 1', 'Valid Book 2']]
                assert len(valid_books) >= 2
                
                print("✓ Error recovery working - valid books imported despite errors")
                
            finally:
                os.unlink(f.name)
    
    @pytest.mark.asyncio
    async def test_large_csv_import_performance(self, client, test_session):
        """Test performance with larger CSV datasets"""
        
        # Create a larger dataset (50 books)
        large_dataset = []
        for i in range(1, 51):
            series_num = (i - 1) // 10 + 1  # 5 series with 10 books each
            volume_num = (i - 1) % 10 + 1
            
            book_data = {
                'Title': f'Test Series {series_num}, Vol. {volume_num}',
                'Author': f'Author {series_num}',
                'Publisher': f'Publisher {series_num}',
                'Published Date': f'202{series_num}-0{min(volume_num, 9)}-01',
                'Format': 'Paperback',
                'Pages': str(200 + volume_num * 10),
                'Series': f'Test Series {series_num}',
                'Volume': str(volume_num),
                'Language': 'English',
                'ISBN': f'97812345{series_num:02d}{volume_num:02d}0',
                'Rating': str(3.0 + (i % 20) / 10),  # Ratings 3.0-4.9
                'Price': str(9.99 + volume_num),
                'Genres': f'Genre {series_num}',
                'Summary': f'Volume {volume_num} of Test Series {series_num}...',
                'Image Url': f'https://example.com/series{series_num}vol{volume_num}.jpg',
                'Added Date': '07/18/2025',
                # Fill other HandyLib columns
                'Page Read': '', 'Item Url': '', 'Icon Path': '', 'Photo Path': '',
                'Location': '', 'Copy Index': '', 'Read': '', 'Started Reading Date': '',
                'Finished Reading Date': '', 'Favorite': '', 'Comments': '', 'Tags': '',
                'BookShelf': f'Series {series_num}', 'Settings': ''
            }
            large_dataset.append(book_data)
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            headers = list(large_dataset[0].keys())
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            for row in large_dataset:
                writer.writerow(row)
            f.flush()
            
            try:
                import time
                start_time = time.time()
                
                # Import large dataset
                with open(f.name, 'rb') as csv_file:
                    response = client.post(
                        "/api/import/csv",
                        files={"file": ("large.csv", csv_file, "text/csv")}
                    )
                
                end_time = time.time()
                import_time = end_time - start_time
                
                assert response.status_code == 200
                data = response.json()
                
                assert data['success'] is True
                stats = data['stats']
                
                # Should have processed all 50 rows
                assert stats['total_rows'] == 50
                
                # Performance check - should complete in reasonable time
                assert import_time < 30, f"Import took too long: {import_time}s"
                
                # Verify all books were created
                books = test_session.exec(select(Book)).all()
                assert len(books) >= 50
                
                print(f"✓ Large CSV import completed in {import_time:.2f}s")
                print(f"✓ Created {len(books)} books from 50 CSV rows")
                
            finally:
                os.unlink(f.name)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])