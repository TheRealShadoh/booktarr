#!/usr/bin/env python3
"""
Simple demo of CSV parsing without full backend imports
"""
import csv
import json
from typing import Dict, Any, Optional, List
from datetime import datetime

def parse_handylib_row(row: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Parse a single row from HandyLib CSV into our book format."""
    title = row.get("Title", "").strip()
    if not title:
        return None
    
    # Parse authors - HandyLib uses semicolon separated authors
    authors_str = row.get("Author", "").strip()
    authors = []
    if authors_str:
        # Split by semicolon and clean up
        authors = [author.strip() for author in authors_str.split(";") if author.strip()]
    
    # Parse series and volume
    series_name = row.get("Series", "").strip() or None
    series_position = None
    volume_str = row.get("Volume", "").strip()
    if volume_str and volume_str.isdigit():
        series_position = int(volume_str)
    
    # Parse date
    published_date = None
    date_str = row.get("Published Date", "").strip()
    if date_str:
        try:
            # Try to parse various date formats
            for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%Y"]:
                try:
                    parsed_date = datetime.strptime(date_str, fmt)
                    published_date = parsed_date.date().isoformat()
                    break
                except ValueError:
                    continue
        except:
            pass
    
    # Parse price
    price = None
    price_str = row.get("Price", "").strip()
    if price_str:
        try:
            # Remove currency symbols and parse
            price_clean = price_str.replace("$", "").replace(",", "")
            price = float(price_clean)
        except ValueError:
            pass
    
    # Parse rating
    rating = None
    rating_str = row.get("Rating", "").strip()
    if rating_str:
        try:
            rating = float(rating_str)
        except ValueError:
            pass
    
    # Determine ownership status based on HandyLib fields
    status = "missing"  # default
    read_status = row.get("Read", "").strip().lower()
    if read_status in ["true", "1", "yes"]:
        status = "own"  # If they've read it, they likely own it
    
    # Map HandyLib format to our format
    format_mapping = {
        "paperback": "paperback",
        "hardcover": "hardcover", 
        "ebook": "ebook",
        "audiobook": "audiobook",
        "kindle": "ebook",
        "digital": "ebook"
    }
    book_format = format_mapping.get(row.get("Format", "").lower().strip(), row.get("Format", "").strip())
    
    book_data = {
        "title": title,
        "authors": authors,
        "series_name": series_name,
        "series_position": series_position,
        "isbn_13": row.get("ISBN", "").strip() or None,
        "publisher": row.get("Publisher", "").strip() or None,
        "release_date": published_date,
        "cover_url": row.get("Image Url", "").strip() or None,
        "price": price,
        "format": book_format,
        "source": "handylib_import",
        "summary": row.get("Summary", "").strip() or None,
        "rating": rating,
        "status": status,
        "notes": row.get("Comments", "").strip() or None,
        "tags": row.get("Tags", "").strip() or None,
        "pages": row.get("Pages", "").strip() or None,
        "started_reading": row.get("Started Reading Date", "").strip() or None,
        "finished_reading": row.get("Finished Reading Date", "").strip() or None,
        "favorite": row.get("Favorite", "").strip().lower() in ["true", "1", "yes"]
    }
    
    return book_data

def demo_csv_parsing():
    """Demo the CSV parsing functionality"""
    csv_file_path = "sample_data/HandyLib.csv"
    
    print("BookTarr HandyLib CSV Parser Demo")
    print("=" * 50)
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            # Show headers
            print(f"CSV Headers found: {list(csv_reader.fieldnames)[:10]}...")  # Show first 10 headers
            print()
            
            # Parse and show first few rows
            for i, row in enumerate(csv_reader):
                if i >= 5:  # Only process first 5 rows for demo
                    break
                
                print(f"Row {i + 2}:")  # +2 because row 1 is headers
                
                # Show original data
                print("  Original CSV data:")
                print(f"    Title: {row.get('Title', '')}")
                print(f"    Author: {row.get('Author', '')}")
                print(f"    Series: {row.get('Series', '')} Vol. {row.get('Volume', '')}")
                print(f"    ISBN: {row.get('ISBN', '')}")
                print(f"    Format: {row.get('Format', '')}")
                print(f"    Price: {row.get('Price', '')}")
                print(f"    Rating: {row.get('Rating', '')}")
                
                # Parse the row
                parsed_data = parse_handylib_row(row)
                
                print("  Parsed book data:")
                if parsed_data:
                    print(f"    Title: {parsed_data['title']}")
                    print(f"    Authors: {parsed_data['authors']}")
                    if parsed_data['series_name']:
                        series_info = f"{parsed_data['series_name']}"
                        if parsed_data['series_position']:
                            series_info += f" #{parsed_data['series_position']}"
                        print(f"    Series: {series_info}")
                    print(f"    ISBN-13: {parsed_data['isbn_13']}")
                    print(f"    Format: {parsed_data['format']}")
                    print(f"    Price: ${parsed_data['price']}" if parsed_data['price'] else "    Price: None")
                    print(f"    Rating: {parsed_data['rating']}/5" if parsed_data['rating'] else "    Rating: None")
                    print(f"    Status: {parsed_data['status']}")
                else:
                    print("    Failed to parse row")
                
                print()
            
            # Count total rows
            file.seek(0)  # Reset file pointer
            total_rows = sum(1 for _ in csv_reader) - 1  # -1 for header row
            print(f"Total books in CSV: {total_rows}")
            
    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_file_path}")
        print("Make sure you have placed the HandyLib.csv file in the sample_data folder.")
    except Exception as e:
        print(f"Error reading CSV: {e}")

if __name__ == "__main__":
    demo_csv_parsing()