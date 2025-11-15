"""
Tests for integration manager and external service clients
"""
import pytest
import asyncio
from typing import Optional

# Import integration components
try:
    from backend.services.integration_manager import (
        IntegrationManager, MetadataSource, get_integration_manager
    )
    from backend.clients.myanimelist import MyAnimeListClient
    from backend.clients.goodreads import GoodreadsClient
    from backend.clients.anilist import AniListClient
except ImportError:
    from services.integration_manager import (
        IntegrationManager, MetadataSource, get_integration_manager
    )
    from clients.myanimelist import MyAnimeListClient
    from clients.goodreads import GoodreadsClient
    from clients.anilist import AniListClient


class TestAniListClient:
    """Tests for AniList integration"""

    @pytest.mark.asyncio
    async def test_anilist_client_initialization(self):
        """Test that AniListClient initializes properly"""
        client = AniListClient()
        assert client.base_url == "https://graphql.anilist.co"
        assert client.session is None

    @pytest.mark.asyncio
    async def test_anilist_normalize_series_name(self):
        """Test series name normalization"""
        client = AniListClient()

        # Test known mapping
        normalized = client._normalize_series_name("bleach")
        assert normalized == "Bleach"

        # Test general capitalization
        normalized = client._normalize_series_name("my hero academia")
        assert normalized.lower() in normalized.lower()

    def test_anilist_get_known_volume_data(self):
        """Test known volume data retrieval"""
        client = AniListClient()

        # Test Bleach (known series with 74 volumes)
        bleach_data = client._get_known_volume_data("Bleach")
        assert len(bleach_data) == 74
        assert 1 in bleach_data
        assert 74 in bleach_data
        assert bleach_data[1]["title"] == "Bleach, Vol. 1: Strawberry and the Soul Reapers"

    @pytest.mark.asyncio
    async def test_anilist_client_cleanup(self):
        """Test client cleanup"""
        client = AniListClient()
        await client.close()
        assert client.session is None


class TestMyAnimeListClient:
    """Tests for MyAnimeList integration"""

    def test_mal_client_initialization(self):
        """Test MyAnimeListClient initialization"""
        client = MyAnimeListClient()
        assert client.base_url == "https://api.myanimelist.net/v2"
        assert client.client_id is None

    def test_mal_client_set_client_id(self):
        """Test setting client ID"""
        client = MyAnimeListClient()
        client.set_client_id("test_client_id")
        assert client.client_id == "test_client_id"

    def test_mal_normalize_status(self):
        """Test status normalization"""
        client = MyAnimeListClient()

        assert client._normalize_status("currently_publishing") == "ongoing"
        assert client._normalize_status("finished") == "completed"
        assert client._normalize_status("not_yet_published") == "upcoming"
        assert client._normalize_status("unknown") == "unknown"

    @pytest.mark.asyncio
    async def test_mal_client_cleanup(self):
        """Test client cleanup"""
        client = MyAnimeListClient()
        await client.close()
        assert client.session is None


class TestGoodreadsClient:
    """Tests for Goodreads integration"""

    def test_goodreads_client_initialization(self):
        """Test GoodreadsClient initialization"""
        client = GoodreadsClient()
        assert client.base_url == "https://www.goodreads.com/api"
        assert client.api_key is None

    def test_goodreads_set_api_key(self):
        """Test setting API key"""
        client = GoodreadsClient()
        client.set_api_key("test_api_key")
        assert client.api_key == "test_api_key"

    def test_goodreads_get_text(self):
        """Test XML text extraction"""
        import xml.etree.ElementTree as ET

        xml_str = '<root><field>Test Value</field></root>'
        root = ET.fromstring(xml_str)

        text = GoodreadsClient._get_text(root, "field")
        assert text == "Test Value"

        text = GoodreadsClient._get_text(root, "missing")
        assert text is None

    @pytest.mark.asyncio
    async def test_goodreads_client_cleanup(self):
        """Test client cleanup"""
        client = GoodreadsClient()
        await client.close()
        assert client.session is None


class TestIntegrationManager:
    """Tests for IntegrationManager"""

    def test_integration_manager_initialization(self):
        """Test IntegrationManager initialization"""
        manager = IntegrationManager()

        # Check clients are initialized
        assert manager.anilist_client is not None
        assert manager.mal_client is not None
        assert manager.goodreads_client is not None
        assert manager.google_books_client is not None
        assert manager.openlibrary_client is not None

    def test_integration_manager_preferences(self):
        """Test preference management"""
        manager = IntegrationManager()

        # Get default preferences
        prefs = manager.get_user_preferences()
        assert prefs["primary_source"] == MetadataSource.GOOGLE_BOOKS
        assert prefs["manga_source"] == MetadataSource.ANILIST
        assert prefs["enable_anilist"] is True
        assert prefs["enable_mal"] is False

    def test_integration_manager_update_preferences(self):
        """Test updating preferences"""
        manager = IntegrationManager()

        new_prefs = {
            "primary_source": MetadataSource.OPEN_LIBRARY,
            "enable_mal": True,
            "sync_ratings": True
        }

        manager.set_user_preferences(new_prefs)
        prefs = manager.get_user_preferences()

        assert prefs["primary_source"] == MetadataSource.OPEN_LIBRARY
        assert prefs["enable_mal"] is True
        assert prefs["sync_ratings"] is True
        # Other prefs should remain unchanged
        assert prefs["enable_anilist"] is True

    def test_integration_manager_status(self):
        """Test getting integration status"""
        manager = IntegrationManager()
        status = manager.get_integration_status()

        assert "integrations" in status
        assert "preferences" in status
        assert "timestamp" in status

        # Check all integrations are present
        integrations = status["integrations"]
        assert MetadataSource.GOOGLE_BOOKS in integrations
        assert MetadataSource.ANILIST in integrations
        assert MetadataSource.GOODREADS in integrations

    def test_integration_manager_enable_disable(self):
        """Test enabling/disabling integrations"""
        manager = IntegrationManager()

        # Disable an integration
        manager.disable_integration("goodreads")
        assert manager.integration_status[MetadataSource.GOODREADS]["enabled"] is False

        # Re-enable it
        manager.enable_integration("goodreads")
        assert manager.integration_status[MetadataSource.GOODREADS]["enabled"] is True

    def test_integration_manager_error_tracking(self):
        """Test error tracking and auto-disable"""
        manager = IntegrationManager()

        # Record multiple errors
        for _ in range(5):
            manager._record_error(MetadataSource.GOODREADS)

        # Should be disabled after 5 errors
        assert manager.integration_status[MetadataSource.GOODREADS]["enabled"] is False
        assert manager.integration_status[MetadataSource.GOODREADS]["errors"] == 5

    @pytest.mark.asyncio
    async def test_integration_manager_cleanup(self):
        """Test manager cleanup"""
        manager = IntegrationManager()
        await manager.close()
        # All clients should be closed
        assert manager.anilist_client.session is None
        assert manager.mal_client.session is None
        assert manager.goodreads_client.session is None


class TestIntegrationEndpoints:
    """Tests for integration API endpoints"""

    @pytest.mark.asyncio
    async def test_get_integration_manager_singleton(self):
        """Test global integration manager singleton"""
        manager1 = await get_integration_manager()
        manager2 = await get_integration_manager()

        # Should be same instance
        assert manager1 is manager2

        # Cleanup
        from services.integration_manager import close_integration_manager
        await close_integration_manager()


class TestIntegrationValidation:
    """Validation tests for integration data"""

    def test_metadata_source_enum(self):
        """Test MetadataSource enum"""
        assert MetadataSource.GOOGLE_BOOKS.value == "google_books"
        assert MetadataSource.ANILIST.value == "anilist"
        assert MetadataSource.MYANIMELIST.value == "myanimelist"
        assert MetadataSource.GOODREADS.value == "goodreads"
        assert MetadataSource.OPEN_LIBRARY.value == "openlibrary"

    def test_goodreads_export_format(self):
        """Test Goodreads export format generation"""
        client = GoodreadsClient()

        test_books = [
            {
                "id": "1",
                "title": "Test Book",
                "authors": ["Test Author"],
                "isbn": "1234567890",
                "isbn13": "9781234567890",
                "rating": 5,
                "average_rating": 4.5,
                "publisher": "Test Publisher",
                "format": "Hardcover",
                "page_count": 300,
                "published_date": "2024-01-01",
                "date_read": "2024-06-01",
                "date_added": "2024-01-01",
                "categories": ["Fiction", "Science Fiction"],
                "series": "Test Series"
            }
        ]

        csv_data = client.export_to_goodreads_format(test_books)

        # Check format
        assert "book id,title,author" in csv_data
        assert '"Test Book"' in csv_data
        assert "Test Author" in csv_data
        assert "9781234567890" in csv_data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
