# 🧠 Prompt: Build a Python Backend for a Book Collection App with Metadata Enrichment, Local Caching, and Edition Tracking

You are building a **Python backend** for a book-tracking application that allows users to manage their book collections, enrich metadata from public and private sources, and track ownership status for each edition. All functions must return structured **JSON**, and all logic should be **testable** and respect API rate limits.

---

## 📚 1. Search and Ingestion from ISBN, Title, Author, or Series

Implement a function that accepts any of the following as input:

* **ISBN** (13 or 10)
* **Book title**
* **Series name**
* **Author name**

The function must:

* Search the **local database** for relevant matches (by ISBN or fuzzy match on title/author/series).
* If not found or incomplete, query **external APIs** (Google Books, OpenLibrary, others).
* Return a structured **JSON** object containing:

  * Book title, authors, series info (name + position)
  * All known **editions** of the book (ISBNs, formats, release dates, pricing, cover art)
  * Metadata about the **series** (and other books in it)
  * Whether the user owns, wants, or is missing each edition
  * Source metadata (Google/OpenLibrary/Amazon/etc.)

This function should eventually support input from a **barcode scanner**, defaulting to ISBN-based lookup.

---

## 🏗️ 2. Data Model for Book, Edition, and Ownership

Design your database with the following model:

```python
class Book(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    authors: List[str]
    series_name: Optional[str]
    series_position: Optional[int]
    openlibrary_id: Optional[str]
    google_books_id: Optional[str]

    editions: List["Edition"] = Relationship(back_populates="book")

class Edition(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    isbn_10: Optional[str]
    isbn_13: Optional[str]
    book_id: int = Field(foreign_key="book.id")
    book_format: Optional[str]  # hardcover, paperback, ebook, audiobook
    publisher: Optional[str]
    release_date: Optional[date]
    cover_url: Optional[str]
    price: Optional[float]
    source: Optional[str]  # openlibrary, google, amazon, etc.

    book: Book = Relationship(back_populates="editions")
    user_statuses: List["UserEditionStatus"] = Relationship(back_populates="edition")

class UserEditionStatus(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    edition_id: int = Field(foreign_key="edition.id")
    status: str  # 'own', 'want', or 'missing'
    notes: Optional[str]

    edition: Edition = Relationship(back_populates="user_statuses")
```

---

## 💾 3. Local-First Metadata Caching

* Store all book/edition metadata in a **long-lived JSON database**.
* Every query first checks this database.
* If data is missing, outdated, or incomplete, the backend performs:

  * Web API query to Google Books, OpenLibrary, Amazon, or Audible
  * Normalizes and stores the result in the local database

---

## 🔁 4. Metadata Refresh

* Background job or function to **refresh stale metadata**.
* Refresh based on timestamp, prioritizing:

  * Partial entries (missing series or editions)
  * Missing cover images or price info
* Respect **API rate limits** with batching, delay, or exponential backoff.

---

## 🔍 5. Advanced Book Search API

Implement an async FastAPI endpoint or function:

* Input: ISBN, title, series name, or author name
* Logic:

  1. Query local DB
  2. If not found or incomplete → fetch from APIs
* Output: JSON like below:

```json
{
  "title": "The Way of Kings",
  "authors": ["Brandon Sanderson"],
  "series": "Stormlight Archive",
  "series_position": 1,
  "editions": [
    {
      "isbn_13": "9780765326355",
      "format": "hardcover",
      "release_date": "2010-08-31",
      "cover_url": "https://...",
      "price": 29.99,
      "status": "own"
    },
    {
      "isbn_13": "9781429952040",
      "format": "ebook",
      "release_date": "2010-08-31",
      "price": 9.99,
      "status": "want"
    }
  ]
}
```

---

## 🧩 6. Edition Ownership Management

* Functions to:

  * Mark an **edition** as `own`, `want`, or `missing`
  * List editions the user is **missing** from:

    * A series
    * An author
  * List books the user **wants**
  * Add notes (e.g., "signed copy", "preordered")

---

## 📅 7. Book Release Calendar

* Function to return a JSON calendar of:

  * Upcoming release dates from tracked series
  * Released books still missing or wanted
  * Output format:

```json
{
  "2025-11": [
    {
      "title": "Stormlight Archive Book 5",
      "release_date": "2025-11-05",
      "format": "hardcover",
      "owned": false,
      "wanted": true
    }
  ]
}
```

---

## 🔐 8. Amazon (Kindle) & Audible Integration

* Allow user to **authenticate** with Amazon
* Retrieve:

  * Kindle library (matched by ASIN/ISBN)
  * Audible library (audiobooks and metadata)
* Cross-reference with local editions
* Mark matched editions as **owned**

---

## 🧪 9. Testing and Structure

* Every function must include a **unit test** (real external APIs)
* Use:

  * `httpx` for async API requests
  * `pydantic` for data validation
  * `SQLModel` or `SQLAlchemy` for DB
  * `FastAPI` for future API surface
* Organize as:

  * `models/`
  * `clients/`
  * `services/`
  * `routes/`
  * `tests/`

---

## ✅ Summary of Functional Goals

| Feature                         | Description                     |
| ------------------------------- | ------------------------------- |
| ISBN/title/author/series lookup | Full metadata, editions, status |
| Local JSON database             | Local-first API calls           |
| CSV import                      | Bulk enrichment                 |
| Edition-level tracking          | `own`, `want`, `missing`        |
| Metadata refresh                | Rate-limited API sync           |
| Amazon auth                     | Pull from Kindle/Audible        |
| Release calendar                | JSON timeline of expected books |
| Search UI-ready                 | JSON-first API design           |

---

Let me know if you'd like this prompt scaffolded into a working repository with endpoints and tests, or if you'd like a diagram or visual flowchart of the backend architecture.

---

## 🚧 Missing Backend Functionality

The frontend expects the following API endpoints that need to be implemented in the new backend:

### Books API Endpoints
- **GET /api/books** - Fetch all books in the collection
- **GET /api/books/test** - Fetch test books data
- **GET /api/books/{isbn}/metadata-sources** - Get metadata sources for a book
- **GET /api/books/enrich/{isbn}** - Legacy endpoint for metadata enrichment

### Settings API Endpoints
- **GET /api/settings** - Get current settings
- **PUT /api/settings** - Update settings
- **POST /api/settings/validate-url** - Validate URLs (e.g., Skoolib)
- **POST /api/settings/reset** - Reset to default settings
- **POST /api/settings/backup** - Backup current settings
- **POST /api/settings/restore** - Restore settings from backup
- **GET /api/settings/info** - Get settings information
- **GET /api/settings/health** - Check settings health

### Reading Progress API Endpoints
- **PUT /api/reading/progress** - Update reading progress
- **GET /api/reading/stats** - Get reading statistics
- **GET /api/reading/books/status/{status}** - Get books by reading status
- **POST /api/reading/books/{isbn}/start-reading** - Mark book as currently reading
- **POST /api/reading/books/{isbn}/finish-reading** - Mark book as finished (with optional rating)
- **POST /api/reading/books/{isbn}/add-to-wishlist** - Add book to wishlist

### General Endpoints
- **GET /api/health** - Health check endpoint (already implemented)

### Backend Issues
- Import path issues in the backend preventing it from starting properly
- The backend uses relative imports that are causing `ImportError: attempted relative import beyond top-level package`
- Need to fix import paths in:
  - `/backend/services/book_search.py`
  - Other service and route files

### Frontend Configuration
- Frontend is configured to proxy API requests from `/api` to `http://localhost:8000`
- Frontend expects all API endpoints to be prefixed with `/api`
- CORS is enabled in the backend for all origins (should be restricted in production)