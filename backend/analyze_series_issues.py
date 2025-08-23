"""
Script to analyze and fix series metadata integrity issues
"""
import sys
import json
from database import get_session
from models import Series, SeriesVolume, Book
from sqlmodel import select

def analyze_series_data():
    """Analyze series data for integrity issues"""
    session = next(get_session())
    
    try:
        # Query all series
        all_series = session.exec(select(Series)).all()
        
        print("Series Data Analysis Report")
        print("=" * 60)
        print(f"Total series in database: {len(all_series)}")
        print()
        
        problem_series = []
        
        for series in all_series:
            volumes = session.exec(select(SeriesVolume).where(SeriesVolume.series_id == series.id)).all()
            owned_count = len([v for v in volumes if v.status == "owned"])
            total_books = series.total_books or len(volumes)
            
            # Check for problematic ratios
            if total_books > 0 and owned_count > total_books:
                completion = round(owned_count / total_books * 100)
                
                # Safely handle Unicode in series names
                try:
                    series_name = series.name.encode('ascii', 'replace').decode('ascii')
                except:
                    series_name = f"Series_ID_{series.id}"
                
                problem_info = {
                    "id": series.id,
                    "name": series_name,
                    "original_name": series.name,
                    "owned_count": owned_count,
                    "total_books": total_books,
                    "volume_count": len(volumes),
                    "completion_percentage": completion,
                    "status": series.status
                }
                
                problem_series.append(problem_info)
                
                print(f"PROBLEM: {series_name}")
                print(f"  - Owned: {owned_count}, Total: {total_books}, Completion: {completion}%")
                print(f"  - Volume count: {len(volumes)}, ID: {series.id}")
                print()
        
        print(f"Total problematic series: {len(problem_series)}")
        print()
        
        # Show statistics
        if problem_series:
            print("Problem Categories:")
            print("-" * 30)
            
            extreme_problems = [s for s in problem_series if s["completion_percentage"] > 500]
            high_problems = [s for s in problem_series if 200 <= s["completion_percentage"] <= 500]
            moderate_problems = [s for s in problem_series if 100 < s["completion_percentage"] < 200]
            
            print(f"Extreme (>500%): {len(extreme_problems)} series")
            print(f"High (200-500%): {len(high_problems)} series")
            print(f"Moderate (100-200%): {len(moderate_problems)} series")
            
            return problem_series
            
    finally:
        session.close()
    
    return []

def fix_series_data():
    """Fix the series data integrity issues"""
    session = next(get_session())
    
    try:
        problem_series = analyze_series_data()
        if not problem_series:
            print("No problematic series found!")
            return
        
        print("\nApplying Fixes:")
        print("=" * 30)
        
        fixes_applied = 0
        
        for problem in problem_series:
            series_id = problem["id"]
            owned_count = problem["owned_count"]
            
            # Get the series
            series = session.exec(select(Series).where(Series.id == series_id)).first()
            if not series:
                continue
            
            # Fix: Update total_books to match reality
            # Use the higher of: owned_count or current volume count
            volumes = session.exec(select(SeriesVolume).where(SeriesVolume.series_id == series_id)).all()
            new_total = max(owned_count, len(volumes))
            
            if series.total_books != new_total:
                old_total = series.total_books
                series.total_books = new_total
                session.add(series)
                fixes_applied += 1
                
                print(f"Fixed {problem['name']}: {old_total} -> {new_total} total books")
        
        # Commit all changes
        session.commit()
        print(f"\nApplied {fixes_applied} fixes successfully!")
        
    finally:
        session.close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--fix":
        fix_series_data()
    else:
        analyze_series_data()
        print("\nTo apply fixes, run: python analyze_series_issues.py --fix")