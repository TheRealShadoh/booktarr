"""
Skoolib parser using Playwright for JavaScript SPA handling
"""
import re
import asyncio
import logging
from typing import List, Optional, Dict
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)

class SkoolibPlaywrightParsingError(Exception):
    """Raised when Skoolib Playwright parsing fails"""
    pass

class SkoolibPlaywrightParser:
    """Parser using Playwright to handle Skoolib JavaScript SPA"""
    
    def __init__(self, headless: bool = True, timeout: int = 30000, max_books: int = 50):
        self.headless = headless
        self.timeout = timeout
        self.max_books = max_books
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=self.headless)
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'playwright'):
            await self.playwright.stop()
    
    def extract_library_id(self, url: str) -> str:
        """Extract library ID from Skoolib share URL"""
        # Extract from URLs like: https://skoolib.net/share/library/d14ba5a0-b081-70ba-a7e4-237b4befefed*library2025-07-07T23:44:27.734Z.1/books
        match = re.search(r'/share/library/([^/]+)', url)
        if match:
            return match.group(1)
        raise SkoolibPlaywrightParsingError(f"Could not extract library ID from URL: {url}")
    
    def construct_book_url(self, library_id: str, book_id: str) -> str:
        """Construct book detail URL from library ID and book ID"""
        # Format: https://skoolib.net/share/books/{book_id}
        return f"https://skoolib.net/share/books/{book_id}"
    
    async def wait_for_page_load(self, page: Page, selector: str = None) -> None:
        """Wait for page to load completely"""
        try:
            # Wait for network to be idle
            await page.wait_for_load_state("networkidle")
            
            # If selector provided, wait for it
            if selector:
                await page.wait_for_selector(selector, timeout=self.timeout)
            
            # Wait a bit more for any lazy-loaded content
            await page.wait_for_timeout(2000)
            
        except Exception as e:
            logger.warning(f"Page load timeout or error: {e}")
    
    async def get_book_links_from_library(self, library_url: str) -> List[str]:
        """Get all book links from the library page"""
        if not self.context:
            raise SkoolibPlaywrightParsingError("Parser not initialized")
        
        page = await self.context.new_page()
        book_links = []
        
        try:
            logger.info(f"Loading library page: {library_url}")
            await page.goto(library_url, timeout=self.timeout)
            
            # Wait for the page to load
            await self.wait_for_page_load(page)
            
            # Try different selectors that might contain book links
            selectors_to_try = [
                'a[href*="/books/"]',  # Links containing /books/
                '[data-book-id]',      # Elements with book ID data attribute
                '.book-item',          # Common book item class
                '.book-card',          # Common book card class
                'div[onclick*="book"]', # Clickable divs with book handlers
                'button[onclick*="book"]', # Clickable buttons with book handlers
            ]
            
            for selector in selectors_to_try:
                try:
                    elements = await page.query_selector_all(selector)
                    logger.info(f"Found {len(elements)} elements with selector: {selector}")
                    
                    for element in elements:
                        # Try to get href attribute
                        href = await element.get_attribute('href')
                        if href and '/books/' in href:
                            book_links.append(href)
                            continue
                        
                        # Try to get data-book-id attribute
                        book_id = await element.get_attribute('data-book-id')
                        if book_id:
                            book_links.append(self.construct_book_url(self.extract_library_id(library_url), book_id))
                            continue
                        
                        # Try to get onclick attribute and extract book ID
                        onclick = await element.get_attribute('onclick')
                        if onclick:
                            book_id_match = re.search(r'([a-f0-9-]+\*[^"\'\\s]+)', onclick)
                            if book_id_match:
                                book_id = book_id_match.group(1)
                                book_links.append(self.construct_book_url(self.extract_library_id(library_url), book_id))
                    
                    if book_links:
                        break
                        
                except Exception as e:
                    logger.debug(f"Selector {selector} failed: {e}")
                    continue
            
            # If no book links found, try to find them in the page content
            if not book_links:
                content = await page.content()
                book_id_matches = re.findall(r'/books/([a-f0-9-]+\*[^"\'\\s]+)', content)
                for book_id in book_id_matches:
                    book_links.append(f"https://skoolib.net/share/books/{book_id}")
            
            # Try pagination if available
            if book_links and len(book_links) < self.max_books:
                await self.handle_pagination(page, book_links)
            
        except Exception as e:
            logger.error(f"Error getting book links: {e}")
        finally:
            await page.close()
        
        # Remove duplicates and limit results
        unique_links = list(set(book_links))[:self.max_books]
        logger.info(f"Found {len(unique_links)} unique book links")
        return unique_links
    
    async def handle_pagination(self, page: Page, book_links: List[str]) -> None:
        """Handle pagination to get more book links"""
        try:
            # Look for pagination buttons
            pagination_selectors = [
                'button[aria-label*="next"]',
                'button[aria-label*="Next"]',
                '.pagination-next',
                '.next-page',
                'a[aria-label*="next"]',
                'a[href*="page="]'
            ]
            
            max_pages = 5  # Limit pagination to prevent infinite loops
            current_page = 1
            
            while current_page < max_pages and len(book_links) < self.max_books:
                next_button = None
                
                for selector in pagination_selectors:
                    try:
                        next_button = await page.query_selector(selector)
                        if next_button:
                            is_disabled = await next_button.get_attribute('disabled')
                            if not is_disabled:
                                break
                    except:
                        continue
                
                if not next_button:
                    logger.info("No next button found, stopping pagination")
                    break
                
                # Click next button
                await next_button.click()
                await self.wait_for_page_load(page)
                current_page += 1
                
                # Get book links from current page
                page_links = await self.get_book_links_from_current_page(page)
                book_links.extend(page_links)
                
                logger.info(f"Page {current_page}: found {len(page_links)} more links")
                
                # Add delay between pages
                await page.wait_for_timeout(1000)
                
        except Exception as e:
            logger.error(f"Error handling pagination: {e}")
    
    async def get_book_links_from_current_page(self, page: Page) -> List[str]:
        """Get book links from current page"""
        links = []
        try:
            # Use the same selectors as in get_book_links_from_library
            elements = await page.query_selector_all('a[href*="/books/"]')
            for element in elements:
                href = await element.get_attribute('href')
                if href and '/books/' in href:
                    if href.startswith('/'):
                        href = 'https://skoolib.net' + href
                    links.append(href)
        except Exception as e:
            logger.error(f"Error getting links from current page: {e}")
        
        return links
    
    async def extract_isbn_from_book_page(self, book_url: str) -> Optional[str]:
        """Extract ISBN from individual book page"""
        if not self.context:
            raise SkoolibPlaywrightParsingError("Parser not initialized")
        
        page = await self.context.new_page()
        
        try:
            logger.debug(f"Loading book page: {book_url}")
            await page.goto(book_url, timeout=self.timeout)
            
            # Wait for page to load
            await self.wait_for_page_load(page)
            
            # Get page content
            content = await page.content()
            
            # Try multiple strategies to find ISBN
            isbn = await self.find_isbn_in_page(page, content)
            
            if isbn:
                logger.info(f"Found ISBN {isbn} in {book_url}")
                return isbn
            
            # If no ISBN found in content, try URL-based extraction
            isbn_from_url = self.extract_isbn_from_url(book_url)
            if isbn_from_url:
                logger.info(f"Found ISBN {isbn_from_url} in URL {book_url}")
                return isbn_from_url
            
            logger.warning(f"No ISBN found in {book_url}")
            return None
            
        except Exception as e:
            logger.error(f"Error extracting ISBN from {book_url}: {e}")
            return None
        finally:
            await page.close()
    
    async def find_isbn_in_page(self, page: Page, content: str) -> Optional[str]:
        """Find ISBN in page using various strategies"""
        
        # Strategy 1: Look for ISBN in text content
        isbn_patterns = [
            r'ISBN[-:\s]*([0-9]{13})',
            r'ISBN[-:\s]*([0-9]{10})',
            r'ISBN[-:\s]*([0-9-]{10,17})',
            r'([0-9]{13})',
            r'([0-9]{10})',
        ]
        
        for pattern in isbn_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                isbn = self._clean_isbn(match)
                if self.validate_isbn(isbn):
                    return self.normalize_isbn(isbn)
        
        # Strategy 2: Look in specific elements
        selectors_to_check = [
            'meta[name*="isbn"]',
            'meta[property*="isbn"]',
            '[data-isbn]',
            '.isbn',
            '#isbn',
            'span:contains("ISBN")',
            'div:contains("ISBN")',
        ]
        
        for selector in selectors_to_check:
            try:
                elements = await page.query_selector_all(selector)
                for element in elements:
                    text = await element.inner_text()
                    if text:
                        for pattern in isbn_patterns:
                            matches = re.findall(pattern, text, re.IGNORECASE)
                            for match in matches:
                                isbn = self._clean_isbn(match)
                                if self.validate_isbn(isbn):
                                    return self.normalize_isbn(isbn)
            except:
                continue
        
        # Strategy 3: Look for ISBN in the URL structure
        # From the example: https://skoolib.net/share/books/d14ba5a0-b081-70ba-a7e4-237b4befefed*library2025-07-07T23:58:12.909Z is 9781975363178A
        current_url = page.url
        isbn_from_url = self.extract_isbn_from_url(current_url)
        if isbn_from_url:
            return isbn_from_url
        
        return None
    
    def extract_isbn_from_url(self, url: str) -> Optional[str]:
        """Extract ISBN from URL structure"""
        # Based on the pattern: the ISBN might be embedded in the URL or as a parameter
        # Example: https://skoolib.net/share/books/d14ba5a0-b081-70ba-a7e4-237b4befefed*library2025-07-07T23:58:12.909Z is 9781975363178A
        
        # Look for ISBN-like patterns in the URL
        isbn_patterns = [
            r'([0-9]{13})[A-Z]?',
            r'([0-9]{10})[A-Z]?',
            r'isbn=([0-9]{10,13})',
            r'id=([0-9]{10,13})',
        ]
        
        for pattern in isbn_patterns:
            matches = re.findall(pattern, url, re.IGNORECASE)
            for match in matches:
                isbn = self._clean_isbn(match)
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
        """Get all ISBNs from Skoolib library using Playwright"""
        try:
            logger.info(f"Starting Playwright parsing for library: {library_url}")
            
            # Step 1: Get all book links from the library page
            book_links = await self.get_book_links_from_library(library_url)
            
            if not book_links:
                logger.warning("No book links found using Playwright")
                return []
            
            logger.info(f"Found {len(book_links)} book links to process")
            
            # Step 2: Extract ISBNs from each book page
            isbns = []
            for i, book_url in enumerate(book_links):
                try:
                    logger.debug(f"Processing book {i+1}/{len(book_links)}: {book_url}")
                    
                    isbn = await self.extract_isbn_from_book_page(book_url)
                    if isbn:
                        isbns.append(isbn)
                    
                    # Add delay between requests
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Error processing book {book_url}: {e}")
                    continue
            
            logger.info(f"Successfully extracted {len(isbns)} ISBNs using Playwright")
            return isbns
            
        except Exception as e:
            logger.error(f"Error in Playwright parsing: {e}")
            raise SkoolibPlaywrightParsingError(f"Failed to parse Skoolib with Playwright: {e}")

# Convenience function for backward compatibility
async def get_isbns_from_skoolib_playwright(url: str) -> List[str]:
    """Get ISBNs from Skoolib URL using Playwright"""
    async with SkoolibPlaywrightParser() as parser:
        return await parser.get_all_book_isbns(url)