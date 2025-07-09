from typing import Dict, Optional, Any
import time
import json
import hashlib
from collections import OrderedDict

class LRUCache:
    """LRU (Least Recently Used) cache with TTL support"""
    
    def __init__(self, max_size: int = 1000, ttl: int = 3600):
        self.cache: OrderedDict[str, tuple] = OrderedDict()
        self.max_size = max_size
        self.ttl = ttl
        self._hits = 0
        self._misses = 0
    
    def _evict_expired(self):
        """Remove expired entries"""
        current_time = time.time()
        expired_keys = []
        for key, (_, timestamp) in self.cache.items():
            if current_time - timestamp >= self.ttl:
                expired_keys.append(key)
        for key in expired_keys:
            del self.cache[key]
    
    def _evict_lru(self):
        """Remove least recently used entries to maintain max_size"""
        while len(self.cache) >= self.max_size:
            self.cache.popitem(last=False)
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value if not expired"""
        self._evict_expired()
        
        if key in self.cache:
            data, timestamp = self.cache[key]
            # Move to end (most recently used)
            self.cache.move_to_end(key)
            self._hits += 1
            return data
        
        self._misses += 1
        return None
    
    def set(self, key: str, value: Any):
        """Set cache value with timestamp"""
        self._evict_expired()
        self._evict_lru()
        
        self.cache[key] = (value, time.time())
        self.cache.move_to_end(key)
    
    def delete(self, key: str) -> bool:
        """Delete specific key from cache"""
        if key in self.cache:
            del self.cache[key]
            return True
        return False
    
    def clear(self):
        """Clear all cache entries"""
        self.cache.clear()
        self._hits = 0
        self._misses = 0
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        total_requests = self._hits + self._misses
        hit_rate = self._hits / total_requests if total_requests > 0 else 0
        
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": hit_rate,
            "ttl": self.ttl
        }

class CacheService:
    """Enhanced cache service with multiple cache strategies"""
    
    def __init__(self, ttl: int = 3600, max_size: int = 1000):
        self.book_cache = LRUCache(max_size=max_size, ttl=ttl)
        self.api_cache = LRUCache(max_size=max_size // 2, ttl=ttl // 2)  # Shorter TTL for API responses
        self.page_cache = LRUCache(max_size=100, ttl=ttl * 2)  # Longer TTL for HTML pages
    
    def get_book(self, isbn: str) -> Optional[dict]:
        """Get book from cache"""
        return self.book_cache.get(f"book:{isbn}")
    
    def set_book(self, isbn: str, book_data: dict):
        """Cache book data"""
        self.book_cache.set(f"book:{isbn}", book_data)
    
    def get_api_response(self, url: str) -> Optional[dict]:
        """Get API response from cache"""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return self.api_cache.get(f"api:{url_hash}")
    
    def set_api_response(self, url: str, response_data: dict):
        """Cache API response"""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        self.api_cache.set(f"api:{url_hash}", response_data)
    
    def get_page(self, url: str) -> Optional[str]:
        """Get HTML page from cache"""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return self.page_cache.get(f"page:{url_hash}")
    
    def set_page(self, url: str, html_content: str):
        """Cache HTML page"""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        self.page_cache.set(f"page:{url_hash}", html_content)
    
    def clear_all(self):
        """Clear all caches"""
        self.book_cache.clear()
        self.api_cache.clear()
        self.page_cache.clear()
    
    def get_stats(self) -> dict:
        """Get comprehensive cache statistics"""
        return {
            "book_cache": self.book_cache.get_stats(),
            "api_cache": self.api_cache.get_stats(),
            "page_cache": self.page_cache.get_stats()
        }

# Global cache instance
cache_service = CacheService()