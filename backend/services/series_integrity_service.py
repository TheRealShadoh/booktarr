"""
Series Integrity Service - Comprehensive validation and prevention for series metadata issues
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import date
from sqlmodel import Session, select

try:
    from backend.models import Series, SeriesVolume, Book
    from backend.database import get_session
except ImportError:
    from models import Series, SeriesVolume, Book
    from database import get_session

logger = logging.getLogger(__name__)


class SeriesIntegrityService:
    """Service for maintaining series data integrity"""
    
    def __init__(self):
        self.session = None
    
    def __enter__(self):
        self.session = next(get_session())
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            self.session.close()
    
    def validate_series_ratio(self, series: Series) -> Dict[str, Any]:
        """
        Validate that a series doesn't have impossible completion ratios
        Returns validation result with corrections if needed
        """
        if not self.session:
            raise RuntimeError("Service must be used as context manager")
        
        # Get volumes for this series
        volumes = self.session.exec(
            select(SeriesVolume).where(SeriesVolume.series_id == series.id)
        ).all()
        
        owned_count = len([v for v in volumes if v.status == "owned"])
        volume_count = len(volumes)
        
        # Current total from series record
        current_total = series.total_books or 0
        
        # Determine the correct total
        # Priority: max of owned_count, volume_count, or reasonable external total
        correct_total = max(owned_count, volume_count)
        
        # If external API provided a reasonable total (not way too low), use it
        if current_total >= correct_total:
            correct_total = current_total
        
        # Check for integrity issues
        is_valid = owned_count <= correct_total
        
        return {
            "valid": is_valid,
            "series_id": series.id,
            "series_name": series.name,
            "owned_count": owned_count,
            "volume_count": volume_count,
            "current_total": current_total,
            "correct_total": correct_total,
            "needs_correction": current_total != correct_total,
            "completion_percentage": round(owned_count / correct_total * 100) if correct_total > 0 else 0
        }
    
    def fix_series_ratio(self, series_id: int) -> Dict[str, Any]:
        """Fix an individual series' ratio issues"""
        if not self.session:
            raise RuntimeError("Service must be used as context manager")
        
        # Get the series
        series = self.session.exec(select(Series).where(Series.id == series_id)).first()
        if not series:
            return {"success": False, "error": f"Series ID {series_id} not found"}
        
        # Validate and get correction info
        validation = self.validate_series_ratio(series)
        
        if not validation["needs_correction"]:
            return {
                "success": True,
                "message": "No correction needed",
                "series_name": series.name
            }
        
        # Apply the correction
        old_total = series.total_books
        series.total_books = validation["correct_total"]
        self.session.add(series)
        self.session.commit()
        
        return {
            "success": True,
            "message": f"Updated {series.name} total_books from {old_total} to {validation['correct_total']}",
            "series_name": series.name,
            "old_total": old_total,
            "new_total": validation["correct_total"]
        }
    
    def audit_all_series(self) -> Dict[str, Any]:
        """Audit all series for integrity issues"""
        if not self.session:
            raise RuntimeError("Service must be used as context manager")
        
        all_series = self.session.exec(select(Series)).all()
        
        valid_series = []
        invalid_series = []
        correctable_series = []
        
        for series in all_series:
            validation = self.validate_series_ratio(series)
            
            if validation["valid"]:
                valid_series.append(validation)
            else:
                invalid_series.append(validation)
                if validation["needs_correction"]:
                    correctable_series.append(validation)
        
        return {
            "total_series": len(all_series),
            "valid_series": len(valid_series),
            "invalid_series": len(invalid_series),
            "correctable_series": len(correctable_series),
            "invalid_details": invalid_series,
            "audit_date": date.today().isoformat()
        }
    
    def fix_all_series_ratios(self) -> Dict[str, Any]:
        """Fix all series with ratio issues"""
        if not self.session:
            raise RuntimeError("Service must be used as context manager")
        
        audit = self.audit_all_series()
        
        if audit["correctable_series"] == 0:
            return {
                "success": True,
                "message": "No series need correction",
                "fixes_applied": 0
            }
        
        fixes = []
        
        for invalid_info in audit["invalid_details"]:
            if invalid_info["needs_correction"]:
                fix_result = self.fix_series_ratio(invalid_info["series_id"])
                if fix_result["success"]:
                    fixes.append(fix_result)
        
        return {
            "success": True,
            "message": f"Applied {len(fixes)} fixes",
            "fixes_applied": len(fixes),
            "fixes": fixes
        }
    
    def validate_before_update(self, series_id: int, new_total_books: int) -> Dict[str, Any]:
        """
        Validate a series update to prevent integrity issues
        Call this before updating total_books field
        """
        if not self.session:
            raise RuntimeError("Service must be used as context manager")
        
        # Get current series data
        series = self.session.exec(select(Series).where(Series.id == series_id)).first()
        if not series:
            return {"valid": False, "error": f"Series ID {series_id} not found"}
        
        # Get current owned count
        volumes = self.session.exec(
            select(SeriesVolume).where(SeriesVolume.series_id == series_id)
        ).all()
        owned_count = len([v for v in volumes if v.status == "owned"])
        
        # Validate the proposed change
        if new_total_books < owned_count:
            return {
                "valid": False,
                "error": f"Cannot set total_books ({new_total_books}) below owned count ({owned_count})",
                "owned_count": owned_count,
                "proposed_total": new_total_books
            }
        
        return {
            "valid": True,
            "message": "Update is valid",
            "owned_count": owned_count,
            "proposed_total": new_total_books
        }
    
    def prevent_volume_count_exceeding_total(self, series_id: int, new_volume_status: str) -> Dict[str, Any]:
        """
        Check if marking a volume as 'owned' would exceed the series total
        Call this before changing volume status to 'owned'
        """
        if not self.session:
            raise RuntimeError("Service must be used as context manager")
        
        if new_volume_status != "owned":
            return {"valid": True, "message": "Not marking as owned, no validation needed"}
        
        # Get series and current volumes
        series = self.session.exec(select(Series).where(Series.id == series_id)).first()
        if not series:
            return {"valid": False, "error": f"Series ID {series_id} not found"}
        
        volumes = self.session.exec(
            select(SeriesVolume).where(SeriesVolume.series_id == series_id)
        ).all()
        current_owned = len([v for v in volumes if v.status == "owned"])
        
        # Check if adding one more would exceed total
        if series.total_books and current_owned >= series.total_books:
            return {
                "valid": False,
                "warning": f"Series '{series.name}' already has {current_owned} owned volumes out of {series.total_books} total",
                "recommend_total_update": True,
                "current_owned": current_owned,
                "series_total": series.total_books
            }
        
        return {
            "valid": True,
            "message": "Volume can be marked as owned",
            "current_owned": current_owned,
            "series_total": series.total_books
        }
    
    def get_series_health_report(self) -> Dict[str, Any]:
        """Generate comprehensive health report for all series"""
        if not self.session:
            raise RuntimeError("Service must be used as context manager")
        
        audit = self.audit_all_series()
        
        # Additional health metrics
        all_series = self.session.exec(select(Series)).all()
        
        # Series without any volumes
        series_without_volumes = []
        # Series with external metadata issues
        metadata_issues = []
        
        for series in all_series:
            volumes = self.session.exec(
                select(SeriesVolume).where(SeriesVolume.series_id == series.id)
            ).all()
            
            if not volumes:
                series_without_volumes.append({
                    "id": series.id,
                    "name": series.name,
                    "total_books": series.total_books
                })
            
            # Check if external metadata seems wrong
            if series.total_books and len(volumes) > 0:
                owned_count = len([v for v in volumes if v.status == "owned"])
                if series.total_books < len(volumes) or series.total_books < owned_count:
                    metadata_issues.append({
                        "id": series.id,
                        "name": series.name,
                        "total_books": series.total_books,
                        "volume_count": len(volumes),
                        "owned_count": owned_count
                    })
        
        return {
            **audit,
            "series_without_volumes": len(series_without_volumes),
            "series_with_metadata_issues": len(metadata_issues),
            "health_score": round((audit["valid_series"] / audit["total_series"]) * 100) if audit["total_series"] > 0 else 100,
            "recommendations": self._generate_health_recommendations(audit, series_without_volumes, metadata_issues)
        }
    
    def _generate_health_recommendations(self, audit: Dict, no_volumes: List, metadata_issues: List) -> List[str]:
        """Generate health recommendations based on audit results"""
        recommendations = []
        
        if audit["invalid_series"] > 0:
            recommendations.append(f"Fix {audit['invalid_series']} series with completion ratio issues")
        
        if no_volumes:
            recommendations.append(f"Add volume data for {len(no_volumes)} series without volumes")
        
        if metadata_issues:
            recommendations.append(f"Review external metadata for {len(metadata_issues)} series")
        
        if audit["total_series"] > 50 and audit["valid_series"] / audit["total_series"] < 0.95:
            recommendations.append("Consider implementing automated validation checks")
        
        if not recommendations:
            recommendations.append("Series data integrity is excellent! No issues found.")
        
        return recommendations