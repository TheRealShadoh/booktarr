#!/usr/bin/env python3
"""
Series Integrity Fix Script

This script identifies and fixes series with impossible completion ratios
where owned_count > total_books, causing >100% completion displays.

Usage:
    python fix_series_integrity.py              # Analyze issues only
    python fix_series_integrity.py --fix        # Apply fixes
    python fix_series_integrity.py --force-fix  # Apply fixes without confirmation
"""

import argparse
import sys
from typing import List, Dict, Any
from database import get_session
from models import Series, SeriesVolume
from sqlmodel import select
from services.series_integrity_service import SeriesIntegrityService

def analyze_integrity_issues() -> Dict[str, Any]:
    """Analyze all series for integrity issues"""
    print("Analyzing series integrity issues...")
    
    session = next(get_session())
    issues = []
    
    try:
        statement = select(Series).order_by(Series.name)
        all_series = session.exec(statement).all()
        
        for series in all_series:
            # Get volumes and owned count
            statement = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
            volumes = session.exec(statement).all()
            owned_count = len([v for v in volumes if v.status == "owned"])
            volume_count = len(volumes)
            
            # Check for display logic issues (same as routes/series.py)
            display_total = series.total_books or max(volume_count, owned_count) if series.total_books is None else (series.total_books if series.total_books >= max(owned_count, volume_count) else max(owned_count, volume_count))
            
            # Actually, let's use the OLD problematic logic to find issues
            old_logic_total = series.total_books or max(volume_count, owned_count)
            old_completion = round(owned_count / old_logic_total * 100) if old_logic_total > 0 else 0
            
            # New corrected logic
            correct_total = max(owned_count, volume_count)
            if series.total_books and series.total_books >= correct_total:
                correct_total = series.total_books
            new_completion = round(owned_count / correct_total * 100) if correct_total > 0 else 0
            
            if old_completion > 100 or (series.total_books and series.total_books < owned_count):
                issues.append({
                    'id': series.id,
                    'name': series.name,
                    'owned_count': owned_count,
                    'volume_count': volume_count,
                    'db_total_books': series.total_books,
                    'old_logic_total': old_logic_total,
                    'old_completion': old_completion,
                    'correct_total': correct_total,
                    'new_completion': new_completion,
                    'needs_fix': old_logic_total != correct_total
                })
    
    finally:
        session.close()
    
    return {
        'total_series': len(all_series),
        'issues_found': len(issues),
        'issues': issues
    }

def fix_integrity_issues(issues: List[Dict[str, Any]], force: bool = False) -> Dict[str, Any]:
    """Fix identified integrity issues"""
    
    fixable_issues = [issue for issue in issues if issue['needs_fix']]
    
    if not fixable_issues:
        return {'success': True, 'message': 'No issues need fixing', 'fixes_applied': 0}
    
    print(f"Found {len(fixable_issues)} series that need fixing:")
    for issue in fixable_issues[:10]:  # Show first 10
        print(f"   - {issue['name']}: {issue['owned_count']}/{issue['db_total_books']} = {issue['old_completion']}% -> {issue['correct_total']} total")
    
    if len(fixable_issues) > 10:
        print(f"   ... and {len(fixable_issues) - 10} more")
    
    if not force:
        confirm = input(f"\nFix {len(fixable_issues)} series? [y/N]: ").lower().strip()
        if confirm not in ['y', 'yes']:
            print("Fix cancelled by user")
            return {'success': False, 'message': 'Cancelled by user', 'fixes_applied': 0}
    
    print("\nApplying fixes...")
    
    session = next(get_session())
    fixes = []
    
    try:
        for issue in fixable_issues:
            # Get the series
            series = session.exec(select(Series).where(Series.id == issue['id'])).first()
            if not series:
                continue
                
            old_total = series.total_books
            new_total = issue['correct_total']
            
            # Update the total
            series.total_books = new_total
            session.add(series)
            
            fixes.append({
                'series_name': series.name,
                'old_total': old_total,
                'new_total': new_total,
                'message': f"Updated {series.name} total_books from {old_total} to {new_total}"
            })
        
        session.commit()
        print(f"Successfully applied {len(fixes)} fixes")
        
    except Exception as e:
        session.rollback()
        print(f"Error applying fixes: {e}")
        return {'success': False, 'message': str(e), 'fixes_applied': 0}
    finally:
        session.close()
    
    return {'success': True, 'message': f'Fixed {len(fixes)} series', 'fixes_applied': len(fixes), 'fixes': fixes}

def main():
    parser = argparse.ArgumentParser(description='Fix series integrity issues')
    parser.add_argument('--fix', action='store_true', help='Apply fixes (with confirmation)')
    parser.add_argument('--force-fix', action='store_true', help='Apply fixes without confirmation')
    
    args = parser.parse_args()
    
    print("Series Integrity Fix Tool")
    print("=" * 50)
    
    # Analyze issues
    analysis = analyze_integrity_issues()
    
    print(f"Analysis Results:")
    print(f"   - Total Series: {analysis['total_series']}")
    print(f"   - Issues Found: {analysis['issues_found']}")
    
    if analysis['issues_found'] == 0:
        print("No integrity issues found!")
        return
    
    # Show issue summary
    extreme_issues = [i for i in analysis['issues'] if i['old_completion'] >= 500]
    high_issues = [i for i in analysis['issues'] if 200 <= i['old_completion'] < 500]
    moderate_issues = [i for i in analysis['issues'] if 100 < i['old_completion'] < 200]
    
    if extreme_issues:
        print(f"   - Extreme issues (>=500%): {len(extreme_issues)}")
    if high_issues:
        print(f"   - High issues (200-499%): {len(high_issues)}")
    if moderate_issues:
        print(f"   - Moderate issues (101-199%): {len(moderate_issues)}")
    
    print("\nTop issues:")
    sorted_issues = sorted(analysis['issues'], key=lambda x: x['old_completion'], reverse=True)
    for issue in sorted_issues[:5]:
        print(f"   - {issue['name']}: {issue['owned_count']}/{issue['db_total_books']} = {issue['old_completion']}%")
    
    # Apply fixes if requested
    if args.fix or args.force_fix:
        print("\n" + "=" * 50)
        result = fix_integrity_issues(analysis['issues'], force=args.force_fix)
        
        if result['success']:
            print(f"SUCCESS: {result['message']}")
            if result.get('fixes'):
                print("\nFixes applied:")
                for fix in result['fixes'][:10]:
                    print(f"   - {fix['message']}")
        else:
            print(f"ERROR: {result['message']}")
            sys.exit(1)
    else:
        print(f"\nTo fix these issues, run:")
        print(f"   python {sys.argv[0]} --fix")

if __name__ == '__main__':
    main()