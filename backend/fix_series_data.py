#!/usr/bin/env python3
"""
Script to fix series data inconsistencies and sync volume statuses
"""
import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

async def fix_series_data():
    """Fix all series data issues"""
    print("🔧 Starting series data validation and synchronization...")
    
    try:
        # Import services
        from services.series_metadata import SeriesMetadataService
        from services.volume_sync_service import VolumeSyncService
        
        # Initialize services
        metadata_service = SeriesMetadataService()
        sync_service = VolumeSyncService()
        
        try:
            print("\n📊 Step 1: Validating and fixing series metadata...")
            validation_result = await metadata_service.validate_and_fix_series_data()
            
            if validation_result["success"]:
                print(f"✅ {validation_result['message']}")
                if validation_result["fixed_series"]:
                    print("📋 Fixed series:")
                    for fix in validation_result["fixed_series"]:
                        print(f"   • {fix['name']}: {fix['old_total']} → {fix['new_total']} books")
                else:
                    print("   ℹ️  No series needed fixing")
            else:
                print(f"❌ Validation failed: {validation_result.get('message', 'Unknown error')}")
            
            print("\n🔄 Step 2: Synchronizing all series volumes with book ownership...")
            sync_result = await sync_service.sync_all_series_volumes()
            
            if sync_result["success"]:
                print(f"✅ {sync_result['message']}")
                print(f"📈 Total changes made: {sync_result['total_changes']}")
                
                if sync_result["changes_by_series"]:
                    print("📋 Changes made:")
                    current_series = None
                    for change in sync_result["changes_by_series"]:
                        if "series" in change:
                            if current_series != change.get("series"):
                                current_series = change.get("series")
                                print(f"\n   📚 {current_series}:")
                        print(f"      • Vol {change['position']}: {change['old_status']} → {change['new_status']}")
                        print(f"        Reason: {change['reason']}")
                else:
                    print("   ℹ️  No synchronization changes needed")
            else:
                print(f"❌ Synchronization failed: {sync_result.get('message', 'Unknown error')}")
            
            print("\n🔍 Step 3: Checking for remaining ownership mismatches...")
            mismatch_result = await sync_service.reconcile_ownership_mismatches()
            
            if mismatch_result["success"]:
                print(f"✅ {mismatch_result['message']}")
                if mismatch_result["mismatches"]:
                    print("⚠️  Found remaining mismatches:")
                    for mismatch in mismatch_result["mismatches"]:
                        print(f"   • {mismatch['series']} Vol {mismatch['position']}: {mismatch['issue']}")
                else:
                    print("   ✅ No ownership mismatches found")
            else:
                print(f"❌ Mismatch check failed: {mismatch_result.get('message', 'Unknown error')}")
            
            print("\n🎯 Step 4: Updating series totals from actual volume counts...")
            totals_result = await sync_service.update_series_totals_from_volumes()
            
            if totals_result["success"]:
                print(f"✅ {totals_result['message']}")
                if totals_result["updated_series"]:
                    print("📊 Updated series totals:")
                    for update in totals_result["updated_series"]:
                        print(f"   • {update['series']}: {update['old_total']} → {update['new_total']} total books")
                        print(f"     (Volumes: {update['volume_count']}, Owned: {update['owned_count']})")
                else:
                    print("   ℹ️  No series totals needed updating")
            else:
                print(f"❌ Totals update failed: {totals_result.get('message', 'Unknown error')}")
            
        finally:
            await metadata_service.close()
        
        print("\n🎉 Series data validation and synchronization complete!")
        print("💡 The frontend should now show correct completion ratios.")
        
    except Exception as e:
        print(f"❌ Error during series data fix: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_series_data())