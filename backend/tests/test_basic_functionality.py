"""
Basic functionality tests without SQLAlchemy complications
"""
import pytest
import os
import csv


def test_sample_csv_exists(sample_csv_path):
    """Test that the sample CSV file exists and is readable"""
    assert os.path.exists(sample_csv_path), f"Sample CSV not found at {sample_csv_path}"
    
    # Read a few lines to verify it's valid CSV
    with open(sample_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        assert 'Title' in header
        assert 'Author' in header
        
        # Read first few data rows
        rows = []
        for i, row in enumerate(reader):
            if i >= 5:  # Just read first 5 rows
                break
            rows.append(row)
        
        assert len(rows) > 0, "CSV file should have data rows"
        print(f"Sample CSV has {len(header)} columns and at least {len(rows)} data rows")


def test_python_imports():
    """Test that we can import basic Python modules"""
    import json
    import datetime
    import pathlib
    
    assert json is not None
    assert datetime is not None
    assert pathlib is not None


def test_fastapi_imports():
    """Test FastAPI and related imports"""
    import fastapi
    import uvicorn
    import pydantic
    
    assert fastapi is not None
    assert uvicorn is not None
    assert pydantic is not None


def test_sqlmodel_basic():
    """Test basic SQLModel functionality without table creation"""
    import sqlmodel
    from sqlmodel import SQLModel, Field
    
    # Test basic model definition (not table=True)
    class TestModel(SQLModel):
        id: int = Field(primary_key=True)
        name: str
    
    # Test model instantiation
    instance = TestModel(id=1, name="test")
    assert instance.id == 1
    assert instance.name == "test"