"""
Settings management service with file-based storage and validation
"""
import json
import os
from typing import Optional, Dict, Any
from pathlib import Path
import logging
import aiofiles
import asyncio
from datetime import datetime

from ..models import Settings
from .cache_service import cache_service

logger = logging.getLogger(__name__)

class SettingsValidationError(Exception):
    """Raised when settings validation fails"""
    pass

class SettingsStorageError(Exception):
    """Raised when settings storage operations fail"""
    pass

class SettingsService:
    """Settings management service with file-based storage"""
    
    def __init__(self, settings_file: str = "settings.json"):
        self.settings_file = Path(settings_file)
        self.settings_lock = asyncio.Lock()
        self._settings_cache = None
        self._last_modified = None
        
    async def get_settings(self) -> Settings:
        """Get current settings with caching"""
        # Simple version without complex locking to avoid deadlocks
        try:
            # Check if file exists and load it
            if self.settings_file.exists():
                async with aiofiles.open(self.settings_file, 'r') as f:
                    content = await f.read()
                    if content.strip():
                        data = json.loads(content)
                        return Settings(**data)
            
            # Create default settings if file doesn't exist or is empty
            default_settings = Settings()
            await self._save_settings_to_file(default_settings)
            logger.info("Created default settings")
            return default_settings
            
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Error loading settings: {e}")
            # Return default settings but don't cache them
            return Settings()
    
    async def update_settings(self, settings_data: Dict[str, Any]) -> Settings:
        """Update settings with validation"""
        current_settings = await self.get_settings()
        
        # Create new settings object with updated values
        updated_data = current_settings.dict()
        updated_data.update(settings_data)
        
        try:
            new_settings = Settings(**updated_data)
            
            # Validate settings
            await self._validate_settings(new_settings)
            
            # Save to file
            await self._save_settings_to_file(new_settings)
            
            logger.info("Settings updated successfully")
            return new_settings
            
        except Exception as e:
            logger.error(f"Error updating settings: {e}")
            raise SettingsValidationError(f"Failed to update settings: {str(e)}")
    
    async def validate_skoolib_url(self, url: str) -> Dict[str, Any]:
        """Validate Skoolib URL by attempting to fetch and parse"""
        if not url:
            return {"valid": False, "error": "URL is required"}
        
        if not url.startswith(("http://", "https://")):
            return {"valid": False, "error": "URL must start with http:// or https://"}
        
        try:
            from .skoolib_parser import SkoolibParser
            
            async with SkoolibParser() as parser:
                # Try to fetch the HTML
                html = await parser.fetch_html(url)
                
                if not html:
                    return {"valid": False, "error": "Failed to fetch content from URL"}
                
                # Try to extract ISBNs
                isbns = parser.extract_isbns(html)
            
            if not isbns:
                return {
                    "valid": True,
                    "warning": "No ISBNs found in the page. Make sure this is a Skoolib share page with books.",
                    "isbn_count": 0
                }
            
            return {
                "valid": True,
                "isbn_count": len(isbns),
                "sample_isbns": isbns[:5]  # Show first 5 ISBNs as sample
            }
            
        except Exception as e:
            logger.error(f"Error validating Skoolib URL: {e}")
            return {"valid": False, "error": f"Failed to validate URL: {str(e)}"}
    
    async def reset_settings(self) -> Settings:
        """Reset settings to default values"""
        default_settings = Settings()
        await self._save_settings_to_file(default_settings)
        logger.info("Settings reset to defaults")
        return default_settings
    
    async def backup_settings(self) -> str:
        """Create a backup of current settings"""
        settings = await self.get_settings()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"settings_backup_{timestamp}.json"
        
        try:
            async with aiofiles.open(backup_file, 'w') as f:
                await f.write(json.dumps(settings.dict(), indent=2))
            logger.info(f"Settings backed up to {backup_file}")
            return backup_file
        except Exception as e:
            logger.error(f"Error backing up settings: {e}")
            raise SettingsStorageError(f"Failed to backup settings: {str(e)}")
    
    async def restore_settings(self, backup_file: str) -> Settings:
        """Restore settings from backup file"""
        try:
            async with aiofiles.open(backup_file, 'r') as f:
                content = await f.read()
                data = json.loads(content)
                
            # Validate the backup data
            restored_settings = Settings(**data)
            await self._validate_settings(restored_settings)
            
            # Save as current settings
            await self._save_settings_to_file(restored_settings)
            
            async with self.settings_lock:
                self._settings_cache = restored_settings
                self._last_modified = os.path.getmtime(self.settings_file)
            
            logger.info(f"Settings restored from {backup_file}")
            return restored_settings
            
        except Exception as e:
            logger.error(f"Error restoring settings: {e}")
            raise SettingsStorageError(f"Failed to restore settings: {str(e)}")
    
    async def _validate_settings(self, settings: Settings) -> None:
        """Validate settings values"""
        if settings.cache_ttl < 60:
            raise SettingsValidationError("Cache TTL must be at least 60 seconds")
        
        if settings.cache_ttl > 86400:
            raise SettingsValidationError("Cache TTL must be at most 24 hours (86400 seconds)")
        
        if settings.skoolib_url:
            # Basic URL validation
            if not settings.skoolib_url.startswith(("http://", "https://")):
                raise SettingsValidationError("Skoolib URL must start with http:// or https://")
        
        # Validate language code
        if settings.default_language and len(settings.default_language) != 2:
            raise SettingsValidationError("Language code must be 2 characters (e.g., 'en', 'fr')")
    
    async def _save_settings_to_file(self, settings: Settings) -> None:
        """Save settings to file"""
        try:
            # Create directory if it doesn't exist
            self.settings_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Write settings to file
            async with aiofiles.open(self.settings_file, 'w') as f:
                await f.write(json.dumps(settings.dict(), indent=2))
                
            logger.debug(f"Settings saved to {self.settings_file}")
            
        except Exception as e:
            logger.error(f"Error saving settings: {e}")
            raise SettingsStorageError(f"Failed to save settings: {str(e)}")
    
    def get_settings_file_path(self) -> str:
        """Get the path to the settings file"""
        return str(self.settings_file.absolute())
    
    def get_settings_info(self) -> Dict[str, Any]:
        """Get information about the settings file"""
        if self.settings_file.exists():
            stat = self.settings_file.stat()
            return {
                "file_path": str(self.settings_file.absolute()),
                "file_size": stat.st_size,
                "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "exists": True
            }
        else:
            return {
                "file_path": str(self.settings_file.absolute()),
                "exists": False
            }


# Global settings service instance
settings_service = SettingsService()

# Convenience functions for easy access
async def get_settings() -> Settings:
    """Get current settings"""
    return await settings_service.get_settings()

async def update_settings(settings_data: Dict[str, Any]) -> Settings:
    """Update settings"""
    return await settings_service.update_settings(settings_data)

async def validate_skoolib_url(url: str) -> Dict[str, Any]:
    """Validate Skoolib URL"""
    return await settings_service.validate_skoolib_url(url)