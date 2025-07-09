from pydantic import BaseModel
from typing import List, Optional, Dict

class Book(BaseModel):
    id: str
    title: str
    author: str
    isbn10: Optional[str] = None
    isbn13: Optional[str] = None
    shelves: Optional[List[str]] = None
    series: Optional[str] = None
    series_number: Optional[int] = None
    cover_image: Optional[str] = None
    pricing: Optional[Dict[str, float]] = None
    
class SeriesGroup(BaseModel):
    series_name: str
    books: List[Book]