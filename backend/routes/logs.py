"""
API routes for log management
"""
from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime
import uuid

router = APIRouter()

# In-memory log storage (in production, this would be a proper logging system)
logs_storage: List[Dict[str, Any]] = [
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "level": "info",
        "source": "system",
        "message": "BookTarr system started",
        "details": None
    }
]

@router.get("/logs")
async def get_logs() -> Dict[str, Any]:
    """Get all system logs"""
    return {
        "success": True,
        "logs": logs_storage,
        "total": len(logs_storage)
    }

@router.delete("/logs")
async def clear_logs() -> Dict[str, Any]:
    """Clear all logs"""
    global logs_storage
    logs_storage = []
    return {
        "success": True,
        "message": "All logs cleared"
    }

def add_log(level: str, source: str, message: str, details: Any = None):
    """Add a log entry"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "level": level,
        "source": source,
        "message": message,
        "details": details
    }
    logs_storage.append(log_entry)
    
    # Keep only the last 1000 logs
    if len(logs_storage) > 1000:
        logs_storage[:] = logs_storage[-1000:]