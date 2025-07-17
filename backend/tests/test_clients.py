import pytest
from unittest.mock import AsyncMock, patch
from datetime import date
import httpx

from backend.clients import GoogleBooksClient, OpenLibraryClient


@pytest.fixture
def google_client():
    return GoogleBooksClient()


@pytest.fixture
def openlibrary_client():
    return OpenLibraryClient()


class TestGoogleBooksClient:
    
    @pytest.mark.asyncio
    async def test_search_by_isbn_success(self, google_client):
        mock_response = {
            "totalItems": 1,
            "items": [{
                "id": "test_google_id",
                "volumeInfo": {
                    "title": "Test Book",
                    "authors": ["Test Author"],
                    "publisher": "Test Publisher",
                    "publishedDate": "2023-01-01",
                    "pageCount": 300,
                    "categories": ["Fiction"],
                    "description": "A test book",
                    "industryIdentifiers": [
                        {"type": "ISBN_13", "identifier": "9781234567890"},
                        {"type": "ISBN_10", "identifier": "1234567890"}
                    ],
                    "imageLinks": {
                        "thumbnail": "https://example.com/cover.jpg"
                    },
                    "printType": "BOOK"
                },
                "saleInfo": {
                    "saleability": "FOR_SALE",
                    "retailPrice": {
                        "amount": 29.99,
                        "currencyCode": "USD"
                    }
                }
            }]
        }
        
        with patch.object(google_client.client, 'get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.json = AsyncMock(return_value=mock_response)
            mock_response_obj.raise_for_status = AsyncMock()
            mock_get.return_value = mock_response_obj
            
            result = await google_client.search_by_isbn("9781234567890")
            
            assert result is not None
            assert result["title"] == "Test Book"
            assert result["authors"] == ["Test Author"]
            assert result["isbn_13"] == "9781234567890"
            assert result["isbn_10"] == "1234567890"
            assert result["publisher"] == "Test Publisher"
            assert result["price"] == 29.99
            assert result["source"] == "google_books"
    
    @pytest.mark.asyncio
    async def test_search_by_isbn_not_found(self, google_client):
        mock_response = {
            "totalItems": 0,
            "items": []
        }
        
        with patch.object(google_client.client, 'get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.json = AsyncMock(return_value=mock_response)
            mock_response_obj.raise_for_status = AsyncMock()
            mock_get.return_value = mock_response_obj
            
            result = await google_client.search_by_isbn("9781234567890")
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_search_by_title(self, google_client):
        mock_response = {
            "totalItems": 1,
            "items": [{
                "id": "test_google_id",
                "volumeInfo": {
                    "title": "Test Book",
                    "authors": ["Test Author"],
                    "industryIdentifiers": [
                        {"type": "ISBN_13", "identifier": "9781234567890"}
                    ],
                    "printType": "BOOK"
                },
                "saleInfo": {
                    "saleability": "NOT_FOR_SALE"
                }
            }]
        }
        
        with patch.object(google_client.client, 'get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.json = AsyncMock(return_value=mock_response)
            mock_response_obj.raise_for_status = AsyncMock()
            mock_get.return_value = mock_response_obj
            
            result = await google_client.search_by_title("Test Book")
            
            assert len(result) == 1
            assert result[0]["title"] == "Test Book"
            assert result[0]["authors"] == ["Test Author"]
            assert result[0]["isbn_13"] == "9781234567890"
            assert result[0]["source"] == "google_books"
    
    @pytest.mark.asyncio
    async def test_search_by_author(self, google_client):
        mock_response = {
            "totalItems": 1,
            "items": [{
                "id": "test_google_id",
                "volumeInfo": {
                    "title": "Test Book",
                    "authors": ["Test Author"],
                    "industryIdentifiers": [
                        {"type": "ISBN_13", "identifier": "9781234567890"}
                    ],
                    "printType": "BOOK"
                },
                "saleInfo": {
                    "saleability": "NOT_FOR_SALE"
                }
            }]
        }
        
        with patch.object(google_client.client, 'get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.json = AsyncMock(return_value=mock_response)
            mock_response_obj.raise_for_status = AsyncMock()
            mock_get.return_value = mock_response_obj
            
            result = await google_client.search_by_author("Test Author")
            
            assert len(result) == 1
            assert result[0]["title"] == "Test Book"
            assert result[0]["authors"] == ["Test Author"]
    
    @pytest.mark.asyncio
    async def test_parse_volume_with_minimal_data(self, google_client):
        volume = {
            "id": "test_id",
            "volumeInfo": {
                "title": "Minimal Book"
            },
            "saleInfo": {
                "saleability": "NOT_FOR_SALE"
            }
        }
        
        result = google_client._parse_volume(volume)
        
        assert result["google_books_id"] == "test_id"
        assert result["title"] == "Minimal Book"
        assert result["authors"] == []
        assert result["isbn_10"] is None
        assert result["isbn_13"] is None
        assert result["price"] is None
        assert result["source"] == "google_books"
    
    @pytest.mark.asyncio
    async def test_parse_volume_with_date_formats(self, google_client):
        # Test different date formats
        test_cases = [
            ("2023", "2023-01-01"),
            ("2023-05", "2023-05-01"),
            ("2023-05-15", "2023-05-15")
        ]
        
        for input_date, expected_date in test_cases:
            volume = {
                "id": "test_id",
                "volumeInfo": {
                    "title": "Test Book",
                    "publishedDate": input_date
                },
                "saleInfo": {
                    "saleability": "NOT_FOR_SALE"
                }
            }
            
            result = google_client._parse_volume(volume)
            assert result["release_date"] == expected_date


class TestOpenLibraryClient:
    
    @pytest.mark.asyncio
    async def test_search_by_isbn_success(self, openlibrary_client):
        mock_book_data = {
            "key": "/books/OL1234567M",
            "title": "Test Book",
            "authors": [{"key": "/authors/OL1234567A"}],
            "publishers": ["Test Publisher"],
            "isbn_13": ["9781234567890"],
            "isbn_10": ["1234567890"],
            "number_of_pages": 300,
            "publish_date": "January 1, 2023",
            "covers": [12345],
            "physical_format": "Hardcover",
            "works": [{"key": "/works/OL1234567W"}]
        }
        
        mock_work_data = {
            "key": "/works/OL1234567W",
            "title": "Test Book",
            "description": "A test book description"
        }
        
        with patch.object(openlibrary_client.client, 'get') as mock_get:
            # Mock the book data response
            mock_response_obj = AsyncMock()
            mock_response_obj.status_code = 200
            mock_response_obj.json = AsyncMock(return_value=mock_book_data)
            mock_response_obj.raise_for_status = AsyncMock()
            mock_get.return_value = mock_response_obj
            
            result = await openlibrary_client.search_by_isbn("9781234567890")
            
            assert result is not None
            assert result["title"] == "Test Book"
            assert result["publisher"] == "Test Publisher"
            assert result["isbn_13"] == "9781234567890"
            assert result["isbn_10"] == "1234567890"
            assert result["page_count"] == 300
            assert result["format"] == "hardcover"
            assert result["source"] == "openlibrary"
            assert "https://covers.openlibrary.org/b/id/12345-M.jpg" in result["cover_url"]
    
    @pytest.mark.asyncio
    async def test_search_by_isbn_not_found(self, openlibrary_client):
        with patch.object(openlibrary_client.client, 'get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.status_code = 404
            mock_get.return_value = mock_response_obj
            
            result = await openlibrary_client.search_by_isbn("9781234567890")
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_search_by_title(self, openlibrary_client):
        mock_search_data = {
            "docs": [{
                "key": "/works/OL1234567W",
                "title": "Test Book",
                "author_name": ["Test Author"],
                "first_publish_year": 2023,
                "cover_i": 12345,
                "number_of_pages_median": 300,
                "publisher": ["Test Publisher"]
            }]
        }
        
        # Mock the search_by_isbn method to return None (forcing direct parsing)
        with patch.object(openlibrary_client, 'search_by_isbn', new_callable=AsyncMock, return_value=None):
            with patch.object(openlibrary_client.client, 'get') as mock_get:
                mock_response_obj = AsyncMock()
                mock_response_obj.json = AsyncMock(return_value=mock_search_data)
                mock_response_obj.raise_for_status = AsyncMock()
                mock_get.return_value = mock_response_obj
                
                result = await openlibrary_client.search_by_title("Test Book")
                
                assert len(result) == 1
                assert result[0]["title"] == "Test Book"
                assert result[0]["authors"] == ["Test Author"]
                assert result[0]["isbn_10"] is None
                assert result[0]["page_count"] == 300
                assert result[0]["source"] == "openlibrary"
    
    @pytest.mark.asyncio
    async def test_search_by_author(self, openlibrary_client):
        mock_search_data = {
            "docs": [{
                "key": "/works/OL1234567W",
                "title": "Test Book",
                "author_name": ["Test Author"],
                "first_publish_year": 2023
            }]
        }
        
        with patch.object(openlibrary_client.client, 'get') as mock_get:
            mock_response_obj = AsyncMock()
            mock_response_obj.json = AsyncMock(return_value=mock_search_data)
            mock_response_obj.raise_for_status = AsyncMock()
            mock_get.return_value = mock_response_obj
            
            result = await openlibrary_client.search_by_author("Test Author")
            
            assert len(result) == 1
            assert result[0]["title"] == "Test Book"
            assert result[0]["authors"] == ["Test Author"]
    
    @pytest.mark.asyncio
    async def test_parse_book_data_minimal(self, openlibrary_client):
        book_data = {
            "key": "/books/OL1234567M",
            "title": "Minimal Book"
        }
        
        result = openlibrary_client._parse_book_data(book_data)
        
        assert result["openlibrary_id"] == "/books/OL1234567M"
        assert result["title"] == "Minimal Book"
        assert result["authors"] == []
        assert result["publisher"] is None
        assert result["isbn_10"] is None
        assert result["isbn_13"] is None
        assert result["source"] == "openlibrary"
    
    @pytest.mark.asyncio
    async def test_parse_search_doc(self, openlibrary_client):
        doc = {
            "key": "/works/OL1234567W",
            "title": "Test Book",
            "author_name": ["Test Author"],
            "first_publish_year": 2023,
            "isbn": ["9781234567890"],
            "cover_i": 12345,
            "publisher": ["Test Publisher"]
        }
        
        result = openlibrary_client._parse_search_doc(doc)
        
        assert result["openlibrary_id"] == "/works/OL1234567W"
        assert result["title"] == "Test Book"
        assert result["authors"] == ["Test Author"]
        assert result["publisher"] == "Test Publisher"
        assert result["isbn_10"] == "9781234567890"
        assert result["release_date"] == "2023-01-01"
        assert result["source"] == "openlibrary"
        assert "https://covers.openlibrary.org/b/id/12345-M.jpg" in result["cover_url"]


@pytest.mark.asyncio
async def test_client_close(google_client, openlibrary_client):
    # Test that close methods work without errors
    await google_client.close()
    await openlibrary_client.close()