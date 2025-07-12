"""
Comprehensive tests for Amazon integration (Audible and Kindle)
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
import json

from app.services.amazon_auth_service import amazon_auth_service
from app.services.audible_sync_service import audible_sync_service
from app.services.kindle_sync_service import kindle_sync_service


class TestAmazonAuthService:
    """Test Amazon authentication service"""
    
    @pytest.mark.asyncio
    async def test_encryption_key_generation(self):
        """Test encryption key generation and storage"""
        service = amazon_auth_service
        
        # Test that encryption key exists
        assert service.encryption_key is not None
        assert len(service.encryption_key) > 0
        
        # Test encryption/decryption
        test_data = {"username": "test", "password": "secret"}
        encrypted = service._encrypt_auth_data(test_data)
        decrypted = service._decrypt_auth_data(encrypted)
        
        assert decrypted == test_data
    
    @pytest.mark.asyncio
    async def test_store_and_retrieve_credentials(self):
        """Test storing and retrieving credentials"""
        test_auth_data = {
            "access_token": "test_token",
            "refresh_token": "test_refresh",
            "username": "test@example.com"
        }
        
        # Store credentials
        auth_id = await amazon_auth_service.store_auth_credentials(
            service='test_service',
            auth_data=test_auth_data,
            marketplace='us',
            user_id='test_user'
        )
        
        assert auth_id is not None
        
        # Retrieve credentials
        retrieved = await amazon_auth_service.get_auth_credentials(
            service='test_service',
            user_id='test_user'
        )
        
        assert retrieved is not None
        assert retrieved['credentials']['username'] == test_auth_data['username']
        assert retrieved['marketplace'] == 'us'
        
        # Test authentication check
        is_auth = await amazon_auth_service.is_authenticated('test_service', 'test_user')
        assert is_auth is True
        
        # Clean up
        await amazon_auth_service.revoke_auth('test_service', 'test_user')
    
    @pytest.mark.asyncio
    async def test_sync_job_management(self):
        """Test sync job creation and management"""
        # First create auth entry
        auth_id = await amazon_auth_service.store_auth_credentials(
            service='test_service',
            auth_data={"test": "data"},
            marketplace='us',
            user_id='test_user'
        )
        
        # Create sync job
        job_id = await amazon_auth_service.create_sync_job(
            auth_id=auth_id,
            job_type='test_sync',
            service='test_service',
            job_data={"test": "job_data"}
        )
        
        assert job_id is not None
        
        # Update sync job
        await amazon_auth_service.update_sync_job(
            job_id=job_id,
            status='running',
            metrics={'books_found': 10, 'books_added': 5}
        )
        
        # Get sync jobs
        jobs = await amazon_auth_service.get_sync_jobs(
            service='test_service',
            user_id='test_user'
        )
        
        assert len(jobs) > 0
        assert jobs[0]['status'] == 'running'
        assert jobs[0]['books_found'] == 10
        
        # Clean up
        await amazon_auth_service.revoke_auth('test_service', 'test_user')


class TestAudibleSyncService:
    """Test Audible sync service"""
    
    def test_audible_availability_check(self):
        """Test Audible library availability"""
        service = audible_sync_service
        assert service._check_audible_available() is True
    
    def test_marketplace_domains(self):
        """Test marketplace domain mapping"""
        service = audible_sync_service
        assert service.marketplace_domains['us'] == 'audible.com'
        assert service.marketplace_domains['uk'] == 'audible.co.uk'
        assert service.marketplace_domains['de'] == 'audible.de'
    
    def test_extract_book_data_from_audible(self):
        """Test extracting book data from Audible API response"""
        service = audible_sync_service
        
        # Mock Audible API response
        audible_item = {
            'title': 'Test Book',
            'subtitle': 'A Great Story',
            'authors': [{'name': 'Test Author'}],
            'narrators': [{'name': 'Test Narrator'}],
            'publisher_summary': 'A test book description',
            'release_date': '2023-01-15T00:00:00Z',
            'asin': 'B0TEST123',
            'category_ladders': [['Fiction', 'Mystery']]
        }
        
        book_data = service._extract_book_data_from_audible(audible_item)
        
        assert book_data['title'] == 'Test Book: A Great Story'
        assert book_data['authors'] == ['Test Author']
        assert book_data['narrator'] == 'Test Narrator'
        assert book_data['description'] == 'A test book description'
        assert book_data['asin'] == 'B0TEST123'
    
    def test_extract_edition_data_from_audible(self):
        """Test extracting edition data from Audible item"""
        service = audible_sync_service
        
        audible_item = {
            'asin': 'B0TEST123',
            'title': 'Test Book',
            'subtitle': 'A Great Story',
            'narrators': [{'name': 'Test Narrator'}],
            'runtime_length_min': 480,
            'purchase_date': '2023-01-15T10:30:00Z'
        }
        
        edition_data = service._extract_edition_data_from_audible(audible_item)
        
        assert edition_data['edition_type'] == 'audible'
        assert edition_data['format'] == 'aax'
        assert edition_data['asin'] == 'B0TEST123'
        assert edition_data['narrator'] == 'Test Narrator'
        assert edition_data['duration_minutes'] == 480
        assert edition_data['is_owned'] is True
    
    @pytest.mark.asyncio
    @patch('app.services.audible_sync_service.audible')
    async def test_authenticate_with_credentials_mock(self, mock_audible):
        """Test authentication with mocked audible library"""
        service = audible_sync_service
        
        # Mock successful authentication
        mock_auth = Mock()
        mock_auth.access_token = 'test_token'
        mock_auth.refresh_token = 'test_refresh'
        mock_auth.device_private_key = 'test_key'
        mock_auth.adp_token = 'test_adp'
        mock_auth.device_info = {'device_type': 'test'}
        mock_auth.customer_info = {'name': 'Test User'}
        mock_auth.expires = datetime(2024, 12, 31)
        mock_auth.locale = 'us'
        
        mock_audible.Authenticator.from_login.return_value = mock_auth
        
        result = await service.authenticate_with_credentials(
            username='test@example.com',
            password='testpass',
            marketplace='us',
            user_id='test_user'
        )
        
        assert result['success'] is True
        assert result['customer_name'] == 'Test User'
        assert result['marketplace'] == 'us'
        
        # Clean up
        await amazon_auth_service.revoke_auth('audible', 'test_user')


class TestKindleSyncService:
    """Test Kindle sync service"""
    
    def test_supported_formats(self):
        """Test supported Kindle formats"""
        service = kindle_sync_service
        expected_formats = ['azw', 'azw3', 'mobi', 'pdf', 'epub', 'txt']
        assert service.supported_formats == expected_formats
    
    def test_extract_book_data_from_csv(self):
        """Test extracting book data from CSV row"""
        service = kindle_sync_service
        
        csv_row = {
            'Title': 'Test Kindle Book',
            'Author': 'Test Author',
            'ASIN': 'B0KINDLE123',
            'Description': 'A test Kindle book'
        }
        
        book_data = service._extract_book_data_from_csv(csv_row)
        
        assert book_data['title'] == 'Test Kindle Book'
        assert book_data['authors'] == ['Test Author']
        assert book_data['asin'] == 'B0KINDLE123'
        assert book_data['description'] == 'A test Kindle book'
    
    def test_extract_book_data_from_json(self):
        """Test extracting book data from JSON item"""
        service = kindle_sync_service
        
        json_item = {
            'title': 'Test Kindle Book JSON',
            'authors': ['Test Author 1', 'Test Author 2'],
            'asin': 'B0KINDLEJSON',
            'description': 'A test Kindle book from JSON'
        }
        
        book_data = service._extract_book_data_from_json(json_item)
        
        assert book_data['title'] == 'Test Kindle Book JSON'
        assert book_data['authors'] == ['Test Author 1', 'Test Author 2']
        assert book_data['asin'] == 'B0KINDLEJSON'
    
    def test_extract_book_data_from_file(self):
        """Test extracting book data from file info"""
        service = kindle_sync_service
        
        file_info = {
            'filename': 'Author Name - Book Title.azw3',
            'path': '/kindle/documents/Author Name - Book Title.azw3',
            'size': 1024 * 1024,  # 1MB
            'modified': datetime(2023, 1, 15)
        }
        
        book_data = service._extract_book_data_from_file(file_info)
        
        assert book_data['title'] == 'Book Title'
        assert book_data['authors'] == ['Author Name']
        assert book_data['filename'] == 'Author Name - Book Title.azw3'
    
    def test_extract_kindle_edition_data(self):
        """Test extracting Kindle edition data"""
        service = kindle_sync_service
        
        # Test device source
        device_item = {
            'filename': 'test_book.azw3',
            'path': '/kindle/documents/test_book.azw3',
            'size': 2048 * 1024,  # 2MB
            'asin': 'B0KINDLE456'
        }
        
        edition_data = service._extract_kindle_edition_data(device_item, 'device')
        
        assert edition_data['edition_type'] == 'kindle'
        assert edition_data['format'] == 'azw3'
        assert edition_data['source'] == 'kindle'
        assert edition_data['file_size_mb'] == 2
        assert edition_data['is_downloaded'] is True
        assert edition_data['sync_source'] == 'kindle_device'
    
    @pytest.mark.asyncio
    async def test_import_kindle_library_csv_mock(self):
        """Test CSV import with mock data"""
        service = kindle_sync_service
        
        csv_content = """Title,Author,ASIN,Description
Test Book 1,Test Author 1,B0TEST001,First test book
Test Book 2,Test Author 2,B0TEST002,Second test book"""
        
        result = await service.import_kindle_library_csv(
            csv_content=csv_content,
            user_id='test_user'
        )
        
        assert result['success'] is True
        assert result['items_found'] == 2
        assert result['job_id'] is not None
        
        # Clean up
        await amazon_auth_service.revoke_auth('kindle', 'test_user')
    
    @pytest.mark.asyncio
    async def test_import_kindle_library_json_mock(self):
        """Test JSON import with mock data"""
        service = kindle_sync_service
        
        json_content = json.dumps([
            {
                'title': 'Test JSON Book 1',
                'authors': ['JSON Author 1'],
                'asin': 'B0JSON001',
                'description': 'First JSON test book'
            },
            {
                'title': 'Test JSON Book 2',
                'authors': ['JSON Author 2'],
                'asin': 'B0JSON002',
                'description': 'Second JSON test book'
            }
        ])
        
        result = await service.import_kindle_library_json(
            json_content=json_content,
            user_id='test_user'
        )
        
        assert result['success'] is True
        assert result['items_found'] == 2
        assert result['job_id'] is not None
        
        # Clean up
        await amazon_auth_service.revoke_auth('kindle', 'test_user')


class TestAmazonIntegrationFlow:
    """Test complete Amazon integration flow"""
    
    @pytest.mark.asyncio
    async def test_audible_authentication_flow(self):
        """Test complete Audible authentication and setup flow"""
        # This would be a mock test for the full flow
        # In real scenario, would require actual Audible credentials
        
        # Test that the services are properly initialized
        assert audible_sync_service is not None
        assert amazon_auth_service is not None
        
        # Test that required methods exist
        assert hasattr(audible_sync_service, 'authenticate_with_credentials')
        assert hasattr(audible_sync_service, 'sync_audible_library')
        assert hasattr(audible_sync_service, 'get_audible_client')
    
    @pytest.mark.asyncio
    async def test_kindle_import_flow(self):
        """Test complete Kindle import flow"""
        # Test that the services are properly initialized
        assert kindle_sync_service is not None
        
        # Test that required methods exist
        assert hasattr(kindle_sync_service, 'import_kindle_library_csv')
        assert hasattr(kindle_sync_service, 'import_kindle_library_json')
        assert hasattr(kindle_sync_service, 'scan_kindle_device')


if __name__ == "__main__":
    pytest.main([__file__, "-v"])