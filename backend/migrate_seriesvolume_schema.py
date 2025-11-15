#!/usr/bin/env python3
"""
Database Migration: Add missing SeriesVolume model columns
Fixes: sqlite3.OperationalError: no such column: seriesvolume.chapter_count
"""

import sqlite3
import sys
from pathlib import Path

# Fix Windows encoding issues
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def migrate_database():
    """Add missing columns to SeriesVolume table"""

    db_path = Path(__file__).parent / "booktarr.db"

    if not db_path.exists():
        print(f"[ERROR] Database not found at {db_path}")
        print("Creating new database with correct schema...")
        from database import init_db
        init_db()
        print("[SUCCESS] New database created successfully")
        return True

    print(f"[INFO] Database found: {db_path}")

    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check current seriesvolume table schema
    cursor.execute("PRAGMA table_info(seriesvolume);")
    existing_columns = {row[1] for row in cursor.fetchall()}
    print(f"[INFO] Existing columns: {len(existing_columns)}")

    # Define new columns to add for SeriesVolume table
    new_columns = {
        'chapter_count': 'INTEGER',  # Number of chapters in this volume
        'is_color': 'BOOLEAN'  # Whether volume is in color or B&W (for manga)
    }

    # Add missing columns
    added_count = 0
    for column_name, column_type in new_columns.items():
        if column_name not in existing_columns:
            try:
                sql = f"ALTER TABLE seriesvolume ADD COLUMN {column_name} {column_type};"
                print(f"  [+] Adding column: {column_name} ({column_type})")
                cursor.execute(sql)
                added_count += 1
            except sqlite3.OperationalError as e:
                print(f"  [WARN] Warning: {e}")
        else:
            print(f"  [OK] Column already exists: {column_name}")

    # Commit changes
    conn.commit()

    # Verify new schema
    cursor.execute("PRAGMA table_info(seriesvolume);")
    final_columns = {row[1] for row in cursor.fetchall()}

    conn.close()

    print(f"\n[SUCCESS] Migration complete!")
    print(f"   Added {added_count} new columns")
    print(f"   Total columns now: {len(final_columns)}")

    # Verify all required columns are present
    missing = set(new_columns.keys()) - final_columns
    if missing:
        print(f"\n[ERROR] Still missing columns: {missing}")
        return False

    print(f"\n[SUCCESS] All required columns present!")
    return True

if __name__ == "__main__":
    try:
        success = migrate_database()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
