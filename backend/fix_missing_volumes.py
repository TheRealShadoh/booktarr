#!/usr/bin/env python3
"""
Fix books that have series info but no volume entries
"""
import sqlite3
from datetime import date

def fix_missing_volumes():
    """Create volume entries for books that have series but no volume entry"""
    conn = sqlite3.connect('booktarr.db')
    cursor = conn.cursor()
    
    print("Finding books without volume entries...")
    
    # Find books with series info but no volume entries
    cursor.execute("""
        SELECT b.id, b.title, b.series_name, b.series_position, s.id as series_id
        FROM book b 
        JOIN series s ON b.series_name = s.name
        LEFT JOIN seriesvolume sv ON (sv.series_id = s.id AND sv.position = b.series_position)
        WHERE b.series_name IS NOT NULL AND sv.id IS NULL
        ORDER BY b.series_name, b.series_position NULLS LAST, b.id
    """)
    
    books_without_volumes = cursor.fetchall()
    
    if not books_without_volumes:
        print("No books missing volume entries found!")
        return
    
    print(f"Found {len(books_without_volumes)} books missing volume entries:")
    
    for book_id, book_title, series_name, position, series_id in books_without_volumes:
        print(f"  - {book_title} (Series: {series_name}, Position: {position})")
        
        # If position is None, assign next available
        if position is None:
            cursor.execute("""
                SELECT COALESCE(MAX(position), 0) + 1
                FROM seriesvolume 
                WHERE series_id = ?
            """, (series_id,))
            position = cursor.fetchone()[0]
            
            # Update book with calculated position
            cursor.execute("""
                UPDATE book SET series_position = ? WHERE id = ?
            """, (position, book_id))
            print(f"    Assigned position {position}")
        
        # Create volume entry
        cursor.execute("""
            INSERT INTO seriesvolume (series_id, position, title, status, user_id)
            VALUES (?, ?, ?, 'owned', 1)
        """, (series_id, position, book_title))
        
        print(f"    Created volume entry for position {position}")
    
    conn.commit()
    conn.close()
    
    print(f"\nFixed {len(books_without_volumes)} missing volume entries!")

if __name__ == "__main__":
    fix_missing_volumes()