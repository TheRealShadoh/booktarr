# BookTarr - Book Collection Management Backend

A Python backend for managing book collections with metadata enrichment, local caching, and edition tracking.

## Features

- **Multi-source Search**: Search books by ISBN, title, author, or series using Google Books and OpenLibrary APIs
- **Local-first Caching**: JSON-based caching system for offline access and reduced API calls
- **Edition Tracking**: Track ownership status ('own', 'want', 'missing') for different book editions
- **Release Calendar**: Track upcoming releases and recently released books
- **Metadata Refresh**: Background tasks to refresh stale or incomplete metadata
- **Rate Limiting**: Respects API rate limits with exponential backoff
- **Comprehensive Testing**: Unit tests for all components

## Setup

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run the Application**
   ```bash
   python -m backend.main
   ```

4. **Run Tests**
   ```bash
   pytest
   ```

## API Endpoints

### Search
- `GET /books/search?q=<query>` - Search books by ISBN, title, author, or series

### Ownership Management
- `POST /books/editions/{edition_id}/status` - Mark edition as own/want/missing
- `POST /books/editions/{edition_id}/notes` - Add notes to edition
- `GET /books/wanted` - Get all wanted books
- `GET /books/owned` - Get all owned books

### Series & Author Tracking
- `GET /books/series/{series_name}/missing` - Get missing books from series
- `GET /books/authors/{author_name}/missing` - Get missing books from author
- `GET /books/series/{series_name}/upcoming` - Get upcoming releases from series
- `GET /books/authors/{author_name}/upcoming` - Get upcoming releases from author

### Release Calendar
- `GET /books/calendar` - Get release calendar
- `GET /books/recent?days=30` - Get recent releases

### Metadata Management
- `POST /books/refresh/stale` - Refresh stale metadata
- `POST /books/refresh/incomplete` - Refresh incomplete metadata

## Architecture

```
backend/
├── models/          # SQLModel database models
├── clients/         # API clients (Google Books, OpenLibrary, Amazon)
├── services/        # Business logic services
├── routes/          # FastAPI route handlers
├── tests/           # Unit tests
├── database.py      # Database configuration
└── main.py          # FastAPI application
```

## Database Schema

- **Book**: Core book information (title, authors, series)
- **Edition**: Specific editions with ISBNs, formats, publishers
- **UserEditionStatus**: User ownership status for each edition

## External APIs

- **Google Books API**: Primary source for book metadata
- **OpenLibrary API**: Secondary source and additional edition data
- **Amazon/Audible**: Placeholder for future library sync (requires proper API access)

## Configuration

Environment variables:
- `DATABASE_URL`: Database connection string
- `GOOGLE_BOOKS_API_KEY`: Google Books API key (optional but recommended)
- `CACHE_FILE`: Path to JSON cache file
- `API_RATE_LIMIT_DELAY`: Delay between API calls

## Testing

The application includes comprehensive unit tests:
- Model tests for database operations
- Client tests for API interactions (mocked)
- Service tests for business logic
- Integration tests for complete workflows

## Future Enhancements

- Amazon/Audible library synchronization
- CSV import/export functionality
- Advanced series detection
- Cover image optimization
- User authentication system
- Web interface

## License

This project is part of the BookTarr application.