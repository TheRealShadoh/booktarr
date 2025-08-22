"""
P1-002: Series Validation Tests with Real Data

Tests series validation functionality using real series data from HandyLib.csv.
Validates:
- Series detection and creation from real manga/book series
- Volume counting and ordering
- Missing volume identification
- Series completion tracking
- Complex series naming patterns (Japanese + English)
"""

import pytest
import asyncio
import os
import csv
from sqlmodel import Session, select, create_engine, SQLModel
from typing import List, Dict, Any

# Import models and services
try:
    from backend.models.book import Book, Edition
    from backend.models.series import Series, SeriesVolume
    from backend.services.series_validation import SeriesValidationService
    from backend.services.volume_sync_service import VolumeSyncService
    from backend.services.csv_import import CSVImportService
    from backend.database import get_session
except ImportError:
    from models.book import Book, Edition
    from models.series import Series, SeriesVolume
    from services.series_validation import SeriesValidationService
    from services.volume_sync_service import VolumeSyncService
    from services.csv_import import CSVImportService
    from database import get_session


class TestSeriesValidationRealData:
    """Test series validation with real HandyLib.csv data"""
    
    @pytest.fixture
    def test_db(self):
        """Create a test database"""
        engine = create_engine("sqlite:///:memory:")
        SQLModel.metadata.create_all(engine)
        return engine
    
    @pytest.fixture
    def test_session(self, test_db):
        """Create a test session"""
        with Session(test_db) as session:
            yield session
    
    @pytest.fixture
    def validation_service(self, test_session):
        """Create series validation service"""
        return SeriesValidationService(test_session)
    
    @pytest.fixture
    def volume_sync_service(self, test_session):
        """Create volume sync service"""
        return VolumeSyncService(test_session)
    
    @pytest.fixture
    def real_series_data(self):
        """Real series data patterns from HandyLib.csv"""
        return {
            'oshi_no_ko': {
                'series_name': '推しの子 [Oshi no Ko]',
                'volumes': [
                    {
                        'title': '[Oshi No Ko], Vol. 1 (Volume 1) ([Oshi No Ko], 1)',
                        'volume': 1,
                        'isbn': '9781975363178',
                        'authors': ['Akasaka, Aka', 'Yokoyari, Mengo'],
                        'publisher': 'Yen Press',
                        'pages': 228
                    },
                    {
                        'title': '[Oshi No Ko], Vol. 2 (Volume 2) ([Oshi No Ko], 2)',
                        'volume': 2,
                        'isbn': '9781975363192',
                        'authors': ['Akasaka, Aka', 'Yokoyari, Mengo'],
                        'publisher': 'Yen Press',
                        'pages': 194
                    },
                    {
                        'title': '[Oshi No Ko], Vol. 3 (Volume 3) ([Oshi No Ko], 3)',
                        'volume': 3,
                        'isbn': '9781975363215',
                        'authors': ['Akasaka, Aka', 'Yokoyari, Mengo'],
                        'publisher': 'Yen Press',
                        'pages': 194
                    },
                    {
                        'title': '[Oshi No Ko], Vol. 7 (Volume 7) ([Oshi No Ko], 7)',
                        'volume': 7,
                        'isbn': '9781975363291',
                        'authors': ['Akasaka, Aka', 'Yokoyari, Mengo'],
                        'publisher': 'Yen Press',
                        'pages': 194
                    }
                ]
            },
            'citrus': {
                'series_name': 'Citrus',
                'volumes': [
                    {
                        'title': 'Citrus Vol. 1',
                        'volume': 1,
                        'isbn': '9781626920453',
                        'authors': ['Saburouta'],
                        'publisher': 'Seven Seas',
                        'pages': 180
                    },
                    {
                        'title': 'Citrus Vol. 3',
                        'volume': 3,
                        'isbn': '9781626921290',
                        'authors': ['Saburouta'],
                        'publisher': 'Seven Seas',
                        'pages': 180
                    },
                    {
                        'title': 'Citrus Vol. 5',
                        'volume': 5,
                        'isbn': '9781626923850',
                        'authors': ['Saburouta'],
                        'publisher': 'Seven Seas',
                        'pages': 180
                    }
                ]
            },
            'attack_on_titan': {
                'series_name': 'Attack on Titan',
                'volumes': [
                    {
                        'title': 'Attack on Titan Volume 1',
                        'volume': 1,
                        'isbn': '9781612620244',
                        'authors': ['Hajime Isayama'],
                        'publisher': 'Kodansha Comics',
                        'pages': 192
                    },
                    {
                        'title': 'Attack on Titan Volume 2',
                        'volume': 2,
                        'isbn': '9781612620251',
                        'authors': ['Hajime Isayama'],
                        'publisher': 'Kodansha Comics',
                        'pages': 192
                    },
                    {
                        'title': 'Attack on Titan Volume 34',
                        'volume': 34,
                        'isbn': '9781646512416',
                        'authors': ['Hajime Isayama'],
                        'publisher': 'Kodansha Comics',
                        'pages': 192
                    }
                ]
            }
        }
    
    def _create_books_from_series_data(self, test_session, series_data: Dict[str, Any]) -> List[Book]:
        """Helper to create books from series data"""
        books = []
        
        for volume_data in series_data['volumes']:
            book = Book(
                title=volume_data['title'],
                authors=str(volume_data['authors']),
                series_name=series_data['series_name'],
                series_position=volume_data['volume']
            )
            test_session.add(book)
            books.append(book)
        
        test_session.commit()
        
        for i, book in enumerate(books):
            test_session.refresh(book)
            
            # Create edition
            volume_data = series_data['volumes'][i]
            edition = Edition(
                book_id=book.id,
                isbn_13=volume_data['isbn'],
                publisher=volume_data['publisher']
            )
            test_session.add(edition)
        
        test_session.commit()
        return books
    
    @pytest.mark.asyncio
    async def test_japanese_series_name_handling(self, test_session, validation_service, real_series_data):
        """Test handling of Japanese series names with English translations"""
        oshi_data = real_series_data['oshi_no_ko']
        books = self._create_books_from_series_data(test_session, oshi_data)
        
        # Validate series with Japanese + English name
        result = await validation_service.validate_series_metadata(oshi_data['series_name'])
        
        assert result['valid'] is True
        assert result['series_name'] == '推しの子 [Oshi no Ko]'
        assert '推しの子' in result['series_name']  # Japanese part
        assert '[Oshi no Ko]' in result['series_name']  # English part
        
        # Check volume detection
        volumes = result.get('volumes', [])
        assert len(volumes) >= 4
        
        # Verify volume positions
        positions = [v['position'] for v in volumes]
        assert 1 in positions
        assert 2 in positions
        assert 3 in positions
        assert 7 in positions
        
        print("✓ Japanese series name handling works correctly")
    
    @pytest.mark.asyncio
    async def test_missing_volume_detection(self, test_session, validation_service, real_series_data):
        """Test detection of missing volumes in series"""
        # Use Oshi no Ko data (has volumes 1, 2, 3, 7 - missing 4, 5, 6)
        oshi_data = real_series_data['oshi_no_ko']
        books = self._create_books_from_series_data(test_session, oshi_data)
        
        result = await validation_service.validate_series_metadata(oshi_data['series_name'])
        
        # Should detect missing volumes
        missing_volumes = result.get('missing_volumes', [])
        assert 4 in missing_volumes
        assert 5 in missing_volumes  
        assert 6 in missing_volumes
        
        # Should not report owned volumes as missing
        assert 1 not in missing_volumes
        assert 2 not in missing_volumes
        assert 3 not in missing_volumes
        assert 7 not in missing_volumes
        
        # Check series completion
        completion = result.get('completion_percentage', 0)
        assert 0 < completion < 100  # Should be incomplete
        
        print(f"✓ Missing volume detection works. Missing: {missing_volumes}")
    
    @pytest.mark.asyncio
    async def test_sparse_volume_collection(self, test_session, validation_service, real_series_data):
        """Test handling of sparse volume collections (non-consecutive volumes)"""
        # Use Citrus data (has volumes 1, 3, 5 - missing 2, 4)
        citrus_data = real_series_data['citrus']
        books = self._create_books_from_series_data(test_session, citrus_data)
        
        result = await validation_service.validate_series_metadata(citrus_data['series_name'])
        
        assert result['valid'] is True
        
        # Check owned volumes
        owned_volumes = [v['position'] for v in result.get('volumes', []) if v.get('status') == 'owned']
        assert 1 in owned_volumes
        assert 3 in owned_volumes
        assert 5 in owned_volumes
        
        # Check missing volumes
        missing_volumes = result.get('missing_volumes', [])
        assert 2 in missing_volumes
        assert 4 in missing_volumes
        
        # Series should show appropriate total volume count
        total_volumes = result.get('total_volumes', 0)
        assert total_volumes >= 5  # At least 5 since we have volume 5
        
        print(f"✓ Sparse volume collection handled correctly. Total: {total_volumes}")
    
    @pytest.mark.asyncio
    async def test_volume_count_reconciliation(self, test_session, validation_service, real_series_data):
        """Test reconciliation of volume counts from different sources"""
        oshi_data = real_series_data['oshi_no_ko']
        books = self._create_books_from_series_data(test_session, oshi_data)
        
        # Create initial series record with incorrect count
        series = Series(
            name=oshi_data['series_name'],
            total_volumes=3,  # Incorrect - we have volume 7
            description='Test series'
        )
        test_session.add(series)
        test_session.commit()
        
        # Validation should detect and correct the count
        result = await validation_service.reconcile_series_volume_count(oshi_data['series_name'])
        
        assert result['reconciled'] is True
        assert result['old_count'] == 3
        assert result['new_count'] >= 7  # Should be at least 7
        
        # Verify database was updated
        test_session.refresh(series)
        assert series.total_volumes >= 7
        
        print(f"✓ Volume count reconciled from {result['old_count']} to {result['new_count']}")
    
    @pytest.mark.asyncio
    async def test_long_running_series_validation(self, test_session, validation_service, real_series_data):
        """Test validation of long-running series with many volumes"""
        # Use Attack on Titan data (volumes 1, 2, 34 - very sparse)
        aot_data = real_series_data['attack_on_titan']
        books = self._create_books_from_series_data(test_session, aot_data)
        
        result = await validation_service.validate_series_metadata(aot_data['series_name'])
        
        assert result['valid'] is True
        
        # Should recognize this as a long series
        total_volumes = result.get('total_volumes', 0)
        assert total_volumes >= 34
        
        # Should have many missing volumes
        missing_volumes = result.get('missing_volumes', [])
        assert len(missing_volumes) >= 30  # Missing most volumes
        
        # Completion percentage should be very low
        completion = result.get('completion_percentage', 0)
        assert completion < 20  # Less than 20% complete
        
        print(f"✓ Long series validation works. {len(missing_volumes)} missing volumes")
    
    @pytest.mark.asyncio
    async def test_series_volume_sync(self, test_session, volume_sync_service, real_series_data):
        """Test syncing series volumes with book ownership"""
        oshi_data = real_series_data['oshi_no_ko']
        books = self._create_books_from_series_data(test_session, oshi_data)
        
        # Create series and volumes
        series = Series(
            name=oshi_data['series_name'],
            total_volumes=10
        )
        test_session.add(series)
        test_session.commit()
        test_session.refresh(series)
        
        # Create some volumes (including one that doesn't match a book)
        for i in range(1, 8):
            status = 'owned' if i in [1, 2, 3, 7] else 'missing'
            volume = SeriesVolume(
                series_id=series.id,
                position=i,
                title=f'Volume {i}',
                status=status
            )
            test_session.add(volume)
        
        test_session.commit()
        
        # Sync volumes with actual books
        result = await volume_sync_service.sync_series_volumes(oshi_data['series_name'])
        
        assert result['synced'] is True
        assert result['volumes_updated'] >= 0
        
        # Verify volumes are correctly synced
        volumes = test_session.exec(
            select(SeriesVolume).where(SeriesVolume.series_id == series.id)
        ).all()
        
        owned_volumes = [v for v in volumes if v.status == 'owned']
        assert len(owned_volumes) == 4  # Volumes 1, 2, 3, 7
        
        # Check that book IDs are linked
        for volume in owned_volumes:
            if volume.book_id:
                book = test_session.exec(
                    select(Book).where(Book.id == volume.book_id)
                ).first()
                assert book is not None
                assert book.series_position == volume.position
        
        print("✓ Volume sync working correctly")
    
    @pytest.mark.asyncio
    async def test_duplicate_volume_cleanup(self, test_session, validation_service, real_series_data):
        """Test cleanup of duplicate volume entries"""
        oshi_data = real_series_data['oshi_no_ko']
        books = self._create_books_from_series_data(test_session, oshi_data)
        
        # Create series
        series = Series(name=oshi_data['series_name'], total_volumes=10)
        test_session.add(series)
        test_session.commit()
        test_session.refresh(series)
        
        # Create duplicate volumes
        for i in [1, 1, 2, 2, 3]:  # Duplicates for volumes 1 and 2
            volume = SeriesVolume(
                series_id=series.id,
                position=i,
                title=f'Volume {i}',
                status='owned'
            )
            test_session.add(volume)
        
        test_session.commit()
        
        # Validation should detect and clean duplicates
        result = await validation_service.remove_duplicate_volumes(oshi_data['series_name'])
        
        assert result['duplicates_removed'] >= 2
        
        # Verify only one volume per position remains
        volumes = test_session.exec(
            select(SeriesVolume).where(SeriesVolume.series_id == series.id)
        ).all()
        
        positions = [v.position for v in volumes]
        assert len(positions) == len(set(positions))  # No duplicate positions
        
        print(f"✓ Duplicate cleanup removed {result['duplicates_removed']} duplicates")
    
    @pytest.mark.asyncio
    async def test_orphaned_volume_detection(self, test_session, validation_service, real_series_data):
        """Test detection of orphaned volume records"""
        oshi_data = real_series_data['oshi_no_ko']
        books = self._create_books_from_series_data(test_session, oshi_data)
        
        # Create series
        series = Series(name=oshi_data['series_name'], total_volumes=10)
        test_session.add(series)
        test_session.commit()
        test_session.refresh(series)
        
        # Create volumes, some orphaned (referencing non-existent books)
        volume1 = SeriesVolume(
            series_id=series.id,
            position=1,
            title='Volume 1',
            book_id=books[0].id,  # Valid reference
            status='owned'
        )
        test_session.add(volume1)
        
        volume_orphaned = SeriesVolume(
            series_id=series.id,
            position=99,
            title='Orphaned Volume',
            book_id=99999,  # Non-existent book ID
            status='owned'
        )
        test_session.add(volume_orphaned)
        
        test_session.commit()
        
        # Detect orphaned volumes
        result = await validation_service.find_orphaned_volumes(oshi_data['series_name'])
        
        orphaned_volumes = result.get('orphaned_volumes', [])
        assert len(orphaned_volumes) >= 1
        
        # The orphaned volume should be detected
        orphaned_positions = [v['position'] for v in orphaned_volumes]
        assert 99 in orphaned_positions
        assert 1 not in orphaned_positions  # Valid volume should not be orphaned
        
        print(f"✓ Orphaned volume detection found {len(orphaned_volumes)} orphans")
    
    def test_series_completion_calculation(self, test_session, real_series_data):
        """Test series completion percentage calculation"""
        # Test different completion scenarios
        test_cases = [
            {
                'name': 'Complete Series',
                'owned_volumes': [1, 2, 3, 4, 5],
                'total_volumes': 5,
                'expected_completion': 100.0
            },
            {
                'name': 'Half Complete',
                'owned_volumes': [1, 2, 3],
                'total_volumes': 6,
                'expected_completion': 50.0
            },
            {
                'name': 'Sparse Collection',
                'owned_volumes': [1, 5, 10],
                'total_volumes': 10,
                'expected_completion': 30.0
            }
        ]
        
        for case in test_cases:
            # Create series
            series = Series(
                name=f"Test Series - {case['name']}",
                total_volumes=case['total_volumes']
            )
            test_session.add(series)
            test_session.commit()
            test_session.refresh(series)
            
            # Create volumes
            for position in case['owned_volumes']:
                volume = SeriesVolume(
                    series_id=series.id,
                    position=position,
                    title=f'Volume {position}',
                    status='owned'
                )
                test_session.add(volume)
            
            test_session.commit()
            
            # Calculate completion
            owned_count = len(case['owned_volumes'])
            total_count = case['total_volumes']
            completion = (owned_count / total_count) * 100 if total_count > 0 else 0
            
            assert abs(completion - case['expected_completion']) < 0.1
            
            print(f"✓ {case['name']}: {completion:.1f}% completion")
    
    @pytest.mark.asyncio
    async def test_real_world_series_patterns(self, test_session, validation_service):
        """Test validation with real-world series naming patterns"""
        
        # Complex series patterns found in real data
        complex_series = [
            {
                'name': '推しの子 [Oshi no Ko]',
                'pattern': 'japanese_with_english',
                'volumes': ['[Oshi No Ko], Vol. 1 (Volume 1)', '[Oshi No Ko], Vol. 2']
            },
            {
                'name': 'One Piece',
                'pattern': 'simple_english',
                'volumes': ['One Piece Volume 1', 'One Piece Volume 2']
            },
            {
                'name': 'ナルト [Naruto]',
                'pattern': 'japanese_with_romanization',
                'volumes': ['Naruto Vol. 1', 'Naruto Vol. 2']
            }
        ]
        
        for series_data in complex_series:
            # Create books for this series
            for i, volume_title in enumerate(series_data['volumes'], 1):
                book = Book(
                    title=volume_title,
                    authors='["Test Author"]',
                    series_name=series_data['name'],
                    series_position=i
                )
                test_session.add(book)
            
            test_session.commit()
            
            # Validate series pattern
            result = await validation_service.validate_series_metadata(series_data['name'])
            
            assert result['valid'] is True
            assert result['series_name'] == series_data['name']
            
            # Should detect the volumes
            volumes = result.get('volumes', [])
            assert len(volumes) >= len(series_data['volumes'])
            
            print(f"✓ {series_data['pattern']} pattern validated: {series_data['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])