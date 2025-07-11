"""
Setup scheduled tasks for automatic metadata refresh
"""
import asyncio
import json
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.database.models_cache import ScheduledTask, APIConfiguration
from app.database.connection import AsyncSessionLocal
import logging

logger = logging.getLogger(__name__)

async def setup_default_scheduled_tasks():
    """Set up default scheduled tasks for metadata refresh"""
    
    async with AsyncSessionLocal() as session:
        try:
            # Task 1: Daily cache cleanup
            await _ensure_task_exists(
                session,
                task_name="daily_cache_cleanup",
                task_type="cleanup_expired_cache",
                cron_expression="0 2 * * *",  # Every day at 2 AM
                task_data=json.dumps({}),
                description="Daily cleanup of expired cache entries"
            )
            
            # Task 2: Weekly series metadata refresh
            await _ensure_task_exists(
                session,
                task_name="weekly_series_refresh",
                task_type="refresh_all_series_metadata",
                cron_expression="0 3 * * 0",  # Every Sunday at 3 AM
                task_data=json.dumps({"batch_size": 10, "delay_between_requests": 5}),
                description="Weekly refresh of all cached series metadata"
            )
            
            await session.commit()
            logger.info("Default scheduled tasks set up successfully")
            
        except Exception as e:
            logger.error(f"Error setting up scheduled tasks: {e}")
            await session.rollback()

async def _ensure_task_exists(
    session: AsyncSession,
    task_name: str,
    task_type: str,
    cron_expression: str,
    task_data: str,
    description: str = None
):
    """Ensure a scheduled task exists, create if it doesn't"""
    
    # Check if task already exists
    result = await session.execute(
        select(ScheduledTask).where(ScheduledTask.task_name == task_name)
    )
    existing_task = result.scalar_one_or_none()
    
    if existing_task:
        # Update existing task
        await session.execute(
            update(ScheduledTask)
            .where(ScheduledTask.id == existing_task.id)
            .values(
                task_type=task_type,
                cron_expression=cron_expression,
                task_data=task_data,
                next_run=_calculate_next_run(cron_expression),
                updated_at=datetime.utcnow()
            )
        )
        logger.info(f"Updated scheduled task: {task_name}")
    else:
        # Create new task
        task = ScheduledTask(
            task_name=task_name,
            task_type=task_type,
            cron_expression=cron_expression,
            task_data=task_data,
            is_active=True,
            next_run=_calculate_next_run(cron_expression)
        )
        session.add(task)
        logger.info(f"Created scheduled task: {task_name}")

def _calculate_next_run(cron_expression: str) -> datetime:
    """Calculate next run time from cron expression (simplified)"""
    # For now, schedule 1 hour from now - in production, use proper cron parser
    return datetime.utcnow() + timedelta(hours=1)

async def setup_default_api_configurations():
    """Set up default API configurations for rate limiting"""
    
    async with AsyncSessionLocal() as session:
        try:
            # Google Books API configuration
            await _ensure_api_config_exists(
                session,
                service_name="google_books",
                config_key="rate_limit_minute",
                config_value="60",
                description="Rate limit per minute for Google Books API"
            )
            
            await _ensure_api_config_exists(
                session,
                service_name="google_books",
                config_key="rate_limit_hour",
                config_value="1000",
                description="Rate limit per hour for Google Books API"
            )
            
            await _ensure_api_config_exists(
                session,
                service_name="google_books",
                config_key="cache_ttl_hours",
                config_value="24",
                description="Cache TTL in hours for Google Books responses"
            )
            
            # Open Library API configuration
            await _ensure_api_config_exists(
                session,
                service_name="open_library",
                config_key="rate_limit_minute",
                config_value="30",
                description="Rate limit per minute for Open Library API"
            )
            
            await _ensure_api_config_exists(
                session,
                service_name="open_library",
                config_key="rate_limit_hour",
                config_value="500",
                description="Rate limit per hour for Open Library API"
            )
            
            await _ensure_api_config_exists(
                session,
                service_name="open_library",
                config_key="cache_ttl_hours",
                config_value="72",
                description="Cache TTL in hours for Open Library responses"
            )
            
            await session.commit()
            logger.info("Default API configurations set up successfully")
            
        except Exception as e:
            logger.error(f"Error setting up API configurations: {e}")
            await session.rollback()

async def _ensure_api_config_exists(
    session: AsyncSession,
    service_name: str,
    config_key: str,
    config_value: str,
    description: str = None
):
    """Ensure an API configuration exists, create if it doesn't"""
    
    # Check if config already exists
    result = await session.execute(
        select(APIConfiguration).where(
            (APIConfiguration.service_name == service_name) &
            (APIConfiguration.config_key == config_key)
        )
    )
    existing_config = result.scalar_one_or_none()
    
    if existing_config:
        # Update existing config
        await session.execute(
            update(APIConfiguration)
            .where(APIConfiguration.id == existing_config.id)
            .values(
                config_value=config_value,
                description=description,
                updated_at=datetime.utcnow()
            )
        )
        logger.info(f"Updated API config: {service_name}.{config_key}")
    else:
        # Create new config
        config = APIConfiguration(
            service_name=service_name,
            config_key=config_key,
            config_value=config_value,
            description=description,
            is_active=True
        )
        session.add(config)
        logger.info(f"Created API config: {service_name}.{config_key}")

async def initialize_dynamic_system():
    """Initialize the entire dynamic caching and job system"""
    try:
        logger.info("Initializing dynamic caching and job system...")
        
        # Set up API configurations
        await setup_default_api_configurations()
        
        # Set up scheduled tasks
        await setup_default_scheduled_tasks()
        
        logger.info("Dynamic system initialization completed successfully")
        
    except Exception as e:
        logger.error(f"Error initializing dynamic system: {e}")
        raise

if __name__ == "__main__":
    # Run initialization
    asyncio.run(initialize_dynamic_system())