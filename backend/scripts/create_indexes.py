"""
P2-002: Database Indexes for Common Queries

Creates database indexes to improve query performance for common operations:
- Book searches by title, author, series
- ISBN lookups
- User-specific queries
- Reading progress queries
- Series volume queries
"""

import asyncio
import sys
from pathlib import Path
from sqlalchemy import text, Index
from sqlmodel import create_engine

# Add backend to path for imports
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

try:
    from database import get_engine
    from models.book import Book, Edition, UserEditionStatus
    from models.reading_progress import ReadingProgress
    from models.series import Series, SeriesVolume
except ImportError as e:
    print(f"Import error: {e}")
    print("Please run this script from the backend directory")
    sys.exit(1)


class DatabaseIndexManager:
    """Manages database indexes for performance optimization"""
    
    def __init__(self):
        self.engine = get_engine()
    
    def create_all_indexes(self):
        """Create all performance indexes"""
        print("Creating database indexes for performance optimization...")
        
        with self.engine.connect() as conn:
            # Book indexes
            self._create_book_indexes(conn)
            
            # Edition indexes
            self._create_edition_indexes(conn)
            
            # User status indexes
            self._create_user_status_indexes(conn)
            
            # Reading progress indexes
            self._create_reading_progress_indexes(conn)
            
            # Series indexes
            self._create_series_indexes(conn)
            
            # Commit all changes
            conn.commit()
        
        print("✓ All indexes created successfully")
    
    def _create_book_indexes(self, conn):
        """Create indexes for Book table"""
        print("Creating Book table indexes...")
        
        # Index for title searches (case-insensitive)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_book_title_lower 
            ON book (LOWER(title))
        """))
        
        # Index for series searches
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_book_series_name 
            ON book (series_name)
        """))
        
        # Composite index for series name and position
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_book_series_position 
            ON book (series_name, series_position)
        """))
        
        # Index for author searches (JSON field)
        # Note: This creates a functional index on the JSON content
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_book_authors_lower 
            ON book (LOWER(authors))
        """))
        
        # Index for books with series (non-null series_name)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_book_has_series 
            ON book (series_name) 
            WHERE series_name IS NOT NULL
        """))
        
        print("✓ Book indexes created")
    
    def _create_edition_indexes(self, conn):
        """Create indexes for Edition table"""
        print("Creating Edition table indexes...")
        
        # Primary ISBN indexes for fast lookups
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_edition_isbn13 
            ON edition (isbn_13)
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_edition_isbn10 
            ON edition (isbn_10)
        """))
        
        # Composite index for book_id (foreign key optimization)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_edition_book_id 
            ON edition (book_id)
        """))
        
        # Index for release date queries (calendar features)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_edition_release_date 
            ON edition (release_date)
        """))
        
        # Index for publisher searches
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_edition_publisher 
            ON edition (publisher)
        """))
        
        # Composite index for format and release date
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_edition_format_date 
            ON edition (book_format, release_date)
        """))
        
        # Index for price queries
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_edition_price 
            ON edition (price) 
            WHERE price IS NOT NULL
        """))
        
        print("✓ Edition indexes created")
    
    def _create_user_status_indexes(self, conn):
        """Create indexes for UserEditionStatus table"""
        print("Creating UserEditionStatus table indexes...")
        
        # Primary user-edition lookup
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_edition_user_edition 
            ON usereditionstatus (user_id, edition_id)
        """))
        
        # Index for user's owned books
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_edition_user_status 
            ON usereditionstatus (user_id, status)
        """))
        
        # Index for edition ownership lookup
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_edition_edition_id 
            ON usereditionstatus (edition_id)
        """))
        
        # Index for finding wanted books
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_edition_wanted 
            ON usereditionstatus (user_id) 
            WHERE status = 'want'
        """))
        
        # Index for finding owned books
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_edition_owned 
            ON usereditionstatus (user_id) 
            WHERE status = 'own'
        """))
        
        print("✓ UserEditionStatus indexes created")
    
    def _create_reading_progress_indexes(self, conn):
        """Create indexes for ReadingProgress table"""
        print("Creating ReadingProgress table indexes...")
        
        # Primary user-edition lookup
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_reading_progress_user_edition 
            ON readingprogress (user_id, edition_id)
        """))
        
        # Index for user's reading status
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_reading_progress_user_status 
            ON readingprogress (user_id, status)
        """))
        
        # Index for currently reading books
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_reading_progress_currently_reading 
            ON readingprogress (user_id) 
            WHERE status = 'currently_reading'
        """))
        
        # Index for finished books
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_reading_progress_finished 
            ON readingprogress (user_id) 
            WHERE status = 'finished'
        """))
        
        # Index for finish date (reading statistics)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_reading_progress_finish_date 
            ON readingprogress (user_id, finish_date) 
            WHERE finish_date IS NOT NULL
        """))
        
        # Index for ratings
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_reading_progress_rating 
            ON readingprogress (user_id, rating) 
            WHERE rating IS NOT NULL
        """))
        
        # Index for updated_at (recent activity)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_reading_progress_updated 
            ON readingprogress (updated_at)
        """))
        
        print("✓ ReadingProgress indexes created")
    
    def _create_series_indexes(self, conn):
        """Create indexes for Series and SeriesVolume tables"""
        print("Creating Series table indexes...")
        
        # Series name lookup
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_series_name 
            ON series (name)
        """))
        
        # Index for ongoing series
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_series_ongoing 
            ON series (ongoing) 
            WHERE ongoing = true
        """))
        
        # Index for total volumes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_series_total_volumes 
            ON series (total_volumes)
        """))
        
        print("Creating SeriesVolume table indexes...")
        
        # Primary series-position lookup
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_series_volume_series_position 
            ON seriesvolume (series_id, position)
        """))
        
        # Index for volume status
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_series_volume_status 
            ON seriesvolume (series_id, status)
        """))
        
        # Index for book_id (when volume is linked to actual book)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_series_volume_book_id 
            ON seriesvolume (book_id) 
            WHERE book_id IS NOT NULL
        """))
        
        # Index for missing volumes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_series_volume_missing 
            ON seriesvolume (series_id) 
            WHERE status = 'missing'
        """))
        
        print("✓ Series indexes created")
    
    def drop_all_indexes(self):
        """Drop all custom indexes (for cleanup or rebuilding)"""
        print("Dropping all custom indexes...")
        
        index_names = [
            # Book indexes
            'idx_book_title_lower',
            'idx_book_series_name',
            'idx_book_series_position',
            'idx_book_authors_lower',
            'idx_book_has_series',
            
            # Edition indexes
            'idx_edition_isbn13',
            'idx_edition_isbn10',
            'idx_edition_book_id',
            'idx_edition_release_date',
            'idx_edition_publisher',
            'idx_edition_format_date',
            'idx_edition_price',
            
            # UserEditionStatus indexes
            'idx_user_edition_user_edition',
            'idx_user_edition_user_status',
            'idx_user_edition_edition_id',
            'idx_user_edition_wanted',
            'idx_user_edition_owned',
            
            # ReadingProgress indexes
            'idx_reading_progress_user_edition',
            'idx_reading_progress_user_status',
            'idx_reading_progress_currently_reading',
            'idx_reading_progress_finished',
            'idx_reading_progress_finish_date',
            'idx_reading_progress_rating',
            'idx_reading_progress_updated',
            
            # Series indexes
            'idx_series_name',
            'idx_series_ongoing',
            'idx_series_total_volumes',
            'idx_series_volume_series_position',
            'idx_series_volume_status',
            'idx_series_volume_book_id',
            'idx_series_volume_missing'
        ]
        
        with self.engine.connect() as conn:
            for index_name in index_names:
                try:
                    conn.execute(text(f"DROP INDEX IF EXISTS {index_name}"))
                    print(f"✓ Dropped index: {index_name}")
                except Exception as e:
                    print(f"⚠ Failed to drop index {index_name}: {e}")
            
            conn.commit()
        
        print("✓ Index cleanup completed")
    
    def analyze_query_performance(self):
        """Analyze common query performance"""
        print("Analyzing query performance with current indexes...")
        
        common_queries = [
            # Book title search
            "SELECT * FROM book WHERE LOWER(title) LIKE '%test%'",
            
            # ISBN lookup
            "SELECT * FROM edition WHERE isbn_13 = '9781234567890'",
            
            # Series books
            "SELECT * FROM book WHERE series_name = 'Test Series' ORDER BY series_position",
            
            # User's owned books
            """
            SELECT b.* FROM book b 
            JOIN edition e ON b.id = e.book_id 
            JOIN usereditionstatus ues ON e.id = ues.edition_id 
            WHERE ues.user_id = 1 AND ues.status = 'own'
            """,
            
            # Reading progress
            """
            SELECT * FROM readingprogress 
            WHERE user_id = 1 AND status = 'currently_reading'
            """,
            
            # Release calendar
            """
            SELECT * FROM edition 
            WHERE release_date >= date('now') 
            ORDER BY release_date
            """
        ]
        
        with self.engine.connect() as conn:
            for i, query in enumerate(common_queries, 1):
                print(f"\nQuery {i}: {query[:50]}...")
                try:
                    # Use EXPLAIN QUERY PLAN for SQLite
                    result = conn.execute(text(f"EXPLAIN QUERY PLAN {query}"))
                    plan = result.fetchall()
                    for row in plan:
                        print(f"  {row}")
                except Exception as e:
                    print(f"  Error analyzing query: {e}")
    
    def get_index_info(self):
        """Get information about existing indexes"""
        print("Current database indexes:")
        
        with self.engine.connect() as conn:
            # Get all indexes
            result = conn.execute(text("""
                SELECT name, tbl_name, sql 
                FROM sqlite_master 
                WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
                ORDER BY tbl_name, name
            """))
            
            indexes = result.fetchall()
            current_table = None
            
            for index in indexes:
                if index[1] != current_table:
                    current_table = index[1]
                    print(f"\nTable: {current_table}")
                
                print(f"  {index[0]}")
                if index[2]:  # SQL definition available
                    print(f"    {index[2]}")
    
    def optimize_database(self):
        """Run database optimization commands"""
        print("Optimizing database...")
        
        with self.engine.connect() as conn:
            # Analyze tables for query planner
            conn.execute(text("ANALYZE"))
            
            # Vacuum to reclaim space and defragment
            conn.execute(text("VACUUM"))
            
            conn.commit()
        
        print("✓ Database optimization completed")


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Manage database indexes for performance')
    parser.add_argument('action', choices=['create', 'drop', 'analyze', 'info', 'optimize'],
                       help='Action to perform')
    
    args = parser.parse_args()
    
    index_manager = DatabaseIndexManager()
    
    if args.action == 'create':
        index_manager.create_all_indexes()
    elif args.action == 'drop':
        index_manager.drop_all_indexes()
    elif args.action == 'analyze':
        index_manager.analyze_query_performance()
    elif args.action == 'info':
        index_manager.get_index_info()
    elif args.action == 'optimize':
        index_manager.optimize_database()


if __name__ == "__main__":
    main()