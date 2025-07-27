"""
Image Service for downloading, caching, and matching book cover images
"""
import os
import httpx
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
from sqlmodel import Session, select
import json

try:
    from backend.models import Book, Edition, Series, SeriesVolume
    from backend.database import get_db_session
except ImportError:
    from models import Book, Edition, Series, SeriesVolume
    from database import get_db_session


class ImageService:
    """Service for managing book cover images"""
    
    def __init__(self):
        # Create covers directory if it doesn't exist
        self.covers_dir = Path("backend/static/covers")
        self.covers_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories for organization
        (self.covers_dir / "books").mkdir(exist_ok=True)
        (self.covers_dir / "series").mkdir(exist_ok=True)
        
    def get_cover_storage_path(self, isbn: str, subdirectory: str = "books") -> str:
        """Get consistent storage path for cover images"""
        # Use ISBN as filename with jpg extension
        filename = f"{isbn}.jpg"
        return str(self.covers_dir / subdirectory / filename)
        
    def get_cover_url_path(self, isbn: str, subdirectory: str = "books") -> str:
        """Get URL path for serving cover images"""
        return f"/static/covers/{subdirectory}/{isbn}.jpg"
        
    async def download_cover_image(self, cover_url: str, local_path: str) -> bool:
        """Download cover image from URL and save locally"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(cover_url)
                if response.status_code == 200:
                    # Ensure directory exists
                    Path(local_path).parent.mkdir(parents=True, exist_ok=True)
                    
                    # Write image data
                    with open(local_path, 'wb') as f:
                        f.write(response.content)
                    return True
        except Exception as e:
            print(f"Error downloading cover image from {cover_url}: {e}")
        return False
    
    async def match_existing_covers_to_volumes(self, series_name: str) -> Dict[int, str]:
        """Match existing book covers to series volumes by ISBN"""
        matched_covers = {}
        
        with get_db_session() as session:
            # Get series and its volumes
            series = session.exec(select(Series).where(Series.name == series_name)).first()
            if not series:
                return matched_covers
                
            volumes = session.exec(
                select(SeriesVolume).where(SeriesVolume.series_id == series.id)
            ).all()
            
            # Get all books in this series with their editions
            books = session.exec(
                select(Book).where(Book.series_name == series_name)
            ).all()
            
            # Create mapping of ISBN to cover URL from existing books
            isbn_to_cover = {}
            for book in books:
                for edition in book.editions:
                    if edition.cover_url:
                        if edition.isbn_13:
                            isbn_to_cover[edition.isbn_13] = edition.cover_url
                        if edition.isbn_10:
                            isbn_to_cover[edition.isbn_10] = edition.cover_url
            
            # Match volumes to existing covers
            for volume in volumes:
                cover_url = None
                local_path = None
                
                # Try to match by ISBN
                if volume.isbn_13 and volume.isbn_13 in isbn_to_cover:
                    cover_url = isbn_to_cover[volume.isbn_13]
                    local_path = self.get_cover_storage_path(volume.isbn_13, "series")
                elif volume.isbn_10 and volume.isbn_10 in isbn_to_cover:
                    cover_url = isbn_to_cover[volume.isbn_10]
                    local_path = self.get_cover_storage_path(volume.isbn_10, "series")
                
                if cover_url and local_path:
                    # Check if we already have the image locally
                    if not os.path.exists(local_path):
                        # Download and cache the image
                        success = await self.download_cover_image(cover_url, local_path)
                        if success:
                            matched_covers[volume.position] = self.get_cover_url_path(
                                volume.isbn_13 or volume.isbn_10, "series"
                            )
                            # Update volume record with local path
                            volume.cover_url = self.get_cover_url_path(
                                volume.isbn_13 or volume.isbn_10, "series"
                            )
                            session.add(volume)
                    else:
                        matched_covers[volume.position] = self.get_cover_url_path(
                            volume.isbn_13 or volume.isbn_10, "series"
                        )
                        # Update volume record with local path
                        volume.cover_url = self.get_cover_url_path(
                            volume.isbn_13 or volume.isbn_10, "series"
                        )
                        session.add(volume)
            
            session.commit()
            
        return matched_covers
    
    async def download_missing_volume_covers(self, series_id: int) -> Dict[int, str]:
        """Download missing covers for series volumes"""
        downloaded_covers = {}
        
        with get_db_session() as session:
            # Get all volumes for this series that have cover URLs but no local files
            volumes = session.exec(
                select(SeriesVolume).where(SeriesVolume.series_id == series_id)
            ).all()
            
            for volume in volumes:
                if volume.cover_url and not volume.cover_url.startswith('/static/'):
                    # This is an external URL, download it
                    isbn = volume.isbn_13 or volume.isbn_10
                    if isbn:
                        local_path = self.get_cover_storage_path(isbn, "series")
                        
                        if not os.path.exists(local_path):
                            success = await self.download_cover_image(volume.cover_url, local_path)
                            if success:
                                # Update volume with local path
                                volume.cover_url = self.get_cover_url_path(isbn, "series")
                                session.add(volume)
                                downloaded_covers[volume.position] = volume.cover_url
                
            session.commit()
            
        return downloaded_covers
    
    async def cache_all_book_covers(self) -> Dict[str, Any]:
        """Download and cache all book cover images locally"""
        cached_count = 0
        error_count = 0
        
        with get_db_session() as session:
            # Get all editions with cover URLs
            editions = session.exec(
                select(Edition).where(Edition.cover_url.isnot(None))
            ).all()
            
            for edition in editions:
                if edition.cover_url and not edition.cover_url.startswith('/static/'):
                    isbn = edition.isbn_13 or edition.isbn_10
                    if isbn:
                        local_path = self.get_cover_storage_path(isbn, "books")
                        
                        if not os.path.exists(local_path):
                            success = await self.download_cover_image(edition.cover_url, local_path)
                            if success:
                                # Update edition with local path
                                edition.cover_url = self.get_cover_url_path(isbn, "books")
                                session.add(edition)
                                cached_count += 1
                            else:
                                error_count += 1
            
            session.commit()
            
        return {
            "success": True,
            "cached_covers": cached_count,
            "errors": error_count,
            "message": f"Cached {cached_count} cover images with {error_count} errors"
        }
    
    def get_image_info(self, isbn: str) -> Dict[str, Any]:
        """Get information about a cached image"""
        local_path = self.get_cover_storage_path(isbn, "books")
        series_path = self.get_cover_storage_path(isbn, "series")
        
        info = {
            "isbn": isbn,
            "book_cover_exists": os.path.exists(local_path),
            "series_cover_exists": os.path.exists(series_path),
            "book_cover_path": self.get_cover_url_path(isbn, "books") if os.path.exists(local_path) else None,
            "series_cover_path": self.get_cover_url_path(isbn, "series") if os.path.exists(series_path) else None
        }
        
        if info["book_cover_exists"]:
            stat = os.stat(local_path)
            info["book_cover_size"] = stat.st_size
            info["book_cover_modified"] = stat.st_mtime
            
        if info["series_cover_exists"]:
            stat = os.stat(series_path)
            info["series_cover_size"] = stat.st_size  
            info["series_cover_modified"] = stat.st_mtime
            
        return info