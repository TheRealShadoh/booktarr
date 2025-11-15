# 🔄 BookTarr Integration Guide

Comprehensive documentation for all data integration features in BookTarr.

## Table of Contents

1. [Overview](#overview)
2. [CSV Import & Export](#csv-importexport)
3. [AniList Integration](#anilist-integration)
4. [MyAnimeList Integration](#myanimelist-integration)
5. [Goodreads Integration](#goodreads-integration)
6. [Amazon/Kindle Integration](#amazonkindle-integration)
7. [API Reference](#api-reference)
8. [Setup Guide](#setup-guide)

---

## Overview

BookTarr supports integration with multiple external services for book metadata, manga information, and reading progress tracking:

| Service | Type | Features | Setup Required |
|---------|------|----------|-----------------|
| **Google Books** | Metadata | Book search, metadata enrichment, covers | ✅ None |
| **OpenLibrary** | Metadata | ISBN lookup, indie books, public domain | ✅ None |
| **CSV** | Import/Export | Bulk import, export to multiple formats | ✅ None |
| **AniList** | Manga Metadata | Manga series, volume info, genres | ✅ None |
| **MyAnimeList** | Manga Metadata | Manga search, ratings, user lists | ⚠️ Optional API key |
| **Goodreads** | Books & Metadata | Ratings, reviews, shelf sync | ⚠️ API key recommended |
| **Amazon/Kindle** | Sync | Kindle library import, reading progress | ⚠️ OAuth setup |

---

## CSV Import/Export

### Features

- **Full Library Backup**: Export entire collection as JSON or CSV
- **Selective Export**: Export specific books, series, or reading lists
- **Format Support**: HandyLib, Goodreads, Hardcover, generic CSV
- **Bulk Import**: Import 100+ books with metadata enrichment
- **Metadata Enrichment**: Auto-fetches missing covers and metadata

### Supported Formats

#### HandyLib CSV Format

```csv
Title,Author,Publisher,Published Date,Format,Pages,Series,Volume,Language,ISBN,...
```

**Import Steps:**
1. Navigate to Settings → Import
2. Select "HandyLib" format
3. Choose CSV file
4. Review column mapping
5. Enable metadata enrichment
6. Start import

#### Goodreads CSV Format

```csv
book id,title,author,isbn,isbn13,my rating,average rating,publisher,...
```

**Import Steps:**
1. Export your library from Goodreads (Settings → Import/Export → Export Library)
2. In BookTarr, select "Goodreads" format
3. Upload the CSV file
4. Proceed with import

### Export Options

**Export Full Library:**
```
GET /api/books?export=csv&format=full
```

**Export Reading List:**
```
GET /api/books?export=csv&format=reading-list&series=SeriesName
```

**Export Goodreads Compatible:**
```
POST /api/integrations/goodreads/export
Body: { "book_ids": [1, 2, 3, ...] }
```

---

## AniList Integration

### Features

- **Manga Series Metadata**: Complete information on manga series
- **Volume Information**: Accurate volume counts and titles
- **Genre & Tags**: Detailed categorization
- **Status Tracking**: Publishing status and timelines
- **No Authentication**: Works automatically

### How It Works

1. When you add a manga series (detected by Japanese characters or manga genres)
2. BookTarr queries AniList for comprehensive series data
3. Volume information is fetched and cached locally
4. Series metadata is updated periodically

### Supported Series

- Popular anime/manga franchises (Bleach, Naruto, Death Note, etc.)
- Light novels with anime adaptations
- Any series found on AniList

### API Endpoints

**Search Manga:**
```
POST /api/integrations/search/manga
Body: {
  "series_name": "Bleach",
  "source": "anilist"
}
```

**Get Series Volumes:**
```
GET /api/integrations/manga/Bleach/volumes?source=anilist
```

**Direct AniList Search:**
```
GET /api/integrations/anilist/search?q=Bleach
```

### Example Response

```json
{
  "query": "Bleach",
  "result": {
    "name": "Bleach",
    "author": "Tite Kubo",
    "total_volumes": 74,
    "genres": ["Action", "Shounen", "Supernatural"],
    "status": "completed",
    "cover_url": "https://...",
    "anilist_id": 30123
  }
}
```

---

## MyAnimeList Integration

### Features

- **Manga Search**: Comprehensive manga database
- **Series Metadata**: Volumes, chapters, ratings
- **User Lists**: Sync reading lists (with OAuth)
- **Ratings & Reviews**: Community ratings
- **Alternative to AniList**: More comprehensive for Western manga

### Setup (Optional)

MyAnimeList API works without authentication for basic queries.

**For Full Features:**
1. Visit https://myanimelist.net/apiconfig
2. Create an API application
3. Get your Client ID
4. Set in BookTarr Settings → Integrations

### API Endpoints

**Search Manga:**
```
GET /api/integrations/myanimelist/search?q=Naruto&limit=10
```

**Get Manga Details:**
```
GET /api/integrations/myanimelist/manga/{id}
```

**Get User List (Requires OAuth):**
```
GET /api/integrations/myanimelist/user/{username}/list?status=reading
```

### Example Response

```json
{
  "query": "Naruto",
  "results": [
    {
      "name": "Naruto",
      "mal_id": 13619,
      "total_volumes": 72,
      "genres": ["Action", "Comedy", "School", "Shounen", "Supernatural"],
      "score": 8.2,
      "rank": 45,
      "cover_url": "https://..."
    }
  ]
}
```

---

## Goodreads Integration

### Features

- **Book Search**: Access to Goodreads' massive database
- **User Ratings**: Sync book ratings and reviews
- **Shelf Management**: Manage books across shelves
- **Reading Progress**: Sync "currently reading" status
- **CSV Export**: Export library in Goodreads format

### Setup

**Basic Setup (No API Key Needed):**
- Search and metadata fetching works automatically

**Full Features (API Key Required):**
1. Create Goodreads account at https://www.goodreads.com
2. Visit https://www.goodreads.com/api
3. Create an application to get your API key
4. Add to BookTarr Settings → Integrations → Goodreads

### API Endpoints

**Search Books:**
```
GET /api/integrations/goodreads/search?q=The%20Way%20of%20Kings
```

**Get Book by ISBN:**
```
GET /api/integrations/goodreads/book/9780765326355
```

**Get Author Books:**
```
GET /api/integrations/goodreads/author/{author_id}/books
```

**Export Goodreads Format:**
```
POST /api/integrations/goodreads/export
Body: { "book_ids": [1, 2, 3] }
```

### Example Goodreads Export Format

```csv
book id,title,author,isbn,isbn13,my rating,average rating,publisher,binding,number of pages,original publication year,date read,date added,bookshelves
"123456","The Way of Kings","Brandon Sanderson","","9780765326355","5","4.64","Tor Books","Hardcover","1007","2010","2024-01-15","2023-06-20","fantasy,epic"
```

### Goodreads Search Response

```json
{
  "query": "The Way of Kings",
  "results": [
    {
      "gr_work_id": "3918701",
      "title": "The Way of Kings",
      "author": "Brandon Sanderson",
      "isbn": "9780765326355",
      "rating_avg": 4.64,
      "ratings_count": 152000,
      "image_url": "https://..."
    }
  ]
}
```

---

## Amazon/Kindle Integration

### Features

- **Kindle Library**: Import your Kindle book library
- **Audible Books**: Sync audiobook collection
- **Reading Progress**: Track progress on devices
- **Purchase History**: Historical data
- **Multiple Formats**: eBooks, physical books, audiobooks

### Setup

**OAuth Configuration:**
1. Login to Amazon account used for Kindle/Audible
2. BookTarr initiates OAuth flow
3. Authorize access to your library
4. Automatic sync begins

**Settings:**
- Choose book formats to import (eBooks, physical, audiobooks)
- Set sync frequency
- Manage connected devices

### API Endpoints

**Get Authentication URL:**
```
GET /api/amazon/auth/url
Response: { "auth_url": "https://..." }
```

**Handle OAuth Callback:**
```
POST /api/amazon/auth/callback
Body: { "code": "authorization_code" }
```

**Get Kindle Library:**
```
GET /api/amazon/kindle/library
```

**Get Audible Library:**
```
GET /api/amazon/audible/library
```

**Sync Status:**
```
GET /api/amazon/sync/status
```

---

## Integration Manager

### Overview

The `IntegrationManager` service coordinates all metadata sources with intelligent fallback logic.

### Architecture

```
User Request
    ↓
Integration Manager
    ├→ Primary Source (e.g., Google Books)
    │   ├→ Success: Return results
    │   └→ Failure: Try next source
    ├→ Fallback 1 (e.g., OpenLibrary)
    │   ├→ Success: Return results
    │   └→ Failure: Try next source
    ├→ Fallback 2 (e.g., Goodreads)
    │   └→ Success or Failure
    └→ Result to User
```

### Preference System

Users can configure:

```json
{
  "primary_source": "google_books",
  "manga_source": "anilist",
  "fallback_sources": ["openlibrary", "goodreads"],
  "enable_anilist": true,
  "enable_mal": false,
  "enable_goodreads": true,
  "sync_reading_progress": false,
  "sync_ratings": false
}
```

### API Reference

**Get Current Status:**
```
GET /api/integrations/status
```

**Get Preferences:**
```
GET /api/integrations/preferences
```

**Update Preferences:**
```
PUT /api/integrations/preferences
Body: {
  "primary_source": "openlibrary",
  "enable_goodreads": true
}
```

**Enable Integration:**
```
POST /api/integrations/enable/goodreads
```

**Disable Integration:**
```
POST /api/integrations/disable/myanimelist
```

---

## API Reference

### Search Endpoints

#### Multi-Source Search
```
POST /api/integrations/search/metadata
Body: {
  "query": "Brandon Sanderson",
  "search_type": "author"  // author, title, isbn
}

Response: {
  "query": "Brandon Sanderson",
  "search_type": "author",
  "sources": {
    "primary": [...],
    "google_books": [...],
    "openlibrary": [...]
  }
}
```

#### Manga Search
```
POST /api/integrations/search/manga
Body: {
  "series_name": "Bleach",
  "source": "anilist"  // optional
}

Response: {
  "series_name": "Bleach",
  "sources": {
    "anilist": { ... },
    "myanimelist": [ ... ]
  }
}
```

### Individual Service Endpoints

**AniList Search:**
```
GET /api/integrations/anilist/search?q=Bleach
```

**MyAnimeList Search:**
```
GET /api/integrations/myanimelist/search?q=Naruto&limit=10
```

**Goodreads Search:**
```
GET /api/integrations/goodreads/search?q=Sanderson
```

**Goodreads by ISBN:**
```
GET /api/integrations/goodreads/book/9780765326355
```

---

## Setup Guide

### Quick Start

1. **CSV Import:**
   - Settings → Import → Choose HandyLib or Goodreads format
   - Select CSV file
   - Review and import

2. **AniList for Manga:**
   - Automatic when manga series detected
   - No setup required
   - Provides volume counts and metadata

3. **Goodreads (Optional):**
   - Settings → Integrations → Goodreads
   - Add API key (optional, for full features)
   - Enable sync preferences

4. **MyAnimeList (Optional):**
   - Settings → Integrations → MyAnimeList
   - Add Client ID from myanimelist.net/apiconfig
   - Enable manga source preference

### Integration Settings UI

Located in Settings → Integrations:

- **Connected Services**: Enable/disable integrations
- **Preferences**: Choose primary sources, fallbacks
- **Sync Options**: Enable reading progress and rating sync
- **Integration Details**: Setup guides for each service

### Troubleshooting

**Issue: "No metadata found" for book**
- Solution: Check that at least one primary source is enabled
- Try different search terms (title, author, ISBN)
- Enable fallback sources in preferences

**Issue: Manga series shows incorrect volume count**
- Solution: Use AniList source (most accurate)
- Manually verify and adjust if needed
- Report to project if data is wrong

**Issue: Goodreads search returns no results**
- Solution: API key may be required (add in settings)
- Try searching by ISBN instead of title
- Check Goodreads website for exact book format

**Issue: Integration keeps failing**
- Solution: Check network connectivity
- Verify API keys are correct
- Disable and re-enable integration
- Check BookTarr logs for detailed errors

---

## Best Practices

### For Manga Collections

1. Use **AniList** as primary manga source (most comprehensive)
2. Enable **fallback to MyAnimeList** for additional coverage
3. Manually verify volume counts for incomplete series
4. Use "Series Metadata" tools to fix discrepancies

### For Mixed Book/Manga Collections

1. Set **Google Books** as primary (best overall)
2. Set **AniList** as manga source (auto-detected)
3. Enable **OpenLibrary** as fallback (indie/older books)
4. Keep **Goodreads** enabled for ratings and social features

### For Export and Sharing

1. Use **CSV export** for sharing reading lists
2. Use **Goodreads export** for Goodreads users
3. Use **JSON export** for complete backups
4. Include cover images in exports when possible

### For Reading Progress

1. Enable **sync_reading_progress** to track books across services
2. Enable **sync_ratings** to keep ratings in sync
3. Sync frequency: Weekly is recommended
4. Monitor sync status in Integration dashboard

---

## Advanced Configuration

### Environment Variables

```bash
# Goodreads API (optional)
GOODREADS_API_KEY=your_key_here

# MyAnimeList API (optional)
MYANIMELIST_CLIENT_ID=your_client_id

# Amazon OAuth (if configured)
AMAZON_CLIENT_ID=your_client_id
AMAZON_CLIENT_SECRET=your_secret
```

### Rate Limiting

BookTarr respects API rate limits:

- **Google Books**: 1000 requests/day (shared)
- **OpenLibrary**: Unlimited (public API)
- **Goodreads**: 1 request/sec (API key required)
- **AniList**: 90 requests/minute
- **MyAnimeList**: 1 request/sec

Caching is used to minimize API calls.

### Caching Strategy

```
Book Metadata:
└─ Local Cache (30 days)
   └─ API Result Cache (24 hours)

Series Metadata:
└─ Local Cache (30 days)
   └─ AniList/MAL Cache (7 days)

User Preferences:
└─ Session Cache (always fresh)
```

---

## Version History

**v1.0.0** (November 2025)
- Initial integration framework
- CSV import/export
- AniList integration
- MyAnimeList client
- Goodreads integration
- Amazon/Kindle scaffolding
- Integration settings UI

---

## Support & Feedback

For issues, questions, or feature requests:

1. Check this guide for setup instructions
2. Review troubleshooting section
3. Check logs in Settings → Logs
4. Report issues with integration information

---

## See Also

- [CLAUDE.md](./CLAUDE.md) - Project overview and architecture
- [TASKLIST.md](./TASKLIST.md) - Development tasks and status
- [API Reference](#api-reference) - Full API endpoint documentation
