"""
Amazon authentication service for Audible and Kindle integration
"""
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import AsyncSessionLocal
from app.database.models_amazon import AmazonAuth, AmazonSyncJob
from app.config.logging import get_logger

logger = get_logger(__name__)


class AmazonAuthService:
    """Service for managing Amazon authentication credentials"""
    
    def __init__(self):
        # In production, this should be stored securely (env var, key management service)
        # For now, generate a key and store it securely
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher = Fernet(self.encryption_key)
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for storing auth data"""
        try:
            # Try to read existing key
            with open('data/encryption.key', 'rb') as f:
                return f.read()
        except FileNotFoundError:
            # Generate new key
            key = Fernet.generate_key()
            with open('data/encryption.key', 'wb') as f:
                f.write(key)
            logger.info("Generated new encryption key for Amazon auth")
            return key
    
    def _encrypt_auth_data(self, data: Dict[str, Any]) -> str:
        """Encrypt authentication data"""
        json_data = json.dumps(data)
        encrypted = self.cipher.encrypt(json_data.encode())
        return encrypted.decode()
    
    def _decrypt_auth_data(self, encrypted_data: str) -> Dict[str, Any]:
        """Decrypt authentication data"""
        try:
            decrypted = self.cipher.decrypt(encrypted_data.encode())
            return json.loads(decrypted.decode())
        except Exception as e:
            logger.error(f"Failed to decrypt auth data: {e}")
            return {}
    
    async def store_auth_credentials(
        self,
        service: str,
        auth_data: Dict[str, Any],
        marketplace: str = "us",
        user_id: str = "default"
    ) -> int:
        """Store encrypted authentication credentials"""
        try:
            encrypted_data = self._encrypt_auth_data(auth_data)
            
            async with AsyncSessionLocal() as session:
                # Check if auth already exists
                result = await session.execute(
                    select(AmazonAuth).where(
                        AmazonAuth.user_id == user_id,
                        AmazonAuth.service == service
                    )
                )
                existing_auth = result.scalar_one_or_none()
                
                if existing_auth:
                    # Update existing
                    existing_auth.auth_data = encrypted_data
                    existing_auth.marketplace = marketplace
                    existing_auth.is_active = True
                    existing_auth.updated_at = datetime.utcnow()
                    auth_id = existing_auth.id
                else:
                    # Create new
                    new_auth = AmazonAuth(
                        user_id=user_id,
                        service=service,
                        auth_data=encrypted_data,
                        marketplace=marketplace,
                        is_active=True
                    )
                    session.add(new_auth)
                    await session.flush()
                    auth_id = new_auth.id
                
                await session.commit()
                logger.info(f"Stored {service} auth credentials for user {user_id}")
                return auth_id
                
        except Exception as e:
            logger.error(f"Failed to store auth credentials: {e}")
            raise
    
    async def get_auth_credentials(
        self,
        service: str,
        user_id: str = "default"
    ) -> Optional[Dict[str, Any]]:
        """Retrieve and decrypt authentication credentials"""
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(AmazonAuth).where(
                        AmazonAuth.user_id == user_id,
                        AmazonAuth.service == service,
                        AmazonAuth.is_active == True
                    )
                )
                auth = result.scalar_one_or_none()
                
                if not auth:
                    return None
                
                return {
                    'auth_id': auth.id,
                    'marketplace': auth.marketplace,
                    'credentials': self._decrypt_auth_data(auth.auth_data),
                    'last_sync': auth.last_sync
                }
                
        except Exception as e:
            logger.error(f"Failed to get auth credentials: {e}")
            return None
    
    async def is_authenticated(self, service: str, user_id: str = "default") -> bool:
        """Check if user is authenticated for a service"""
        auth_data = await self.get_auth_credentials(service, user_id)
        return auth_data is not None
    
    async def revoke_auth(self, service: str, user_id: str = "default") -> bool:
        """Revoke authentication for a service"""
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(
                    update(AmazonAuth)
                    .where(
                        AmazonAuth.user_id == user_id,
                        AmazonAuth.service == service
                    )
                    .values(is_active=False, updated_at=datetime.utcnow())
                )
                await session.commit()
                logger.info(f"Revoked {service} auth for user {user_id}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to revoke auth: {e}")
            return False
    
    async def update_sync_status(
        self,
        service: str,
        status: str,
        error: Optional[str] = None,
        user_id: str = "default"
    ) -> None:
        """Update sync status for a service"""
        try:
            async with AsyncSessionLocal() as session:
                values = {
                    'sync_status': status,
                    'updated_at': datetime.utcnow()
                }
                
                if status == 'completed':
                    values['last_sync'] = datetime.utcnow()
                    values['sync_error'] = None
                elif status == 'error' and error:
                    values['sync_error'] = error
                
                await session.execute(
                    update(AmazonAuth)
                    .where(
                        AmazonAuth.user_id == user_id,
                        AmazonAuth.service == service
                    )
                    .values(**values)
                )
                await session.commit()
                
        except Exception as e:
            logger.error(f"Failed to update sync status: {e}")
    
    async def create_sync_job(
        self,
        auth_id: int,
        job_type: str,
        service: str,
        job_data: Optional[Dict[str, Any]] = None
    ) -> int:
        """Create a new sync job"""
        try:
            async with AsyncSessionLocal() as session:
                sync_job = AmazonSyncJob(
                    auth_id=auth_id,
                    job_type=job_type,
                    service=service,
                    status='pending',
                    job_data=job_data
                )
                session.add(sync_job)
                await session.flush()
                job_id = sync_job.id
                await session.commit()
                
                logger.info(f"Created sync job {job_id} for {service}")
                return job_id
                
        except Exception as e:
            logger.error(f"Failed to create sync job: {e}")
            raise
    
    async def update_sync_job(
        self,
        job_id: int,
        status: str,
        metrics: Optional[Dict[str, int]] = None,
        error: Optional[str] = None
    ) -> None:
        """Update sync job status and metrics"""
        try:
            async with AsyncSessionLocal() as session:
                values = {
                    'status': status,
                    'updated_at': datetime.utcnow()
                }
                
                if status == 'running' and not await self._get_job_start_time(job_id):
                    values['start_time'] = datetime.utcnow()
                elif status in ['completed', 'failed']:
                    values['end_time'] = datetime.utcnow()
                
                if metrics:
                    values.update(metrics)
                
                if error:
                    values['error_message'] = error
                
                await session.execute(
                    update(AmazonSyncJob)
                    .where(AmazonSyncJob.id == job_id)
                    .values(**values)
                )
                await session.commit()
                
        except Exception as e:
            logger.error(f"Failed to update sync job: {e}")
    
    async def _get_job_start_time(self, job_id: int) -> Optional[datetime]:
        """Get sync job start time"""
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(AmazonSyncJob.start_time).where(AmazonSyncJob.id == job_id)
                )
                return result.scalar_one_or_none()
        except Exception:
            return None
    
    async def get_sync_jobs(
        self,
        service: Optional[str] = None,
        limit: int = 10,
        user_id: str = "default"
    ) -> List[Dict[str, Any]]:
        """Get recent sync jobs"""
        try:
            async with AsyncSessionLocal() as session:
                query = (
                    select(AmazonSyncJob, AmazonAuth.service)
                    .join(AmazonAuth, AmazonSyncJob.auth_id == AmazonAuth.id)
                    .where(AmazonAuth.user_id == user_id)
                    .order_by(AmazonSyncJob.created_at.desc())
                    .limit(limit)
                )
                
                if service:
                    query = query.where(AmazonAuth.service == service)
                
                result = await session.execute(query)
                rows = result.all()
                
                jobs = []
                for job, service_name in rows:
                    duration = None
                    if job.start_time and job.end_time:
                        duration = (job.end_time - job.start_time).total_seconds()
                    
                    jobs.append({
                        'id': job.id,
                        'service': service_name,
                        'job_type': job.job_type,
                        'status': job.status,
                        'books_found': job.books_found,
                        'books_added': job.books_added,
                        'books_updated': job.books_updated,
                        'books_failed': job.books_failed,
                        'start_time': job.start_time,
                        'end_time': job.end_time,
                        'duration_seconds': duration,
                        'error_message': job.error_message,
                        'created_at': job.created_at
                    })
                
                return jobs
                
        except Exception as e:
            logger.error(f"Failed to get sync jobs: {e}")
            return []


# Global service instance
amazon_auth_service = AmazonAuthService()