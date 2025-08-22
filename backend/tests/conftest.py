"""
Simple test configuration
"""
import os
import pytest


@pytest.fixture
def sample_csv_path():
    """Return path to the sample CSV file"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    return os.path.join(project_root, "sample_data", "HandyLib.csv")