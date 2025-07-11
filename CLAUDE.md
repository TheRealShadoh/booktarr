# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Booktarr is a book library management system that imports books from Skoolib share links and displays them in a Sonarr-inspired interface with rich metadata and pricing information. The project is a complete Progressive Web App with barcode scanning and reading progress tracking.

**IMPORTANT**: Always use the INTEGRATION_ROADMAP.md file to see what phase to work on next. Update that file as you progress with errors, status, workarounds, and features.

## Development Workflow

1. **Run locally** for faster development cycles (not in containers)
2. **Test after each phase** before committing
3. **Commit after completing** each step/phase for rollback capability
4. **Update INTEGRATION_ROADMAP.md** with progress and any issues encountered

## Common Development Commands

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Development server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest -v                              # Run all tests
pytest tests/test_specific.py -v      # Run specific test file
pytest -k "test_function_name"        # Run specific test by name

# Format code
black app/
isort app/
mypy app/                             # Type checking

# Database migrations
alembic upgrade head                   # Apply migrations
alembic revision --autogenerate -m "description"   # Create new migration
```

### Frontend Development
```bash
cd frontend
npm install

# Development
npm start           # Development server on port 3000
npm test           # Run test suite in watch mode
npm run lint       # ESLint checking
npm run build      # Production build
```

## Architecture Overview

### Service Communication Flow
```
React Frontend (3000) → Nginx Proxy → FastAPI Backend (8000)
                                    ↓
                         SQLite DB + External APIs
```

### Key API Endpoints

#### Book Management
- `GET /api/books` - Returns books grouped by series with enriched metadata
- `POST /api/books/scan` - Add book via ISBN
- `DELETE /api/books/{isbn}` - Remove book from library
- `PUT /api/books/{isbn}/progress` - Update reading status
- `GET /api/search/books` - Search external book APIs
- `POST /api/books` - Add book to library

#### Settings & Sync
- `GET/PUT /api/settings` - Settings management
- `POST /api/settings/sync-skoolib` - Manual Skoolib sync trigger
- `POST /api/settings/validate` - Test Skoolib URL validity

#### Statistics & Export
- `GET /api/stats/reading` - Reading statistics
- `GET /api/books/export` - Export library data
- `POST /api/books/import` - Import library data

## Current Status (Phase 5.1 Complete)

### Completed Features:
- **Skoolib Integration**: Playwright-based parser for JavaScript SPAs
- **Metadata Enrichment**: Google Books and Open Library APIs
- **Sonarr-Inspired UI**: Dark theme with library, series, and authors pages
- **Progressive Web App**: Full PWA with offline capabilities
- **Barcode Scanner**: Camera integration with ZXing library
- **Reading Progress**: Status tracking (unread/reading/read/wishlist/DNF)
- **Search & Add**: External book search with visual feedback
- **State Management**: Context API with optimistic updates
- **Export/Import**: CSV/JSON export with backup functionality

### Next Phase (5.2): Library Organization & Management
See INTEGRATION_ROADMAP.md for detailed next steps.

## Skoolib Parser

The Skoolib parser uses Playwright for browser automation due to Skoolib being a JavaScript SPA:

```python
class SkoolibPlaywrightParser:
    # Primary parser with browser automation
    # Tries multiple CSS selectors to find book links
    # Handles pagination automatically
    # Validates ISBN-10/13 with checksums
```

**Current Status**: Parser loads URLs but may need selector adjustments for specific Skoolib layouts.

## Database Schema

### Core Tables (SQLAlchemy)
- **books**: ISBN (PK), title, authors, series info, metadata, reading_status, progress
- **settings**: Configuration for Skoolib URL, API keys, sync preferences
- **sync_history**: Track Skoolib sync operations and results

Always use Alembic for schema changes:
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## State Management

Frontend uses React Context API with:
- **BookContext**: Books data, loading states, CRUD operations
- **SettingsContext**: App settings and preferences
- **CacheContext**: Client-side caching with IndexedDB

## Testing Strategy

- **Backend**: pytest with async support, aim for >80% coverage
- **Frontend**: Jest + React Testing Library, aim for >70% coverage
- Run tests before committing any phase

## Key Implementation Details

### Caching
- Backend: LRU cache with configurable TTL
- Frontend: IndexedDB for offline support
- Service Worker: Cache-first strategy for PWA

### Error Handling
- Backend: Comprehensive middleware with structured logging
- Frontend: Error boundaries and toast notifications

### Performance
- Debounced search operations
- Lazy loading for images
- Virtual scrolling for large lists
- Optimistic UI updates

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=sqlite:///./data/booktarr.db
LOG_LEVEL=INFO
CACHE_TTL=3600
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENABLE_PWA=true
```

## Important Notes

- **Always check INTEGRATION_ROADMAP.md** for current phase and next steps
- **Commit after each completed phase** for easy rollback
- **Update roadmap** with any issues or deviations
- **Run locally** for faster development iteration