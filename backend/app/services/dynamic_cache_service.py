"""
Dynamic cache service for API responses with rate limiting and background refresh
"""
import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Union
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.database.models_cache import (
    APIResponseCache, APIConfiguration, RateLimitTracking, 
    MetadataEnhancementHistory, ApplicationConfig, FeatureFlag,
    JobQueue, ScheduledTask, SeriesMetadata, SearchAnalytics
)

logger = logging.getLogger(__name__)

class DynamicCacheService:
    """Service for managing API response caching and rate limiting"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        
    def _generate_cache_key(self, api_service: str, url: str, params: Dict[str, Any] = None) -> str:
        """Generate a unique cache key from service, URL and parameters"""
        key_data = f"{api_service}:{url}"
        if params:
            # Sort params for consistent key generation
            sorted_params = json.dumps(params, sort_keys=True)
            key_data += f":{sorted_params}"
        
        return hashlib.sha256(key_data.encode()).hexdigest()
    
    async def get_cached_response(
        self, 
        api_service: str, 
        url: str, 
        params: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """Get cached API response if available and not expired"""
        cache_key = self._generate_cache_key(api_service, url, params)
        
        try:
            result = await self.session.execute(
                select(APIResponseCache).where(
                    and_(
                        APIResponseCache.cache_key == cache_key,
                        APIResponseCache.expires_at > datetime.utcnow()
                    )
                )
            )
            cached_item = result.scalar_one_or_none()
            
            if cached_item:
                # Update hit count and last accessed
                await self.session.execute(
                    update(APIResponseCache)
                    .where(APIResponseCache.id == cached_item.id)
                    .values(
                        hit_count=cached_item.hit_count + 1,
                        last_accessed=datetime.utcnow()
                    )
                )
                await self.session.commit()
                
                logger.info(f"Cache HIT for {api_service}: {url}")
                return json.loads(cached_item.response_data)
            
            logger.info(f"Cache MISS for {api_service}: {url}")
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving cache for {api_service}: {e}")
            return None
    
    async def store_cached_response(
        self,
        api_service: str,
        url: str,
        response_data: Dict[str, Any],
        ttl_hours: int = 24,
        params: Dict[str, Any] = None
    ) -> bool:
        """Store API response in cache"""
        cache_key = self._generate_cache_key(api_service, url, params)
        expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
        
        try:
            # Check if entry already exists
            result = await self.session.execute(
                select(APIResponseCache).where(APIResponseCache.cache_key == cache_key)
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                # Update existing entry
                await self.session.execute(
                    update(APIResponseCache)
                    .where(APIResponseCache.id == existing.id)
                    .values(
                        response_data=json.dumps(response_data),
                        expires_at=expires_at,
                        last_accessed=datetime.utcnow()
                    )
                )
            else:
                # Create new entry
                cache_entry = APIResponseCache(
                    cache_key=cache_key,
                    api_service=api_service,
                    request_url=url,
                    response_data=json.dumps(response_data),
                    expires_at=expires_at,
                    hit_count=0,
                    last_accessed=datetime.utcnow()
                )
                self.session.add(cache_entry)
            
            await self.session.commit()
            logger.info(f"Cached response for {api_service}: {url}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing cache for {api_service}: {e}")
            await self.session.rollback()
            return False
    
    async def check_rate_limit(self, api_service: str, window: str = "minute") -> bool:
        """Check if API service is within rate limits"""
        
        # Get rate limit configuration
        config = await self.get_api_config(api_service, f"rate_limit_{window}")
        if not config:
            # Default rate limits if not configured
            default_limits = {"minute": 60, "hour": 1000, "day": 10000}
            limit = default_limits.get(window, 60)
        else:
            limit = int(config)
        
        # Calculate window start time
        now = datetime.utcnow()
        if window == "minute":
            window_start = now.replace(second=0, microsecond=0)
        elif window == "hour":
            window_start = now.replace(minute=0, second=0, microsecond=0)
        elif window == "day":
            window_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            window_start = now - timedelta(seconds=60)  # Default to 1 minute
        
        try:
            # Get or create rate limit tracking entry
            result = await self.session.execute(
                select(RateLimitTracking).where(
                    and_(
                        RateLimitTracking.api_service == api_service,
                        RateLimitTracking.time_window == window,
                        RateLimitTracking.window_start == window_start
                    )
                )
            )
            tracking = result.scalar_one_or_none()
            
            if tracking:
                if tracking.request_count >= limit:
                    logger.warning(f"Rate limit exceeded for {api_service} ({window}): {tracking.request_count}/{limit}")
                    return False
                
                # Increment request count
                await self.session.execute(
                    update(RateLimitTracking)
                    .where(RateLimitTracking.id == tracking.id)
                    .values(request_count=tracking.request_count + 1)
                )
            else:
                # Create new tracking entry
                tracking = RateLimitTracking(
                    api_service=api_service,
                    time_window=window,
                    window_start=window_start,
                    request_count=1
                )
                self.session.add(tracking)
            
            await self.session.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error checking rate limit for {api_service}: {e}")
            return False
    
    async def get_api_config(self, service_name: str, config_key: str) -> Optional[str]:
        """Get API configuration value"""
        try:
            result = await self.session.execute(
                select(APIConfiguration).where(
                    and_(
                        APIConfiguration.service_name == service_name,
                        APIConfiguration.config_key == config_key,
                        APIConfiguration.is_active == True
                    )
                )
            )
            config = result.scalar_one_or_none()
            return config.config_value if config else None
            
        except Exception as e:
            logger.error(f"Error getting API config {service_name}.{config_key}: {e}")
            return None
    
    async def set_api_config(self, service_name: str, config_key: str, value: str, description: str = None) -> bool:
        """Set API configuration value"""
        try:
            result = await self.session.execute(
                select(APIConfiguration).where(
                    and_(
                        APIConfiguration.service_name == service_name,
                        APIConfiguration.config_key == config_key
                    )
                )
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                await self.session.execute(
                    update(APIConfiguration)
                    .where(APIConfiguration.id == existing.id)
                    .values(
                        config_value=value,
                        description=description,
                        updated_at=datetime.utcnow()
                    )
                )
            else:
                config = APIConfiguration(
                    service_name=service_name,
                    config_key=config_key,
                    config_value=value,
                    description=description
                )
                self.session.add(config)
            
            await self.session.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error setting API config {service_name}.{config_key}: {e}")
            await self.session.rollback()
            return False
    
    async def store_series_metadata(
        self,
        series_name: str,
        author_name: str,
        metadata: Dict[str, Any],
        source_api: str,
        ttl_hours: int = 168  # 1 week default
    ) -> bool:
        """Store series metadata with expiration"""
        expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
        
        try:
            # Check for existing entry
            result = await self.session.execute(
                select(SeriesMetadata).where(
                    and_(
                        SeriesMetadata.series_name == series_name,
                        SeriesMetadata.author_name == author_name,
                        SeriesMetadata.source_api == source_api
                    )
                )
            )
            existing = result.scalar_one_or_none()
            
            # Calculate quality score based on completeness
            quality_score = self._calculate_metadata_quality(metadata)
            
            if existing:
                await self.session.execute(
                    update(SeriesMetadata)
                    .where(SeriesMetadata.id == existing.id)
                    .values(
                        metadata_json=json.dumps(metadata),
                        quality_score=quality_score,
                        updated_at=datetime.utcnow(),
                        expires_at=expires_at
                    )
                )
            else:
                series_meta = SeriesMetadata(
                    series_name=series_name,
                    author_name=author_name,
                    total_books=metadata.get('total_books'),
                    source_api=source_api,
                    metadata_json=json.dumps(metadata),
                    quality_score=quality_score,
                    expires_at=expires_at
                )
                self.session.add(series_meta)
            
            await self.session.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error storing series metadata for {series_name}: {e}")
            await self.session.rollback()
            return False
    
    async def get_series_metadata(self, series_name: str, author_name: str = None) -> Optional[Dict[str, Any]]:
        """Get cached series metadata"""
        try:
            query = select(SeriesMetadata).where(
                and_(
                    SeriesMetadata.series_name == series_name,
                    SeriesMetadata.expires_at > datetime.utcnow()
                )
            )
            
            if author_name:
                query = query.where(SeriesMetadata.author_name == author_name)
            
            # Order by quality score and recency for best match
            query = query.order_by(
                SeriesMetadata.quality_score.desc(),
                SeriesMetadata.updated_at.desc()
            )
            
            result = await self.session.execute(query)
            metadata = result.scalar_one_or_none()
            
            if metadata:
                return {
                    'series_name': metadata.series_name,
                    'author_name': metadata.author_name,
                    'total_books': metadata.total_books,
                    'source_api': metadata.source_api,
                    'quality_score': metadata.quality_score,
                    'metadata': json.loads(metadata.metadata_json)
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting series metadata for {series_name}: {e}")
            return None
    
    def _calculate_metadata_quality(self, metadata: Dict[str, Any]) -> int:
        """Calculate quality score (0-100) based on metadata completeness"""
        score = 0
        
        # Basic information
        if metadata.get('total_books'):
            score += 20
        if metadata.get('books') and len(metadata['books']) > 0:
            score += 30
        if metadata.get('description'):
            score += 10
        if metadata.get('genre') or metadata.get('categories'):
            score += 10
        if metadata.get('publication_date') or metadata.get('first_published'):
            score += 10
        if metadata.get('rating') or metadata.get('average_rating'):
            score += 10
        if metadata.get('cover_image') or metadata.get('image_links'):
            score += 10
        
        return min(score, 100)
    
    async def schedule_background_job(
        self,
        job_type: str,
        job_data: Dict[str, Any],
        priority: int = 0,
        max_retries: int = 3,
        scheduled_at: datetime = None
    ) -> bool:
        """Schedule a background job for execution"""
        try:
            job = JobQueue(
                job_type=job_type,
                job_data=json.dumps(job_data),
                priority=priority,
                max_retries=max_retries,
                scheduled_at=scheduled_at or datetime.utcnow()
            )
            self.session.add(job)
            await self.session.commit()
            
            logger.info(f"Scheduled background job: {job_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling job {job_type}: {e}")
            await self.session.rollback()
            return False
    
    async def clean_expired_cache(self) -> int:
        """Remove expired cache entries and return count of cleaned entries"""
        try:
            # Count expired entries
            result = await self.session.execute(
                select(APIResponseCache).where(
                    APIResponseCache.expires_at <= datetime.utcnow()
                )
            )
            expired_count = len(result.fetchall())
            
            # Delete expired entries
            await self.session.execute(
                delete(APIResponseCache).where(
                    APIResponseCache.expires_at <= datetime.utcnow()
                )
            )
            
            # Clean expired series metadata
            await self.session.execute(
                delete(SeriesMetadata).where(
                    SeriesMetadata.expires_at <= datetime.utcnow()
                )
            )
            
            await self.session.commit()
            logger.info(f"Cleaned {expired_count} expired cache entries")
            return expired_count
            
        except Exception as e:
            logger.error(f"Error cleaning expired cache: {e}")
            await self.session.rollback()
            return 0


def get_cache_service(session: AsyncSession) -> DynamicCacheService:
    """Factory function to get cache service instance"""
    return DynamicCacheService(session)