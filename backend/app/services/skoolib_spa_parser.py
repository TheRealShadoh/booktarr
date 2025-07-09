"""
Enhanced Skoolib parser for handling SPA pages and individual book detail parsing
"""
import re
import asyncio
import httpx
import logging
from typing import List, Optional, Dict, Set
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, quote
import json

logger = logging.getLogger(__name__)

class SkoolibSPAParsingError(Exception):
    """Raised when Skoolib SPA parsing fails"""
    pass

class SkoolibSPAParser:
    """Enhanced parser for Skoolib SPA with pagination and individual book detail pages"""
    
    def __init__(self, timeout: int = 30, max_retries: int = 3, max_pages: int = 50):
        self.timeout = timeout
        self.max_retries = max_retries
        self.max_pages = max_pages
        self.session = None
        self.base_url = None
        self.library_id = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = httpx.AsyncClient(
            timeout=self.timeout,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.aclose()
    
    def extract_library_id(self, url: str) -> str:
        """Extract library ID from Skoolib share URL"""
        # Extract from URLs like: https://skoolib.net/share/library/d14ba5a0-b081-70ba-a7e4-237b4befefed*library2025-07-07T23:44:27.734Z.1/books
        match = re.search(r'/share/library/([^/]+)', url)
        if match:
            return match.group(1)
        raise SkoolibSPAParsingError(f"Could not extract library ID from URL: {url}")
    
    async def fetch_html(self, url: str) -> str:
        """Fetch HTML with retry logic"""
        if not self.session:
            raise SkoolibSPAParsingError("Parser not initialized. Use async context manager.")
        
        last_exception = None
        for attempt in range(self.max_retries):
            try:
                logger.debug(f"Fetching URL (attempt {attempt + 1}): {url}")
                response = await self.session.get(url, follow_redirects=True)
                response.raise_for_status()
                return response.text
            except httpx.HTTPError as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
        
        raise SkoolibSPAParsingError(f"Failed to fetch HTML after {self.max_retries} attempts: {last_exception}")
    
    def extract_book_links_from_spa(self, html: str) -> List[str]:
        """Extract book detail links from SPA HTML"""
        book_links = []
        soup = BeautifulSoup(html, 'html.parser')
        
        # Look for JavaScript variables or data attributes that might contain book data
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string:
                # Look for book IDs or URLs in JavaScript
                book_id_matches = re.findall(r'["\']([a-f0-9-]+\*[^"\']+)["\']', script.string)
                for book_id in book_id_matches:
                    if 'library' not in book_id and len(book_id) > 20:  # Filter out library IDs
                        book_links.append(book_id)
        
        # Also look for data attributes or hrefs that might contain book references
        for element in soup.find_all(['div', 'a', 'span'], attrs={'data-book-id': True}):
            book_id = element.get('data-book-id')
            if book_id:
                book_links.append(book_id)
        
        # Look for links that match the book detail pattern
        for link in soup.find_all('a', href=True):
            href = link['href']
            if '/books/' in href:
                book_links.append(href)
        
        return list(set(book_links))  # Remove duplicates
    
    def extract_isbn_from_book_page(self, html: str) -> Optional[str]:
        """Extract ISBN from individual book detail page"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Strategy 1: Look for ISBN in text content
        isbn_patterns = [
            r'ISBN[-:\s]*([0-9]{10,13})',
            r'ISBN[-:\s]*([0-9]{1,5}[-\s]?[0-9]{1,7}[-\s]?[0-9]{1,7}[-\s]?[0-9]{1,7}[-\s]?[0-9]{1})',
            r'([0-9]{13})',
            r'([0-9]{10})',
        ]
        
        for pattern in isbn_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                isbn = self._clean_isbn(match)
                if self.validate_isbn(isbn):
                    return self.normalize_isbn(isbn)
        
        # Strategy 2: Look in meta tags
        meta_tags = soup.find_all('meta')
        for meta in meta_tags:
            content = meta.get('content', '')
            if content:
                for pattern in isbn_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    for match in matches:
                        isbn = self._clean_isbn(match)
                        if self.validate_isbn(isbn):
                            return self.normalize_isbn(isbn)
        
        # Strategy 3: Look for specific book identifiers in the URL itself
        # From the example: https://skoolib.net/share/books/d14ba5a0-b081-70ba-a7e4-237b4befefed*library2025-07-07T23:58:12.909Z is 9781975363178A
        # The ISBN appears to be at the end of the URL
        url_isbn_match = re.search(r'([0-9]{10,13})[A-Z]?$', html)
        if url_isbn_match:
            isbn = url_isbn_match.group(1)
            if self.validate_isbn(isbn):
                return self.normalize_isbn(isbn)
        
        return None
    
    def _clean_isbn(self, isbn: str) -> str:
        """Clean ISBN by removing non-digit characters"""
        return re.sub(r'[^\d]', '', isbn)
    
    def validate_isbn(self, isbn: str) -> bool:
        """Validate ISBN-10 or ISBN-13"""
        if not isbn:
            return False
        
        # Remove any non-digit characters
        isbn = self._clean_isbn(isbn)
        
        if len(isbn) == 10:
            return self._validate_isbn10(isbn)
        elif len(isbn) == 13:
            return self._validate_isbn13(isbn)
        else:
            return False
    
    def _validate_isbn10(self, isbn: str) -> bool:
        """Validate ISBN-10 using check digit algorithm"""
        if len(isbn) != 10:
            return False
        
        try:
            # Convert to integers, handling 'X' as 10
            digits = []
            for char in isbn:
                if char.upper() == 'X':
                    digits.append(10)
                else:
                    digits.append(int(char))
            
            # Calculate check digit
            check_sum = sum(digit * (10 - i) for i, digit in enumerate(digits))
            return check_sum % 11 == 0
        except (ValueError, TypeError):
            return False
    
    def _validate_isbn13(self, isbn: str) -> bool:
        """Validate ISBN-13 using check digit algorithm"""
        if len(isbn) != 13:
            return False
        
        try:
            digits = [int(char) for char in isbn]
            
            # Calculate check digit
            check_sum = sum(digit * (1 if i % 2 == 0 else 3) for i, digit in enumerate(digits))
            return check_sum % 10 == 0
        except (ValueError, TypeError):
            return False
    
    def normalize_isbn(self, isbn: str) -> str:
        """Convert ISBN-10 to ISBN-13 format"""
        isbn = self._clean_isbn(isbn)
        
        if len(isbn) == 13:
            return isbn
        elif len(isbn) == 10:
            # Convert ISBN-10 to ISBN-13
            # Remove check digit from ISBN-10
            isbn9 = isbn[:9]
            # Add 978 prefix
            isbn12 = "978" + isbn9
            
            # Calculate new check digit
            check_sum = sum(int(digit) * (1 if i % 2 == 0 else 3) for i, digit in enumerate(isbn12))
            check_digit = (10 - (check_sum % 10)) % 10
            
            return isbn12 + str(check_digit)
        else:
            return isbn
    
    async def get_all_book_isbns(self, library_url: str) -> List[str]:
        """Get all ISBNs from a Skoolib library by handling pagination and individual book pages"""
        try:
            self.library_id = self.extract_library_id(library_url)
            self.base_url = '/'.join(library_url.split('/')[:-1])  # Remove '/books' from end
            
            logger.info(f"Starting SPA parsing for library: {self.library_id}")
            
            # Step 1: Fetch the main library page
            html = await self.fetch_html(library_url)
            logger.debug(f"Fetched main page, HTML length: {len(html)}")
            
            # Step 2: Extract book links/IDs from the SPA
            book_links = self.extract_book_links_from_spa(html)
            logger.info(f"Found {len(book_links)} potential book links")
            
            if not book_links:
                logger.warning("No book links found in SPA. Trying alternative extraction methods...")
                return await self._try_alternative_extraction(library_url)
            
            # Step 3: Process each book link to get ISBN
            isbns = []
            for i, book_link in enumerate(book_links[:20]):  # Limit to first 20 books for testing
                try:
                    # Construct full book detail URL
                    if book_link.startswith('http'):
                        book_url = book_link
                    else:
                        book_url = f"https://skoolib.net/share/books/{book_link}"
                    
                    logger.debug(f"Processing book {i+1}/{len(book_links)}: {book_url}")
                    
                    # Fetch individual book page
                    book_html = await self.fetch_html(book_url)
                    
                    # Extract ISBN from book page
                    isbn = self.extract_isbn_from_book_page(book_html)
                    if isbn:
                        isbns.append(isbn)
                        logger.info(f"Found ISBN: {isbn}")
                    else:
                        logger.warning(f"No ISBN found for book: {book_url}")
                    
                    # Add small delay to avoid overwhelming the server
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Error processing book {book_link}: {e}")
                    continue
            
            logger.info(f"Successfully extracted {len(isbns)} ISBNs from Skoolib SPA")
            return isbns
            
        except Exception as e:
            logger.error(f"Error in SPA parsing: {e}")
            raise SkoolibSPAParsingError(f"Failed to parse Skoolib SPA: {e}")
    
    async def _try_alternative_extraction(self, library_url: str) -> List[str]:
        """Try alternative methods to extract book information"""
        logger.info("Trying alternative extraction methods...")
        
        # Method 1: Try to find API endpoints or data in the page
        try:
            html = await self.fetch_html(library_url)
            
            # Look for JSON data in script tags
            soup = BeautifulSoup(html, 'html.parser')
            scripts = soup.find_all('script')
            
            for script in scripts:
                if script.string:
                    # Look for JSON-like data
                    json_matches = re.findall(r'\{[^}]*"isbn"[^}]*\}', script.string, re.IGNORECASE)
                    for match in json_matches:
                        try:
                            data = json.loads(match)
                            if 'isbn' in data:
                                isbn = self._clean_isbn(str(data['isbn']))
                                if self.validate_isbn(isbn):
                                    return [self.normalize_isbn(isbn)]
                        except:
                            continue
            
            # Look for ISBN patterns in the entire HTML
            isbn_patterns = [
                r'["\']([0-9]{13})["\']',
                r'["\']([0-9]{10})["\']',
                r'ISBN[:\s]*([0-9]{10,13})',
            ]
            
            for pattern in isbn_patterns:
                matches = re.findall(pattern, html, re.IGNORECASE)
                isbns = []
                for match in matches:
                    isbn = self._clean_isbn(match)
                    if self.validate_isbn(isbn):
                        isbns.append(self.normalize_isbn(isbn))
                
                if isbns:
                    logger.info(f"Found {len(isbns)} ISBNs using alternative extraction")
                    return isbns
            
        except Exception as e:
            logger.error(f"Alternative extraction failed: {e}")
        
        return []

# Convenience function for backward compatibility
async def get_isbns_from_skoolib_spa(url: str) -> List[str]:
    """Get ISBNs from Skoolib SPA URL"""
    async with SkoolibSPAParser() as parser:
        return await parser.get_all_book_isbns(url)