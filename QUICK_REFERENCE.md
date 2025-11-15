# 🚀 Smart Collections - Quick Reference Guide

## 📁 Files Created/Modified

### New Backend Files
- `backend/services/tag_manager.py` (550+ lines) - Core tag/duplicate logic
- `backend/routes/collections.py` (300+ lines) - API endpoints

### New Frontend Files
- `frontend/src/components/TagManager.tsx` (250 lines) - Tag UI
- `frontend/src/components/TagManager.css` (380 lines)
- `frontend/src/components/CollectionFilter.tsx` (280 lines) - Filter UI
- `frontend/src/components/CollectionFilter.css` (420 lines)

### Modified Files
- `backend/models/book.py` - Added 5 fields to Book, 1 to Edition
- `backend/main.py` - Added collections router
- `backend/clients/google_books.py` - Added language extraction
- `backend/clients/openlibrary.py` - Added language/categories extraction
- `frontend/src/types/index.ts` - Added 15 new interfaces

### Documentation Files
- `SMART_COLLECTIONS_GUIDE.md` - Complete documentation
- `IMPLEMENTATION_SUMMARY.md` - What was delivered
- `QUICK_REFERENCE.md` - This file

---

## 🔌 API Endpoints (15 Total)

### Tags (7)
```
POST   /api/tags/add                    # Add tag to book
POST   /api/tags/remove                 # Remove tag from book
PUT    /api/tags/{book_id}              # Set all tags
GET    /api/tags                        # List all tags
GET    /api/tags/{tag}/books            # Get books with tag
POST   /api/tags/filter                 # Filter by multiple tags
```

### Categories (2)
```
GET    /api/categories                  # List categories
GET    /api/categories/{category}/books # Get books in category
```

### Languages (2)
```
GET    /api/languages                   # List languages
GET    /api/languages/{language}/books  # Get books by language
```

### Editions (1)
```
GET    /api/books/{book_id}/editions    # Get edition variants
```

### Duplicates (2)
```
GET    /api/duplicates                  # Find duplicates
POST   /api/duplicates/merge            # Merge duplicates
```

### Statistics (1)
```
GET    /api/collection/stats            # Collection statistics
```

---

## 🧩 React Components

### TagManager
```jsx
<TagManager
  bookId={42}                    // Required: Book ID
  initialTags={["Isekai"]}      // Optional: Starting tags
  allTags={["Isekai", "Cozy"]} // Optional: Available tags
  onTagsChange={(tags) => {}}   // Optional: Change handler
  readOnly={false}              // Optional: Read-only mode
  maxTags={10}                  // Optional: Max allowed tags
/>
```

**Props**:
- `bookId: number` - The book to tag
- `initialTags?: string[]` - Starting tags
- `allTags?: string[]` - Available tags for suggestions
- `onTagsChange?: (tags: string[]) => void` - Callback on change
- `readOnly?: boolean` - Disable editing
- `maxTags?: number` - Maximum tags allowed (default 10)

**Features**:
- ✅ Tag chips with remove buttons
- ✅ Real-time suggestions
- ✅ 50+ predefined tags
- ✅ Custom tag creation
- ✅ Error handling
- ✅ Dark mode
- ✅ Mobile responsive

### CollectionFilter
```jsx
<CollectionFilter
  stats={collectionStats}        // Optional: Pre-loaded stats
  onFilterChange={(filters) => {}} // Optional: Filter handler
  showStats={true}               // Optional: Show stats panel
  collapsible={true}             // Optional: Allow collapse
/>
```

**Props**:
- `stats?: CollectionStats` - Pre-loaded statistics
- `onFilterChange?: (filters) => void` - Filter change callback
- `showStats?: boolean` - Show statistics (default true)
- `collapsible?: boolean` - Allow collapse/expand (default true)

**Features**:
- ✅ Multi-select filters
- ✅ Tag match-all toggle
- ✅ Category filtering
- ✅ Language filtering (with flags)
- ✅ Format filtering
- ✅ Reset button
- ✅ Statistics display
- ✅ Dark mode
- ✅ Mobile responsive

---

## 🔧 Backend Services

### TagManager (Tag Operations)
```python
from services.tag_manager import TagManager
from database import get_db_session

with get_db_session() as session:
    # Add tag
    TagManager.add_tag_to_book(session, book_id, "Isekai")

    # Remove tag
    TagManager.remove_tag_from_book(session, book_id, "Isekai")

    # Set all tags
    TagManager.set_tags_for_book(session, book_id, ["Isekai", "Cozy"])

    # Get all tags
    all_tags = TagManager.get_all_tags(session)

    # Get all categories
    categories = TagManager.get_all_categories(session)

    # Filter by tag
    books = TagManager.filter_books_by_tag(session, "Isekai")

    # Filter by category
    books = TagManager.filter_books_by_category(session, "Fiction")

    # Filter by language
    books = TagManager.filter_books_by_language(session, "ja")

    # Filter by multiple tags
    books = TagManager.filter_books_by_multiple_tags(
        session,
        ["Isekai", "Cozy"],
        match_all=True  # Require all tags
    )

    # Get statistics
    stats = TagManager.get_book_collection_stats(session)
```

### SmartDuplicateDetector (Duplicate Operations)
```python
from services.tag_manager import SmartDuplicateDetector

with get_db_session() as session:
    # Find duplicates with confidence
    duplicates = SmartDuplicateDetector.find_duplicates_with_confidence(
        session,
        confidence=0.6  # 0.0-1.0 scale
    )

    # Merge duplicates
    merged = SmartDuplicateDetector.merge_duplicate_books(
        session,
        primary_id=42,
        duplicate_ids=[43, 44]
    )
```

---

## 📊 Data Models

### Book Model Fields (Added)
```python
language: Optional[str] = None              # e.g., "en", "ja", "fr"
page_count: Optional[int] = None            # Number of pages
description: Optional[str] = None          # Book description
categories: Optional[str] = None           # JSON: ["Fiction", "Fantasy"]
tags: Optional[str] = None                 # JSON: ["Isekai", "Cozy"]
```

### Edition Model Fields (Added)
```python
language: Optional[str] = None              # Edition-specific language
```

---

## 📚 Predefined Tags (50+)

### Tropes & Themes (10)
Found Family, Time Travel, Isekai, Reincarnation, Magic System, Portal Fantasy, Enemies to Lovers, Slow Burn, Chosen One, Forbidden Romance

### Vibes & Mood (10)
Cozy, Dark, Whimsical, Sad, Comedic, Romantic, Action-Packed, Philosophical, Spooky, Heartwarming

### Format & Translation (8)
Light Novel, Manga, Web Novel, Original English, Translated, Dual Language, Graphic Novel, Audiobook

### Collection Status (8)
Collector's Edition, Signed Copy, Rare, Deluxe, Mint Condition, First Edition, Limited Print, Out of Print

### Personal Notes (6)
Favorite, Reread, Wish List Priority, Gifted, Borrowed, To Donate

---

## 🌍 Supported Languages

**Common codes**: en, ja, fr, es, de, zh, ko, ru

**Full list**: Any ISO 639-1 language code supported (Google Books & OpenLibrary)

---

## 📈 Collection Statistics

```json
{
  "total_books": 315,
  "total_editions": 412,
  "languages": {
    "en": 245,
    "ja": 60,
    "fr": 10
  },
  "formats": {
    "hardcover": 180,
    "paperback": 120,
    "ebook": 85,
    "manga": 27
  },
  "categories": {
    "Fiction": 150,
    "Fantasy": 120
  },
  "tags": {
    "Isekai": 25,
    "Found Family": 18
  },
  "unique_languages": 3,
  "unique_formats": 4,
  "unique_categories": 2,
  "unique_tags": 10
}
```

---

## 🎯 Common Workflows

### Add Tag to Book
```python
# Backend
tag = TagManager.add_tag_to_book(session, book_id=42, tag="Isekai")

# API
POST /api/tags/add
{ "book_id": 42, "tag": "Isekai" }

# Frontend
<TagManager bookId={42} onTagsChange={handleChange} />
```

### Find & Merge Duplicates
```python
# Backend
duplicates = SmartDuplicateDetector.find_duplicates_with_confidence(session, 0.6)
merged = SmartDuplicateDetector.merge_duplicate_books(session, 42, [43])

# API
GET /api/duplicates?confidence=0.6
POST /api/duplicates/merge
{ "primary_id": 42, "duplicate_ids": [43] }
```

### Filter Books by Language
```python
# Backend
japanese_books = TagManager.filter_books_by_language(session, "ja")

# API
GET /api/languages/ja/books

# Frontend
<CollectionFilter onFilterChange={handleFilter} />
```

### Get Collection Statistics
```python
# Backend
stats = TagManager.get_book_collection_stats(session)

# API
GET /api/collection/stats

# Frontend
<CollectionFilter showStats={true} />
```

---

## 🚨 Common Issues & Solutions

### Issue: Tags not saving
**Solution**: Check that `onTagsChange` callback is implemented and API is accessible

### Issue: Duplicates not detected
**Solution**: Try lowering confidence threshold (0.4 instead of 0.6)

### Issue: Language not showing
**Solution**: Ensure books were imported/enriched with Google Books or OpenLibrary

### Issue: Categories empty
**Solution**: Re-run metadata enrichment from settings or re-import with new API

---

## ⚙️ Configuration

### Max Tags Per Book
```python
TagManager.add_tag_to_book()  # Checks against maxTags
# Default: 10 tags per book
# Frontend: <TagManager maxTags={15} />
```

### Duplicate Confidence Threshold
```python
# Default: 0.6 (60%)
# Range: 0.0-1.0
# Higher = stricter matching
SmartDuplicateDetector.find_duplicates_with_confidence(session, 0.6)
```

### API Response Format
All endpoints return JSON with success/error information

---

## 📖 Documentation Files

1. **SMART_COLLECTIONS_GUIDE.md** - Comprehensive feature documentation
2. **IMPLEMENTATION_SUMMARY.md** - What was delivered and next steps
3. **QUICK_REFERENCE.md** - This quick reference guide

---

## ✅ Checklist for Integration

- [ ] Review file changes in `backend/models/book.py`
- [ ] Verify new routes registered in `backend/main.py`
- [ ] Test API endpoints with curl or Postman
- [ ] Import and test `TagManager` service
- [ ] Import and test frontend components
- [ ] Test with real book data
- [ ] Verify database schema changes
- [ ] Test dark mode display
- [ ] Test mobile responsiveness
- [ ] Review error handling
- [ ] Load test with collection stats

---

## 🎊 You're All Set!

All smart collection features are ready to use. Start with:

1. **Read**: SMART_COLLECTIONS_GUIDE.md
2. **Test**: Try API endpoints
3. **Integrate**: Add components to your UI
4. **Deploy**: Roll out to users
5. **Monitor**: Check analytics and feedback

Happy organizing! 📚✨
