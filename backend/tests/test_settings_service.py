"""
Tests for settings service
"""
import pytest
import asyncio
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, AsyncMock

from app.services.settings_service import (
    SettingsService,
    SettingsValidationError,
    SettingsStorageError
)
from app.models import Settings

class TestSettingsService:
    """Test cases for SettingsService"""
    
    @pytest.fixture
    def temp_settings_file(self):
        """Create a temporary settings file for testing"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            yield f.name
        os.unlink(f.name)
    
    @pytest.fixture
    def settings_service(self, temp_settings_file):
        """Create a settings service instance with temporary file"""
        return SettingsService(temp_settings_file)
    
    @pytest.mark.asyncio
    async def test_get_default_settings(self, settings_service):
        """Test getting default settings when no file exists"""
        settings = await settings_service.get_settings()
        
        assert isinstance(settings, Settings)
        assert settings.skoolib_url is None
        assert settings.google_books_api_key is None
        assert settings.cache_ttl == 3600
        assert settings.enable_price_lookup is True
        assert settings.default_language == "en"
    
    @pytest.mark.asyncio
    async def test_update_settings(self, settings_service):
        """Test updating settings"""
        update_data = {
            "skoolib_url": "https://example.com/skoolib",
            "cache_ttl": 7200,
            "enable_price_lookup": False
        }
        
        updated_settings = await settings_service.update_settings(update_data)
        
        assert updated_settings.skoolib_url == "https://example.com/skoolib"
        assert updated_settings.cache_ttl == 7200
        assert updated_settings.enable_price_lookup is False
        assert updated_settings.default_language == "en"  # Should retain default
    
    @pytest.mark.asyncio
    async def test_settings_persistence(self, settings_service):
        """Test that settings are persisted across service instances"""
        # Update settings
        update_data = {"skoolib_url": "https://test.com"}
        await settings_service.update_settings(update_data)
        
        # Create new service instance with same file
        new_service = SettingsService(settings_service.settings_file)
        settings = await new_service.get_settings()
        
        assert settings.skoolib_url == "https://test.com"
    
    @pytest.mark.asyncio
    async def test_invalid_cache_ttl(self, settings_service):
        """Test validation of cache TTL"""
        # Test too low
        with pytest.raises(SettingsValidationError, match="at least 60 seconds"):
            await settings_service.update_settings({"cache_ttl": 30})
        
        # Test too high
        with pytest.raises(SettingsValidationError, match="at most 24 hours"):
            await settings_service.update_settings({"cache_ttl": 90000})
    
    @pytest.mark.asyncio
    async def test_invalid_url(self, settings_service):
        """Test validation of Skoolib URL"""
        with pytest.raises(SettingsValidationError, match="must start with http"):
            await settings_service.update_settings({"skoolib_url": "ftp://example.com"})
    
    @pytest.mark.asyncio
    async def test_invalid_language(self, settings_service):
        """Test validation of language code"""
        with pytest.raises(SettingsValidationError, match="must be 2 characters"):
            await settings_service.update_settings({"default_language": "english"})
    
    @pytest.mark.asyncio
    async def test_reset_settings(self, settings_service):
        """Test resetting settings to defaults"""
        # First update some settings
        await settings_service.update_settings({
            "skoolib_url": "https://example.com",
            "cache_ttl": 7200
        })
        
        # Reset to defaults
        default_settings = await settings_service.reset_settings()
        
        assert default_settings.skoolib_url is None
        assert default_settings.cache_ttl == 3600
        assert default_settings.enable_price_lookup is True
    
    @pytest.mark.asyncio
    async def test_backup_and_restore(self, settings_service):
        """Test backing up and restoring settings"""
        # Set some custom settings
        original_settings = await settings_service.update_settings({
            "skoolib_url": "https://example.com",
            "cache_ttl": 7200
        })
        
        # Create backup
        backup_file = await settings_service.backup_settings()
        
        try:
            # Modify settings
            await settings_service.update_settings({"cache_ttl": 3600})
            
            # Restore from backup
            restored_settings = await settings_service.restore_settings(backup_file)
            
            assert restored_settings.skoolib_url == "https://example.com"
            assert restored_settings.cache_ttl == 7200
            
        finally:
            # Clean up backup file
            if os.path.exists(backup_file):
                os.unlink(backup_file)
    
    @pytest.mark.asyncio
    async def test_settings_caching(self, settings_service):
        """Test that settings are cached properly"""
        # Mock file operations to test caching
        with patch('aiofiles.open', AsyncMock()) as mock_open:
            # First call should read from file
            await settings_service.get_settings()
            
            # Second call should use cache (no file operations)
            await settings_service.get_settings()
            
            # Should have only called file operations once
            assert mock_open.call_count <= 1
    
    @pytest.mark.asyncio
    @patch('app.services.settings_service.SkoolibParser')
    async def test_validate_skoolib_url_success(self, mock_parser_class, settings_service):
        """Test successful Skoolib URL validation"""
        mock_parser = AsyncMock()
        mock_parser_class.return_value = mock_parser
        mock_parser.fetch_html.return_value = "<html>Mock HTML</html>"
        mock_parser.extract_isbns.return_value = ["9781234567890", "9780987654321"]
        
        result = await settings_service.validate_skoolib_url("https://example.com/skoolib")
        
        assert result["valid"] is True
        assert result["isbn_count"] == 2
        assert len(result["sample_isbns"]) == 2
    
    @pytest.mark.asyncio
    @patch('app.services.settings_service.SkoolibParser')
    async def test_validate_skoolib_url_no_isbns(self, mock_parser_class, settings_service):
        """Test Skoolib URL validation with no ISBNs found"""
        mock_parser = AsyncMock()
        mock_parser_class.return_value = mock_parser
        mock_parser.fetch_html.return_value = "<html>Mock HTML</html>"
        mock_parser.extract_isbns.return_value = []
        
        result = await settings_service.validate_skoolib_url("https://example.com/skoolib")
        
        assert result["valid"] is True
        assert "warning" in result
        assert result["isbn_count"] == 0
    
    @pytest.mark.asyncio
    async def test_validate_skoolib_url_invalid_url(self, settings_service):
        """Test validation of invalid URLs"""
        # Empty URL
        result = await settings_service.validate_skoolib_url("")
        assert result["valid"] is False
        assert "required" in result["error"]
        
        # Invalid protocol
        result = await settings_service.validate_skoolib_url("ftp://example.com")
        assert result["valid"] is False
        assert "http" in result["error"]
    
    @pytest.mark.asyncio
    @patch('app.services.settings_service.SkoolibParser')
    async def test_validate_skoolib_url_fetch_error(self, mock_parser_class, settings_service):
        """Test Skoolib URL validation with fetch error"""
        mock_parser = AsyncMock()
        mock_parser_class.return_value = mock_parser
        mock_parser.fetch_html.return_value = None
        
        result = await settings_service.validate_skoolib_url("https://example.com/skoolib")
        
        assert result["valid"] is False
        assert "Failed to fetch" in result["error"]
    
    @pytest.mark.asyncio
    async def test_concurrent_settings_access(self, settings_service):
        """Test concurrent access to settings"""
        async def update_settings(value):
            await settings_service.update_settings({"cache_ttl": value})
        
        # Run multiple concurrent updates
        await asyncio.gather(
            update_settings(1800),
            update_settings(3600),
            update_settings(7200)
        )
        
        # Final settings should be one of the values
        final_settings = await settings_service.get_settings()
        assert final_settings.cache_ttl in [1800, 3600, 7200]
    
    def test_settings_file_info(self, settings_service):
        """Test getting settings file information"""
        info = settings_service.get_settings_info()
        
        assert "file_path" in info
        assert "exists" in info
        assert isinstance(info["exists"], bool)
        
        if info["exists"]:
            assert "file_size" in info
            assert "last_modified" in info
    
    @pytest.mark.asyncio
    async def test_corrupted_settings_file(self, temp_settings_file):
        """Test handling of corrupted settings file"""
        # Write invalid JSON to file
        with open(temp_settings_file, 'w') as f:
            f.write("invalid json content")
        
        service = SettingsService(temp_settings_file)
        
        # Should return default settings without crashing
        settings = await service.get_settings()
        assert isinstance(settings, Settings)
    
    @pytest.mark.asyncio
    async def test_settings_file_permission_error(self, settings_service):
        """Test handling of file permission errors"""
        # Make settings file read-only
        settings_file = settings_service.settings_file
        
        # Create the file first
        await settings_service.get_settings()
        
        # Make it read-only
        os.chmod(settings_file, 0o444)
        
        try:
            # Should raise SettingsStorageError
            with pytest.raises(SettingsStorageError):
                await settings_service.update_settings({"cache_ttl": 7200})
        finally:
            # Restore permissions for cleanup
            os.chmod(settings_file, 0o644)