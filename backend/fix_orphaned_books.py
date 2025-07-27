#!/usr/bin/env python3
"""
Fix orphaned books that have series_name but no corresponding series entry
"""
import sqlite3
from datetime import date
import json

def fix_orphaned_books():
    """Create series entries for books that have series_name but no series entry"""
    conn = sqlite3.connect('booktarr.db')
    cursor = conn.cursor()
    
    print("Finding orphaned books...")
    
    # Find books with series_name but no series entry
    cursor.execute("""
        SELECT DISTINCT b.series_name, 
               (SELECT b2.authors FROM book b2 WHERE b2.series_name = b.series_name LIMIT 1) as authors,
               COUNT(*) as book_count
        FROM book b 
        LEFT JOIN series s ON b.series_name = s.name 
        WHERE b.series_name IS NOT NULL AND s.id IS NULL
        GROUP BY b.series_name
    """)
    
    orphaned_series = cursor.fetchall()
    
    if not orphaned_series:
        print("No orphaned books found!")
        return
    
    print(f"Found {len(orphaned_series)} series missing from series table:")
    
    for series_name, authors_json, book_count in orphaned_series:
        print(f"  - {series_name} ({book_count} books)")
        
        # Parse authors JSON
        try:
            authors = json.loads(authors_json) if authors_json else []
            primary_author = authors[0] if authors else None
        except:
            primary_author = None
        
        # Create series entry
        cursor.execute("""
            INSERT INTO series (name, author, total_books, status, created_date, last_updated)
            VALUES (?, ?, ?, 'unknown', ?, ?)
        """, (series_name, primary_author, book_count, date.today().isoformat(), date.today().isoformat()))
        
        series_id = cursor.lastrowid
        print(f"    Created series entry with ID {series_id}")
        
        # Create volume entries for each book in this series
        cursor.execute("""
            SELECT id, title, series_position
            FROM book 
            WHERE series_name = ?
            ORDER BY series_position NULLS LAST, id
        """, (series_name,))
        
        books_in_series = cursor.fetchall()
        
        for book_id, book_title, position in books_in_series:
            # Use position if available, otherwise assign sequential positions
            if position is None:
                # Find next available position
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
            
            # Check if volume entry already exists
            cursor.execute("""
                SELECT id FROM seriesvolume 
                WHERE series_id = ? AND position = ?
            """, (series_id, position))
            
            if cursor.fetchone() is None:
                # Create volume entry
                cursor.execute("""
                    INSERT INTO seriesvolume (series_id, position, title, status, user_id)
                    VALUES (?, ?, ?, 'owned', 1)
                """, (series_id, position, book_title))
                
                print(f"    Created volume entry: Position {position} - {book_title}")
    
    conn.commit()
    conn.close()
    
    print(f"\nFixed {len(orphaned_series)} orphaned series!")

if __name__ == "__main__":
    fix_orphaned_books()