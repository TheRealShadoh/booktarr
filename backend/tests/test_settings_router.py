"""
Tests for settings router endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.models import Settings

client = TestClient(app)

class TestSettingsRouter:
    """Test cases for settings router endpoints"""
    
    @patch('app.routers.settings.settings_service')
    def test_get_settings(self, mock_service):
        """Test GET /api/settings endpoint"""
        mock_settings = Settings(
            skoolib_url="https://example.com",
            cache_ttl=3600,
            enable_price_lookup=True
        )
        mock_service.get_settings.return_value = mock_settings
        
        response = client.get("/api/settings")
        
        assert response.status_code == 200
        data = response.json()
        assert data["skoolib_url"] == "https://example.com"
        assert data["cache_ttl"] == 3600
        assert data["enable_price_lookup"] is True
    
    @patch('app.routers.settings.settings_service')
    def test_update_settings(self, mock_service):
        """Test PUT /api/settings endpoint"""
        mock_updated_settings = Settings(
            skoolib_url="https://updated.com",
            cache_ttl=7200,
            enable_price_lookup=False
        )
        mock_service.update_settings.return_value = mock_updated_settings
        
        update_data = {
            "skoolib_url": "https://updated.com",
            "cache_ttl": 7200,
            "enable_price_lookup": False
        }
        
        response = client.put("/api/settings", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Settings updated successfully"
        assert data["settings"]["skoolib_url"] == "https://updated.com"
        assert data["settings"]["cache_ttl"] == 7200
        assert data["settings"]["enable_price_lookup"] is False
    
    def test_update_settings_empty_request(self):
        """Test updating settings with empty request"""
        response = client.put("/api/settings", json={})
        
        assert response.status_code == 400
        assert "No settings provided" in response.json()["detail"]
    
    def test_update_settings_invalid_cache_ttl(self):
        """Test updating settings with invalid cache TTL"""
        response = client.put("/api/settings", json={"cache_ttl": 30})
        
        assert response.status_code == 422
        assert "between 60 and 86400" in response.json()["detail"][0]["msg"]
    
    def test_update_settings_invalid_language(self):
        """Test updating settings with invalid language code"""
        response = client.put("/api/settings", json={"default_language": "english"})
        
        assert response.status_code == 422
        assert "2 characters" in response.json()["detail"][0]["msg"]
    
    @patch('app.routers.settings.settings_service')
    def test_validate_skoolib_url_success(self, mock_service):
        """Test successful URL validation"""
        mock_service.validate_skoolib_url.return_value = {
            "valid": True,
            "isbn_count": 5,
            "sample_isbns": ["9781234567890"]
        }
        
        response = client.post("/api/settings/validate-url", json={"url": "https://example.com"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["isbn_count"] == 5
        assert len(data["sample_isbns"]) == 1
    
    @patch('app.routers.settings.settings_service')
    def test_validate_skoolib_url_failure(self, mock_service):
        """Test failed URL validation"""
        mock_service.validate_skoolib_url.return_value = {
            "valid": False,
            "error": "Invalid URL format"
        }
        
        response = client.post("/api/settings/validate-url", json={"url": "invalid-url"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert "Invalid URL format" in data["error"]
    
    @patch('app.routers.settings.settings_service')
    def test_reset_settings(self, mock_service):
        """Test resetting settings to defaults"""
        mock_default_settings = Settings()
        mock_service.reset_settings.return_value = mock_default_settings
        
        response = client.post("/api/settings/reset")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Settings reset to defaults"
        assert data["settings"]["cache_ttl"] == 3600
        assert data["settings"]["enable_price_lookup"] is True
    
    @patch('app.routers.settings.settings_service')
    def test_backup_settings(self, mock_service):
        """Test backing up settings"""
        mock_service.backup_settings.return_value = "settings_backup_20240101_120000.json"
        
        response = client.post("/api/settings/backup")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Settings backed up successfully"
        assert "settings_backup_" in data["backup_file"]
    
    @patch('app.routers.settings.settings_service')
    def test_restore_settings(self, mock_service):
        """Test restoring settings from backup"""
        mock_restored_settings = Settings(
            skoolib_url="https://restored.com",
            cache_ttl=7200
        )
        mock_service.restore_settings.return_value = mock_restored_settings
        
        response = client.post("/api/settings/restore", json={"backup_file": "backup.json"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Settings restored successfully"
        assert data["settings"]["skoolib_url"] == "https://restored.com"
    
    @patch('app.routers.settings.settings_service')
    def test_get_settings_info(self, mock_service):
        """Test getting settings information"""
        mock_service.get_settings_info.return_value = {
            "file_path": "/app/settings.json",
            "exists": True,
            "file_size": 256,
            "last_modified": "2024-01-01T12:00:00"
        }
        
        response = client.get("/api/settings/info")
        
        assert response.status_code == 200
        data = response.json()
        assert data["settings_file"]["file_path"] == "/app/settings.json"
        assert data["settings_file"]["exists"] is True
        assert "supported_languages" in data
        assert "cache_ttl_range" in data
        assert data["cache_ttl_range"]["min"] == 60
        assert data["cache_ttl_range"]["max"] == 86400
    
    @patch('app.routers.settings.settings_service')
    def test_settings_health_check_healthy(self, mock_service):
        """Test healthy settings health check"""
        mock_service.get_settings.return_value = Settings()
        mock_service.get_settings_info.return_value = {
            "exists": True,
            "file_path": "/app/settings.json"
        }
        
        response = client.get("/api/settings/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["settings_loaded"] is True
        assert data["file_exists"] is True
    
    @patch('app.routers.settings.settings_service')
    def test_settings_health_check_unhealthy(self, mock_service):
        """Test unhealthy settings health check"""
        mock_service.get_settings.side_effect = Exception("Settings error")
        
        response = client.get("/api/settings/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unhealthy"
        assert "error" in data
    
    @patch('app.routers.settings.settings_service')
    def test_settings_service_error_handling(self, mock_service):
        """Test error handling in settings endpoints"""
        from app.services.settings_service import SettingsValidationError
        
        mock_service.update_settings.side_effect = SettingsValidationError("Validation failed")
        
        response = client.put("/api/settings", json={"cache_ttl": 7200})
        
        assert response.status_code == 400
        assert "Validation failed" in response.json()["detail"]
    
    def test_settings_request_validation(self):
        """Test request validation for settings endpoints"""
        # Test missing URL in validate-url endpoint
        response = client.post("/api/settings/validate-url", json={})
        assert response.status_code == 422
        
        # Test missing backup_file in restore endpoint
        response = client.post("/api/settings/restore", json={})
        assert response.status_code == 422
    
    @patch('app.routers.settings.settings_service')
    def test_partial_settings_update(self, mock_service):
        """Test partial settings update"""
        mock_updated_settings = Settings(
            skoolib_url="https://example.com",
            cache_ttl=7200,  # Only this should be updated
            enable_price_lookup=True  # Should remain default
        )
        mock_service.update_settings.return_value = mock_updated_settings
        
        # Only update cache_ttl
        update_data = {"cache_ttl": 7200}
        
        response = client.put("/api/settings", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["settings"]["cache_ttl"] == 7200
        assert data["settings"]["enable_price_lookup"] is True
        
        # Verify only cache_ttl was passed to update_settings
        mock_service.update_settings.assert_called_once_with({"cache_ttl": 7200})