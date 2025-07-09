import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "Booktarr" in response.json()["message"]


def test_books_endpoint():
    """Test books endpoint returns valid structure"""
    response = client.get("/api/books")
    assert response.status_code == 200
    data = response.json()
    assert "series" in data
    assert "total_books" in data
    assert "total_series" in data
    assert "last_sync" in data