"""
Enhanced Image Service for downloading, caching, resizing, and optimizing book cover images
"""
import os
import httpx
import hashlib
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from sqlmodel import Session, select
import json
from datetime import datetime, timedelta
from PIL import Image, ImageOps
import io
import aiofiles
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

try:
    from backend.models import Book, Edition, Series, SeriesVolume
    from backend.database import get_db_session
except ImportError:
    from models import Book, Edition, Series, SeriesVolume
    from database import get_db_session


class ImageService:
    """Enhanced service for managing book cover images with performance optimizations"""
    
    def __init__(self):
        # Create covers directory if it doesn't exist
        self.covers_dir = Path("backend/static/covers")
        self.covers_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories for organization
        (self.covers_dir / "books").mkdir(exist_ok=True)
        (self.covers_dir / "series").mkdir(exist_ok=True)
        (self.covers_dir / "thumbnails").mkdir(exist_ok=True)
        (self.covers_dir / "cache").mkdir(exist_ok=True)
        
        # Image processing settings
        self.max_width = 800
        self.max_height = 1200
        self.thumbnail_width = 200
        self.thumbnail_height = 300
        self.jpeg_quality = 85
        self.webp_quality = 80
        
        # Thread pool for CPU-intensive image processing
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Cache for image metadata
        self.cache_file = self.covers_dir / "cache" / "metadata.json"
        self._cache = self._load_cache()
        
        # HTTP client with optimized settings
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            headers={
                'User-Agent': 'BookTarr/1.0 Image Service',
                'Accept': 'image/jpeg,image/png,image/webp,image/*;q=0.8'
            }
        )
    
    def _load_cache(self) -> Dict[str, Any]:
        """Load image metadata cache"""
        try:
            if self.cache_file.exists():
                with open(self.cache_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load image cache: {e}")
        return {}
    
    def _save_cache(self):
        """Save image metadata cache"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(self._cache, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save image cache: {e}")
    
    def _get_cache_key(self, url: str) -> str:
        """Generate cache key for URL"""
        return hashlib.md5(url.encode()).hexdigest()
    
    def _is_cache_valid(self, cache_entry: Dict[str, Any], max_age_days: int = 30) -> bool:
        """Check if cache entry is still valid"""
        try:
            cached_time = datetime.fromisoformat(cache_entry.get('timestamp', ''))
            return datetime.now() - cached_time < timedelta(days=max_age_days)
        except:
            return False
        
    def get_cover_storage_path(self, isbn: str, subdirectory: str = "books") -> str:
        """Get consistent storage path for cover images"""
        # Use ISBN as filename with jpg extension
        filename = f"{isbn}.jpg"
        return str(self.covers_dir / subdirectory / filename)
        
    def get_cover_url_path(self, isbn: str, subdirectory: str = "books") -> str:
        """Get URL path for serving cover images"""
        return f"/static/covers/{subdirectory}/{isbn}.jpg"
    
    def get_thumbnail_path(self, isbn: str) -> str:
        """Get thumbnail storage path"""
        return str(self.covers_dir / "thumbnails" / f"{isbn}_thumb.jpg")
    
    def get_thumbnail_url_path(self, isbn: str) -> str:
        """Get thumbnail URL path"""
        return f"/static/covers/thumbnails/{isbn}_thumb.jpg"
    
    def _process_image_sync(self, image_data: bytes, output_path: str, create_thumbnail: bool = True) -> Dict[str, Any]:
        """Process image synchronously (runs in thread pool)"""
        try:
            # Open image with PIL
            with Image.open(io.BytesIO(image_data)) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'P'):
                    # Create white background for transparency
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'RGBA':
                        background.paste(img, mask=img.split()[-1])
                    else:
                        background.paste(img)
                    img = background
                
                # Auto-orient based on EXIF data
                img = ImageOps.exif_transpose(img)
                
                # Get original dimensions
                original_width, original_height = img.size
                
                # Resize if too large
                if original_width > self.max_width or original_height > self.max_height:
                    img.thumbnail((self.max_width, self.max_height), Image.Resampling.LANCZOS)
                
                # Save optimized main image
                img.save(output_path, 'JPEG', quality=self.jpeg_quality, optimize=True)
                
                # Create thumbnail if requested
                thumbnail_path = None
                if create_thumbnail:
                    isbn = Path(output_path).stem
                    thumbnail_path = self.get_thumbnail_path(isbn)
                    
                    # Create thumbnail
                    thumbnail = img.copy()
                    thumbnail.thumbnail((self.thumbnail_width, self.thumbnail_height), Image.Resampling.LANCZOS)
                    thumbnail.save(thumbnail_path, 'JPEG', quality=self.jpeg_quality, optimize=True)
                
                # Get file sizes
                main_size = os.path.getsize(output_path)
                thumb_size = os.path.getsize(thumbnail_path) if thumbnail_path else 0
                
                return {
                    'success': True,
                    'original_size': (original_width, original_height),
                    'processed_size': img.size,
                    'file_size': main_size,
                    'thumbnail_size': thumb_size,
                    'compression_ratio': len(image_data) / main_size if main_size > 0 else 1
                }
        
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _process_image(self, image_data: bytes, output_path: str, create_thumbnail: bool = True) -> Dict[str, Any]:
        """Process image asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, 
            self._process_image_sync, 
            image_data, 
            output_path, 
            create_thumbnail
        )
        
    async def download_cover_image(self, cover_url: str, local_path: str, create_thumbnail: bool = True) -> Dict[str, Any]:
        """Download and process cover image from URL"""
        cache_key = self._get_cache_key(cover_url)
        
        # Check cache first
        if cache_key in self._cache and self._is_cache_valid(self._cache[cache_key]):
            cached_entry = self._cache[cache_key]
            if Path(local_path).exists() and Path(cached_entry.get('local_path', '')).exists():
                logger.info(f"Using cached image for {cover_url}")
                return {
                    'success': True,
                    'cached': True,
                    'local_path': local_path,
                    **cached_entry.get('metadata', {})
                }
        
        try:
            # Download image
            response = await self.client.get(cover_url, follow_redirects=True)
            if response.status_code == 200:
                # Ensure directory exists
                Path(local_path).parent.mkdir(parents=True, exist_ok=True)
                
                # Process and save image
                processing_result = await self._process_image(
                    response.content, 
                    local_path, 
                    create_thumbnail
                )
                
                if processing_result['success']:
                    # Update cache
                    self._cache[cache_key] = {
                        'url': cover_url,
                        'local_path': local_path,
                        'timestamp': datetime.now().isoformat(),
                        'metadata': processing_result
                    }
                    self._save_cache()
                    
                    logger.info(f"Downloaded and processed cover: {cover_url} -> {local_path}")
                    return {
                        'success': True,
                        'cached': False,
                        'local_path': local_path,
                        **processing_result
                    }
                else:
                    logger.error(f"Failed to process image from {cover_url}: {processing_result.get('error')}")
                    return {'success': False, 'error': processing_result.get('error')}
            else:
                logger.warning(f"Failed to download cover from {cover_url}: HTTP {response.status_code}")
                return {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except Exception as e:
            logger.error(f"Error downloading cover from {cover_url}: {e}")
            return {'success': False, 'error': str(e)}
    
    async def download_multiple_covers(self, cover_requests: List[Tuple[str, str]], max_concurrent: int = 5) -> List[Dict[str, Any]]:
        """Download multiple cover images concurrently"""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def download_with_semaphore(cover_url: str, local_path: str) -> Dict[str, Any]:
            async with semaphore:
                return await self.download_cover_image(cover_url, local_path)
        
        tasks = [
            download_with_semaphore(url, path) 
            for url, path in cover_requests
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to error results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    'success': False,
                    'error': str(result),
                    'url': cover_requests[i][0]
                })
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def optimize_existing_images(self, directory_path: str = None) -> Dict[str, Any]:
        """Optimize existing images in the covers directory"""
        if directory_path is None:
            directory_path = str(self.covers_dir / "books")
        
        directory = Path(directory_path)
        if not directory.exists():
            return {'success': False, 'error': 'Directory does not exist'}
        
        image_files = list(directory.glob("*.jpg")) + list(directory.glob("*.png"))
        results = {'processed': 0, 'errors': 0, 'total_saved': 0}
        
        for image_path in image_files:
            try:
                # Read original file
                with open(image_path, 'rb') as f:
                    original_data = f.read()
                
                original_size = len(original_data)
                
                # Process image
                processing_result = await self._process_image(
                    original_data, 
                    str(image_path),
                    create_thumbnail=True
                )
                
                if processing_result['success']:
                    new_size = processing_result['file_size']
                    saved_bytes = original_size - new_size
                    results['total_saved'] += saved_bytes
                    results['processed'] += 1
                    
                    logger.info(f"Optimized {image_path.name}: {original_size} -> {new_size} bytes ({saved_bytes} saved)")
                else:
                    results['errors'] += 1
                    logger.error(f"Failed to optimize {image_path.name}")
            
            except Exception as e:
                results['errors'] += 1
                logger.error(f"Error optimizing {image_path.name}: {e}")
        
        return {
            'success': True,
            'results': results,
            'processed_files': results['processed'],
            'total_size_saved': results['total_saved']
        }
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        cache_size = len(self._cache)
        valid_entries = sum(1 for entry in self._cache.values() if self._is_cache_valid(entry))
        
        # Calculate total file sizes
        total_images = 0
        total_size = 0
        
        for subdirectory in ['books', 'series', 'thumbnails']:
            subdir_path = self.covers_dir / subdirectory
            if subdir_path.exists():
                for image_file in subdir_path.glob("*.jpg"):
                    total_images += 1
                    total_size += image_file.stat().st_size
        
        return {
            'cache_entries': cache_size,
            'valid_cache_entries': valid_entries,
            'expired_cache_entries': cache_size - valid_entries,
            'total_images': total_images,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'average_image_size_kb': round(total_size / total_images / 1024, 2) if total_images > 0 else 0
        }
    
    def cleanup_cache(self, max_age_days: int = 90) -> Dict[str, Any]:
        """Clean up expired cache entries and orphaned files"""
        cleaned_entries = 0
        orphaned_files = 0
        
        # Clean expired cache entries
        expired_keys = [
            key for key, entry in self._cache.items()
            if not self._is_cache_valid(entry, max_age_days)
        ]
        
        for key in expired_keys:
            del self._cache[key]
            cleaned_entries += 1
        
        # Find orphaned files (files without cache entries)
        all_cached_paths = set(entry.get('local_path', '') for entry in self._cache.values())
        
        for subdirectory in ['books', 'series']:
            subdir_path = self.covers_dir / subdirectory
            if subdir_path.exists():
                for image_file in subdir_path.glob("*.jpg"):
                    if str(image_file) not in all_cached_paths:
                        try:
                            image_file.unlink()
                            orphaned_files += 1
                        except Exception as e:
                            logger.error(f"Failed to delete orphaned file {image_file}: {e}")
        
        # Save updated cache
        if cleaned_entries > 0:
            self._save_cache()
        
        return {
            'cleaned_cache_entries': cleaned_entries,
            'removed_orphaned_files': orphaned_files
        }
    
    async def close(self):
        """Close the image service and cleanup resources"""
        await self.client.aclose()
        self.executor.shutdown(wait=True)
    
    def __del__(self):
        """Cleanup on deletion"""
        try:
            self.executor.shutdown(wait=False)
        except:
            pass
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