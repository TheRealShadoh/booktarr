# BookTarr Codebase Structure & Metadata Field Inventory

## Overview
BookTarr is a comprehensive book collection management system with:
- **Backend**: Python FastAPI + SQLModel (SQLite database)
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **External APIs**: Google Books, OpenLibrary, AniList (manga-focused)
- **Data Flow**: Local-first caching with external API enrichment

---

## 1. DATABASE MODELS & METADATA FIELDS

### Core Models (backend/models/)

#### **Book Model** (`models/book.py`)
```python
class Book(SQLModel, table=True):
    id: Optional[int] = PK
    title: str
    authors: str  # JSON serialized list
    series_name: Optional[str]
    series_position: Optional[int]
    openlibrary_id: Optional[str]
    google_books_id: Optional[str]
    
    # Relationships
    editions: List[Edition]  # One-to-many relationship
```

**Current Metadata Tracked:**
- Basic: title, authors (JSON array), series name/position
- External IDs: OpenLibrary ID, Google Books ID
- No current fields for: language, book_type, original_title, translator, artist/mangaka

#### **Edition Model** (`models/book.py`)
```python
class Edition(SQLModel, table=True):
    id: Optional[int] = PK
    isbn_10: Optional[str]
    isbn_13: Optional[str]
    book_id: int = FK
    book_format: Optional[str]  # hardcover, paperback, ebook, audiobook
    publisher: Optional[str]
    release_date: Optional[date]
    cover_url: Optional[str]
    price: Optional[float]
    source: Optional[str]  # openlibrary, google, amazon, etc.
    
    # Relationships
    book: Book
    user_statuses: List[UserEditionStatus]
    reading_progress: List[ReadingProgress]
```

**Current Metadata Tracked:**
- ISBN (10 & 13)
- Format: hardcover, paperback, ebook, audiobook
- Publication details: publisher, release_date
- Media: cover_url, price
- Source attribution: source
- No current fields for: pages, language, original_language, book_type

#### **Series Model** (`models/series.py`)
```python
class Series(SQLModel, table=True):
    id: Optional[int] = PK
    name: str (indexed)
    description: Optional[str]
    total_books: Optional[int]
    author: Optional[str]
    publisher: Optional[str]
    first_published: Optional[date]
    last_published: Optional[date]
    status: Optional[str]  # ongoing, completed, hiatus, etc.
    genres: Optional[str]  # JSON serialized list
    tags: Optional[str]  # JSON serialized list
    goodreads_id: Optional[str]
    openlibrary_id: Optional[str]
    google_books_id: Optional[str]
    cover_url: Optional[str]
    created_date: date
    last_updated: date
    
    # Relationships
    volumes: List[SeriesVolume]
```

**Current Metadata Tracked:**
- Series meta: name, description, total_books, author, publisher
- Publication dates: first_published, last_published
- Status: ongoing, completed, hiatus, etc.
- Categories: genres (JSON), tags (JSON)
- External IDs: Goodreads, OpenLibrary, Google Books
- No current fields for: book_type (manga, light_novel, etc.), original_language, year_started

#### **SeriesVolume Model** (`models/series.py`)
```python
class SeriesVolume(SQLModel, table=True):
    id: Optional[int] = PK
    series_id: int = FK
    position: int  # Book number
    title: str
    subtitle: Optional[str]
    isbn_10: Optional[str]
    isbn_13: Optional[str]
    publisher: Optional[str]
    published_date: Optional[date]
    page_count: Optional[int]
    description: Optional[str]
    cover_url: Optional[str]
    goodreads_id: Optional[str]
    openlibrary_id: Optional[str]
    google_books_id: Optional[str]
    
    # Ownership tracking
    user_id: int = 1  # Default
    status: str  # owned, wanted, missing
    owned_edition_id: Optional[int]
    notes: Optional[str]
    date_acquired: Optional[date]
    
    # Relationships
    series: Series
```

**Current Metadata Tracked:**
- Volume meta: position, title, subtitle
- ISBN (10 & 13), page_count
- Publication: publisher, published_date
- Description and cover
- External IDs: Goodreads, OpenLibrary, Google Books
- No current fields for: format, language, isbn_variants, chapters

#### **ReadingProgress Model** (`models/reading_progress.py`)
```python
class ReadingProgress(SQLModel, table=True):
    id: Optional[int] = PK
    user_id: int = 1  # Default
    edition_id: int = FK
    status: str  # want_to_read, currently_reading, finished
    current_page: Optional[int]
    total_pages: Optional[int]
    progress_percentage: Optional[float]
    start_date: Optional[datetime]
    finish_date: Optional[datetime]
    rating: Optional[int]  # 1-5 stars
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # Relationships
    edition: Edition
```

**Current Metadata Tracked:**
- Reading status, current page, total pages, progress %
- Dates: start, finish, created, updated
- Rating (1-5 stars), notes
- No current fields for: mood, session tracking, chapter notes

---

## 2. EXTERNAL API CLIENTS & METADATA EXTRACTION

### Google Books Client (`clients/google_books.py`)

**Search Methods:**
- `search_by_isbn(isbn)` → Returns single book
- `search_by_title(title, author?)` → Returns list of books
- `search_by_author(author)` → Returns list of books

**Extracted Metadata:**
```
{
  "google_books_id": str,
  "title": str,
  "authors": str[],
  "publisher": str,
  "isbn_10": str,
  "isbn_13": str,
  "release_date": date (ISO format),
  "page_count": int,
  "categories": str[],  # e.g., ["Fiction", "Science Fiction"]
  "description": str,
  "cover_url": str,
  "price": float,
  "format": str,  # from printType field
  "source": "google_books",
  "series_name": str (extracted via regex patterns),
  "series_position": int (extracted via regex patterns)
}
```

**Series Detection:** Uses regex patterns on title/subtitle/description:
- "Series Name, Vol. X"
- "Series Name #X"
- "Series Name (Book X)"
- Volume patterns in subtitles
- Manga/light novel patterns

### OpenLibrary Client (`clients/openlibrary.py`)

**Search Methods:**
- `search_by_isbn(isbn)` → Returns single book
- `search_by_title(title, author?)` → Returns list of books
- `search_by_author(author)` → Returns list of books
- `get_editions(work_key)` → Returns editions for a work

**Extracted Metadata:**
```
{
  "openlibrary_id": str,
  "title": str,
  "authors": str[],  # Keys, not names
  "publisher": str,
  "isbn_10": str,
  "isbn_13": str,
  "release_date": date (ISO format),
  "page_count": int,
  "cover_url": str,
  "format": str,  # from physical_format field
  "source": "openlibrary"
}
```

### AniList Client (`clients/anilist.py`)

**Search Methods:**
- `search_manga_series(series_name, author?)` → GraphQL query for MANGA type
- `get_manga_volumes(series_name, total_volumes)` → Generates volume list

**Extracted Metadata:**
```
{
  "name": str,
  "author": str,  # From staff edges (Story/Story & Art/Original Creator)
  "description": str,
  "total_volumes": int,
  "total_chapters": int,
  "status": str,  # ongoing, completed, etc.
  "genres": str[],
  "tags": str[],  # High-rank tags (rank > 50)
  "first_published": date,
  "last_published": date,
  "cover_url": str,
  "anilist_id": int
}
```

**Features:**
- Normalizes series names for better matching
- Has hardcoded volume data for popular series (Bleach, etc.)
- Generates volume lists with estimated page counts (200 pages/volume average)

---

## 3. CSV IMPORT SERVICE & DATA MAPPING

### HandyLib CSV Format Support (`services/csv_import.py`)

**Parsed CSV Columns:**
- Title, Author, Publisher, Published Date, Format, Pages
- Series, Volume, Language, ISBN
- Page Read, Item Url, Icon Path, Photo Path, Image Url
- Summary, Location, Price, Genres, Rating
- Added Date, Copy Index, Read, Started Reading Date, Finished Reading Date
- Favorite, Comments, Tags, BookShelf, Settings

**Data Extraction:**
```python
{
  "title": str,
  "authors": str[],  # Split by semicolon
  "series_name": str,
  "series_position": int,
  "isbn_13": str,
  "publisher": str,
  "release_date": date (ISO),
  "cover_url": str,
  "price": float,
  "format": str,  # Maps: paperback, hardcover, ebook, audiobook, kindle → ebook, digital → ebook
  "source": "handylib_import",
  "summary": str,
  "rating": float,
  "status": str,  # own (default for imported books)
  "notes": str,  # From Comments column
  "tags": str,
  "pages": int,
  "started_reading": date,
  "finished_reading": date,
  "favorite": bool
}
```

**Processing Flow:**
1. Parse CSV row
2. Check if book exists by ISBN or title+author
3. Create/update Book and Edition records
4. Create UserEditionStatus entry
5. Auto-detect and enrich series information (via EnhancedSeriesDetectionService)

---

## 4. FRONTEND TYPE DEFINITIONS & DISPLAY

### Book Type (`frontend/src/types/index.ts`)
```typescript
interface Book {
  // Core
  isbn: string;
  title: string;
  authors: string[];
  series?: string;
  series_position?: number;
  
  // Edition details
  publisher?: string;
  published_date?: string;
  page_count?: number;
  language: string;
  
  // Media
  thumbnail_url?: string;
  cover_url?: string;
  description?: string;
  
  // Categorization
  categories: string[];
  
  // Pricing (array of prices from different sources)
  pricing: PriceInfo[];
  metadata_source: MetadataSource;
  
  // Metadata enhancement tracking
  metadata_enhanced?: boolean;
  metadata_enhanced_date?: string;
  metadata_sources_used?: string[];
  
  // Reading progress & status
  reading_status: ReadingStatus;
  reading_progress_pages?: number;
  reading_progress_percentage?: number;
  date_started?: string;
  date_finished?: string;
  personal_rating?: number;  // 1-5 stars
  personal_notes?: string;
  times_read: number;
  
  // Admin
  added_date: string;
  last_updated: string;
}

enum ReadingStatus {
  UNREAD = 'unread',
  READING = 'reading',
  READ = 'read',
  WISHLIST = 'wishlist',
  DNF = 'dnf',
  WANT_TO_READ = 'want_to_read'
}
```

### Series Type
```typescript
interface Series {
  id: number;
  name: string;
  description?: string;
  total_books?: number;
  author?: string;
  publisher?: string;
  first_published?: string;
  last_published?: string;
  status?: string;
  genres: string[];
  tags: string[];
  cover_url?: string;
  created_date: string;
  last_updated: string;
}

interface SeriesVolume {
  position: number;
  title: string;
  subtitle?: string;
  isbn_13?: string;
  isbn_10?: string;
  publisher?: string;
  published_date?: string;
  page_count?: number;
  description?: string;
  cover_url?: string;
  status: 'owned' | 'wanted' | 'missing';
  notes?: string;
  date_acquired?: string;
  owned_book?: {
    id: number;
    title: string;
    authors: string[];
    isbn?: string;
  };
}
```

### UI Display Components
- **BookCard.tsx**: Displays title, authors, reading status, published year, series info (with position), page count
- **SeriesDetailsPage.tsx**: Shows series metadata, volumes with filtering/sorting, completion ratios
- **BookDetailsPage.tsx**: Comprehensive view with editions, reading progress, quotes, stats

---

## 5. METADATA ENRICHMENT FLOW

### Services for Metadata Enhancement

**Book Search Service** (`services/book_search.py`):
- Searches local database first
- Falls back to external APIs (Google Books → OpenLibrary)
- Caches results in JsonCache

**Series Metadata Service** (`services/series_metadata.py`):
1. Checks local database for cached series
2. Validates metadata freshness
3. Fetches from external APIs if needed:
   - Enhanced patterns (hardcoded for known series)
   - AniList (for likely manga)
   - Google Books (for all series types)
   - Falls back to AniList even for non-manga
4. Creates basic data from owned books if all else fails
5. Updates database with fetched information

**Enhanced Series Detection** (`services/enhanced_series_detection.py`):
- Auto-detects series from book metadata
- Populates missing series information
- Syncs series volumes with book ownership

**Volume Sync Service** (`services/volume_sync_service.py`):
- Synchronizes series volumes with actual book ownership
- Ensures completion percentages are accurate
- Reconciles discrepancies

---

## 6. API ROUTES FOR METADATA

### Key Endpoints
- `GET /api/books` - List all books
- `GET /api/books/{isbn}/metadata-sources` - Get available metadata sources for a book
- `POST /api/books` - Add new book with metadata enrichment
- `PUT /api/{book_id}/metadata` - Update book metadata
- `PUT /api/{book_id}/editions/{edition_id}/metadata` - Update edition metadata
- `POST /api/books/{book_id}/apply-metadata` - Apply selected metadata from search results

### CSV Import
- `POST /api/books/import` - Import CSV file with enrich_metadata parameter

---

## 7. CURRENTLY UNSUPPORTED METADATA

The following metadata fields are NOT currently tracked but might be useful for manga/light novels:

### Book-Level Fields
- **book_type**: manga, light_novel, graphic_novel, comic, traditional_novel, etc.
- **language**: Original language (Japanese for manga, English for novels, etc.)
- **original_title**: Original title in native language
- **original_language**: Language of original publication
- **translator**: Name of translator (for translated works)
- **artist/mangaka**: Artist for manga/graphic novels (separate from author)
- **illustrator**: For light novels with illustrations
- **chapter_count**: For manga/light novels
- **color**: Whether manga is in color or black & white

### Edition-Level Fields
- **language_variant**: Language of this specific edition
- **translator_variant**: Translator for this edition (may differ from canonical translator)
- **format_variant**: Specific format (e.g., "Deluxe Hardcover", "Box Set", "Omnibus")
- **pages**: Already partially supported via SeriesVolume.page_count, but not on Edition

### Series-Level Fields
- **series_type**: manga_series, light_novel_series, book_series, comic_series, etc.
- **original_language**: Original language of the series
- **year_started**: Year series began publication
- **is_complete**: Boolean flag for completion status
- **average_volume_count**: Estimated volume count for ongoing series
- **spinoffs**: Related series (prequels, sequels, spin-offs)

### Volume/Edition-Level Fields
- **release_type**: standard_release, limited_edition, special_edition, reprint, etc.
- **is_current_edition**: Whether this is the latest/preferred edition
- **printings**: Edition printings and availability
- **availability**: in_stock, out_of_stock, coming_soon, discontinued

### Cross-Metadata Relationship
- **alternate_titles**: Array of alternative titles in different languages
- **adaptation_metadata**: Links to anime adaptations, live-action versions, etc.

---

## 8. API RESPONSE STRUCTURES

### Metadata Extraction Pattern
All external API clients follow pattern:
1. Search → returns Dict with extracted fields
2. Parse response → normalize to internal format
3. Cache locally → store in database
4. Return to frontend → JSON response

### Data Flow
```
Frontend (React) 
  ↓ (request with ISBN/title/author)
Backend Routes (FastAPI)
  ↓ (call service)
Metadata Services (local-first)
  ↓ (check cache, then external APIs)
External APIs (Google Books, OpenLibrary, AniList)
  ↓ (parse response)
Database (SQLite/SQLModel)
  ↓ (cache metadata)
Frontend (React)
  ↓ (display cached data)
```

---

## 9. CURRENT METADATA QUALITY & LIMITATIONS

### Strengths
✓ Local-first caching reduces API calls
✓ Multiple API sources with fallbacks
✓ Series detection with comprehensive regex patterns
✓ Page count tracking
✓ Format tracking (physical formats only)
✓ Reading progress tracking
✓ CSV import with metadata enrichment

### Gaps for Manga Support
✗ No book_type field (manga vs. light_novel vs. traditional novel)
✗ No language/original_language fields
✗ No artist/mangaka distinction from authors
✗ Limited format support (no "manga" or "light novel" explicit type)
✗ No translator tracking
✗ No chapter/volume distinction clarity
✗ No alternate title support for different translations
✗ AniList integration limited to known series and hardcoded volume data

### Database Constraints
- Authors stored as JSON string, not normalized table (makes author queries difficult)
- No separate table for translators or artists
- No foreign key enforcement for some relationships (e.g., owned_edition_id on SeriesVolume)
- Language field in frontend types but not in database models

---

## 10. KEY FILES REFERENCE

### Backend Structure
```
/backend/
├── models/
│   ├── book.py (Book, Edition, UserEditionStatus)
│   ├── series.py (Series, SeriesVolume)
│   └── reading_progress.py (ReadingProgress, ReadingStats)
├── clients/
│   ├── google_books.py (GoogleBooksClient)
│   ├── openlibrary.py (OpenLibraryClient)
│   ├── anilist.py (AniListClient)
│   └── amazon.py (AmazonClient)
├── services/
│   ├── book_search.py (BookSearchService)
│   ├── series_metadata.py (SeriesMetadataService)
│   ├── csv_import.py (CSVImportService)
│   ├── enhanced_series_detection.py (EnhancedSeriesDetectionService)
│   ├── volume_sync_service.py (VolumeSyncService)
│   └── metadata_refresh.py (MetadataRefreshService)
└── routes/
    ├── books.py (Book CRUD, search, metadata)
    └── series.py (Series management, volume tracking)
```

### Frontend Structure
```
/frontend/src/
├── types/
│   └── index.ts (All TypeScript interfaces)
└── components/
    ├── BookCard.tsx (Book display)
    ├── BookDetailsPage.tsx (Book detail view)
    ├── SeriesDetailsPage.tsx (Series detail view)
    ├── SeriesCard.tsx (Series display)
    └── SeriesManagement.tsx (Series admin)
```

