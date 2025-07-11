# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL INSTRUCTIONS FOR AUTONOMOUS OPERATION

**YOU MUST ALWAYS:**
1. **REFERENCE INTEGRATION_ROADMAP.md** for ALL tasks - check it FIRST before starting any work
2. **Work autonomously** - make decisions and implement without asking for clarification
3. **Use git worktrees** for parallel development of different features
4. **Update INTEGRATION_ROADMAP.md** as you progress with status, errors, and workarounds
5. **Commit after each completed phase** for rollback capability
6. **Run lint and typecheck** after completing tasks

### Git Worktrees Setup
```bash
# Set up worktrees for parallel feature development
git worktree add -b feature/book-card-resize ../booktarr-book-resize
git worktree add -b feature/greyscale-missing ../booktarr-greyscale
git worktree add -b feature/author-series-ui ../booktarr-ui-flow
git worktree add -b feature/wanted-page ../booktarr-wanted
git worktree add -b feature/import-lists ../booktarr-imports

# List worktrees
git worktree list

# Remove worktree when done
git worktree remove ../booktarr-feature-name
```

## Project Overview

Booktarr is a book library management system that imports books from Skoolib share links and displays them in a Sonarr-inspired interface with rich metadata and pricing information. The project is a complete Progressive Web App with barcode scanning and reading progress tracking.

## New Feature Tasks to Implement

### 1. Book Card Size Reduction (Priority: HIGH)
- **Goal**: Make book cards in library view ~50% smaller by default
- **Implementation**: 
  - Scale based on viewport/resolution
  - Maintain aspect ratio and readability
  - Add size toggle option in UI
  - Update BookCard component responsive classes
  - Test on multiple screen sizes

### 2. Re-enable Greyscale Book Art (Priority: HIGH)
- **Goal**: Show greyscale placeholder images for missing books in series
- **Implementation**:
  - Restore greyscale filter CSS for missing books
  - Apply to books without cover art
  - Ensure visual consistency with series display
  - Add loading state for cover images

### 3. Author & Series Page Visual Flow (Priority: MEDIUM)
- **Goal**: Improve visual flow while maintaining functionality
- **Implementation**:
  - Review current layout and identify flow issues
  - Enhance spacing and typography
  - Improve navigation between sections
  - Add visual hierarchy
  - Maintain all existing capabilities

### 4. Wanted Page Enhancement (Priority: HIGH)
- **Goal**: Add "Missing From Series" and manual "Wantlist" sections
- **Implementation**:
  - Create two distinct sections on Wanted page
  - "Missing From Series List": Auto-populated from series gaps
  - "Wantlist": Manually added books user wants
  - Add button on missing series books to add to Wantlist
  - Store in both locations when added
  - Implement backend models for wantlist storage

### 5. Book List Import Feature (Priority: HIGH)
- **Goal**: Import books from multiple sources
- **Formats to support**:
  
  **CSV Import**:
  - Generic CSV with flexible field mapping
  - Common fields: ISBN, Title, Author, Publisher, etc.
  - UTF-8 encoding support
  - Header row detection
  
  **Goodreads Import**:
  - Handle Excel formula format (="value")
  - Map standard Goodreads CSV columns
  - Support shelves and reading status
  - Handle multiple authors field
  
  **Hardcover Import**:
  - Implement GraphQL API integration (CSV export not yet available)
  - Use API endpoint: docs.hardcover.app/api/getting-started/
  - Require API token from user
  - Query books by status and lists
  
  **HandyLib Import**:
  - Support tab-delimited format
  - TITLE field required
  - Map common fields
  - Handle both mobile and desktop export formats

## Development Workflow

1. **Check INTEGRATION_ROADMAP.md FIRST** for current phase and tasks
2. **Run locally** for faster development cycles (not in containers)
3. **Use git worktrees** for parallel feature development
4. **Test after each phase** before committing
5. **Update INTEGRATION_ROADMAP.md** with progress and issues

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

# Additional test commands
npm run test:ci     # Single test run with coverage
npm run test:e2e    # Open Cypress E2E tests
npm run test:e2e:ci # Run Cypress tests headless
npm run test:all    # Run all test suites
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

### Known Issues:
- Cache service method signature issue affecting external book search
- Some deprecated npm packages in development dependencies
- CI/CD pipeline not yet implemented (marked as low priority)

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
- **wantlist**: User's manual want list (to be implemented)

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

## Important Implementation Notes

### Autonomous Operation Guidelines
1. **Make decisions** - Don't ask for clarification, implement based on best practices
2. **Research when needed** - Use WebSearch/WebFetch for unknown formats or APIs
3. **Document decisions** - Update INTEGRATION_ROADMAP.md with implementation choices
4. **Test thoroughly** - Run all tests before marking tasks complete
5. **Use parallel development** - Leverage git worktrees for independent features

### Import Feature Specifications
- **CSV**: Support flexible field mapping with preview
- **Goodreads**: Handle Excel formula format and all standard columns
- **Hardcover**: Use GraphQL API until CSV export available
- **HandyLib**: Support tab-delimited with TITLE as required field
- **All formats**: UTF-8 encoding, progress indicators, error handling

## REMEMBER: ALWAYS CHECK INTEGRATION_ROADMAP.md FIRST!