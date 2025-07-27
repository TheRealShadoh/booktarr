# BookTarr - Book Collection Management

A full-stack application for managing book collections with metadata enrichment, local caching, and edition tracking.

## Features

- **Multi-source Search**: Search books by ISBN, title, author, or series using Google Books and OpenLibrary APIs
- **Local-first Caching**: JSON-based caching system for offline access and reduced API calls
- **Edition Tracking**: Track ownership status ('own', 'want', 'missing') for different book editions
- **Release Calendar**: Track upcoming releases and recently released books
- **Metadata Refresh**: Background tasks to refresh stale or incomplete metadata
- **Rate Limiting**: Respects API rate limits with exponential backoff
- **React Frontend**: Modern web interface with responsive design
- **Comprehensive Testing**: Unit tests for all components

## Quick Start

### Prerequisites
- Python 3.8+ with `venv` module
- Node.js 18+ and npm

### Backend Setup

1. **Create and activate virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the backend server**
   ```bash
   python main.py
   ```
   
   The backend will start on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```
   
   The frontend will start on `http://localhost:3000`

### Development Workflow

1. Start the backend first (it provides the API)
2. Start the frontend (it will proxy API requests to the backend)
3. Access the application at `http://localhost:3000`

### Testing

**Backend Tests**
```bash
cd backend
source venv/bin/activate
pytest
```

**Frontend Tests**
```bash
cd frontend
npm test
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