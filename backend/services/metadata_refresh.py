import asyncio
from typing import List, Dict, Any
from datetime import datetime, timedelta
from tenacity import retry, stop_after_attempt, wait_exponential

from .cache import JsonCache
from .book_search import BookSearchService
from ..clients import GoogleBooksClient, OpenLibraryClient


class MetadataRefreshService:
    def __init__(self):
        self.cache = JsonCache()
        self.search_service = BookSearchService()
        self.google_client = GoogleBooksClient()
        self.openlibrary_client = OpenLibraryClient()
        self.rate_limit_delay = 1.0  # seconds between API calls
    
    async def refresh_stale_metadata(self, days_old: int = 30) -> Dict[str, Any]:
        # Get stale entries
        stale_keys = await self.cache.get_stale_entries(days_old)
        
        refreshed = []
        failed = []
        
        for key in stale_keys:
            try:
                await asyncio.sleep(self.rate_limit_delay)  # Rate limiting
                
                if key.startswith("isbn_"):
                    isbn = key.replace("isbn_", "")
                    result = await self._refresh_isbn(isbn)
                    if result:
                        refreshed.append({"key": key, "type": "isbn", "identifier": isbn})
                    else:
                        failed.append({"key": key, "reason": "No data found"})
                        
                elif key.startswith("title_"):
                    # Extract title from key
                    parts = key.split("_")
                    title_start = 1
                    author_start = None
                    
                    for i, part in enumerate(parts):
                        if part == "author":
                            author_start = i + 1
                            break
                    
                    if author_start:
                        title = "_".join(parts[title_start:author_start-1])
                        author = "_".join(parts[author_start:])
                    else:
                        title = "_".join(parts[title_start:])
                        author = None
                    
                    result = await self._refresh_title_search(title, author)
                    if result:
                        refreshed.append({"key": key, "type": "title", "identifier": title})
                    else:
                        failed.append({"key": key, "reason": "No data found"})
                        
            except Exception as e:
                failed.append({"key": key, "reason": str(e)})
        
        return {
            "refreshed": refreshed,
            "failed": failed,
            "total_stale": len(stale_keys),
            "success_count": len(refreshed),
            "failure_count": len(failed)
        }
    
    async def refresh_incomplete_metadata(self) -> Dict[str, Any]:
        # Get incomplete entries
        incomplete_entries = await self.cache.get_incomplete_entries()
        
        refreshed = []
        failed = []
        
        for entry in incomplete_entries:
            try:
                await asyncio.sleep(self.rate_limit_delay)  # Rate limiting
                
                key = entry["key"]
                data = entry["data"]
                reason = entry["reason"]
                
                if reason == "missing_series" and data.get("title"):
                    # Try to find series information
                    result = await self._find_series_info(data)
                    if result:
                        refreshed.append({"key": key, "reason": reason, "updated": True})
                    else:
                        failed.append({"key": key, "reason": "Could not find series info"})
                        
                elif reason == "missing_editions":
                    # Try to find more editions
                    result = await self._find_editions(data)
                    if result:
                        refreshed.append({"key": key, "reason": reason, "updated": True})
                    else:
                        failed.append({"key": key, "reason": "Could not find editions"})
                        
                elif reason == "missing_cover":
                    # Try to find cover image
                    result = await self._find_cover_image(data)
                    if result:
                        refreshed.append({"key": key, "reason": reason, "updated": True})
                    else:
                        failed.append({"key": key, "reason": "Could not find cover"})
                        
            except Exception as e:
                failed.append({"key": entry["key"], "reason": str(e)})
        
        return {
            "refreshed": refreshed,
            "failed": failed,
            "total_incomplete": len(incomplete_entries),
            "success_count": len(refreshed),
            "failure_count": len(failed)
        }
    
    async def _refresh_isbn(self, isbn: str) -> bool:
        try:
            # Try Google Books first
            google_data = await self.google_client.search_by_isbn(isbn)
            if google_data:
                await self.cache.set_isbn_cache(isbn, google_data)
                return True
            
            # Try OpenLibrary
            ol_data = await self.openlibrary_client.search_by_isbn(isbn)
            if ol_data:
                await self.cache.set_isbn_cache(isbn, ol_data)
                return True
            
            return False
        except Exception:
            return False
    
    async def _refresh_title_search(self, title: str, author: str = None) -> bool:
        try:
            results = []
            
            # Search both APIs
            google_results = await self.google_client.search_by_title(title, author)
            results.extend(google_results)
            
            ol_results = await self.openlibrary_client.search_by_title(title, author)
            results.extend(ol_results)
            
            if results:
                await self.cache.set_title_author_cache(title, author, results)
                return True
            
            return False
        except Exception:
            return False
    
    async def _find_series_info(self, book_data: Dict[str, Any]) -> bool:
        # This would require more sophisticated series detection
        # For now, return False
        return False
    
    async def _find_editions(self, book_data: Dict[str, Any]) -> bool:
        # Try to find more editions using OpenLibrary work key
        if book_data.get("openlibrary_id"):
            try:
                editions = await self.openlibrary_client.get_editions(book_data["openlibrary_id"])
                if editions:
                    # Update cache with new editions
                    return True
            except Exception:
                pass
        return False
    
    async def _find_cover_image(self, book_data: Dict[str, Any]) -> bool:
        # Try to find cover from various sources
        # This is a placeholder - would need actual implementation
        return False
    
    async def batch_refresh(self, keys: List[str], batch_size: int = 5) -> Dict[str, Any]:
        """Refresh specific cache keys in batches to respect rate limits"""
        results = {
            "refreshed": [],
            "failed": [],
            "total": len(keys)
        }
        
        for i in range(0, len(keys), batch_size):
            batch = keys[i:i + batch_size]
            
            # Process batch concurrently
            tasks = []
            for key in batch:
                if key.startswith("isbn_"):
                    isbn = key.replace("isbn_", "")
                    tasks.append(self._refresh_isbn(isbn))
            
            # Wait for batch to complete
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    results["failed"].append({"key": batch[j], "error": str(result)})
                elif result:
                    results["refreshed"].append(batch[j])
                else:
                    results["failed"].append({"key": batch[j], "error": "No data found"})
            
            # Rate limit between batches
            if i + batch_size < len(keys):
                await asyncio.sleep(self.rate_limit_delay * 2)
        
        results["success_count"] = len(results["refreshed"])
        results["failure_count"] = len(results["failed"])
        
        return results