import pytest
import asyncio
from unittest.mock import Mock, patch
from app.services.skoolib_parser import SkoolibParser, SkoolibParsingError

class TestSkoolibParser:
    """Test suite for SkoolibParser"""
    
    def test_validate_isbn10_valid(self):
        """Test ISBN-10 validation with valid ISBNs"""
        parser = SkoolibParser()
        
        valid_isbn10s = [
            "0306406152",  # Standard ISBN-10
            "0471958697",  # Another valid ISBN-10
            "019852663X",  # ISBN-10 with X check digit
        ]
        
        for isbn in valid_isbn10s:
            assert parser.validate_isbn(isbn), f"Should be valid: {isbn}"
    
    def test_validate_isbn10_invalid(self):
        """Test ISBN-10 validation with invalid ISBNs"""
        parser = SkoolibParser()
        
        invalid_isbn10s = [
            "0306406151",  # Wrong check digit
            "030640615",   # Too short
            "03064061522", # Too long
            "030640615A",  # Invalid character
            "0306406152Z", # Invalid character in wrong position
        ]
        
        for isbn in invalid_isbn10s:
            assert not parser.validate_isbn(isbn), f"Should be invalid: {isbn}"
    
    def test_validate_isbn13_valid(self):
        """Test ISBN-13 validation with valid ISBNs"""
        parser = SkoolibParser()
        
        valid_isbn13s = [
            "9780306406157",  # Standard ISBN-13
            "9780471958697",  # Another valid ISBN-13
            "9781234567897",  # Valid ISBN-13
        ]
        
        for isbn in valid_isbn13s:
            assert parser.validate_isbn(isbn), f"Should be valid: {isbn}"
    
    def test_validate_isbn13_invalid(self):
        """Test ISBN-13 validation with invalid ISBNs"""
        parser = SkoolibParser()
        
        invalid_isbn13s = [
            "9780306406156",  # Wrong check digit
            "978030640615",   # Too short
            "97803064061577", # Too long
            "978030640615A",  # Invalid character
        ]
        
        for isbn in invalid_isbn13s:
            assert not parser.validate_isbn(isbn), f"Should be invalid: {isbn}"
    
    def test_clean_isbn(self):
        """Test ISBN cleaning functionality"""
        parser = SkoolibParser()
        
        test_cases = [
            ("ISBN: 978-0-306-40615-7", "9780306406157"),
            ("ISBN-10: 0-306-40615-2", "0306406152"),
            ("978 0 306 40615 7", "9780306406157"),
            ("ISBN:0198526636", "0198526636"),
            ("978-0-19-852663-6", "9780198526636"),
        ]
        
        for input_isbn, expected in test_cases:
            result = parser._clean_isbn(input_isbn)
            assert result == expected, f"Expected {expected}, got {result}"
    
    def test_normalize_isbn(self):
        """Test ISBN normalization (ISBN-10 to ISBN-13 conversion)"""
        parser = SkoolibParser()
        
        # Test valid ISBN-10 to ISBN-13 conversion
        isbn10 = "0306406152"
        expected_isbn13 = "9780306406157"
        result = parser.normalize_isbn(isbn10)
        assert result == expected_isbn13, f"Expected {expected_isbn13}, got {result}"
        
        # Test ISBN-13 passthrough
        isbn13 = "9780306406157"
        result = parser.normalize_isbn(isbn13)
        assert result == isbn13, f"Expected {isbn13}, got {result}"
        
        # Test invalid ISBN
        invalid_isbn = "invalid"
        result = parser.normalize_isbn(invalid_isbn)
        assert result == "", f"Expected empty string, got {result}"
    
    def test_extract_isbns_from_html(self):
        """Test ISBN extraction from HTML content"""
        parser = SkoolibParser()
        
        html_content = """
        <html>
        <body>
            <div class="book-item">
                <h3>Book Title</h3>
                <p>ISBN: 978-0-306-40615-7</p>
                <p>Price: $29.99</p>
            </div>
            <div class="book-item">
                <h3>Another Book</h3>
                <p>ISBN-10: 0-471-95869-7</p>
            </div>
            <div class="book-item">
                <h3>Third Book</h3>
                <p>ISBN-13: 978-0-198-52663-6</p>
            </div>
            <a href="https://amazon.com/dp/0306406152">Buy on Amazon</a>
        </body>
        </html>
        """
        
        isbns = parser.extract_isbns(html_content)
        
        # Should extract all ISBNs and normalize them
        expected_isbns = [
            "9780306406157",  # From first book
            "9780471958697",  # From second book (converted from ISBN-10)
            "9780198526636",  # From third book
            "9780306406157",  # From Amazon link (duplicate, should be removed)
        ]
        
        # Remove duplicates from expected for comparison
        expected_unique = []
        seen = set()
        for isbn in expected_isbns:
            if isbn not in seen:
                expected_unique.append(isbn)
                seen.add(isbn)
        
        assert len(isbns) == len(expected_unique), f"Expected {len(expected_unique)} ISBNs, got {len(isbns)}"
        for isbn in expected_unique:
            assert isbn in isbns, f"Expected ISBN {isbn} not found in results"
    
    def test_extract_isbns_with_data_attributes(self):
        """Test ISBN extraction from data attributes"""
        parser = SkoolibParser()
        
        html_content = """
        <div class="book-list">
            <div class="book-item" data-isbn="9780306406157">Book 1</div>
            <div class="book-item" data-isbn="978-0-471-95869-7">Book 2</div>
            <span data-isbn="0198526636">Book 3</span>
        </div>
        """
        
        isbns = parser.extract_isbns(html_content)
        
        expected_isbns = [
            "9780306406157",
            "9780471958697",
            "9780198526636",  # Converted from ISBN-10
        ]
        
        assert len(isbns) == len(expected_isbns)
        for isbn in expected_isbns:
            assert isbn in isbns, f"Expected ISBN {isbn} not found in results"
    
    def test_extract_isbns_empty_html(self):
        """Test ISBN extraction with empty HTML"""
        parser = SkoolibParser()
        
        assert parser.extract_isbns("") == []
        assert parser.extract_isbns("<html></html>") == []
        assert parser.extract_isbns("<div>No ISBNs here</div>") == []
    
    @pytest.mark.asyncio
    async def test_fetch_html_success(self):
        """Test successful HTML fetching"""
        parser = SkoolibParser()
        
        mock_response = Mock()
        mock_response.text = "<html><body>Test content</body></html>"
        mock_response.raise_for_status = Mock()
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            async with parser:
                result = await parser.fetch_html("http://example.com")
                assert result == "<html><body>Test content</body></html>"
    
    @pytest.mark.asyncio
    async def test_fetch_html_retry_logic(self):
        """Test retry logic on HTTP errors"""
        parser = SkoolibParser(max_retries=2)
        
        with patch('httpx.AsyncClient') as mock_client:
            # First call fails, second succeeds
            mock_response_fail = Mock()
            mock_response_fail.raise_for_status.side_effect = Exception("Network error")
            
            mock_response_success = Mock()
            mock_response_success.text = "<html>Success</html>"
            mock_response_success.raise_for_status = Mock()
            
            mock_client.return_value.__aenter__.return_value.get.side_effect = [
                mock_response_fail,
                mock_response_success
            ]
            
            async with parser:
                result = await parser.fetch_html("http://example.com")
                assert result == "<html>Success</html>"
    
    @pytest.mark.asyncio
    async def test_fetch_html_max_retries_exceeded(self):
        """Test behavior when max retries are exceeded"""
        parser = SkoolibParser(max_retries=2)
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.raise_for_status.side_effect = Exception("Persistent error")
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            async with parser:
                with pytest.raises(SkoolibParsingError):
                    await parser.fetch_html("http://example.com")
    
    @pytest.mark.asyncio
    async def test_get_isbns_from_url_integration(self):
        """Test the main integration method"""
        parser = SkoolibParser()
        
        mock_html = """
        <html>
        <body>
            <div class="book">ISBN: 978-0-306-40615-7</div>
            <div class="book">ISBN-10: 0-471-95869-7</div>
        </body>
        </html>
        """
        
        with patch.object(parser, 'fetch_html', return_value=mock_html):
            async with parser:
                isbns = await parser.get_isbns_from_url("http://example.com")
                
                expected_isbns = ["9780306406157", "9780471958697"]
                assert len(isbns) == 2
                for isbn in expected_isbns:
                    assert isbn in isbns
    
    @pytest.mark.asyncio
    async def test_context_manager_usage(self):
        """Test proper context manager usage"""
        parser = SkoolibParser()
        
        # Test that session is None before entering context
        assert parser.session is None
        
        async with parser:
            # Session should be initialized
            assert parser.session is not None
        
        # Session should be closed after exiting context
        # (We can't easily test this without mocking, but the structure is correct)
    
    def test_parser_without_context_manager(self):
        """Test that parser raises error when used without context manager"""
        parser = SkoolibParser()
        
        # This should raise an error since session is not initialized
        with pytest.raises(SkoolibParsingError, match="Parser not initialized"):
            asyncio.run(parser.fetch_html("http://example.com"))