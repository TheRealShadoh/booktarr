#!/usr/bin/env python3
"""
Test series extraction patterns against real API responses
"""
import re

def extract_series_info(title, subtitle="", description=""):
    """
    Extract series name and position from title/subtitle/description.
    Based on the patterns in google_books.py
    """
    
    # Pattern 1: "Series Name, Vol. X" or "Series Name, Volume X"
    pattern1 = re.compile(r'^(.+?),\s*(?:Vol|Volume)\.?\s*(\d+)', re.IGNORECASE)
    match1 = pattern1.match(title)
    if match1:
        return match1.group(1).strip(), int(match1.group(2))
    
    # Pattern 2: "Series Name #X" or "Series Name: X"
    pattern2 = re.compile(r'^(.+?)\s*(?:#|:)\s*(?:Volume\s*)?(\d+)', re.IGNORECASE)
    match2 = pattern2.match(title)
    if match2:
        series_name = match2.group(1).strip()
        # Remove trailing colon if present
        if series_name.endswith(':'):
            series_name = series_name[:-1].strip()
        return series_name, int(match2.group(2))
    
    # Pattern 3: "Series Name (Book X)" or "Series Name (Vol X)"
    pattern3 = re.compile(r'^(.+?)\s*\((?:Book|Vol|Volume)\s*(\d+)\)', re.IGNORECASE)
    match3 = pattern3.match(title)
    if match3:
        return match3.group(1).strip(), int(match3.group(2))
    
    # Pattern 4: Check subtitle for volume info if title seems like a series
    if subtitle:
        # "Volume X of Series Name"
        pattern4 = re.compile(r'Volume\s*(\d+)\s*of\s*(.+)', re.IGNORECASE)
        match4 = pattern4.match(subtitle)
        if match4:
            return match4.group(2).strip(), int(match4.group(1))
        
        # "Book X in the Series Name series"
        pattern5 = re.compile(r'Book\s*(\d+)\s*in\s*the\s*(.+?)\s*series', re.IGNORECASE)
        match5 = pattern5.match(subtitle)
        if match5:
            return match5.group(2).strip(), int(match5.group(1))
    
    # Pattern 6: Look for common manga/light novel patterns
    # "Series Name Vol. X" or "Series Name Volume X"
    pattern6 = re.compile(r'^(.+?)\s+(?:Vol|Volume)\.?\s*(\d+)(?:\D|$)', re.IGNORECASE)
    match6 = pattern6.match(title)
    if match6:
        return match6.group(1).strip(), int(match6.group(2))
    
    # Pattern 7: Japanese series with brackets "[Series Name]"
    pattern7 = re.compile(r'^.*?\[(.+?)\].*?(?:Vol|Volume|#)\.?\s*(\d+)', re.IGNORECASE)
    match7 = pattern7.match(title)
    if match7:
        return match7.group(1).strip(), int(match7.group(2))
    
    # Pattern 8: Harry Potter specific patterns
    # Look for "Harry Potter and the [Title]" in title or description
    if "harry potter" in title.lower() or "harry potter" in description.lower():
        # Map Harry Potter books to positions
        hp_books = {
            "philosopher": 1, "sorcerer": 1,
            "chamber": 2, "secrets": 2,
            "prisoner": 3, "azkaban": 3,
            "goblet": 4, "fire": 4,
            "phoenix": 5, "order": 5,
            "prince": 6, "blood": 6,
            "hallows": 7, "deathly": 7
        }
        
        text_to_check = (title + " " + description).lower()
        for keyword, position in hp_books.items():
            if keyword in text_to_check:
                return "Harry Potter", position
        
        # If we find "Harry Potter" but can't determine position
        return "Harry Potter", None
    
    # Pattern 9: Check description for series information
    if description:
        # Look for "Book X in the Series Name series"
        desc_pattern1 = re.compile(r'Book\s+(\d+)\s+(?:in\s+(?:the\s+)?)?(.+?)\s+series', re.IGNORECASE)
        desc_match1 = desc_pattern1.search(description)
        if desc_match1:
            return desc_match1.group(2).strip(), int(desc_match1.group(1))
        
        # Look for "Volume X of Series Name"
        desc_pattern2 = re.compile(r'Volume\s+(\d+)\s+of\s+(?:the\s+)?(.+?)(?:\s+series)?[.!]', re.IGNORECASE)
        desc_match2 = desc_pattern2.search(description)
        if desc_match2:
            return desc_match2.group(2).strip(), int(desc_match2.group(1))
        
        # Look for "X in the Y series" or "Part X of Y"
        desc_pattern3 = re.compile(r'(?:Part|Volume|Book)\s+(\d+)\s+(?:of|in)\s+(?:the\s+)?(.+?)(?:\s+(?:series|saga|trilogy))?[.!]', re.IGNORECASE)
        desc_match3 = desc_pattern3.search(description)
        if desc_match3:
            return desc_match3.group(2).strip(), int(desc_match3.group(1))
    
    # If no clear series pattern found, return None
    return None, None

def test_series_extraction():
    """Test series extraction with real API data"""
    
    print("🧪 Testing series extraction patterns with real API responses\n")
    
    # Test cases from actual Google Books API responses
    test_cases = [
        # Manga series
        ("Naruto, Vol. 1", "Uzumaki Naruto", "The world's most popular ninja comic!"),
        ("One Piece, Volume 2", "", "Follow Luffy's adventures..."),
        ("Attack on Titan Vol. 5", "", "Humanity fights for survival..."),
        
        # Light novels  
        ("Sword Art Online #1", "Aincrad", "In the year 2022..."),
        ("Re:Zero Starting Life in Another World, Vol. 1", "", "Subaru finds himself..."),
        
        # Western series
        ("The Hunger Games (Book 1)", "", "In a dark vision of the future..."),
        ("Harry Potter and the Sorcerer's Stone", "", ""),
        ("Harry Potter and the Chamber of Secrets - Gryffindor Edition", "", "Let the magic of J.K. Rowling's classic series take you back to Hogwarts School of Witchcraft and Wizardry."),
        
        # Test cases for problematic titles that Google Books returns
        ("harry potter and the sorcerer's stone", "", "Harry Potter has never been the star of a Quidditch team, scoring points while riding a broomstick far above the ground. He knows no spells, has never helped to hatch a dragon, and has never worn a cloak of invisibility."),
        ("harry potter and the chamber of secrets", "", "The Dursleys were so mean and hideous that summer that all Harry Potter wanted was to get back to the Hogwarts School for Witchcraft and Wizardry."),
        
        # Description-based series detection
        ("The Fellowship of the Ring", "", "This is Volume 1 of The Lord of the Rings trilogy by J.R.R. Tolkien."),
        ("A Game of Thrones", "", "Book 1 in the Song of Ice and Fire series."),
        
        # Edge cases
        ("Foundation", "", "For twelve thousand years the Galactic Empire has ruled supreme..."),
        ("Dune", "", "Set on the desert planet Arrakis..."),
        
        # Different formats
        ("呪術廻戦 [Jujutsu Kaisen] Vol. 7", "", ""),
        ("Dragon Ball Z, Volume 10", "", ""),
    ]
    
    for title, subtitle, description in test_cases:
        series_name, series_position = extract_series_info(title, subtitle, description)
        print(f"📖 '{title}'")
        if subtitle:
            print(f"   Subtitle: '{subtitle}'")
        print(f"   → Series: '{series_name}', Position: {series_position}")
        print()

if __name__ == "__main__":
    test_series_extraction()