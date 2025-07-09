"""
Error handling middleware for comprehensive error management
"""
import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import traceback
from datetime import datetime

logger = logging.getLogger(__name__)

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle errors and exceptions globally"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            # Log HTTP exceptions
            logger.warning(f"HTTP {e.status_code} error on {request.method} {request.url}: {e.detail}")
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "error": True,
                    "message": e.detail,
                    "status_code": e.status_code,
                    "timestamp": datetime.now().isoformat(),
                    "path": str(request.url),
                    "method": request.method
                }
            )
        except Exception as e:
            # Log unexpected errors
            logger.error(f"Unexpected error on {request.method} {request.url}: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Return generic error response
            return JSONResponse(
                status_code=500,
                content={
                    "error": True,
                    "message": "Internal server error",
                    "status_code": 500,
                    "timestamp": datetime.now().isoformat(),
                    "path": str(request.url),
                    "method": request.method
                }
            )

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all incoming requests"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        start_time = datetime.now()
        
        # Log request
        logger.info(f"🔄 {request.method} {request.url} - Start")
        
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Log response
            logger.info(f"✅ {request.method} {request.url} - {response.status_code} ({duration:.3f}s)")
            
            return response
            
        except Exception as e:
            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Log error
            logger.error(f"❌ {request.method} {request.url} - Error: {str(e)} ({duration:.3f}s)")
            
            raise