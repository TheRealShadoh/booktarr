import pytest
import time
from app.services.cache_service import LRUCache, CacheService

class TestLRUCache:
    """Test suite for LRUCache"""
    
    def test_basic_set_get(self):
        """Test basic cache set and get operations"""
        cache = LRUCache(max_size=10, ttl=60)
        
        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"
        
        cache.set("key2", {"nested": "value"})
        assert cache.get("key2") == {"nested": "value"}
    
    def test_cache_miss(self):
        """Test cache miss returns None"""
        cache = LRUCache(max_size=10, ttl=60)
        
        assert cache.get("nonexistent") is None
    
    def test_cache_expiry(self):
        """Test cache TTL expiry"""
        cache = LRUCache(max_size=10, ttl=1)  # 1 second TTL
        
        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"
        
        # Wait for expiry
        time.sleep(1.1)
        assert cache.get("key1") is None
    
    def test_lru_eviction(self):
        """Test LRU eviction when max_size is reached"""
        cache = LRUCache(max_size=3, ttl=60)
        
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")
        
        # All should be present
        assert cache.get("key1") == "value1"
        assert cache.get("key2") == "value2"
        assert cache.get("key3") == "value3"
        
        # Access key1 to make it most recently used
        cache.get("key1")
        
        # Add key4, should evict key2 (least recently used)
        cache.set("key4", "value4")
        
        assert cache.get("key1") == "value1"  # Still present
        assert cache.get("key2") is None      # Evicted
        assert cache.get("key3") == "value3"  # Still present
        assert cache.get("key4") == "value4"  # Newly added
    
    def test_cache_update(self):
        """Test updating existing cache entry"""
        cache = LRUCache(max_size=10, ttl=60)
        
        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"
        
        cache.set("key1", "updated_value")
        assert cache.get("key1") == "updated_value"
    
    def test_cache_delete(self):
        """Test cache deletion"""
        cache = LRUCache(max_size=10, ttl=60)
        
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        
        assert cache.get("key1") == "value1"
        assert cache.delete("key1") is True
        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"
        
        # Deleting non-existent key
        assert cache.delete("nonexistent") is False
    
    def test_cache_clear(self):
        """Test cache clearing"""
        cache = LRUCache(max_size=10, ttl=60)
        
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        
        assert cache.get("key1") == "value1"
        assert cache.get("key2") == "value2"
        
        cache.clear()
        
        assert cache.get("key1") is None
        assert cache.get("key2") is None
    
    def test_cache_stats(self):
        """Test cache statistics"""
        cache = LRUCache(max_size=10, ttl=60)
        
        # Initial stats
        stats = cache.get_stats()
        assert stats["hits"] == 0
        assert stats["misses"] == 0
        assert stats["hit_rate"] == 0
        assert stats["size"] == 0
        assert stats["max_size"] == 10
        
        # Add some data and access it
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        
        # Hit
        cache.get("key1")
        # Miss
        cache.get("nonexistent")
        
        stats = cache.get_stats()
        assert stats["hits"] == 1
        assert stats["misses"] == 1
        assert stats["hit_rate"] == 0.5
        assert stats["size"] == 2
        
        # Clear resets stats
        cache.clear()
        stats = cache.get_stats()
        assert stats["hits"] == 0
        assert stats["misses"] == 0
        assert stats["hit_rate"] == 0
        assert stats["size"] == 0
    
    def test_expired_entries_cleanup(self):
        """Test that expired entries are cleaned up"""
        cache = LRUCache(max_size=10, ttl=1)
        
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        
        # Both should be present
        assert cache.get("key1") == "value1"
        assert cache.get("key2") == "value2"
        
        # Wait for expiry
        time.sleep(1.1)
        
        # Accessing one should trigger cleanup of both
        assert cache.get("key1") is None
        
        # Cache should be empty
        stats = cache.get_stats()
        assert stats["size"] == 0

class TestCacheService:
    """Test suite for CacheService"""
    
    def test_book_cache_operations(self):
        """Test book-specific cache operations"""
        cache_service = CacheService()
        
        book_data = {
            "title": "Test Book",
            "author": "Test Author",
            "isbn": "9780306406157"
        }
        
        isbn = "9780306406157"
        
        # Test set and get
        cache_service.set_book(isbn, book_data)
        retrieved = cache_service.get_book(isbn)
        assert retrieved == book_data
        
        # Test miss
        assert cache_service.get_book("nonexistent") is None
    
    def test_api_cache_operations(self):
        """Test API response cache operations"""
        cache_service = CacheService()
        
        url = "https://api.example.com/book/123"
        response_data = {
            "status": "success",
            "data": {"title": "Test Book"}
        }
        
        # Test set and get
        cache_service.set_api_response(url, response_data)
        retrieved = cache_service.get_api_response(url)
        assert retrieved == response_data
        
        # Test miss
        assert cache_service.get_api_response("https://api.example.com/nonexistent") is None
    
    def test_page_cache_operations(self):
        """Test HTML page cache operations"""
        cache_service = CacheService()
        
        url = "https://example.com/books"
        html_content = "<html><body><h1>Book List</h1></body></html>"
        
        # Test set and get
        cache_service.set_page(url, html_content)
        retrieved = cache_service.get_page(url)
        assert retrieved == html_content
        
        # Test miss
        assert cache_service.get_page("https://example.com/nonexistent") is None
    
    def test_url_hashing(self):
        """Test that URLs are properly hashed for caching"""
        cache_service = CacheService()
        
        # Same URL should return same cached value
        url1 = "https://api.example.com/book/123"
        url2 = "https://api.example.com/book/123"  # Same URL
        url3 = "https://api.example.com/book/456"  # Different URL
        
        response_data = {"title": "Test Book"}
        
        cache_service.set_api_response(url1, response_data)
        
        # Same URL should return cached value
        assert cache_service.get_api_response(url2) == response_data
        
        # Different URL should return None
        assert cache_service.get_api_response(url3) is None
    
    def test_clear_all_caches(self):
        """Test clearing all caches"""
        cache_service = CacheService()
        
        # Populate all caches
        cache_service.set_book("9780306406157", {"title": "Book"})
        cache_service.set_api_response("https://api.com/test", {"data": "test"})
        cache_service.set_page("https://example.com", "<html>test</html>")
        
        # Verify data is cached
        assert cache_service.get_book("9780306406157") is not None
        assert cache_service.get_api_response("https://api.com/test") is not None
        assert cache_service.get_page("https://example.com") is not None
        
        # Clear all caches
        cache_service.clear_all()
        
        # Verify all caches are empty
        assert cache_service.get_book("9780306406157") is None
        assert cache_service.get_api_response("https://api.com/test") is None
        assert cache_service.get_page("https://example.com") is None
    
    def test_cache_stats(self):
        """Test comprehensive cache statistics"""
        cache_service = CacheService()
        
        # Add some data to different caches
        cache_service.set_book("9780306406157", {"title": "Book"})
        cache_service.set_api_response("https://api.com/test", {"data": "test"})
        cache_service.set_page("https://example.com", "<html>test</html>")
        
        # Access some data (hits and misses)
        cache_service.get_book("9780306406157")  # Hit
        cache_service.get_book("nonexistent")    # Miss
        
        stats = cache_service.get_stats()
        
        # Should have stats for all three caches
        assert "book_cache" in stats
        assert "api_cache" in stats
        assert "page_cache" in stats
        
        # Book cache should show activity
        book_stats = stats["book_cache"]
        assert book_stats["size"] == 1
        assert book_stats["hits"] == 1
        assert book_stats["misses"] == 1
        assert book_stats["hit_rate"] == 0.5
        
        # API cache should show one entry, no access
        api_stats = stats["api_cache"]
        assert api_stats["size"] == 1
        assert api_stats["hits"] == 0
        assert api_stats["misses"] == 0
        
        # Page cache should show one entry, no access
        page_stats = stats["page_cache"]
        assert page_stats["size"] == 1
        assert page_stats["hits"] == 0
        assert page_stats["misses"] == 0
    
    def test_different_cache_ttls(self):
        """Test that different caches have different TTLs"""
        # This test verifies the concept but is hard to test without waiting
        # The API cache should have shorter TTL than book cache
        cache_service = CacheService(ttl=4)  # 4 seconds base TTL
        
        # API cache should have ttl=2, book cache should have ttl=4, page cache should have ttl=8
        stats = cache_service.get_stats()
        
        assert stats["api_cache"]["ttl"] == 2    # ttl // 2
        assert stats["book_cache"]["ttl"] == 4   # ttl
        assert stats["page_cache"]["ttl"] == 8   # ttl * 2
    
    def test_cache_key_prefixes(self):
        """Test that cache keys have proper prefixes"""
        cache_service = CacheService()
        
        # This is more of an implementation detail test
        # We can't directly access the internal cache keys, but we can verify
        # that different types of data don't interfere with each other
        
        # Use same string for different cache types
        test_string = "test123"
        
        cache_service.set_book(test_string, {"type": "book"})
        cache_service.set_api_response(test_string, {"type": "api"})
        cache_service.set_page(test_string, "page content")
        
        # Each should return its own data
        assert cache_service.get_book(test_string) == {"type": "book"}
        assert cache_service.get_api_response(test_string) == {"type": "api"}
        assert cache_service.get_page(test_string) == "page content"