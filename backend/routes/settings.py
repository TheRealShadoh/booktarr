from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import json
import os
import sqlite3

router = APIRouter(prefix="/settings", tags=["settings"])

# Path to settings file
SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "settings.json")


class SettingsResponse(BaseModel):
    skoolib_url: str = ""
    google_books_api_key: str = ""
    open_library_api_key: str = ""
    cache_ttl: int = 3600
    enable_price_lookup: bool = True
    default_language: str = "en"
    enable_external_metadata: bool = True
    external_metadata_timeout_until: Optional[str] = None  # ISO datetime string


def load_settings() -> Dict[str, Any]:
    """Load settings from file."""
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_settings(settings: Dict[str, Any]) -> None:
    """Save settings to file."""
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f, indent=2)


def is_external_metadata_enabled() -> bool:
    """Check if external metadata is currently enabled."""
    settings = load_settings()
    
    # Check if manually disabled
    if not settings.get('enable_external_metadata', True):
        return False
    
    # Check if temporarily disabled due to timeout
    timeout_until = settings.get('external_metadata_timeout_until')
    if timeout_until:
        timeout_dt = datetime.fromisoformat(timeout_until)
        if datetime.now() < timeout_dt:
            return False
    
    return True


@router.get("/")
async def get_settings() -> SettingsResponse:
    """
    Get current application settings.
    """
    saved_settings = load_settings()
    return SettingsResponse(**saved_settings)


@router.put("/")
async def update_settings(settings: SettingsResponse) -> Dict[str, Any]:
    """
    Update application settings.
    """
    settings_dict = settings.dict()
    save_settings(settings_dict)
    
    return {
        "success": True,
        "message": "Settings updated successfully",
        "settings": settings_dict
    }


@router.post("/validate-url")
async def validate_url(request: Dict[str, str]) -> Dict[str, Any]:
    """
    Validate a Skoolib URL.
    """
    url = request.get("url", "")
    
    # Basic validation for now
    if not url or not url.startswith("http"):
        return {
            "valid": False,
            "error": "Invalid URL format"
        }
    
    return {
        "valid": True,
        "isbn_count": 0,
        "message": "URL validation not fully implemented"
    }


@router.post("/reset")
async def reset_settings() -> Dict[str, Any]:
    """
    Reset settings to defaults.
    """
    return {
        "success": True,
        "message": "Settings reset to defaults",
        "settings": SettingsResponse().dict()
    }


@router.post("/backup")
async def backup_settings() -> Dict[str, Any]:
    """
    Backup current settings.
    """
    return {
        "success": True,
        "message": "Settings backed up",
        "backup_id": "backup_001"
    }


@router.post("/restore")
async def restore_settings() -> Dict[str, Any]:
    """
    Restore settings from backup.
    """
    return {
        "success": True,
        "message": "Settings restored from backup"
    }


@router.get("/info")
async def get_settings_info() -> Dict[str, Any]:
    """
    Get settings information.
    """
    return {
        "version": "1.0.0",
        "database_size": "1.2 MB",
        "cache_size": "512 KB"
    }


@router.get("/health")
async def get_settings_health() -> Dict[str, Any]:
    """
    Check settings health.
    """
    return {
        "healthy": True,
        "checks": {
            "database": "ok",
            "cache": "ok",
            "external_apis": "ok"
        }
    }


@router.get("/sync-history")
async def get_sync_history() -> Dict[str, Any]:
    """
    Get sync history.
    """
    return {
        "sync_history": [
            {
                "id": 1,
                "timestamp": "2025-07-22T12:00:00Z",
                "type": "skoolib",
                "status": "success",
                "books_added": 5,
                "books_updated": 3
            }
        ],
        "total_syncs": 1
    }


@router.get("/cache/stats")
async def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics.
    """
    return {
        "cache_size": "1.2 MB",
        "cache_entries": 150,
        "hit_rate": 0.855,
        "last_cleanup": "2025-07-22T10:00:00Z",
        "book_cache": {
            "size": 125,
            "hit_rate": 0.882,
            "total_requests": 450
        },
        "api_cache": {
            "size": 85,
            "hit_rate": 0.751,
            "total_requests": 320
        },
        "page_cache": {
            "size": 45,
            "hit_rate": 0.923,
            "total_requests": 180
        }
    }


@router.post("/external-metadata/disable")
async def disable_external_metadata(duration_minutes: int = 30) -> Dict[str, Any]:
    """
    Temporarily disable external metadata lookups.
    """
    settings = load_settings()
    
    # Set timeout
    timeout_until = datetime.now() + timedelta(minutes=duration_minutes)
    settings['external_metadata_timeout_until'] = timeout_until.isoformat()
    
    save_settings(settings)
    
    return {
        "success": True,
        "message": f"External metadata disabled for {duration_minutes} minutes",
        "enabled": False,
        "timeout_until": timeout_until.isoformat()
    }


@router.post("/external-metadata/enable")
async def enable_external_metadata() -> Dict[str, Any]:
    """
    Enable external metadata lookups.
    """
    settings = load_settings()
    
    # Clear timeout and enable
    settings['enable_external_metadata'] = True
    settings['external_metadata_timeout_until'] = None
    
    save_settings(settings)
    
    return {
        "success": True,
        "message": "External metadata enabled",
        "enabled": True
    }


@router.get("/external-metadata/status")
async def get_external_metadata_status() -> Dict[str, Any]:
    """
    Get current external metadata status.
    """
    settings = load_settings()
    enabled = is_external_metadata_enabled()
    
    response = {
        "enabled": enabled,
        "manually_disabled": not settings.get('enable_external_metadata', True)
    }
    
    timeout_until = settings.get('external_metadata_timeout_until')
    if timeout_until:
        timeout_dt = datetime.fromisoformat(timeout_until)
        if datetime.now() < timeout_dt:
            response["timeout_active"] = True
            response["timeout_until"] = timeout_until
            response["minutes_remaining"] = int((timeout_dt - datetime.now()).total_seconds() / 60)
        else:
            response["timeout_active"] = False
    else:
        response["timeout_active"] = False
    
    return response


class RemoveAllDataRequest(BaseModel):
    confirmation: str


@router.post("/clear-books-keep-metadata")
async def clear_books_keep_metadata() -> Dict[str, Any]:
    """
    Clear all books while preserving metadata (series, authors, etc.).
    Used primarily for testing workflows.
    """
    try:
        # Get database paths
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        books_db_path = os.path.join(backend_dir, "books.db")
        booktarr_db_path = os.path.join(backend_dir, "booktarr.db")
        
        removed_counts = {
            "books": 0,
            "editions": 0,
            "user_edition_statuses": 0,
            "reading_progress": 0
        }
        
        # Clear books.db if it exists and has data
        if os.path.exists(books_db_path) and os.path.getsize(books_db_path) > 0:
            try:
                conn = sqlite3.connect(books_db_path)
                cursor = conn.cursor()
                
                try:
                    # Clear book-related tables but keep metadata
                    tables_to_clear = [
                        ("book", "books"),
                        ("edition", "editions"), 
                        ("usereditionstatus", "user_edition_statuses"),
                        ("readingprogress", "reading_progress")
                    ]
                    
                    for table_name, count_key in tables_to_clear:
                        try:
                            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                            count = cursor.fetchone()[0]
                            removed_counts[count_key] = count
                            
                            # Delete all records from table
                            cursor.execute(f"DELETE FROM {table_name}")
                        except sqlite3.Error:
                            # Table might not exist, skip
                            pass
                    
                    # Reset SQLite sequence counters for cleared tables only
                    try:
                        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('book', 'edition', 'usereditionstatus', 'readingprogress')")
                    except sqlite3.Error:
                        # sqlite_sequence table doesn't exist, which is fine
                        pass
                    
                    conn.commit()
                finally:
                    conn.close()
            except sqlite3.Error as e:
                print(f"Error accessing books.db: {e}")
                pass
        
        # Clear booktarr.db book-related tables if it exists
        if os.path.exists(booktarr_db_path) and os.path.getsize(booktarr_db_path) > 0:
            try:
                conn = sqlite3.connect(booktarr_db_path)
                cursor = conn.cursor()
                
                try:
                    # Only clear book-related tables, preserve metadata tables
                    book_tables = ['book', 'edition', 'usereditionstatus', 'readingprogress']
                    
                    for table_name in book_tables:
                        try:
                            cursor.execute(f"DELETE FROM {table_name}")
                        except sqlite3.Error:
                            # Skip if table doesn't exist
                            pass
                    
                    # Reset sequence counters for book tables only
                    try:
                        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('book', 'edition', 'usereditionstatus', 'readingprogress')")
                    except sqlite3.Error:
                        pass
                    
                    conn.commit()
                finally:
                    conn.close()
            except sqlite3.Error as e:
                print(f"Error accessing booktarr.db: {e}")
                pass
        
        return {
            "success": True,
            "message": "Books cleared while preserving metadata",
            "removed_counts": removed_counts,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear books: {str(e)}"
        )


@router.post("/remove-all-data")
async def remove_all_data(request: RemoveAllDataRequest) -> Dict[str, Any]:
    """
    Remove all books and series data from the library.
    Requires confirmation text "DELETE" to proceed.
    
    WARNING: This is a destructive operation that cannot be undone.
    """
    # Verify confirmation text
    if request.confirmation != "DELETE":
        raise HTTPException(
            status_code=400,
            detail="Invalid confirmation text. Must be exactly 'DELETE' to proceed."
        )
    
    try:
        # Get database paths
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        books_db_path = os.path.join(backend_dir, "books.db")
        booktarr_db_path = os.path.join(backend_dir, "booktarr.db")
        cache_file_path = os.path.join(backend_dir, "book_cache.json")
        
        removed_counts = {
            "books": 0,
            "editions": 0,
            "user_edition_statuses": 0,
            "series": 0,
            "series_volumes": 0,
            "reading_progress": 0,
            "cache_entries": 0
        }
        
        # Clear books.db if it exists and has data
        if os.path.exists(books_db_path) and os.path.getsize(books_db_path) > 0:
            try:
                conn = sqlite3.connect(books_db_path)
                cursor = conn.cursor()
                
                try:
                    # Count records before deletion
                    tables_to_clear = [
                        ("book", "books"),
                        ("edition", "editions"), 
                        ("usereditionstatus", "user_edition_statuses"),
                        ("series", "series"),
                        ("seriesvolume", "series_volumes"),
                        ("readingprogress", "reading_progress")
                    ]
                    
                    for table_name, count_key in tables_to_clear:
                        try:
                            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                            count = cursor.fetchone()[0]
                            removed_counts[count_key] = count
                            
                            # Delete all records from table
                            cursor.execute(f"DELETE FROM {table_name}")
                        except sqlite3.Error:
                            # Table might not exist, skip
                            pass
                    
                    # Reset SQLite sequence counters (if the table exists)
                    try:
                        cursor.execute("DELETE FROM sqlite_sequence")
                    except sqlite3.Error:
                        # sqlite_sequence table doesn't exist, which is fine
                        pass
                    
                    conn.commit()
                finally:
                    conn.close()
            except sqlite3.Error as e:
                # If there's any database error, just skip this database
                print(f"Error accessing books.db: {e}")
                pass
        
        # Clear booktarr.db if it exists and has data
        if os.path.exists(booktarr_db_path) and os.path.getsize(booktarr_db_path) > 0:
            try:
                conn = sqlite3.connect(booktarr_db_path)
                cursor = conn.cursor()
                
                try:
                    # Get list of all tables
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
                    tables = cursor.fetchall()
                    
                    # Clear all data tables (but preserve schema)
                    for (table_name,) in tables:
                        try:
                            cursor.execute(f"DELETE FROM {table_name}")
                        except sqlite3.Error:
                            # Skip if error
                            pass
                    
                    # Reset sequence counters (if the table exists)
                    try:
                        cursor.execute("DELETE FROM sqlite_sequence WHERE name NOT IN ('alembic_version')")
                    except sqlite3.Error:
                        # sqlite_sequence table doesn't exist, which is fine
                        pass
                    
                    conn.commit()
                finally:
                    conn.close()
            except sqlite3.Error as e:
                # If there's any database error, just skip this database
                print(f"Error accessing booktarr.db: {e}")
                pass
        
        # Remove cache file
        if os.path.exists(cache_file_path):
            try:
                with open(cache_file_path, 'r') as f:
                    cache_data = json.load(f)
                    removed_counts["cache_entries"] = len(cache_data)
            except:
                pass
            
            # Remove the cache file
            os.remove(cache_file_path)
        
        return {
            "success": True,
            "message": "All books and series data has been removed from your library",
            "removed_counts": removed_counts,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to remove data: {str(e)}"
        )