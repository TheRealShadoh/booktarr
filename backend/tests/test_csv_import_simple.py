"""
Simple CSV import test with real data
"""
import pytest
import os
import csv
from sqlmodel import Session

from models.book import Book, Edition
from services.csv_import import CSVImportService


class TestCSVImportSimple:
    """Simple test for CSV import functionality"""
    
    def test_sample_csv_exists(self, sample_csv_path):
        """Test that the sample CSV file exists"""
        assert os.path.exists(sample_csv_path), f"Sample CSV not found at {sample_csv_path}"
        
        # Read a few lines to verify it's valid CSV
        with open(sample_csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)
            assert 'Title' in header
            assert 'Author' in header
            
    def test_csv_import_service_creation(self, test_session):
        """Test that CSV import service can be created"""
        service = CSVImportService()
        assert service is not None
        
    def test_book_creation(self, test_session):
        """Test basic book creation in test database"""
        book = Book(
            title="Test Book",
            authors=["Test Author"],
            isbn_13="9781234567890"
        )
        test_session.add(book)
        test_session.commit()
        
        # Verify book was created
        found_book = test_session.get(Book, book.id)
        assert found_book is not None
        assert found_book.title == "Test Book"
        assert found_book.authors == ["Test Author"]