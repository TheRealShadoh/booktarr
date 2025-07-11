"""
Database models for caching and configuration
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

class APIResponseCache(Base):
    """Cache for API responses from external services"""
    __tablename__ = 'api_response_cache'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    cache_key = Column(String(255), unique=True, nullable=False, index=True)
    api_service = Column(String(50), nullable=False, index=True)
    request_url = Column(Text, nullable=False)
    response_data = Column(Text, nullable=False)  # JSON response
    created_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    hit_count = Column(Integer, default=0)
    last_accessed = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('idx_api_service_created', 'api_service', 'created_at'),
        Index('idx_expires_at', 'expires_at'),
    )

class APIConfiguration(Base):
    """Dynamic API configuration settings"""
    __tablename__ = 'api_configurations'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    service_name = Column(String(50), nullable=False, index=True)
    config_key = Column(String(100), nullable=False)
    config_value = Column(Text, nullable=False)
    config_type = Column(String(20), default='string')  # 'string', 'integer', 'boolean', 'json'
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_service_key', 'service_name', 'config_key', unique=True),
    )

class RateLimitTracking(Base):
    """Track API rate limiting across time windows"""
    __tablename__ = 'rate_limit_tracking'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    api_service = Column(String(50), nullable=False, index=True)
    time_window = Column(String(20), nullable=False)  # 'second', 'minute', 'hour', 'day'
    window_start = Column(DateTime, nullable=False)
    request_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    __table_args__ = (
        Index('idx_service_window_start', 'api_service', 'time_window', 'window_start', unique=True),
    )

class MetadataEnhancementHistory(Base):
    """Track metadata enhancement operations and results"""
    __tablename__ = 'metadata_enhancement_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    isbn = Column(String(13), nullable=False, index=True)
    enhancement_type = Column(String(50), nullable=False, index=True)
    original_data = Column(Text)  # JSON of original metadata
    enhanced_data = Column(Text)  # JSON of enhanced metadata
    success = Column(Boolean, nullable=False)
    error_message = Column(Text)
    processing_time_ms = Column(Integer)
    source_api = Column(String(50))  # Which API provided the enhancement
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_isbn_type', 'isbn', 'enhancement_type'),
        Index('idx_success_created', 'success', 'created_at'),
    )

class ApplicationConfig(Base):
    """Centralized application configuration"""
    __tablename__ = 'application_config'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    config_section = Column(String(50), nullable=False, index=True)
    config_key = Column(String(100), nullable=False)
    config_value = Column(Text, nullable=False)
    config_type = Column(String(20), default='string')
    description = Column(Text)
    is_system = Column(Boolean, default=False)  # System configs that can't be changed via UI
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_section_key', 'config_section', 'config_key', unique=True),
    )

class FeatureFlag(Base):
    """Dynamic feature control"""
    __tablename__ = 'feature_flags'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    flag_name = Column(String(100), nullable=False, unique=True, index=True)
    is_enabled = Column(Boolean, default=False, nullable=False)
    description = Column(Text)
    rollout_percentage = Column(Integer, default=0)  # 0-100 for gradual rollout
    target_audience = Column(String(100))  # 'all', 'admin', 'beta_users', etc.
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class JobQueue(Base):
    """Background job queue"""
    __tablename__ = 'job_queue'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_type = Column(String(50), nullable=False, index=True)
    job_data = Column(Text, nullable=False)  # JSON payload
    status = Column(String(20), default='pending', nullable=False, index=True)
    priority = Column(Integer, default=0, index=True)
    scheduled_at = Column(DateTime, default=func.now(), nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    worker_id = Column(String(100))  # ID of worker processing the job
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    __table_args__ = (
        Index('idx_status_priority', 'status', 'priority'),
        Index('idx_job_type_status', 'job_type', 'status'),
    )

class ScheduledTask(Base):
    """Cron-like scheduled tasks"""
    __tablename__ = 'scheduled_tasks'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_name = Column(String(100), nullable=False, unique=True, index=True)
    task_type = Column(String(50), nullable=False)
    cron_expression = Column(String(100))  # Standard cron format
    task_data = Column(Text)  # JSON configuration
    is_active = Column(Boolean, default=True, nullable=False)
    last_run = Column(DateTime)
    next_run = Column(DateTime, index=True)
    run_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    last_error = Column(Text)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class SeriesMetadata(Base):
    """Cached series metadata from external APIs"""
    __tablename__ = 'series_metadata'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    series_name = Column(String(200), nullable=False, index=True)
    author_name = Column(String(200), index=True)
    total_books = Column(Integer)
    source_api = Column(String(50), nullable=False)  # 'google_books', 'open_library'
    metadata_json = Column(Text, nullable=False)  # Full JSON response
    quality_score = Column(Integer, default=0)  # 0-100 based on completeness
    is_verified = Column(Boolean, default=False)  # Manually verified as accurate
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime, nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_series_author', 'series_name', 'author_name'),
        Index('idx_quality_verified', 'quality_score', 'is_verified'),
    )

class SearchAnalytics(Base):
    """Track search queries and results for optimization"""
    __tablename__ = 'search_analytics'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    search_query = Column(String(500), nullable=False, index=True)
    search_type = Column(String(50), nullable=False)  # 'title', 'author', 'isbn', 'general'
    result_count = Column(Integer, default=0)
    response_time_ms = Column(Integer)
    api_sources_used = Column(Text)  # JSON array of APIs consulted
    user_agent = Column(String(500))
    ip_address = Column(String(45))  # IPv6 compatible
    was_cached = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_query_type', 'search_query', 'search_type'),
        Index('idx_created_cached', 'created_at', 'was_cached'),
    )