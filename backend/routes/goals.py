from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import date

try:
    from backend.services.reading_goal import ReadingGoalService
    from backend.models import ReadingGoal, GoalType, GoalStatus
except ImportError:
    from services.reading_goal import ReadingGoalService
    from models import ReadingGoal, GoalType, GoalStatus


router = APIRouter()
service = ReadingGoalService()


# ============ Request/Response Models ============


class CreateGoalRequest(BaseModel):
    title: str
    goal_type: GoalType
    target_value: int
    start_date: date
    end_date: date
    description: Optional[str] = None
    genre: Optional[str] = None
    author: Optional[str] = None
    series_id: Optional[int] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class UpdateGoalRequest(BaseModel):
    title: Optional[str] = None
    target_value: Optional[int] = None
    description: Optional[str] = None
    end_date: Optional[date] = None


class GoalResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    goal_type: str
    target_value: int
    current_value: int
    progress_percentage: float
    days_remaining: int
    status: str
    start_date: str
    end_date: str
    completed_date: Optional[str]
    is_custom: bool
    icon: Optional[str]
    color: Optional[str]

    class Config:
        from_attributes = True


class GoalProgressRequest(BaseModel):
    value_added: int
    notes: Optional[str] = None


# ============ Endpoints ============


@router.post("/goals", response_model=Dict[str, Any])
async def create_goal(request: CreateGoalRequest) -> Dict[str, Any]:
    """Create a new reading goal"""
    try:
        goal = service.create_goal(
            title=request.title,
            goal_type=request.goal_type,
            target_value=request.target_value,
            start_date=request.start_date,
            end_date=request.end_date,
            description=request.description,
            genre=request.genre,
            author=request.author,
            series_id=request.series_id,
            icon=request.icon,
            color=request.color,
        )
        return {
            "success": True,
            "message": "Goal created successfully",
            "goal": {
                "id": goal.id,
                "title": goal.title,
                "goal_type": goal.goal_type,
                "target_value": goal.target_value,
                "current_value": goal.current_value,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goals", response_model=Dict[str, Any])
async def get_all_goals() -> Dict[str, Any]:
    """Get all reading goals"""
    try:
        goals = service.get_all_goals()
        goals_data = [
            {
                "id": goal.id,
                "title": goal.title,
                "description": goal.description,
                "goal_type": goal.goal_type,
                "target_value": goal.target_value,
                "current_value": goal.current_value,
                "progress_percentage": service.get_goal_progress_percentage(goal.id),
                "days_remaining": service.get_days_remaining(goal.id),
                "status": goal.status,
                "start_date": goal.start_date.isoformat(),
                "end_date": goal.end_date.isoformat(),
                "completed_date": goal.completed_date.isoformat() if goal.completed_date else None,
                "is_custom": goal.is_custom,
                "icon": goal.icon,
                "color": goal.color,
            }
            for goal in goals
        ]
        return {
            "success": True,
            "count": len(goals_data),
            "goals": goals_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goals/active", response_model=Dict[str, Any])
async def get_active_goals() -> Dict[str, Any]:
    """Get active reading goals"""
    try:
        goals = service.get_active_goals()
        goals_data = [
            {
                "id": goal.id,
                "title": goal.title,
                "description": goal.description,
                "goal_type": goal.goal_type,
                "target_value": goal.target_value,
                "current_value": goal.current_value,
                "progress_percentage": service.get_goal_progress_percentage(goal.id),
                "days_remaining": service.get_days_remaining(goal.id),
                "status": goal.status,
                "start_date": goal.start_date.isoformat(),
                "end_date": goal.end_date.isoformat(),
                "is_custom": goal.is_custom,
                "icon": goal.icon,
                "color": goal.color,
            }
            for goal in goals
        ]
        return {
            "success": True,
            "count": len(goals_data),
            "goals": goals_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goals/{goal_id}", response_model=Dict[str, Any])
async def get_goal(goal_id: int) -> Dict[str, Any]:
    """Get a specific goal"""
    try:
        goal = service.get_goal(goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        return {
            "success": True,
            "goal": {
                "id": goal.id,
                "title": goal.title,
                "description": goal.description,
                "goal_type": goal.goal_type,
                "target_value": goal.target_value,
                "current_value": goal.current_value,
                "progress_percentage": service.get_goal_progress_percentage(goal.id),
                "days_remaining": service.get_days_remaining(goal.id),
                "reading_pace_needed": service.get_reading_pace_for_goal(goal.id),
                "status": goal.status,
                "start_date": goal.start_date.isoformat(),
                "end_date": goal.end_date.isoformat(),
                "completed_date": goal.completed_date.isoformat() if goal.completed_date else None,
                "is_custom": goal.is_custom,
                "icon": goal.icon,
                "color": goal.color,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/goals/{goal_id}", response_model=Dict[str, Any])
async def update_goal(goal_id: int, request: UpdateGoalRequest) -> Dict[str, Any]:
    """Update a goal"""
    try:
        goal = service.update_goal(
            goal_id=goal_id,
            title=request.title,
            target_value=request.target_value,
            description=request.description,
            end_date=request.end_date,
        )
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        return {
            "success": True,
            "message": "Goal updated successfully",
            "goal": {
                "id": goal.id,
                "title": goal.title,
                "target_value": goal.target_value,
                "current_value": goal.current_value,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/goals/{goal_id}", response_model=Dict[str, Any])
async def delete_goal(goal_id: int) -> Dict[str, Any]:
    """Delete a goal"""
    try:
        success = service.delete_goal(goal_id)
        if not success:
            raise HTTPException(status_code=404, detail="Goal not found")

        return {
            "success": True,
            "message": "Goal deleted successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/goals/{goal_id}/progress", response_model=Dict[str, Any])
async def add_goal_progress(goal_id: int, request: GoalProgressRequest) -> Dict[str, Any]:
    """Record progress toward a goal"""
    try:
        progress = service.add_goal_progress(
            goal_id=goal_id, value_added=request.value_added, notes=request.notes
        )
        if not progress:
            raise HTTPException(status_code=404, detail="Goal not found")

        goal = service.get_goal(goal_id)
        return {
            "success": True,
            "message": "Progress recorded",
            "progress": {
                "id": progress.id,
                "goal_id": progress.goal_id,
                "value_added": progress.value_added,
                "total_value": progress.total_value,
                "recorded_at": progress.recorded_at.isoformat(),
            },
            "goal_progress": {
                "current_value": goal.current_value,
                "target_value": goal.target_value,
                "progress_percentage": service.get_goal_progress_percentage(goal.id),
                "status": goal.status,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goals/{goal_id}/progress", response_model=Dict[str, Any])
async def get_goal_progress(goal_id: int) -> Dict[str, Any]:
    """Get progress history for a goal"""
    try:
        goal = service.get_goal(goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        progress_entries = service.get_goal_progress(goal_id)
        progress_data = [
            {
                "id": entry.id,
                "value_added": entry.value_added,
                "total_value": entry.total_value,
                "recorded_at": entry.recorded_at.isoformat(),
                "source": entry.source,
                "notes": entry.notes,
            }
            for entry in progress_entries
        ]

        return {
            "success": True,
            "goal_id": goal_id,
            "entries_count": len(progress_data),
            "progress_history": progress_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/goals/{goal_id}/complete", response_model=Dict[str, Any])
async def complete_goal(goal_id: int) -> Dict[str, Any]:
    """Mark a goal as completed"""
    try:
        goal = service.complete_goal(goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        return {
            "success": True,
            "message": "Goal marked as completed",
            "goal": {
                "id": goal.id,
                "title": goal.title,
                "status": goal.status,
                "completed_date": goal.completed_date.isoformat() if goal.completed_date else None,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/goals/{goal_id}/abandon", response_model=Dict[str, Any])
async def abandon_goal(goal_id: int) -> Dict[str, Any]:
    """Mark a goal as abandoned"""
    try:
        goal = service.abandon_goal(goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        return {
            "success": True,
            "message": "Goal marked as abandoned",
            "goal": {
                "id": goal.id,
                "title": goal.title,
                "status": goal.status,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goals/stats/velocity", response_model=Dict[str, Any])
async def get_reading_velocity(months: int = 12) -> Dict[str, Any]:
    """Get reading velocity statistics"""
    try:
        velocity = service.calculate_reading_velocity(months)
        return {
            "success": True,
            "reading_velocity": {
                "books_per_month": round(velocity, 2),
                "months_analyzed": months,
                "books_per_year": round(velocity * 12, 2),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/goals/init-defaults", response_model=Dict[str, Any])
async def initialize_default_challenges() -> Dict[str, Any]:
    """Initialize default reading challenges"""
    try:
        service.create_default_challenges()
        return {
            "success": True,
            "message": "Default challenges initialized successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/goals/monthly/current", response_model=Dict[str, Any])
async def get_current_monthly_goal() -> Dict[str, Any]:
    """Get current month's goal"""
    try:
        monthly_goal = service.get_current_month_goal()
        return {
            "success": True,
            "monthly_goal": {
                "id": monthly_goal.id,
                "year_month": monthly_goal.year_month,
                "target_books": monthly_goal.target_books,
                "target_pages": monthly_goal.target_pages,
                "current_books": monthly_goal.current_books,
                "current_pages": monthly_goal.current_pages,
                "books_progress_percentage": (
                    (monthly_goal.current_books / monthly_goal.target_books * 100)
                    if monthly_goal.target_books > 0
                    else 0
                ),
                "pages_progress_percentage": (
                    (monthly_goal.current_pages / monthly_goal.target_pages * 100)
                    if monthly_goal.target_pages > 0
                    else 0
                ),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
