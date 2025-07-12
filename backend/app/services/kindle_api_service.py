"""
Kindle library API synchronization service using web scraping/API approach
Since Amazon doesn't provide an official Kindle API, this uses reverse-engineered methods
"""
import asyncio
import json
import aiohttp
import re
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from bs4 import BeautifulSoup

from app.database.connection import AsyncSessionLocal
from app.database.models import BookModel
from app.database.models_amazon import AmazonLibraryItem, BookEdition
from app.services.amazon_auth_service import amazon_auth_service
from app.config.logging import get_logger

logger = get_logger(__name__)


class KindleAPIService:
    """Service for Kindle library API integration using reverse-engineered methods"""
    
    def __init__(self):
        self.base_url = "https://read.amazon.com"
        self.session = None
        
    async def authenticate_with_credentials(
        self,
        username: str,
        password: str,
        marketplace: str = "us",
        user_id: str = "default",
        verification_code: Optional[str] = None,
        auth_session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Authenticate with Amazon Kindle using username/password with 2FA support"""
        logger.info(f"Starting Kindle authentication for user {username}")
        
        try:
            # Check if we're continuing a 2FA flow
            if verification_code and auth_session_id:
                return await self._complete_2fa_authentication(auth_session_id, verification_code, marketplace, user_id)
            
            # Create session
            self.session = aiohttp.ClientSession(
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            )
            
            # Step 1: Get login page  
            marketplace_domain = "com" if marketplace == "us" else marketplace
            login_url = f"https://www.amazon.{marketplace_domain}/ap/signin"
            async with self.session.get(login_url) as response:
                login_html = await response.text()
                
            # Parse login form
            soup = BeautifulSoup(login_html, 'html.parser')
            appActionToken = soup.find('input', {'name': 'appActionToken'})
            appAction = soup.find('input', {'name': 'appAction'})
            
            if not appActionToken or not appAction:
                raise Exception("Could not find login form tokens")
            
            # Step 2: Submit login
            login_data = {
                'appActionToken': appActionToken['value'],
                'appAction': appAction['value'],
                'email': username,
                'password': password,
                'create': '0',
                'metadata1': 'ECdITeCs:TlhrWsmTxZLl1NfUH8wQTaRNBl/eFXFdOVgHPeI99sVWfuBhX+o2fDe4ZBG4vRF8XKRzPCp6aXUEtNdKfA=='
            }
            
            async with self.session.post(login_url, data=login_data, allow_redirects=True) as response:
                if response.status != 200:
                    raise Exception(f"Login failed with status {response.status}")
                
                # Check if we were redirected to a 2FA or CAPTCHA page
                final_url = str(response.url)
                content = await response.text()
                
                if "cvf" in final_url.lower() or "verification" in content.lower() or "challenge" in content.lower():
                    # Store partial auth state for 2FA completion
                    session_id = await self._store_partial_auth_state(username, password, marketplace, user_id, self.session)
                    return {
                        'success': False,
                        'requires_2fa': True,
                        'auth_session_id': session_id,
                        'message': 'Please check your email/SMS and provide the verification code',
                        'error': 'Two-factor authentication required'
                    }
                
                if "captcha" in content.lower():
                    raise Exception("CAPTCHA verification required - please complete authentication in your browser first")
                
                if "ap/signin" in final_url:
                    raise Exception("Login failed - please check your credentials")
            
            # Step 3: Access Kindle Cloud Reader
            reader_url = f"https://read.amazon.{marketplace_domain}"
            async with self.session.get(reader_url) as response:
                if response.status != 200:
                    raise Exception("Could not access Kindle Cloud Reader")
                
                reader_content = await response.text()
                
                # Extract authentication tokens from the page
                csrf_token = None
                session_id = None
                
                # Look for CSRF token
                csrf_match = re.search(r'"csrfToken":"([^"]+)"', reader_content)
                if csrf_match:
                    csrf_token = csrf_match.group(1)
                
                # Look for session ID
                session_match = re.search(r'"sessionId":"([^"]+)"', reader_content)
                if session_match:
                    session_id = session_match.group(1)
                
                if not csrf_token:
                    logger.warning("Could not extract CSRF token from Kindle page")
            
            # Extract cookies for future use
            cookies = {}
            for cookie in self.session.cookie_jar:
                cookies[cookie.key] = cookie.value
            
            # Store authentication data
            auth_data = {
                'cookies': cookies,
                'csrf_token': csrf_token,
                'session_id': session_id,
                'marketplace': marketplace,
                'username': username,
                'authenticated_at': datetime.utcnow().isoformat(),
                'reader_url': reader_url
            }
            
            # Store encrypted credentials
            auth_id = await amazon_auth_service.store_auth_credentials(
                service='kindle',
                auth_data=auth_data,
                marketplace=marketplace,
                user_id=user_id
            )
            
            logger.info(f"Successfully authenticated Kindle user {username}")
            
            return {
                'success': True,
                'auth_id': auth_id,
                'marketplace': marketplace,
                'message': 'Kindle authentication successful'
            }
            
        except Exception as e:
            logger.error(f"Kindle authentication failed: {e}")
            return {'success': False, 'error': str(e)}
        
        finally:
            if self.session:
                await self.session.close()
    
    async def get_kindle_session(self, user_id: str = "default") -> Optional[aiohttp.ClientSession]:
        """Get authenticated Kindle session"""
        try:
            auth_data = await amazon_auth_service.get_auth_credentials('kindle', user_id)
            if not auth_data:
                return None
            
            credentials = auth_data['credentials']
            cookies = credentials.get('cookies', {})
            
            # Create session with stored cookies
            session = aiohttp.ClientSession(
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            )
            
            # Add cookies to session
            for name, value in cookies.items():
                session.cookie_jar.update_cookies({name: value})
            
            return session
            
        except Exception as e:
            logger.error(f"Failed to create Kindle session: {e}")
            return None
    
    async def sync_kindle_library(self, user_id: str = "default") -> Dict[str, Any]:
        """Sync complete Kindle library using API"""
        if not await amazon_auth_service.is_authenticated('kindle', user_id):
            return {'success': False, 'error': 'Not authenticated with Kindle'}
        
        try:
            
            # Update sync status
            await amazon_auth_service.update_sync_status('kindle', 'syncing', user_id=user_id)
            
            # Get auth data for job creation
            auth_data = await amazon_auth_service.get_auth_credentials('kindle', user_id)
            if not auth_data:
                return {'success': False, 'error': 'Auth data not found'}
            
            # Create sync job
            job_id = await amazon_auth_service.create_sync_job(
                auth_id=auth_data['auth_id'],
                job_type='api_sync',
                service='kindle'
            )
            
            # Start sync in background
            asyncio.create_task(self._sync_kindle_library_task(job_id, user_id))
            
            return {
                'success': True,
                'job_id': job_id,
                'message': 'Kindle library sync started'
            }
            
        except Exception as e:
            logger.error(f"Failed to start Kindle sync: {e}")
            await amazon_auth_service.update_sync_status('kindle', 'error', str(e), user_id)
            return {'success': False, 'error': str(e)}
    
    async def _sync_kindle_library_task(self, job_id: int, user_id: str) -> None:
        """Background task for syncing Kindle library"""
        session = None
        try:
            await amazon_auth_service.update_sync_job(job_id, 'running')
            
            session = await self.get_kindle_session(user_id)
            if not session:
                raise Exception("Could not create Kindle session")
            
            # Get auth data for API calls
            auth_data = await amazon_auth_service.get_auth_credentials('kindle', user_id)
            credentials = auth_data['credentials']
            
            # Fetch library from Kindle Cloud Reader API
            logger.info("Fetching Kindle library...")
            library_items = await self._fetch_kindle_library(session, credentials)
            
            # Process library items
            metrics = {
                'books_found': len(library_items),
                'books_added': 0,
                'books_updated': 0,
                'books_failed': 0
            }
            
            logger.info(f"Processing {len(library_items)} Kindle items...")
            
            for item in library_items:
                try:
                    result = await self._process_kindle_item(item, user_id)
                    if result['action'] == 'added':
                        metrics['books_added'] += 1
                    elif result['action'] == 'updated':
                        metrics['books_updated'] += 1
                except Exception as e:
                    logger.error(f"Failed to process item {item.get('asin', 'unknown')}: {e}")
                    metrics['books_failed'] += 1
            
            # Complete sync job
            await amazon_auth_service.update_sync_job(job_id, 'completed', metrics)
            await amazon_auth_service.update_sync_status('kindle', 'completed', user_id=user_id)
            
            logger.info(f"Kindle sync completed: {metrics}")
            
        except Exception as e:
            logger.error(f"Kindle sync task failed: {e}")
            await amazon_auth_service.update_sync_job(job_id, 'failed', error=str(e))
            await amazon_auth_service.update_sync_status('kindle', 'error', str(e), user_id)
        
        finally:
            if session:
                await session.close()
    
    async def _fetch_kindle_library(self, session: aiohttp.ClientSession, credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch library items from Kindle Cloud Reader"""
        try:
            # Use the Kindle Cloud Reader API endpoint
            api_url = f"{credentials.get('reader_url', 'https://read.amazon.com')}/kindle-library/search"
            
            headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
            
            if credentials.get('csrf_token'):
                headers['X-CSRFToken'] = credentials['csrf_token']
            
            # Fetch library data
            params = {
                'query': '',
                'libraryType': 'BOOKS',
                'sortType': 'recency',
                'querySize': 50
            }
            
            library_items = []
            offset = 0
            
            while True:
                params['offset'] = offset
                
                async with session.get(api_url, params=params, headers=headers) as response:
                    if response.status != 200:
                        logger.warning(f"API request failed with status {response.status}")
                        break
                    
                    data = await response.json()
                    items = data.get('itemsList', [])
                    
                    if not items:
                        break
                    
                    library_items.extend(items)
                    
                    if len(items) < params['querySize']:
                        break
                    
                    offset += len(items)
                    await asyncio.sleep(1)  # Rate limiting
            
            return library_items
            
        except Exception as e:
            logger.error(f"Failed to fetch Kindle library: {e}")
            # Fallback: try to scrape from main library page
            return await self._scrape_kindle_library(session, credentials)
    
    async def _scrape_kindle_library(self, session: aiohttp.ClientSession, credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fallback: scrape library from main Kindle page"""
        try:
            reader_url = credentials.get('reader_url', 'https://read.amazon.com')
            
            async with session.get(reader_url) as response:
                if response.status != 200:
                    return []
                
                content = await response.text()
                
                # Extract library data from JavaScript
                library_match = re.search(r'window\.KindleLibraryData\s*=\s*({.*?});', content, re.DOTALL)
                if library_match:
                    try:
                        library_data = json.loads(library_match.group(1))
                        return library_data.get('items', [])
                    except json.JSONDecodeError:
                        logger.warning("Could not parse library data JSON")
                
                return []
                
        except Exception as e:
            logger.error(f"Failed to scrape Kindle library: {e}")
            return []
    
    async def _process_kindle_item(self, item: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Process a single Kindle library item"""
        try:
            asin = item.get('asin')
            if not asin:
                return {'action': 'skipped', 'reason': 'No ASIN'}
            
            # Store raw library item
            await self._store_raw_kindle_item(item, user_id)
            
            # Extract book information
            book_data = self._extract_book_data_from_kindle(item)
            
            # Try to find existing book by ISBN or ASIN
            book = await self._find_or_create_book(book_data)
            
            # Create or update Kindle edition
            edition_data = self._extract_edition_data_from_kindle(item)
            await self._create_or_update_edition(book.isbn, edition_data)
            
            return {'action': 'added' if not book else 'updated', 'isbn': book.isbn}
            
        except Exception as e:
            logger.error(f"Error processing Kindle item: {e}")
            raise
    
    def _extract_book_data_from_kindle(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Extract book data from Kindle API response"""
        title = item.get('title', 'Unknown Title')
        
        # Extract authors
        authors = []
        if 'authors' in item:
            if isinstance(item['authors'], list):
                authors = item['authors']
            elif isinstance(item['authors'], str):
                authors = [item['authors']]
        
        # Extract other metadata
        description = item.get('description', '')
        
        return {
            'title': title,
            'authors': authors,
            'description': description,
            'asin': item.get('asin'),
            'kindle_metadata': item
        }
    
    def _extract_edition_data_from_kindle(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Extract edition-specific data from Kindle item"""
        return {
            'edition_type': 'kindle',
            'format': 'azw',  # Default Kindle format
            'source': 'kindle_api',
            'asin': item.get('asin'),
            'kindle_asin': item.get('asin'),
            'title': item.get('title'),
            'is_owned': True,
            'amazon_metadata': item,
            'last_synced': datetime.utcnow(),
            'sync_source': 'kindle_api'
        }
    
    async def _store_raw_kindle_item(self, item: Dict[str, Any], user_id: str) -> None:
        """Store raw Kindle library item"""
        try:
            auth_data = await amazon_auth_service.get_auth_credentials('kindle', user_id)
            if not auth_data:
                return
            
            # Extract basic fields
            title = item.get('title', 'Unknown')
            authors = item.get('authors', [])
            if isinstance(authors, str):
                authors = [authors]
            
            library_item = AmazonLibraryItem(
                auth_id=auth_data['auth_id'],
                service='kindle',
                asin=item.get('asin'),
                title=title,
                authors=authors,
                description=item.get('description'),
                raw_data=item
            )
            
            async with AsyncSessionLocal() as session:
                session.add(library_item)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Failed to store raw Kindle library item: {e}")
    
    async def _find_or_create_book(self, book_data: Dict[str, Any]) -> BookModel:
        """Find existing book or create new one"""
        try:
            # Try to find existing book by ASIN or title/author
            async with AsyncSessionLocal() as session:
                existing_book = None
                
                # Try to find by title and first author
                if book_data.get('authors'):
                    result = await session.execute(
                        select(BookModel).where(
                            BookModel.title == book_data['title'],
                            BookModel.authors.contains([book_data['authors'][0]])
                        )
                    )
                    existing_book = result.scalar_one_or_none()
                
                if existing_book:
                    return existing_book
                
                # Create new book
                isbn = book_data.get('asin', f"KINDLE_{book_data.get('asin', 'UNKNOWN')}")
                
                new_book = BookModel(
                    isbn=isbn,
                    title=book_data['title'],
                    authors=book_data['authors'],
                    description=book_data.get('description', ''),
                    metadata_source='kindle_api',
                    added_date=datetime.utcnow(),
                    last_updated=datetime.utcnow()
                )
                
                session.add(new_book)
                await session.commit()
                
                logger.info(f"Created new book from Kindle: {new_book.title}")
                return new_book
                
        except Exception as e:
            logger.error(f"Failed to find or create book: {e}")
            raise
    
    async def _create_or_update_edition(self, book_isbn: str, edition_data: Dict[str, Any]) -> None:
        """Create or update book edition"""
        try:
            async with AsyncSessionLocal() as session:
                # Check if edition already exists
                result = await session.execute(
                    select(BookEdition).where(
                        BookEdition.book_isbn == book_isbn,
                        BookEdition.asin == edition_data['asin']
                    )
                )
                existing_edition = result.scalar_one_or_none()
                
                if existing_edition:
                    # Update existing edition
                    for key, value in edition_data.items():
                        if hasattr(existing_edition, key):
                            setattr(existing_edition, key, value)
                    existing_edition.updated_at = datetime.utcnow()
                else:
                    # Create new edition
                    edition = BookEdition(
                        book_isbn=book_isbn,
                        **edition_data
                    )
                    session.add(edition)
                
                await session.commit()
                
        except Exception as e:
            logger.error(f"Failed to create/update edition: {e}")
    
    async def _store_partial_auth_state(self, username: str, password: str, marketplace: str, user_id: str, session: aiohttp.ClientSession) -> str:
        """Store partial authentication state for 2FA completion"""
        import uuid
        session_id = str(uuid.uuid4())
        
        # Store in memory or cache for now (in production, use Redis/database)
        if not hasattr(self, '_partial_auth_states'):
            self._partial_auth_states = {}
        
        self._partial_auth_states[session_id] = {
            'username': username,
            'password': password,
            'marketplace': marketplace,
            'user_id': user_id,
            'session': session,  # Keep the session alive
            'timestamp': datetime.now()
        }
        
        logger.info(f"Stored partial Kindle auth state for session {session_id}")
        return session_id
    
    async def _complete_2fa_authentication(self, session_id: str, verification_code: str, marketplace: str, user_id: str) -> Dict[str, Any]:
        """Complete 2FA authentication with verification code"""
        try:
            # Retrieve partial auth state
            if not hasattr(self, '_partial_auth_states') or session_id not in self._partial_auth_states:
                return {'success': False, 'error': 'Invalid or expired authentication session'}
            
            auth_state = self._partial_auth_states[session_id]
            
            
            self.session = auth_state['session']
            
            # Submit the verification code
            marketplace_domain = "com" if marketplace == "us" else marketplace  
            cvf_url = f"https://www.amazon.{marketplace_domain}/ap/cvf/request"
            cvf_data = {
                'code': verification_code,
                'action': 'verifyChallengeAnswer',
                'openid.return_to': f"https://www.amazon.{marketplace_domain}/ap/signin",
                'openid.assoc_handle': 'amzn_siwa_us'
            }
            
            async with self.session.post(cvf_url, data=cvf_data, allow_redirects=True) as response:
                if response.status != 200:
                    raise Exception(f"CVF verification failed with status {response.status}")
                
                final_url = str(response.url)
                content = await response.text()
                
                if "ap/signin" in final_url or "verification" in content.lower():
                    raise Exception("Verification code incorrect or expired")
            
            # Clean up partial state
            del self._partial_auth_states[session_id]
            
            # Continue with authentication process
            reader_url = f"https://read.amazon.{marketplace_domain}"
            async with self.session.get(reader_url) as response:
                if response.status != 200:
                    raise Exception("Could not access Kindle Cloud Reader after 2FA")
                
                reader_content = await response.text()
                
                # Extract authentication tokens from the page
                csrf_token = None
                session_id = None
                
                # Look for CSRF token
                csrf_match = re.search(r'csrfToken["\']:[\s]*["\']([^"\']+)["\']', reader_content)
                if csrf_match:
                    csrf_token = csrf_match.group(1)
                
                # Look for session ID
                session_match = re.search(r'sessionId["\']:[\s]*["\']([^"\']+)["\']', reader_content)
                if session_match:
                    session_id = session_match.group(1)
            
            # Store authentication data
            auth_data = {
                'csrf_token': csrf_token,
                'session_id': session_id,
                'cookies': {cookie.key: cookie.value for cookie in self.session.cookie_jar},
                'marketplace': marketplace,
                'username': auth_state['username']
            }
            
            # Store encrypted credentials
            auth_id = await amazon_auth_service.store_auth_credentials(
                service='kindle',
                auth_data=auth_data,
                marketplace=marketplace,
                user_id=user_id
            )
            
            logger.info(f"Successfully completed 2FA authentication for Kindle user {auth_state['username']}")
            
            return {
                'success': True,
                'auth_id': auth_id,
                'marketplace': marketplace,
                'customer_name': auth_state['username']
            }
            
        except Exception as e:
            logger.error(f"2FA authentication completion failed: {e}")
            return {'success': False, 'error': str(e)}




# Global service instance
kindle_api_service = KindleAPIService()