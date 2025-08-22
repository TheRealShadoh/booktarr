"""
Simple test configuration without model imports
"""
import os
import sys
import pytest

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)


@pytest.fixture
def sample_csv_path():
    """Return path to the sample CSV file"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    return os.path.join(project_root, "sample_data", "HandyLib.csv")