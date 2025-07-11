"""
Audible library synchronization service using python-audible
"""
import asyncio
import re
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

try:
    import audible
    AUDIBLE_AVAILABLE = True
except ImportError:
    AUDIBLE_AVAILABLE = False
    audible = None

from app.database.connection import AsyncSessionLocal
from app.database.models import BookModel
from app.database.models_amazon import AmazonLibraryItem, BookEdition
from app.services.amazon_auth_service import amazon_auth_service
from app.services.metadata_enhancement_service import metadata_enhancement_service
from app.config.logging import get_logger

logger = get_logger(__name__)


class AudibleSyncService:
    """Service for syncing Audible library using python-audible"""
    
    def __init__(self):
        if not AUDIBLE_AVAILABLE:
            logger.warning("python-audible not installed. Audible sync disabled.")
        self.marketplace_domains = {
            'us': 'audible.com',
            'uk': 'audible.co.uk', 
            'de': 'audible.de',
            'fr': 'audible.fr',
            'ca': 'audible.ca',
            'au': 'audible.com.au',
            'in': 'audible.in',
            'it': 'audible.it',
            'es': 'audible.es',
            'jp': 'audible.co.jp'
        }
    
    def _check_audible_available(self) -> bool:
        """Check if audible library is available"""
        if not AUDIBLE_AVAILABLE:
            logger.error("python-audible library not installed")
            return False
        return True
    
    async def authenticate_with_credentials(
        self,
        username: str,
        password: str,
        marketplace: str = "us",
        user_id: str = "default"
    ) -> Dict[str, Any]:
        """Authenticate with Audible using username/password"""
        if not self._check_audible_available():
            return {'success': False, 'error': 'Audible library not available'}
        
        try:
            # Create auth object for the specified marketplace
            auth = audible.Authenticator.from_login(
                username=username,
                password=password,
                locale=marketplace,
                with_username=False
            )
            
            # Get the authentication data
            auth_data = {
                'access_token': auth.access_token,
                'refresh_token': auth.refresh_token,
                'device_private_key': auth.device_private_key,
                'adp_token': auth.adp_token,
                'device_info': auth.device_info,
                'customer_info': auth.customer_info,
                'expires': auth.expires.isoformat() if auth.expires else None,
                'locale': auth.locale,
                'username': username
            }
            
            # Store encrypted credentials
            auth_id = await amazon_auth_service.store_auth_credentials(
                service='audible',
                auth_data=auth_data,
                marketplace=marketplace,
                user_id=user_id
            )
            
            logger.info(f"Successfully authenticated Audible user {username} in marketplace {marketplace}")
            
            return {
                'success': True,
                'auth_id': auth_id,
                'marketplace': marketplace,
                'customer_name': auth_data.get('customer_info', {}).get('name', 'Unknown')
            }
            
        except Exception as e:
            logger.error(f"Audible authentication failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_audible_client(self, user_id: str = "default") -> Optional[audible.Client]:
        """Get authenticated Audible client"""
        if not self._check_audible_available():
            return None
            
        try:
            auth_data = await amazon_auth_service.get_auth_credentials('audible', user_id)
            if not auth_data:
                return None
            
            credentials = auth_data['credentials']
            
            # Recreate auth object from stored credentials
            auth = audible.Authenticator(
                locale=credentials.get('locale', 'us'),
                access_token=credentials.get('access_token'),
                refresh_token=credentials.get('refresh_token'),
                device_private_key=credentials.get('device_private_key'),
                adp_token=credentials.get('adp_token'),
                device_info=credentials.get('device_info'),
                customer_info=credentials.get('customer_info')
            )
            
            # Set expires if available
            if credentials.get('expires'):
                auth.expires = datetime.fromisoformat(credentials['expires'])
            
            return audible.Client(auth=auth)
            
        except Exception as e:
            logger.error(f"Failed to create Audible client: {e}")
            return None
    
    async def sync_audible_library(self, user_id: str = "default") -> Dict[str, Any]:
        """Sync complete Audible library"""
        if not await amazon_auth_service.is_authenticated('audible', user_id):
            return {'success': False, 'error': 'Not authenticated with Audible'}
        
        try:
            # Update sync status
            await amazon_auth_service.update_sync_status('audible', 'syncing', user_id=user_id)
            
            # Get auth data for job creation
            auth_data = await amazon_auth_service.get_auth_credentials('audible', user_id)
            if not auth_data:
                return {'success': False, 'error': 'Auth data not found'}
            
            # Create sync job
            job_id = await amazon_auth_service.create_sync_job(
                auth_id=auth_data['auth_id'],
                job_type='full_sync',
                service='audible'
            )
            
            # Start sync in background
            asyncio.create_task(self._sync_audible_library_task(job_id, user_id))
            
            return {
                'success': True,
                'job_id': job_id,
                'message': 'Audible library sync started'
            }
            
        except Exception as e:
            logger.error(f"Failed to start Audible sync: {e}")
            await amazon_auth_service.update_sync_status('audible', 'error', str(e), user_id)
            return {'success': False, 'error': str(e)}
    
    async def _sync_audible_library_task(self, job_id: int, user_id: str) -> None:
        """Background task for syncing Audible library"""
        try:
            await amazon_auth_service.update_sync_job(job_id, 'running')
            
            client = await self.get_audible_client(user_id)
            if not client:
                raise Exception("Could not create Audible client")
            
            # Fetch library from Audible
            logger.info("Fetching Audible library...")
            library_items = []
            page = 1
            
            while True:
                try:
                    response = await client.get(
                        "library",
                        num_results=1000,
                        page=page,
                        response_groups="contributors,media,price,product_attrs,product_desc,product_extended_attrs,product_plan_details,product_plans,rating,sample,sku,series,ws4v,origin_asin,percent_complete,provided_review"
                    )
                    
                    if not response.get('items'):
                        break
                    
                    library_items.extend(response['items'])
                    
                    if len(response['items']) < 1000:
                        break
                    
                    page += 1
                    await asyncio.sleep(1)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Error fetching library page {page}: {e}")
                    break
            
            # Process library items
            metrics = {
                'books_found': len(library_items),
                'books_added': 0,
                'books_updated': 0,
                'books_failed': 0
            }
            
            logger.info(f"Processing {len(library_items)} Audible items...")
            
            for item in library_items:
                try:
                    result = await self._process_audible_item(item, user_id)
                    if result['action'] == 'added':
                        metrics['books_added'] += 1
                    elif result['action'] == 'updated':
                        metrics['books_updated'] += 1
                except Exception as e:
                    logger.error(f"Failed to process item {item.get('asin', 'unknown')}: {e}")
                    metrics['books_failed'] += 1
            
            # Complete sync job
            await amazon_auth_service.update_sync_job(job_id, 'completed', metrics)
            await amazon_auth_service.update_sync_status('audible', 'completed', user_id=user_id)
            
            logger.info(f"Audible sync completed: {metrics}")
            
        except Exception as e:
            logger.error(f"Audible sync task failed: {e}")
            await amazon_auth_service.update_sync_job(job_id, 'failed', error=str(e))
            await amazon_auth_service.update_sync_status('audible', 'error', str(e), user_id)
    
    async def _process_audible_item(self, item: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Process a single Audible library item"""
        try:
            asin = item.get('asin')
            if not asin:
                return {'action': 'skipped', 'reason': 'No ASIN'}
            
            # Store raw library item
            await self._store_raw_library_item(item, user_id)
            
            # Extract book information
            book_data = self._extract_book_data_from_audible(item)
            
            # Try to find existing book by ISBN or ASIN
            book = await self._find_or_create_book(book_data)
            
            # Create or update Audible edition
            edition_data = self._extract_edition_data_from_audible(item)
            await self._create_or_update_edition(book.isbn, edition_data)
            
            return {'action': 'added' if not book else 'updated', 'isbn': book.isbn}
            
        except Exception as e:
            logger.error(f"Error processing Audible item: {e}")
            raise
    
    def _extract_book_data_from_audible(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Extract book data from Audible API response"""
        title = item.get('title', 'Unknown Title')
        subtitle = item.get('subtitle')
        if subtitle:
            title = f"{title}: {subtitle}"
        
        # Extract authors
        authors = []
        if 'authors' in item:
            authors = [author.get('name', '') for author in item['authors']]
        
        # Extract narrator
        narrator = None
        if 'narrators' in item:
            narrator = ', '.join([n.get('name', '') for n in item['narrators']])
        
        # Extract other metadata
        description = item.get('publisher_summary', '')
        if not description and 'product_desc' in item:
            description = item['product_desc']
        
        release_date = item.get('release_date')
        if release_date:
            try:
                release_date = datetime.fromisoformat(release_date.replace('Z', '+00:00'))
            except:
                release_date = None
        
        return {
            'title': title,
            'authors': authors,
            'description': description,
            'published_date': release_date.date() if release_date else None,
            'narrator': narrator,
            'categories': item.get('category_ladders', []),
            'asin': item.get('asin'),
            'audible_metadata': item
        }
    
    def _extract_edition_data_from_audible(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Extract edition-specific data from Audible item"""
        purchase_date = item.get('purchase_date')
        if purchase_date:
            try:
                purchase_date = datetime.fromisoformat(purchase_date.replace('Z', '+00:00'))
            except:
                purchase_date = None
        
        duration_minutes = None
        if 'runtime_length_min' in item:
            duration_minutes = item['runtime_length_min']
        
        return {
            'edition_type': 'audible',
            'format': 'aax',  # Default Audible format
            'source': 'audible',
            'asin': item.get('asin'),
            'audible_asin': item.get('asin'),
            'title': item.get('title'),
            'subtitle': item.get('subtitle'),
            'narrator': ', '.join([n.get('name', '') for n in item.get('narrators', [])]) or None,
            'duration_minutes': duration_minutes,
            'purchase_date': purchase_date,
            'is_owned': True,
            'amazon_metadata': item,
            'last_synced': datetime.utcnow(),
            'sync_source': 'audible_api'
        }
    
    async def _store_raw_library_item(self, item: Dict[str, Any], user_id: str) -> None:
        """Store raw Audible library item"""
        try:
            auth_data = await amazon_auth_service.get_auth_credentials('audible', user_id)
            if not auth_data:
                return
            
            # Extract basic fields
            title = item.get('title', 'Unknown')
            authors = [author.get('name') for author in item.get('authors', [])]
            
            library_item = AmazonLibraryItem(
                auth_id=auth_data['auth_id'],
                service='audible',
                asin=item.get('asin'),
                title=title,
                subtitle=item.get('subtitle'),
                authors=authors,
                narrator=', '.join([n.get('name', '') for n in item.get('narrators', [])]) or None,
                publisher=item.get('publisher_name'),
                description=item.get('publisher_summary'),
                genres=item.get('category_ladders', []),
                duration_minutes=item.get('runtime_length_min'),
                cover_url=item.get('product_images', {}).get('500'),
                raw_data=item
            )
            
            async with AsyncSessionLocal() as session:
                session.add(library_item)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Failed to store raw library item: {e}")
    
    async def _find_or_create_book(self, book_data: Dict[str, Any]) -> BookModel:
        """Find existing book or create new one"""
        try:
            # Try to find existing book by ASIN or title/author
            async with AsyncSessionLocal() as session:
                # Check if we already have this book
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
                # Generate ISBN from ASIN if no ISBN available
                isbn = book_data.get('asin', f"AUDIBLE_{book_data.get('asin', 'UNKNOWN')}")
                
                new_book = BookModel(
                    isbn=isbn,
                    title=book_data['title'],
                    authors=book_data['authors'],
                    description=book_data.get('description', ''),
                    published_date=book_data.get('published_date'),
                    categories=book_data.get('categories', []),
                    metadata_source='audible',
                    added_date=datetime.utcnow(),
                    last_updated=datetime.utcnow()
                )
                
                session.add(new_book)
                await session.commit()
                
                logger.info(f"Created new book from Audible: {new_book.title}")
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


# Global service instance
audible_sync_service = AudibleSyncService()