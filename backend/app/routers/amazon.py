"""
Amazon integration API endpoints for Audible and Kindle
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.services.audible_sync_service import audible_sync_service
from app.services.kindle_sync_service import kindle_sync_service
from app.services.amazon_auth_service import amazon_auth_service

router = APIRouter(prefix="/api/amazon", tags=["amazon"])


# Request/Response Models
class AudibleAuthRequest(BaseModel):
    username: str
    password: str
    marketplace: str = "us"


class KindleDeviceScanRequest(BaseModel):
    device_path: str


class AuthResponse(BaseModel):
    success: bool
    message: str
    auth_id: Optional[int] = None
    customer_name: Optional[str] = None
    error: Optional[str] = None


class SyncResponse(BaseModel):
    success: bool
    message: str
    job_id: Optional[int] = None
    items_found: Optional[int] = None
    error: Optional[str] = None


class SyncJobResponse(BaseModel):
    id: int
    service: str
    job_type: str
    status: str
    books_found: Optional[int] = None
    books_added: Optional[int] = None
    books_updated: Optional[int] = None
    books_failed: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime


class AuthStatusResponse(BaseModel):
    audible_authenticated: bool
    kindle_authenticated: bool
    audible_last_sync: Optional[datetime] = None
    kindle_last_sync: Optional[datetime] = None
    audible_sync_status: Optional[str] = None
    kindle_sync_status: Optional[str] = None


# Authentication Endpoints
@router.post("/audible/auth", response_model=AuthResponse)
async def authenticate_audible(request: AudibleAuthRequest):
    """Authenticate with Audible using username/password"""
    try:
        result = await audible_sync_service.authenticate_with_credentials(
            username=request.username,
            password=request.password,
            marketplace=request.marketplace
        )
        
        return AuthResponse(
            success=result['success'],
            message=result.get('message', 'Authentication successful' if result['success'] else 'Authentication failed'),
            auth_id=result.get('auth_id'),
            customer_name=result.get('customer_name'),
            error=result.get('error')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")


@router.post("/kindle/import/csv", response_model=SyncResponse)
async def import_kindle_csv(file: UploadFile = File(...)):
    """Import Kindle library from CSV file"""
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        result = await kindle_sync_service.import_kindle_library_csv(csv_content)
        
        return SyncResponse(
            success=result['success'],
            message=result.get('message', 'Import started'),
            job_id=result.get('job_id'),
            items_found=result.get('items_found'),
            error=result.get('error')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")


@router.post("/kindle/import/json", response_model=SyncResponse)
async def import_kindle_json(file: UploadFile = File(...)):
    """Import Kindle library from JSON file"""
    try:
        if not file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="File must be a JSON")
        
        content = await file.read()
        json_content = content.decode('utf-8')
        
        result = await kindle_sync_service.import_kindle_library_json(json_content)
        
        return SyncResponse(
            success=result['success'],
            message=result.get('message', 'Import started'),
            job_id=result.get('job_id'),
            items_found=result.get('items_found'),
            error=result.get('error')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")


@router.post("/kindle/scan", response_model=SyncResponse)
async def scan_kindle_device(request: KindleDeviceScanRequest):
    """Scan connected Kindle device for books"""
    try:
        result = await kindle_sync_service.scan_kindle_device(request.device_path)
        
        return SyncResponse(
            success=result['success'],
            message=result.get('message', 'Device scan started'),
            job_id=result.get('job_id'),
            items_found=result.get('files_found'),
            error=result.get('error')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Device scan error: {str(e)}")


# Library Sync Endpoints
@router.post("/audible/sync", response_model=SyncResponse)
async def sync_audible_library():
    """Sync complete Audible library"""
    try:
        result = await audible_sync_service.sync_audible_library()
        
        return SyncResponse(
            success=result['success'],
            message=result.get('message', 'Sync started'),
            job_id=result.get('job_id'),
            error=result.get('error')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")


# Status and Management Endpoints
@router.get("/status", response_model=AuthStatusResponse)
async def get_amazon_auth_status():
    """Get Amazon authentication and sync status"""
    try:
        audible_auth = await amazon_auth_service.get_auth_credentials('audible')
        kindle_auth = await amazon_auth_service.get_auth_credentials('kindle')
        
        return AuthStatusResponse(
            audible_authenticated=audible_auth is not None,
            kindle_authenticated=kindle_auth is not None,
            audible_last_sync=audible_auth.get('last_sync') if audible_auth else None,
            kindle_last_sync=kindle_auth.get('last_sync') if kindle_auth else None,
            audible_sync_status=audible_auth.get('sync_status') if audible_auth else None,
            kindle_sync_status=kindle_auth.get('sync_status') if kindle_auth else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check error: {str(e)}")


@router.get("/sync-jobs", response_model=List[SyncJobResponse])
async def get_sync_jobs(service: Optional[str] = None, limit: int = 10):
    """Get recent sync jobs"""
    try:
        jobs = await amazon_auth_service.get_sync_jobs(service=service, limit=limit)
        
        return [
            SyncJobResponse(
                id=job['id'],
                service=job['service'],
                job_type=job['job_type'],
                status=job['status'],
                books_found=job.get('books_found'),
                books_added=job.get('books_added'),
                books_updated=job.get('books_updated'),
                books_failed=job.get('books_failed'),
                start_time=job.get('start_time'),
                end_time=job.get('end_time'),
                duration_seconds=job.get('duration_seconds'),
                error_message=job.get('error_message'),
                created_at=job['created_at']
            )
            for job in jobs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sync jobs: {str(e)}")


@router.delete("/audible/auth")
async def revoke_audible_auth():
    """Revoke Audible authentication"""
    try:
        success = await amazon_auth_service.revoke_auth('audible')
        if success:
            return {"success": True, "message": "Audible authentication revoked"}
        else:
            raise HTTPException(status_code=500, detail="Failed to revoke authentication")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Revoke error: {str(e)}")


@router.delete("/kindle/auth")
async def revoke_kindle_auth():
    """Revoke Kindle authentication"""
    try:
        success = await amazon_auth_service.revoke_auth('kindle')
        if success:
            return {"success": True, "message": "Kindle authentication revoked"}
        else:
            raise HTTPException(status_code=500, detail="Failed to revoke authentication")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Revoke error: {str(e)}")