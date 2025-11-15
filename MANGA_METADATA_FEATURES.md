# 🌍 Manga-Specific Metadata Features

**Status**: ✅ Implementation Complete

This document describes the comprehensive manga-specific metadata features added to BookTarr, enabling support for manga, light novels, manhwa, manhua, web novels, and other Asian reading content.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Schema Extensions](#database-schema-extensions)
3. [API Endpoints](#api-endpoints)
4. [Services](#services)
5. [Frontend Integration](#frontend-integration)
6. [Usage Examples](#usage-examples)

---

## Overview

### Features Implemented

#### 1. ✅ Format Distinction
- **Types Supported**: Manga, Light Novels, Manhwa, Manhua, Web Novels, Traditional Novels, Graphic Novels
- **Icons & Labels**: Each format has associated icons (📖 for manga, 📚 for light novels, 🇰🇷 for manhwa, etc.) for UI display
- **Field**: `Book.book_type`

#### 2. ✅ Original Title Display
- **Feature**: Show Japanese/original language titles alongside English translations
- **Implementation**:
  - `Book.original_title` - Original title in native language
  - `Book.original_language` - Language code (ja, ko, zh, en, etc.)
- **AniList Integration**: Automatically extracts native Japanese titles from AniList API

#### 3. ✅ Translation Status Tracking
- **Statuses**: Official Translation, Fan Translation, Scanlation
- **Fields**:
  - `Edition.translation_status` - Status type
  - `Edition.translator` - Name(s) of translator(s)
  - `Edition.language` - Language of this edition
- **Display**: API provides human-readable labels for each status

#### 4. ✅ Author/Artist Separation
- **Model**: New `Creator` table with role-based tracking
- **Roles Supported**:
  - Author
  - Artist
  - Mangaka (manga author-artist)
  - Illustrator
  - Translator
  - Adapter
  - Original Creator
- **Benefits**:
  - Separate tracking for manga adaptations (different artists)
  - Translator credit tracking for localized editions
  - Multiple creators per book with specific roles

#### 5. ✅ Serialization Information
- **Model**: New `Serialization` table
- **Data Tracked**:
  - Magazine name (e.g., "Weekly Shonen Jump")
  - Serialization start and end dates
  - Region/Country of publication
  - Publication notes
- **Use Cases**: Identify where manga was originally serialized

#### 6. ✅ Additional Format Details
- **Color/B&W**: `Edition.is_color` - Whether manga is in color or black & white
- **Chapter Count**: `Edition.chapter_count` - Number of chapters in an edition
- **Format Variant**: `Edition.format_variant` - Edition type (deluxe hardcover, box set, omnibus, limited edition, etc.)
- **Current Edition Flag**: `Edition.is_current_edition` - Whether this is the latest/preferred edition

#### 7. ✅ Series-Level Metadata
- **Series Type**: `Series.series_type` - manga_series, light_novel_series, book_series, comic_series, web_series, etc.
- **Original Language**: `Series.original_language` - Language code
- **Year Started**: `Series.year_started` - Year series began publication
- **AniList ID**: `Series.anilist_id` - AniList database reference

---

## Database Schema Extensions

### New Tables

#### Creator Table
```python
class Creator(SQLModel, table=True):
    id: Optional[int] = PK
    book_id: int = FK("book.id")
    name: str
    role: str  # author, artist, mangaka, illustrator, translator, etc.
    language: Optional[str]  # Language they're credited in
    notes: Optional[str]  # Additional context

    book: Book = Relationship
```

#### Serialization Table
```python
class Serialization(SQLModel, table=True):
    id: Optional[int] = PK
    series_id: int = FK("series.id")
    magazine_name: str
    start_date: Optional[date]
    end_date: Optional[date]
    region: Optional[str]  # Country/region
    notes: Optional[str]

    series: Series = Relationship
```

### Extended Fields

#### Book Model Extensions
```python
book_type: Optional[str]  # manga, light_novel, manhwa, manhua, web_novel, etc.
original_title: Optional[str]  # Original title in native language
original_language: Optional[str]  # Language code: ja, ko, zh, en, etc.
anilist_id: Optional[int]  # AniList database ID
creators: List[Creator] = Relationship  # Role-based creators
```

#### Edition Model Extensions
```python
page_count: Optional[int]  # Page count for this edition
language: Optional[str]  # Language of this edition
translation_status: Optional[str]  # official, fan_translation, scanlation
translator: Optional[str]  # Translator name(s)
is_color: Optional[bool]  # Whether manga is in color
chapter_count: Optional[int]  # Number of chapters
format_variant: Optional[str]  # Deluxe edition, box set, omnibus, etc.
is_current_edition: Optional[bool]  # Latest/preferred edition flag
```

#### Series Model Extensions
```python
series_type: Optional[str]  # manga_series, light_novel_series, book_series, etc.
original_language: Optional[str]  # Language code
year_started: Optional[int]  # Year series began
anilist_id: Optional[int]  # AniList reference
serializations: List[Serialization] = Relationship
```

#### SeriesVolume Model Extensions
```python
chapter_count: Optional[int]  # Chapters in this volume
is_color: Optional[bool]  # Color or B&W
```

---

## API Endpoints

### Manga Format Information

#### Get Available Formats
```
GET /api/manga/formats
```
Returns list of supported book formats with icons and labels:
```json
{
  "formats": [
    {
      "type": "manga",
      "label": "Manga",
      "icon": "📖"
    },
    {
      "type": "light_novel",
      "label": "Light Novel",
      "icon": "📚"
    },
    ...
  ]
}
```

#### Get Available Translation Statuses
```
GET /api/manga/translation-statuses
```
Returns supported translation statuses with labels.

### Book Manga Metadata

#### Get Book Manga Metadata
```
GET /api/manga/books/{book_id}/metadata
```
Returns comprehensive manga metadata for a book including:
- Original title and language
- Book type with icon and label
- Creator information with roles
- AniList ID

#### Update Book Manga Metadata
```
PUT /api/manga/books/{book_id}/metadata
```
Query Parameters:
- `book_type`: Manga format type
- `original_title`: Original title in native language
- `original_language`: Language code
- `anilist_id`: AniList database ID

### Edition Translation Metadata

#### Get Edition Translation Status
```
GET /api/manga/editions/{edition_id}/translation-status
```
Returns:
- Language of edition
- Translation status (official/fan/scanlation) with label
- Translator name(s)
- Color/B&W flag
- Chapter and page counts
- Format variant
- Current edition flag

#### Update Edition Translation Status
```
PUT /api/manga/editions/{edition_id}/translation-status
```
Query Parameters:
- `language`: Edition language
- `translation_status`: official, fan_translation, or scanlation
- `translator`: Translator name(s)
- `is_color`: Whether in color (true/false)
- `chapter_count`: Number of chapters
- `format_variant`: Edition variant description
- `is_current_edition`: Whether latest edition (true/false)

---

## Services

### MangaMetadataService
Location: `backend/services/manga_metadata_service.py`

**Key Methods**:
- `get_book_format_icon(book_type)` - Returns UI icon for format
- `get_book_format_label(book_type)` - Returns human-readable label
- `get_translation_status_label(status)` - Returns human-readable status label
- `add_serialization()` - Add magazine serialization info
- `get_serializations()` - Retrieve serialization info
- `update_book_manga_metadata()` - Update book-level manga data
- `update_edition_manga_metadata()` - Update edition-level manga data
- `format_book_with_metadata()` - Format book data for API responses

**Constants**:
- `BOOK_TYPES` - List of supported formats
- `TRANSLATION_STATUSES` - List of valid translation statuses

### CreatorService
Location: `backend/services/creator_service.py`

**Key Methods**:
- `add_creator()` - Add creator with role to book
- `get_creators_by_book()` - Get all creators for a book
- `get_creators_by_role()` - Get creators filtered by role
- `get_authors()` - Get list of author names
- `get_artists()` - Get list of artist names
- `get_translators()` - Get list of translators with language info
- `update_book_creators()` - Replace all creators for a book

### Enhanced AniList Client
Location: `backend/clients/anilist.py`

**New Capabilities**:
- Extracts native Japanese titles from AniList data
- Separates author/artist/mangaka roles from staff data
- Detects book type (manga, light novel, manhwa, manhua, web novel) from metadata
- Returns structured creator information with roles
- Provides year started for series

---

## Frontend Integration

### Frontend Components to Update

The following frontend components should be updated to display manga metadata:

1. **Book Card** (`BookCard.tsx`)
   - Display book format icon next to title
   - Show original title if available (hover tooltip)
   - Add translation status badge for manga volumes

2. **Book Details Page** (`BookDetailsPage.tsx`)
   - Display full manga metadata section
   - Show original title with language flag
   - Creator list with roles (author, artist, translator, etc.)
   - Edition variant and color information
   - Serialization information if available

3. **Series Details Page** (`SeriesDetailsPage.tsx`)
   - Display series type (manga series, light novel series, etc.)
   - Show original Japanese title for series
   - Volume-level format information (color/B&W)
   - Magazine serialization info

4. **Book Add/Edit Dialog** (`AddBookDialog.tsx`)
   - Add fields for manga metadata
   - Dropdown selector for book format
   - Original title input field
   - Creator role management UI

### Frontend Types to Update

```typescript
interface BookMetadata {
  book_type?: string;
  book_type_label?: string;
  book_type_icon?: string;
  original_title?: string;
  original_language?: string;
  anilist_id?: number;
  creators?: CreatorInfo[];
}

interface Creator {
  id?: number;
  name: string;
  role: string; // author, artist, mangaka, illustrator, translator, adapter
  language?: string;
  notes?: string;
}

interface EditionMetadata {
  language?: string;
  translation_status?: string;
  translation_status_label?: string;
  translator?: string;
  is_color?: boolean;
  chapter_count?: number;
  format_variant?: string;
  is_current_edition?: boolean;
}
```

---

## Usage Examples

### Python - Add Manga Book with Full Metadata

```python
from backend.models import Book, Creator, Edition
from backend.services.manga_metadata_service import MangaMetadataService
from backend.services.creator_service import CreatorService

# Create book with manga metadata
book = Book(
    title="Jujutsu Kaisen",
    original_title="呪術廻戦",  # Japanese title
    authors='["Gege Akutami"]',
    book_type="manga",
    original_language="ja",
    anilist_id=119911
)

# Add creators with roles
CreatorService.add_creator(
    book.id,
    "Gege Akutami",
    "mangaka"  # Author who also drew it
)

# Create edition with translation info
edition = Edition(
    book_id=book.id,
    isbn_13="9781974702671",
    language="en",
    translation_status="official",  # Official English translation
    translator="John Werry",
    is_color=False,  # Black and white
    chapter_count=70,
    format_variant="paperback",
    page_count=192
)

# Access format information
icon = MangaMetadataService.get_book_format_icon("manga")  # Returns "📖"
label = MangaMetadataService.get_book_format_label("manga")  # Returns "Manga"
trans_label = MangaMetadataService.get_translation_status_label("official")  # Returns "Official Translation"
```

### API - Get Book with Manga Metadata

```bash
# Get manga metadata for book
curl http://localhost:8000/api/manga/books/1/metadata

# Response:
{
  "id": 1,
  "title": "Jujutsu Kaisen",
  "original_title": "呪術廻戦",
  "book_type": "manga",
  "book_type_label": "Manga",
  "book_type_icon": "📖",
  "original_language": "ja",
  "anilist_id": 119911,
  "creators": [
    {
      "id": 1,
      "name": "Gege Akutami",
      "role": "mangaka",
      "language": null,
      "notes": null
    }
  ]
}
```

### API - Update Edition Translation Info

```bash
# Update edition with translation metadata
curl -X PUT http://localhost:8000/api/manga/editions/1/translation-status \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en",
    "translation_status": "official",
    "translator": "John Werry",
    "is_color": false,
    "chapter_count": 70,
    "format_variant": "paperback"
  }'

# Response:
{
  "id": 1,
  "isbn_13": "9781974702671",
  "language": "en",
  "translation_status": "official",
  "translation_status_label": "Official Translation",
  "translator": "John Werry",
  "is_color": false,
  "chapter_count": 70,
  "format_variant": "paperback",
  "is_current_edition": true,
  "page_count": 192,
  "message": "Edition translation status updated successfully"
}
```

---

## Integration with Existing Features

### CSV Import
- CSV import can now populate manga metadata fields
- Format detection from CSV "Format" column
- Original language detection from content

### AniList Integration
- Automatically enriches manga metadata from AniList
- Extracts native titles, creators, serialization info
- Detects book type based on AniList content

### Series Management
- Series metadata includes type and original language
- Serialization information linked to series
- Volume-level format metadata

---

## Future Enhancements

Potential additions to expand manga support:

1. **Anime Adaptations**: Track linked anime adaptations
2. **Reading Direction**: Mark RTL (right-to-left) vs LTR content
3. **Age Rating**: Content rating system (all ages, teen, mature)
4. **Alternative Titles**: Support multiple translated titles
5. **Publisher Variants**: Track different publishers per region
6. **Spinoffs/Prequels**: Link related series
7. **Webtoon Support**: Enhanced support for vertical scroll webtoons

---

## Technical Details

### Database Migrations

No migrations are required as new fields are added via SQLAlchemy/SQLModel relationships. The database will automatically create new tables on first run.

### API Validation

All endpoints validate input:
- Book types must be in `MangaMetadataService.BOOK_TYPES`
- Translation statuses must be in `MangaMetadataService.TRANSLATION_STATUSES`
- Invalid inputs return 400 Bad Request with descriptive messages

### Performance

- Creator relationships are lazy-loaded by default
- Serialization info is only fetched when requested
- API endpoints support efficient filtering and pagination

---

## Support & Questions

For implementation questions or feature requests, refer to:
- CLAUDE.md - Project overview and architecture
- TASKLIST.md - Development progress tracking
- CODEBASE_EXPLORATION.md - Detailed codebase structure
