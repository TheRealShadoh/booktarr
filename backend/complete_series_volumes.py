#!/usr/bin/env python3
"""
Complete series volumes by adding missing volumes based on known series lengths
"""
import sys
sys.path.insert(0, '.')
from database import get_session
from models import Series, SeriesVolume
from sqlmodel import select

# Known complete series information (manually curated)
COMPLETE_SERIES_INFO = {
    "Bleach": {
        "total_volumes": 74,
        "status": "completed"
    },
    "One Piece": {
        "total_volumes": 107,  # As of 2024, still ongoing
        "status": "ongoing"
    },
    "Naruto": {
        "total_volumes": 72,
        "status": "completed"
    },
    "Death Note": {
        "total_volumes": 12,
        "status": "completed"
    },
    "Attack on Titan": {
        "total_volumes": 34,
        "status": "completed"
    },
    "Dragon Ball": {
        "total_volumes": 42,
        "status": "completed"
    },
    "My Hero Academia": {
        "total_volumes": 40,  # Ongoing as of 2024
        "status": "ongoing"
    },
    "Demon Slayer": {
        "total_volumes": 23,
        "status": "completed"
    },
    "One Punch Man": {
        "total_volumes": 29,  # Ongoing as of 2024
        "status": "ongoing"
    },
    "Tokyo Ghoul": {
        "total_volumes": 14,
        "status": "completed"
    },
    # Japanese series with their Japanese names
    "呪術廻戦 [Jujutsu Kaisen]": {
        "total_volumes": 24,  # Ongoing as of 2024
        "status": "ongoing"
    },
    "スパイファミリー [Spy X Family]": {
        "total_volumes": 13,  # Ongoing as of 2024
        "status": "ongoing"
    },
    "Spy×Family": {
        "total_volumes": 13,  # Same series, different naming
        "status": "ongoing"
    },
    "東京喰種 / Tokyo Ghoul": {
        "total_volumes": 14,
        "status": "completed"
    },
    "古見さんは、コミュ症です。 [Komi-san wa, Komyushō Desu.]": {
        "total_volumes": 31,  # Ongoing as of 2024
        "status": "ongoing"
    },
    "推しの子 [Oshi no Ko]": {
        "total_volumes": 14,  # Ongoing as of 2024
        "status": "ongoing"
    },
    "やがて君になる [Bloom Into You]": {
        "total_volumes": 8,
        "status": "completed"
    },
    "青の祓魔師 [Ao no Exorcist]": {
        "total_volumes": 30,  # Ongoing as of 2024
        "status": "ongoing"
    },
    "よふかしのうた [Yofukashi no Uta]": {
        "total_volumes": 20,  # Ongoing as of 2024
        "status": "ongoing"
    },
    "Citrus": {
        "total_volumes": 10,
        "status": "completed"
    },
    "ひるなかの流星 [Hirunaka no Ryuusei]": {
        "total_volumes": 12,
        "status": "completed"
    },
    "ホリミヤ [Horimiya]": {
        "total_volumes": 17,
        "status": "completed"
    },
    "無職転生: 異世界行ったら本気だす [Mushoku Tensei: Isekai Ittara Honki Dasu]": {
        "total_volumes": 19,  # Ongoing as of 2024
        "status": "ongoing"
    },
    "ニセコイ [Nisekoi]": {
        "total_volumes": 25,
        "status": "completed"
    },
    "NTR: Netsuzou Trap": {
        "total_volumes": 5,
        "status": "completed"
    },
    "ヲタクに恋は難しい [Wotaku ni Koi wa Muzukashii]": {
        "total_volumes": 11,
        "status": "completed"
    },
    "暁のヨナ [Akatsuki no Yona]": {
        "total_volumes": 40,  # Ongoing as of 2024
        "status": "ongoing"
    }
}

def complete_series_volumes():
    """
    Update series to show complete volume counts and add missing volumes
    """
    print("🔧 Completing series volume information...")
    
    with get_session() as session:
        # Get all series
        statement = select(Series)
        all_series = session.exec(statement).all()
        
        updated_count = 0
        
        for series in all_series:
            series_info = COMPLETE_SERIES_INFO.get(series.name)
            
            if series_info:
                print(f"\n📚 Updating {series.name}:")
                print(f"   Current total_books: {series.total_books}")
                print(f"   Actual total volumes: {series_info['total_volumes']}")
                
                # Update series total_books and status
                series.total_books = series_info['total_volumes']
                series.status = series_info['status']
                session.add(series)
                
                # Get existing volumes
                statement = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
                existing_volumes = session.exec(statement).all()
                existing_positions = {vol.position for vol in existing_volumes}
                
                print(f"   Existing volumes: {sorted(existing_positions)}")
                
                # Add missing volumes
                added_volumes = 0
                for vol_num in range(1, series_info['total_volumes'] + 1):
                    if vol_num not in existing_positions:
                        # Create missing volume
                        volume = SeriesVolume(
                            series_id=series.id,
                            position=vol_num,
                            title=f"{series.name}, Vol. {vol_num}",
                            status="missing",  # Mark as missing since user doesn't own it
                            user_id=1
                        )
                        session.add(volume)
                        added_volumes += 1
                
                print(f"   Added {added_volumes} missing volumes")
                updated_count += 1
            else:
                print(f"⚠️  No complete info available for '{series.name}' - keeping current data")
        
        session.commit()
        print(f"\n✅ Updated {updated_count} series with complete volume information")

def show_series_stats():
    """Show updated series statistics"""
    print("\n📊 Updated Series Statistics:")
    
    with get_session() as session:
        statement = select(Series)
        all_series = session.exec(statement).all()
        
        for series in all_series:
            statement = select(SeriesVolume).where(SeriesVolume.series_id == series.id)
            volumes = session.exec(statement).all()
            
            owned = len([v for v in volumes if v.status == "owned"])
            total = len(volumes)
            percentage = round((owned / total) * 100) if total > 0 else 0
            
            print(f"   {series.name}: {owned}/{total} volumes ({percentage}%) - {series.status}")

if __name__ == "__main__":
    complete_series_volumes()
    show_series_stats()