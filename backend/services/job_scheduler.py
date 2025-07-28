"""
Job scheduler service for running background tasks
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from enum import Enum
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class JobStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RATE_LIMITED = "rate_limited"

class JobConfig:
    def __init__(
        self,
        name: str,
        description: str,
        interval_hours: float,
        enabled: bool = True,
        last_run: Optional[datetime] = None,
        next_run: Optional[datetime] = None,
        status: JobStatus = JobStatus.IDLE,
        last_error: Optional[str] = None,
        items_processed: int = 0,
        items_failed: int = 0
    ):
        self.name = name
        self.description = description
        self.interval_hours = interval_hours
        self.enabled = enabled
        self.last_run = last_run
        self.next_run = next_run or datetime.now()
        self.status = status
        self.last_error = last_error
        self.items_processed = items_processed
        self.items_failed = items_failed
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "interval_hours": self.interval_hours,
            "enabled": self.enabled,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None,
            "status": self.status.value,
            "last_error": self.last_error,
            "items_processed": self.items_processed,
            "items_failed": self.items_failed
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'JobConfig':
        return cls(
            name=data["name"],
            description=data["description"],
            interval_hours=data["interval_hours"],
            enabled=data.get("enabled", True),
            last_run=datetime.fromisoformat(data["last_run"]) if data.get("last_run") else None,
            next_run=datetime.fromisoformat(data["next_run"]) if data.get("next_run") else None,
            status=JobStatus(data.get("status", "idle")),
            last_error=data.get("last_error"),
            items_processed=data.get("items_processed", 0),
            items_failed=data.get("items_failed", 0)
        )

class JobScheduler:
    def __init__(self, config_file: str = "jobs_config.json"):
        self.config_file = Path(config_file)
        self.jobs: Dict[str, JobConfig] = {}
        self.job_functions: Dict[str, Callable] = {}
        self.running = False
        self.tasks: List[asyncio.Task] = []
        self.load_config()
        
    def load_config(self):
        """Load job configurations from file"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    data = json.load(f)
                    for job_data in data.get("jobs", []):
                        job = JobConfig.from_dict(job_data)
                        self.jobs[job.name] = job
            except Exception as e:
                logger.error(f"Error loading job config: {e}")
                
    def save_config(self):
        """Save job configurations to file"""
        try:
            data = {
                "jobs": [job.to_dict() for job in self.jobs.values()]
            }
            with open(self.config_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving job config: {e}")
            
    def register_job(self, name: str, description: str, interval_hours: float, 
                    job_function: Callable, enabled: bool = True):
        """Register a new job or update existing one"""
        if name not in self.jobs:
            self.jobs[name] = JobConfig(
                name=name,
                description=description,
                interval_hours=interval_hours,
                enabled=enabled
            )
        else:
            # Update existing job config
            job = self.jobs[name]
            job.description = description
            job.interval_hours = interval_hours
            job.enabled = enabled
            
        self.job_functions[name] = job_function
        self.save_config()
        
    async def run_job(self, job_name: str, force: bool = False):
        """Run a specific job"""
        if job_name not in self.jobs or job_name not in self.job_functions:
            logger.error(f"Job {job_name} not found")
            return
            
        job = self.jobs[job_name]
        
        # Check if job should run
        if not force and (not job.enabled or job.status == JobStatus.RUNNING):
            return
            
        # Check if it's time to run
        if not force and job.next_run and datetime.now() < job.next_run:
            return
            
        logger.info(f"Starting job: {job_name}")
        job.status = JobStatus.RUNNING
        job.items_processed = 0
        job.items_failed = 0
        job.last_error = None
        self.save_config()
        
        try:
            # Run the job function
            result = await self.job_functions[job_name](job)
            
            # Update job status based on result
            if result.get("rate_limited"):
                job.status = JobStatus.RATE_LIMITED
                job.next_run = datetime.now() + timedelta(hours=job.interval_hours)
                job.last_error = "API rate limit reached"
            else:
                job.status = JobStatus.COMPLETED
                job.next_run = datetime.now() + timedelta(hours=job.interval_hours)
                
            job.last_run = datetime.now()
            job.items_processed = result.get("processed", 0)
            job.items_failed = result.get("failed", 0)
            
            logger.info(f"Job {job_name} completed: {job.items_processed} processed, {job.items_failed} failed")
            
        except Exception as e:
            logger.error(f"Job {job_name} failed: {e}")
            job.status = JobStatus.FAILED
            job.last_error = str(e)
            job.next_run = datetime.now() + timedelta(hours=job.interval_hours)
            
        finally:
            self.save_config()
            
    async def scheduler_loop(self):
        """Main scheduler loop"""
        while self.running:
            try:
                # Check each job
                for job_name, job in self.jobs.items():
                    if job.enabled and job.status != JobStatus.RUNNING:
                        if not job.next_run or datetime.now() >= job.next_run:
                            # Run job in background
                            task = asyncio.create_task(self.run_job(job_name))
                            self.tasks.append(task)
                            
                # Clean up completed tasks
                self.tasks = [t for t in self.tasks if not t.done()]
                
                # Wait before next check
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")
                await asyncio.sleep(60)
                
    def start(self):
        """Start the scheduler"""
        if self.running:
            return
            
        self.running = True
        logger.info("Job scheduler started")
        
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        
        # Cancel all running tasks
        for task in self.tasks:
            task.cancel()
            
        logger.info("Job scheduler stopped")
        
    def get_jobs_status(self) -> List[Dict[str, Any]]:
        """Get status of all jobs"""
        return [job.to_dict() for job in self.jobs.values()]
        
    def update_job_config(self, job_name: str, enabled: Optional[bool] = None, 
                         interval_hours: Optional[float] = None):
        """Update job configuration"""
        if job_name not in self.jobs:
            raise ValueError(f"Job {job_name} not found")
            
        job = self.jobs[job_name]
        
        if enabled is not None:
            job.enabled = enabled
            
        if interval_hours is not None:
            job.interval_hours = interval_hours
            # Recalculate next run if interval changed
            if job.last_run:
                job.next_run = job.last_run + timedelta(hours=interval_hours)
                
        self.save_config()
        
    def trigger_job(self, job_name: str):
        """Manually trigger a job"""
        if job_name not in self.jobs:
            raise ValueError(f"Job {job_name} not found")
            
        # Run job in background
        task = asyncio.create_task(self.run_job(job_name, force=True))
        self.tasks.append(task)

# Global scheduler instance
scheduler = JobScheduler()