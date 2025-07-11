"""
Background job processing service for periodic metadata refresh
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.database.models_cache import JobQueue, ScheduledTask, SeriesMetadata
from app.services.dynamic_cache_service import DynamicCacheService
from app.services.google_books_service import GoogleBooksClient
from app.database.connection import AsyncSessionLocal

logger = logging.getLogger(__name__)

class BackgroundJobService:
    """Service for processing background jobs and scheduled tasks"""
    
    def __init__(self):
        self.running = False
        self.worker_id = f"worker_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    async def start_worker(self):
        """Start the background worker process"""
        if self.running:
            logger.warning("Background worker is already running")
            return
        
        self.running = True
        logger.info(f"Starting background worker: {self.worker_id}")
        
        try:
            while self.running:
                async with AsyncSessionLocal() as session:
                    try:
                        # Process scheduled tasks
                        await self._process_scheduled_tasks(session)
                        
                        # Process pending jobs
                        await self._process_pending_jobs(session)
                        
                        # Clean up old completed jobs
                        await self._cleanup_old_jobs(session)
                        
                    except Exception as e:
                        logger.error(f"Error in background worker cycle: {e}")
                        await session.rollback()
                
                # Wait before next cycle
                await asyncio.sleep(30)  # Check every 30 seconds
                
        except Exception as e:
            logger.error(f"Background worker crashed: {e}")
        finally:
            self.running = False
            logger.info("Background worker stopped")
    
    async def stop_worker(self):
        """Stop the background worker"""
        self.running = False
        logger.info("Background worker stop requested")
    
    async def _process_scheduled_tasks(self, session: AsyncSession):
        """Process scheduled tasks that are due"""
        try:
            # Find tasks that are due to run
            result = await session.execute(
                select(ScheduledTask).where(
                    and_(
                        ScheduledTask.is_active == True,
                        ScheduledTask.next_run <= datetime.utcnow()
                    )
                )
            )
            due_tasks = result.scalars().all()
            
            for task in due_tasks:
                try:
                    logger.info(f"Processing scheduled task: {task.task_name}")
                    
                    # Create a job for this task
                    job_data = json.loads(task.task_data) if task.task_data else {}
                    job_data['scheduled_task_id'] = task.id
                    
                    job = JobQueue(
                        job_type=task.task_type,
                        job_data=json.dumps(job_data),
                        priority=1,  # Higher priority for scheduled tasks
                        scheduled_at=datetime.utcnow()
                    )
                    session.add(job)
                    
                    # Update task's next run time
                    next_run = self._calculate_next_run(task.cron_expression)
                    await session.execute(
                        update(ScheduledTask)
                        .where(ScheduledTask.id == task.id)
                        .values(
                            last_run=datetime.utcnow(),
                            next_run=next_run,
                            run_count=task.run_count + 1
                        )
                    )
                    
                    await session.commit()
                    logger.info(f"Scheduled task {task.task_name} queued for execution")
                    
                except Exception as e:
                    logger.error(f"Error processing scheduled task {task.task_name}: {e}")
                    await session.rollback()
                    
                    # Update failure count
                    await session.execute(
                        update(ScheduledTask)
                        .where(ScheduledTask.id == task.id)
                        .values(
                            failure_count=task.failure_count + 1,
                            last_error=str(e)
                        )
                    )
                    await session.commit()
        
        except Exception as e:
            logger.error(f"Error processing scheduled tasks: {e}")
    
    async def _process_pending_jobs(self, session: AsyncSession):
        """Process pending jobs from the queue"""
        try:
            # Get next pending job with highest priority
            result = await session.execute(
                select(JobQueue).where(
                    and_(
                        JobQueue.status == 'pending',
                        JobQueue.scheduled_at <= datetime.utcnow()
                    )
                ).order_by(JobQueue.priority.desc(), JobQueue.created_at.asc()).limit(1)
            )
            job = result.scalar_one_or_none()
            
            if not job:
                return
            
            # Claim the job
            await session.execute(
                update(JobQueue)
                .where(JobQueue.id == job.id)
                .values(
                    status='running',
                    started_at=datetime.utcnow(),
                    worker_id=self.worker_id
                )
            )
            await session.commit()
            
            try:
                logger.info(f"Processing job {job.id}: {job.job_type}")
                
                # Process the job based on type
                success = await self._execute_job(session, job)
                
                if success:
                    # Mark job as completed
                    await session.execute(
                        update(JobQueue)
                        .where(JobQueue.id == job.id)
                        .values(
                            status='completed',
                            completed_at=datetime.utcnow()
                        )
                    )
                    logger.info(f"Job {job.id} completed successfully")
                else:
                    # Handle job failure
                    await self._handle_job_failure(session, job)
                
                await session.commit()
                
            except Exception as e:
                logger.error(f"Error executing job {job.id}: {e}")
                await session.rollback()
                await self._handle_job_failure(session, job, str(e))
        
        except Exception as e:
            logger.error(f"Error processing pending jobs: {e}")
    
    async def _execute_job(self, session: AsyncSession, job: JobQueue) -> bool:
        """Execute a specific job based on its type"""
        try:
            job_data = json.loads(job.job_data)
            cache_service = DynamicCacheService(session)
            
            if job.job_type == "refresh_series_metadata":
                return await self._refresh_series_metadata(session, cache_service, job_data)
            elif job.job_type == "refresh_book_metadata":
                return await self._refresh_book_metadata(session, cache_service, job_data)
            elif job.job_type == "cleanup_expired_cache":
                return await self._cleanup_expired_cache(session, cache_service)
            else:
                logger.warning(f"Unknown job type: {job.job_type}")
                return False
        
        except Exception as e:
            logger.error(f"Error executing job: {e}")
            return False
    
    async def _refresh_series_metadata(self, session: AsyncSession, cache_service: DynamicCacheService, job_data: Dict[str, Any]) -> bool:
        """Refresh series metadata from external APIs"""
        try:
            series_name = job_data.get('series_name')
            author_name = job_data.get('author_name')
            
            if not series_name:
                logger.error("Series name not provided in job data")
                return False
            
            logger.info(f"Refreshing series metadata for: {series_name}")
            
            # Use Google Books API to refresh metadata
            async with GoogleBooksClient(cache_service=cache_service) as client:
                books = await client.search_series_books(series_name, author_name, max_results=40)
                
                if books:
                    # Store updated metadata
                    await cache_service.store_series_metadata(
                        series_name=series_name,
                        author_name=author_name or "Unknown",
                        metadata={
                            'series_name': series_name,
                            'total_books': len(books),
                            'known_books': books,
                            'refreshed_at': datetime.utcnow().isoformat()
                        },
                        source_api="google_books",
                        ttl_hours=168  # 1 week
                    )
                    
                    logger.info(f"Successfully refreshed metadata for series: {series_name}")
                    return True
                else:
                    logger.warning(f"No books found for series: {series_name}")
                    return False
        
        except Exception as e:
            logger.error(f"Error refreshing series metadata: {e}")
            return False
    
    async def _refresh_book_metadata(self, session: AsyncSession, cache_service: DynamicCacheService, job_data: Dict[str, Any]) -> bool:
        """Refresh individual book metadata"""
        try:
            isbn = job_data.get('isbn')
            
            if not isbn:
                logger.error("ISBN not provided in job data")
                return False
            
            logger.info(f"Refreshing book metadata for ISBN: {isbn}")
            
            # Use Google Books API to refresh metadata
            async with GoogleBooksClient(cache_service=cache_service) as client:
                metadata = await client.fetch_book_metadata(isbn)
                
                if metadata:
                    logger.info(f"Successfully refreshed metadata for ISBN: {isbn}")
                    return True
                else:
                    logger.warning(f"No metadata found for ISBN: {isbn}")
                    return False
        
        except Exception as e:
            logger.error(f"Error refreshing book metadata: {e}")
            return False
    
    async def _cleanup_expired_cache(self, session: AsyncSession, cache_service: DynamicCacheService) -> bool:
        """Clean up expired cache entries"""
        try:
            cleaned_count = await cache_service.clean_expired_cache()
            logger.info(f"Cache cleanup completed. Removed {cleaned_count} expired entries.")
            return True
        
        except Exception as e:
            logger.error(f"Error during cache cleanup: {e}")
            return False
    
    async def _handle_job_failure(self, session: AsyncSession, job: JobQueue, error_message: str = None):
        """Handle job failure with retry logic"""
        try:
            retry_count = job.retry_count + 1
            
            if retry_count <= job.max_retries:
                # Schedule retry
                retry_delay = min(retry_count * 300, 3600)  # Exponential backoff, max 1 hour
                scheduled_at = datetime.utcnow() + timedelta(seconds=retry_delay)
                
                await session.execute(
                    update(JobQueue)
                    .where(JobQueue.id == job.id)
                    .values(
                        status='pending',
                        retry_count=retry_count,
                        scheduled_at=scheduled_at,
                        error_message=error_message,
                        started_at=None,
                        worker_id=None
                    )
                )
                
                logger.info(f"Job {job.id} scheduled for retry {retry_count}/{job.max_retries} in {retry_delay} seconds")
            else:
                # Mark as failed
                await session.execute(
                    update(JobQueue)
                    .where(JobQueue.id == job.id)
                    .values(
                        status='failed',
                        completed_at=datetime.utcnow(),
                        error_message=error_message
                    )
                )
                
                logger.error(f"Job {job.id} failed permanently after {job.max_retries} retries")
            
            await session.commit()
        
        except Exception as e:
            logger.error(f"Error handling job failure: {e}")
    
    async def _cleanup_old_jobs(self, session: AsyncSession):
        """Clean up old completed/failed jobs"""
        try:
            # Remove jobs older than 7 days
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            
            result = await session.execute(
                delete(JobQueue).where(
                    and_(
                        JobQueue.status.in_(['completed', 'failed']),
                        or_(
                            JobQueue.completed_at < cutoff_date,
                            and_(
                                JobQueue.completed_at.is_(None),
                                JobQueue.created_at < cutoff_date
                            )
                        )
                    )
                )
            )
            
            deleted_count = result.rowcount
            if deleted_count > 0:
                await session.commit()
                logger.info(f"Cleaned up {deleted_count} old jobs")
        
        except Exception as e:
            logger.error(f"Error cleaning up old jobs: {e}")
    
    def _calculate_next_run(self, cron_expression: str) -> datetime:
        """Calculate next run time from cron expression (simplified)"""
        # For now, just add 24 hours - in production, use a proper cron parser
        return datetime.utcnow() + timedelta(hours=24)


# Global worker instance
background_worker = BackgroundJobService()

async def schedule_series_refresh_job(series_name: str, author_name: str = None, priority: int = 0):
    """Schedule a job to refresh series metadata"""
    async with AsyncSessionLocal() as session:
        cache_service = DynamicCacheService(session)
        
        job_data = {
            'series_name': series_name,
            'author_name': author_name
        }
        
        await cache_service.schedule_background_job(
            job_type="refresh_series_metadata",
            job_data=job_data,
            priority=priority
        )

async def schedule_cache_cleanup_job():
    """Schedule a cache cleanup job"""
    async with AsyncSessionLocal() as session:
        cache_service = DynamicCacheService(session)
        
        await cache_service.schedule_background_job(
            job_type="cleanup_expired_cache",
            job_data={},
            priority=0
        )