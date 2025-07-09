import re
import asyncio
import httpx
from typing import List, Optional
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

class SkoolibParsingError(Exception):
    """Raised when Skoolib HTML parsing fails"""
    pass

class SkoolibParser:
    """HTML parser for extracting ISBNs from Skoolib share links"""
    
    def __init__(self, timeout: int = 30, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = httpx.AsyncClient(timeout=self.timeout)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.aclose()
    
    async def fetch_html(self, url: str) -> str:
        """Fetch HTML with retry logic"""
        if not self.session:
            raise SkoolibParsingError("Parser not initialized. Use async context manager.")
        
        last_exception = None
        for attempt in range(self.max_retries):
            try:
                response = await self.session.get(url, follow_redirects=True)
                response.raise_for_status()
                return response.text
            except httpx.HTTPError as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
        
        raise SkoolibParsingError(f"Failed to fetch HTML after {self.max_retries} attempts: {last_exception}")
    
    def extract_isbns(self, html: str) -> List[str]:
        """Extract ISBNs from Skoolib HTML"""
        if not html:
            return []
        
        soup = BeautifulSoup(html, 'lxml')
        isbns = []
        
        # Common ISBN patterns
        isbn_patterns = [
            r'ISBN[:\s-]*(\d{1,5}[X\d]{1,7}[X\d]{1,7}[\dX])',  # ISBN-10
            r'ISBN[:\s-]*(\d{3}[X\d]{1,5}[X\d]{1,7}[X\d]{1,7}[\dX])',  # ISBN-13
            r'(\d{10}|\d{13})',  # Pure numeric ISBNs
            r'(\d{1,5}[X\d]{1,7}[X\d]{1,7}[\dX])',  # ISBN-10 without prefix
            r'(\d{3}[X\d]{1,5}[X\d]{1,7}[X\d]{1,7}[\dX])',  # ISBN-13 without prefix
        ]
        
        # Strategy 1: Look for ISBN in text content
        text_content = soup.get_text()
        for pattern in isbn_patterns:
            matches = re.findall(pattern, text_content, re.IGNORECASE)
            for match in matches:
                cleaned_isbn = self._clean_isbn(match)
                if cleaned_isbn and self.validate_isbn(cleaned_isbn):
                    isbns.append(cleaned_isbn)
        
        # Strategy 2: Look for ISBNs in data attributes
        for element in soup.find_all(attrs={'data-isbn': True}):
            isbn = element.get('data-isbn')
            cleaned_isbn = self._clean_isbn(isbn)
            if cleaned_isbn and self.validate_isbn(cleaned_isbn):
                isbns.append(cleaned_isbn)
        
        # Strategy 3: Look for ISBNs in href attributes (Amazon links, etc.)
        for link in soup.find_all('a', href=True):
            href = link['href']
            # Amazon ASIN/ISBN patterns
            amazon_match = re.search(r'/dp/([B\d]{10})', href)
            if amazon_match:
                potential_isbn = amazon_match.group(1)
                if potential_isbn.startswith('B'):
                    continue  # Skip ASINs
                cleaned_isbn = self._clean_isbn(potential_isbn)
                if cleaned_isbn and self.validate_isbn(cleaned_isbn):
                    isbns.append(cleaned_isbn)
        
        # Strategy 4: Look for ISBNs in specific HTML structures
        # Common book listing structures
        book_containers = soup.find_all(['div', 'li', 'tr'], class_=re.compile(r'book|item|row', re.I))
        for container in book_containers:
            container_text = container.get_text()
            for pattern in isbn_patterns:
                matches = re.findall(pattern, container_text, re.IGNORECASE)
                for match in matches:
                    cleaned_isbn = self._clean_isbn(match)
                    if cleaned_isbn and self.validate_isbn(cleaned_isbn):
                        isbns.append(cleaned_isbn)
        
        # Remove duplicates while preserving order
        unique_isbns = []
        seen = set()
        for isbn in isbns:
            if isbn not in seen:
                unique_isbns.append(isbn)
                seen.add(isbn)
        
        return unique_isbns
    
    def _clean_isbn(self, isbn: str) -> str:
        """Clean and normalize ISBN string"""
        if not isbn:
            return ""
        
        # Remove common prefixes and suffixes
        isbn = re.sub(r'^ISBN[:\s-]*', '', isbn, flags=re.IGNORECASE)
        
        # Remove all non-alphanumeric characters except X
        isbn = re.sub(r'[^0-9X]', '', isbn, flags=re.IGNORECASE)
        
        # Ensure X is uppercase
        isbn = isbn.upper()
        
        return isbn
    
    def validate_isbn(self, isbn: str) -> bool:
        """Validate ISBN-10 or ISBN-13"""
        if not isbn:
            return False
        
        # Remove any remaining non-digit characters except X
        isbn = re.sub(r'[^0-9X]', '', isbn.upper())
        
        if len(isbn) == 10:
            return self._validate_isbn10(isbn)
        elif len(isbn) == 13:
            return self._validate_isbn13(isbn)
        else:
            return False
    
    def _validate_isbn10(self, isbn: str) -> bool:
        """Validate ISBN-10 using check digit"""
        if len(isbn) != 10:
            return False
        
        try:
            total = 0
            for i in range(9):
                if not isbn[i].isdigit():
                    return False
                total += int(isbn[i]) * (10 - i)
            
            # Check digit can be 0-9 or X (representing 10)
            check_digit = isbn[9]
            if check_digit == 'X':
                check_digit_value = 10
            elif check_digit.isdigit():
                check_digit_value = int(check_digit)
            else:
                return False
            
            return (total + check_digit_value) % 11 == 0
        except (ValueError, IndexError):
            return False
    
    def _validate_isbn13(self, isbn: str) -> bool:
        """Validate ISBN-13 using check digit"""
        if len(isbn) != 13:
            return False
        
        try:
            total = 0
            for i in range(12):
                if not isbn[i].isdigit():
                    return False
                digit = int(isbn[i])
                total += digit * (3 if i % 2 == 1 else 1)
            
            check_digit = int(isbn[12])
            calculated_check = (10 - (total % 10)) % 10
            
            return check_digit == calculated_check
        except (ValueError, IndexError):
            return False
    
    def normalize_isbn(self, isbn: str) -> str:
        """Convert ISBN-10 to ISBN-13 format"""
        cleaned = self._clean_isbn(isbn)
        
        if len(cleaned) == 10 and self.validate_isbn(cleaned):
            # Convert ISBN-10 to ISBN-13
            isbn13_base = '978' + cleaned[:9]
            
            # Calculate ISBN-13 check digit
            total = 0
            for i, digit in enumerate(isbn13_base):
                total += int(digit) * (3 if i % 2 == 1 else 1)
            
            check_digit = (10 - (total % 10)) % 10
            return isbn13_base + str(check_digit)
        
        elif len(cleaned) == 13 and self.validate_isbn(cleaned):
            return cleaned
        
        return ""
    
    async def get_isbns_from_url(self, url: str) -> List[str]:
        """Main method to fetch and parse ISBNs from a Skoolib URL"""
        try:
            html = await self.fetch_html(url)
            isbns = self.extract_isbns(html)
            
            # Normalize all ISBNs to ISBN-13 format
            normalized_isbns = []
            for isbn in isbns:
                normalized = self.normalize_isbn(isbn)
                if normalized:
                    normalized_isbns.append(normalized)
            
            return normalized_isbns
            
        except Exception as e:
            raise SkoolibParsingError(f"Failed to extract ISBNs from {url}: {str(e)}")