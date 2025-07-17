import json
import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import aiofiles
from pathlib import Path
import asyncio


class JsonCache:
    def __init__(self, cache_file: str = "book_cache.json"):
        self.cache_file = Path(cache_file)
        self.cache_data: Dict[str, Any] = {}
        self.lock = asyncio.Lock()
        self._load_cache()
    
    def _load_cache(self):
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    self.cache_data = json.load(f)
            except Exception as e:
                print(f"Error loading cache: {e}")
                self.cache_data = {}
    
    async def _save_cache(self):
        async with aiofiles.open(self.cache_file, 'w') as f:
            await f.write(json.dumps(self.cache_data, indent=2, default=str))
    
    async def get_by_isbn(self, isbn: str) -> Optional[Dict[str, Any]]:
        async with self.lock:
            key = f"isbn_{isbn}"
            if key in self.cache_data:
                entry = self.cache_data[key]
                # Check if cache is still valid (30 days)
                cached_time = datetime.fromisoformat(entry["cached_at"])
                if datetime.now() - cached_time < timedelta(days=30):
                    return entry["data"]
            return None
    
    async def get_by_title_author(self, title: str, author: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        async with self.lock:
            key = f"title_{title.lower()}"
            if author:
                key += f"_author_{author.lower()}"
            
            if key in self.cache_data:
                entry = self.cache_data[key]
                cached_time = datetime.fromisoformat(entry["cached_at"])
                if datetime.now() - cached_time < timedelta(days=30):
                    return entry["data"]
            return None
    
    async def get_by_series(self, series: str) -> Optional[List[Dict[str, Any]]]:
        async with self.lock:
            key = f"series_{series.lower()}"
            
            if key in self.cache_data:
                entry = self.cache_data[key]
                cached_time = datetime.fromisoformat(entry["cached_at"])
                if datetime.now() - cached_time < timedelta(days=30):
                    return entry["data"]
            return None
    
    async def set_isbn_cache(self, isbn: str, data: Dict[str, Any]):
        async with self.lock:
            key = f"isbn_{isbn}"
            self.cache_data[key] = {
                "data": data,
                "cached_at": datetime.now().isoformat()
            }
            await self._save_cache()
    
    async def set_title_author_cache(self, title: str, author: Optional[str], data: List[Dict[str, Any]]):
        async with self.lock:
            key = f"title_{title.lower()}"
            if author:
                key += f"_author_{author.lower()}"
            
            self.cache_data[key] = {
                "data": data,
                "cached_at": datetime.now().isoformat()
            }
            await self._save_cache()
    
    async def set_series_cache(self, series: str, data: List[Dict[str, Any]]):
        async with self.lock:
            key = f"series_{series.lower()}"
            
            self.cache_data[key] = {
                "data": data,
                "cached_at": datetime.now().isoformat()
            }
            await self._save_cache()
    
    async def get_stale_entries(self, days: int = 30) -> List[str]:
        async with self.lock:
            stale_keys = []
            cutoff_time = datetime.now() - timedelta(days=days)
            
            for key, entry in self.cache_data.items():
                cached_time = datetime.fromisoformat(entry["cached_at"])
                if cached_time < cutoff_time:
                    stale_keys.append(key)
            
            return stale_keys
    
    async def remove_entry(self, key: str):
        async with self.lock:
            if key in self.cache_data:
                del self.cache_data[key]
                await self._save_cache()
    
    async def get_incomplete_entries(self) -> List[Dict[str, Any]]:
        async with self.lock:
            incomplete = []
            
            for key, entry in self.cache_data.items():
                data = entry["data"]
                # Check if entry is incomplete
                if isinstance(data, dict):
                    if not data.get("series_name") and data.get("title"):
                        incomplete.append({"key": key, "data": data, "reason": "missing_series"})
                    elif not data.get("editions") or len(data.get("editions", [])) == 0:
                        incomplete.append({"key": key, "data": data, "reason": "missing_editions"})
                    elif not data.get("cover_url"):
                        incomplete.append({"key": key, "data": data, "reason": "missing_cover"})
            
            return incomplete