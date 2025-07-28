"""
API routes for job management
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from services.job_scheduler import scheduler
from jobs.metadata_update_job import metadata_update_job
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class JobUpdateRequest(BaseModel):
    enabled: Optional[bool] = None
    interval_hours: Optional[float] = None

class JobTriggerResponse(BaseModel):
    success: bool
    message: str
    job_name: str

@router.get("/jobs")
async def get_jobs() -> List[Dict[str, Any]]:
    """Get all scheduled jobs and their status"""
    try:
        return scheduler.get_jobs_status()
    except Exception as e:
        logger.error(f"Error getting jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/jobs/{job_name}")
async def update_job(job_name: str, request: JobUpdateRequest) -> Dict[str, Any]:
    """Update job configuration"""
    try:
        scheduler.update_job_config(
            job_name,
            enabled=request.enabled,
            interval_hours=request.interval_hours
        )
        
        # Get updated job status
        jobs = scheduler.get_jobs_status()
        job = next((j for j in jobs if j["name"] == job_name), None)
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_name} not found")
            
        return {
            "success": True,
            "message": f"Job {job_name} updated successfully",
            "job": job
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating job {job_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/{job_name}/trigger")
async def trigger_job(job_name: str) -> JobTriggerResponse:
    """Manually trigger a job"""
    try:
        scheduler.trigger_job(job_name)
        
        return JobTriggerResponse(
            success=True,
            message=f"Job {job_name} triggered successfully",
            job_name=job_name
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error triggering job {job_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/register-defaults")
async def register_default_jobs() -> Dict[str, Any]:
    """Register default jobs (called on startup)"""
    try:
        # Register metadata update job
        scheduler.register_job(
            name="metadata_update",
            description="Updates missing metadata for all books from online sources",
            interval_hours=4.0,
            job_function=metadata_update_job,
            enabled=True
        )
        
        return {
            "success": True,
            "message": "Default jobs registered successfully",
            "jobs": scheduler.get_jobs_status()
        }
        
    except Exception as e:
        logger.error(f"Error registering default jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))