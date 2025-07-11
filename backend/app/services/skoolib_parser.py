#!/usr/bin/env python3
"""
Skoolib ISBN Scraper
Scrapes book ISBNs from a Skoolib library page
"""

import asyncio
import requests
from bs4 import BeautifulSoup
import json
import time
import re
from urllib.parse import urljoin, urlparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import logging
from typing import List, Optional

# Set up logging
logger = logging.getLogger(__name__)

class SkoolibParsingError(Exception):
    """Raised when Skoolib parsing fails"""
    pass

class SkoolibParser:
    """Enhanced Skoolib parser with Selenium and requests fallback"""
    
    def __init__(self, timeout: int = 30, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self.base_url = "https://skoolib.net"
        self.isbns = []
        
    def setup_driver(self):
        """Set up Selenium WebDriver with options"""
        from selenium.webdriver.chrome.options import Options
        
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # Run in background
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-logging')
        chrome_options.add_argument('--disable-web-security')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        try:
            driver = webdriver.Chrome(options=chrome_options)
            return driver
        except Exception as e:
            logger.error(f"Failed to initialize Chrome driver: {e}")
            logger.info("Trying Firefox driver...")
            from selenium.webdriver.firefox.options import Options as FirefoxOptions
            firefox_options = FirefoxOptions()
            firefox_options.add_argument('--headless')
            firefox_options.add_argument('--no-sandbox')
            return webdriver.Firefox(options=firefox_options)
    
    def extract_isbn_from_text(self, text):
        """Extract ISBN-10 or ISBN-13 from text using regex"""
        # ISBN-13 pattern
        isbn13_pattern = r'(?:ISBN[-\s]?13[:\s]?)?(?:978|979)[-\s]?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,6}[-\s]?\d'
        # ISBN-10 pattern
        isbn10_pattern = r'(?:ISBN[-\s]?10[:\s]?)?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,6}[-\s]?[\dX]'
        
        # Try ISBN-13 first
        match = re.search(isbn13_pattern, text, re.IGNORECASE)
        if match:
            isbn = re.sub(r'[-\s]', '', match.group())
            if isbn.startswith('978') or isbn.startswith('979'):
                return isbn[-13:]
        
        # Try ISBN-10
        match = re.search(isbn10_pattern, text, re.IGNORECASE)
        if match:
            isbn = re.sub(r'[-\s]', '', match.group())
            if len(isbn) >= 10:
                return isbn[-10:]
        
        return None
    
    def scrape_with_selenium(self, library_url: str):
        """Scrape using Selenium for JavaScript-rendered content"""
        driver = None
        try:
            driver = self.setup_driver()
            logger.info(f"Loading library page: {library_url}")
            driver.get(library_url)
            
            # Wait for the page to load
            wait = WebDriverWait(driver, 20)
            
            # Wait for book elements to load - adjust selector based on actual page structure
            try:
                book_elements = wait.until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, "a[href*='/book/'], .book-link, .book-item a"))
                )
            except TimeoutException:
                # Try alternative selectors
                book_elements = driver.find_elements(By.CSS_SELECTOR, "[class*='book'] a, [id*='book'] a")
            
            book_urls = []
            for element in book_elements:
                href = element.get_attribute('href')
                if href and '/book/' in href:
                    book_urls.append(href)
            
            logger.info(f"Found {len(book_urls)} book links")
            
            # Visit each book page
            for i, book_url in enumerate(book_urls, 1):
                try:
                    logger.info(f"Processing book {i}/{len(book_urls)}: {book_url}")
                    driver.get(book_url)
                    time.sleep(2)  # Be respectful to the server
                    
                    # Get page source and look for ISBN
                    page_source = driver.page_source
                    
                    # Try multiple methods to find ISBN
                    isbn = None
                    
                    # Method 1: Look for specific ISBN elements
                    try:
                        isbn_elements = driver.find_elements(By.CSS_SELECTOR, 
                            "[class*='isbn'], [id*='isbn'], span:contains('ISBN'), div:contains('ISBN')")
                        
                        for elem in isbn_elements:
                            text = elem.text
                            isbn = self.extract_isbn_from_text(text)
                            if isbn:
                                break
                    except:
                        pass
                    
                    # Method 2: Search in the entire page text
                    if not isbn:
                        isbn = self.extract_isbn_from_text(page_source)
                    
                    if isbn:
                        logger.info(f"Found ISBN: {isbn}")
                        self.isbns.append(isbn)
                    else:
                        logger.warning(f"No ISBN found for {book_url}")
                        
                except Exception as e:
                    logger.error(f"Error processing book {book_url}: {e}")
                    
        except Exception as e:
            logger.error(f"Selenium scraping failed: {e}")
            raise SkoolibParsingError(f"Selenium scraping failed: {e}")
        finally:
            if driver:
                driver.quit()
    
    def scrape_with_requests(self, library_url: str):
        """Fallback scraping method using requests and BeautifulSoup"""
        try:
            logger.info("Trying requests-based scraping...")
            
            # Get the library page
            response = requests.get(library_url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find book links
            book_links = soup.find_all('a', href=re.compile(r'/book/'))
            
            logger.info(f"Found {len(book_links)} book links")
            
            for i, link in enumerate(book_links, 1):
                book_url = urljoin(self.base_url, link['href'])
                logger.info(f"Processing book {i}/{len(book_links)}: {book_url}")
                
                try:
                    book_response = requests.get(book_url, headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }, timeout=self.timeout)
                    book_response.raise_for_status()
                    
                    book_soup = BeautifulSoup(book_response.content, 'html.parser')
                    
                    # Look for ISBN in various places
                    isbn = None
                    
                    # Check meta tags
                    isbn_meta = book_soup.find('meta', attrs={'name': 'isbn'}) or \
                               book_soup.find('meta', attrs={'property': 'isbn'})
                    if isbn_meta:
                        isbn = isbn_meta.get('content')
                    
                    # Check for ISBN in text
                    if not isbn:
                        isbn = self.extract_isbn_from_text(book_soup.text)
                    
                    if isbn:
                        logger.info(f"Found ISBN: {isbn}")
                        self.isbns.append(isbn)
                    else:
                        logger.warning(f"No ISBN found for {book_url}")
                    
                    time.sleep(1)  # Be respectful
                    
                except Exception as e:
                    logger.error(f"Error processing book {book_url}: {e}")
                    
        except Exception as e:
            logger.error(f"Requests-based scraping failed: {e}")
            raise SkoolibParsingError(f"Requests-based scraping failed: {e}")
    
    async def parse_library_url(self, library_url: str) -> List[str]:
        """Main async parsing method"""
        self.isbns = []  # Reset ISBNs
        
        # Try Selenium first for JavaScript-rendered content
        try:
            self.scrape_with_selenium(library_url)
        except Exception as e:
            logger.warning(f"Selenium method failed: {e}")
        
        # If no ISBNs found, try requests-based approach
        if not self.isbns:
            logger.info("No ISBNs found with Selenium, trying requests...")
            try:
                self.scrape_with_requests(library_url)
            except Exception as e:
                logger.warning(f"Requests method failed: {e}")
        
        if not self.isbns:
            raise SkoolibParsingError("No ISBNs found with either scraping method")
        
        logger.info(f"Successfully scraped {len(self.isbns)} ISBNs")
        return self.isbns
    
    # Legacy methods for backward compatibility
    def extract_isbns(self, html: str) -> List[str]:
        """Legacy method - extract ISBNs from HTML"""
        return [isbn for isbn in [self.extract_isbn_from_text(html)] if isbn]
    
    async def fetch_html(self, url: str) -> str:
        """Legacy method - fetch HTML"""
        response = requests.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }, timeout=self.timeout)
        response.raise_for_status()
        return response.text