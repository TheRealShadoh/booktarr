from typing import Dict, Optional
import time
import json

class InMemoryCache:
    def __init__(self, ttl: int = 3600):
        self.cache: Dict[str, tuple] = {}
        self.ttl = ttl
    
    def get(self, key: str) -> Optional[dict]:
        """Get cached value if not expired"""
        if key in self.cache:
            data, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return data
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: dict):
        """Set cache value with timestamp"""
        self.cache[key] = (value, time.time())
    
    def clear(self):
        """Clear all cache entries"""
        self.cache.clear()

# Global cache instance
cache = InMemoryCache()