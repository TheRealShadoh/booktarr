#!/usr/bin/env python3
"""
Script to fix series volume count inconsistencies
"""
import asyncio
import sys
sys.path.append(".")

from services.series_validation import SeriesValidationService
from database import get_session
from models import Series
from sqlmodel import select


async def main():
    """Main function to validate and fix all series"""
    print("Series Volume Count Validation and Fix Tool")
    print("=" * 50)
    
    validation_service = SeriesValidationService()
    
    # First, validate all series
    print("\n1. Validating all series...")
    report = await validation_service.validate_all_series()
    
    print(f"\nTotal series: {report['total_series']}")
    print(f"Series with issues: {report['series_with_issues']}")
    
    if report['series_with_issues'] > 0:
        print("\nSeries with issues:")
        for series_name, series_report in report['reports'].items():
            print(f"\n{series_name}:")
            if series_report['errors']:
                print(f"  Errors ({len(series_report['errors'])}):")
                for error in series_report['errors']:
                    print(f"    - {error}")
            if series_report['warnings']:
                print(f"  Warnings ({len(series_report['warnings'])}):")
                for warning in series_report['warnings']:
                    print(f"    - {warning}")
        
        # Ask if user wants to fix
        response = input("\nDo you want to apply fixes to all series with errors? (yes/no): ")
        if response.lower() == 'yes':
            print("\n2. Applying fixes...")
            
            for series_name in report['reports'].keys():
                print(f"\nFixing {series_name}...")
                result = await validation_service.reconcile_series(series_name, fix_errors=True)
                
                if result['success']:
                    print(f"  ✓ Fixed {result['fix_count']} issues")
                    if result['fixes_applied']:
                        for fix in result['fixes_applied']:
                            print(f"    - {fix}")
                else:
                    print(f"  ✗ Error: {result.get('error', 'Unknown error')}")
            
            # Re-validate to confirm fixes
            print("\n3. Re-validating all series...")
            final_report = await validation_service.validate_all_series()
            print(f"\nFinal status:")
            print(f"  Total series: {final_report['total_series']}")
            print(f"  Series with remaining issues: {final_report['series_with_issues']}")
            
            if final_report['series_with_issues'] > 0:
                print("\nRemaining issues that require manual intervention:")
                for series_name, series_report in final_report['reports'].items():
                    if series_report['errors']:
                        print(f"\n{series_name}: {len(series_report['errors'])} errors")
    else:
        print("\n✓ All series data is consistent!")
    
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())