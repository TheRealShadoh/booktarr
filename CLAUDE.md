# 📚 BookTarr: Full-Stack Book Collection Management System

**Current Status**: Feature-complete book collection management system with React frontend, Python FastAPI backend, and comprehensive testing suite.

## 📋 **Task Management**

**IMPORTANT**: All development tasks are managed in `TASKLIST.md` - the single source of truth for task tracking, progress, and priorities.

### Task Management Guidelines:
- **Always use `TASKLIST.md`** for recording tasks, progress tracking, and priority management
- **Update task status** when starting work (⏳ Pending → 🔄 In Progress → ✅ Completed)
- **Run tests** before marking tasks complete
- **Update TASKLIST.md** with implementation details and results
- **Use the `library-app-developer` agent** for comprehensive code reviews and task planning

### Current Priority:
1. **Production Readiness**: 3 high-priority tasks in TASKLIST.md (favicon, ESLint, error boundaries)
2. **Core Issues**: ✅ All critical blockers resolved (infinite loading, series validation, React warnings)
3. **Overall Health**: 🟢 Excellent - ready for production after P1 completion

## 🏗️ System Architecture (Current Implementation)

### Technology Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + React Query
- **Backend**: Python FastAPI + SQLModel + SQLite
- **Testing**: Playwright E2E + pytest + React Testing Library  
- **Deployment**: Cross-platform development server with dynamic IP detection
- **Mobile**: Progressive Web App with camera barcode scanning

### Current Feature Status ✅
- ✅ **Book Management**: Add, edit, delete books with metadata enrichment
- ✅ **Series Tracking**: Complete series management with volume tracking
- ✅ **CSV Import**: HandyLib format with metadata enrichment
- ✅ **Barcode Scanning**: Mobile camera support with ISBN detection  
- ✅ **Search & Filter**: Advanced search across books, series, authors
- ✅ **Reading Progress**: Track reading status, progress, ratings
- ✅ **Settings Management**: Configurable metadata sources and preferences
- ✅ **Dynamic IP Support**: Cross-platform networking with HTTPS
- ✅ **Comprehensive Testing**: E2E tests with visual verification

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    BookTarr System                         │
├─────────────────────┬───────────────────────────────────────┤
│   Frontend (React)  │          Backend (FastAPI)           │
│                     │                                       │
│ ┌─────────────────┐ │ ┌───────────────┐ ┌─────────────────┐ │
│ │ Component Layer │ │ │   API Routes  │ │   Data Models   │ │
│ │ - BookCard      │ │ │ - Books       │ │ - Book          │ │  
│ │ - SeriesCard    │ │ │ - Series      │ │ - Edition       │ │
│ │ - Scanner       │ │ │ - Reading     │ │ - Series        │ │
│ │ - Settings      │ │ │ - Import      │ │ - Progress      │ │
│ └─────────────────┘ │ └───────────────┘ └─────────────────┘ │
│                     │                                       │
│ ┌─────────────────┐ │ ┌───────────────┐ ┌─────────────────┐ │
│ │ Service Layer   │ │ │   Services    │ │   External APIs │ │
│ │ - API Client    │ │ │ - Metadata    │ │ - Google Books  │ │
│ │ - State Mgmt    │ │ │ - Import      │ │ - OpenLibrary   │ │
│ │ - Offline Queue │ │ │ - Series      │ │ - AniList       │ │
│ └─────────────────┘ │ └───────────────┘ └─────────────────┘ │
├─────────────────────┴───────────────────────────────────────┤
│                    Database Layer                          │
│   SQLite with SQLModel ORM - Books, Series, Progress       │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 MCP Server Configuration & Best Practices

### Available MCP Servers

This project has the following MCP (Model Context Protocol) servers configured:

#### 1. **playwright** - Browser Automation & Testing
- **Purpose**: Comprehensive browser automation for testing and UI validation
- **Key Commands**:
  - `mcp__playwright__browser_navigate` - Navigate to URLs
  - `mcp__playwright__browser_snapshot` - Capture page accessibility tree
  - `mcp__playwright__browser_click` - Click elements
  - `mcp__playwright__browser_type` - Type text into fields
  - `mcp__playwright__browser_take_screenshot` - Capture screenshots
  - `mcp__playwright__browser_console_messages` - Get console output
- **Best Practices**:
  - Always take snapshots before interacting with elements
  - Use descriptive element descriptions for audit trail
  - Capture screenshots for visual verification
  - Check console messages for JavaScript errors

#### 2. **context7** - Documentation Retrieval
- **Purpose**: Fetch up-to-date documentation for any library or framework
- **Key Commands**:
  - `mcp__context7__resolve-library-id` - Find library IDs (use first)
  - `mcp__context7__get-library-docs` - Retrieve documentation
- **Best Practices**:
  - Always resolve library ID first unless user provides exact format
  - Use for getting current API docs beyond knowledge cutoff
  - Specify topic parameter for focused documentation
  - Use appropriate token limit based on need

#### 3. **sequential-thinking** - Structured Problem Solving
- **Purpose**: Break down complex problems with iterative thinking
- **Key Commands**:
  - `mcp__sequential-thinking__sequentialthinking` - Step-by-step analysis
- **Best Practices**:
  - Use for complex multi-step problems
  - Allow for revision and branching of thoughts
  - Mark thoughts as revisions when reconsidering
  - Continue until satisfactory solution reached

#### 4. **browsermcp** - Simple Browser Control
- **Purpose**: Basic browser automation (simpler alternative to playwright)
- **Key Commands**:
  - `mcp__browsermcp__browser_navigate` - Navigate to URL
  - `mcp__browsermcp__browser_snapshot` - Get page structure
  - `mcp__browsermcp__browser_click` - Click elements
- **Best Practices**:
  - Use for simpler browser tasks
  - Prefer playwright for comprehensive testing
  - Good for quick web interactions

### MCP Usage Guidelines

1. **Tool Naming Convention**: All MCP tools follow format `mcp__[server]__[action]`
2. **Error Handling**: MCP tools may fail - always handle errors gracefully
3. **Performance**: MCP operations may be slow - set appropriate timeouts
4. **Security**: Never store credentials in MCP server configurations
5. **Debugging**: Use verbose output when troubleshooting MCP issues

### Common MCP Workflows

#### Visual Testing Workflow
```
1. Navigate: mcp__playwright__browser_navigate
2. Wait for load: mcp__playwright__browser_wait_for
3. Take snapshot: mcp__playwright__browser_snapshot
4. Interact: mcp__playwright__browser_click/type
5. Screenshot: mcp__playwright__browser_take_screenshot
6. Check errors: mcp__playwright__browser_console_messages
```

#### Documentation Lookup Workflow
```
1. Resolve ID: mcp__context7__resolve-library-id
2. Get docs: mcp__context7__get-library-docs
3. Apply learnings to code
```

#### Problem Solving Workflow
```
1. Define problem clearly
2. Use mcp__sequential-thinking__sequentialthinking
3. Iterate through thoughts
4. Revise as needed
5. Arrive at solution
```

### Troubleshooting MCP Issues

- **Connection Issues**: Check MCP server is running
- **Permission Errors**: Verify MCP has necessary permissions
- **Timeout Errors**: Increase timeout or retry operation
- **Not Found Errors**: Verify resource/element exists
- **Rate Limiting**: Add delays between operations

### MCP Best Practices for BookTarr

1. **Use Playwright for all UI testing** - Ensures consistent test results
2. **Document all browser interactions** - Take screenshots and snapshots
3. **Fetch latest library docs** - Use context7 for current API information
4. **Break down complex features** - Use sequential-thinking for planning
5. **Validate UI changes** - Always verify with browser automation

### Addressing MCP Warnings

When MCP servers show warnings, follow these fix actions:

#### Browser Not Installed Warning (Playwright)
```bash
# If you see "browser not installed" warning:
mcp__playwright__browser_install
```

#### Connection Timeout Warnings
- Increase timeout in operations that may take longer
- Add retry logic for flaky operations
- Check network connectivity

#### Element Not Found Warnings
1. Take snapshot first: `mcp__playwright__browser_snapshot`
2. Verify element exists in snapshot
3. Use correct ref from snapshot
4. Ensure page is fully loaded

#### Resource Not Available Warnings
- Verify MCP server is running
- Check server logs for errors
- Restart MCP server if needed
- Verify resource permissions

### MCP Server Health Checks

Periodically verify MCP servers are functioning:

1. **Playwright Health Check**:
   ```
   - Navigate to a known URL
   - Take a snapshot
   - Verify response
   ```

2. **Context7 Health Check**:
   ```
   - Resolve a known library (e.g., 'react')
   - Verify response format
   ```

3. **Sequential Thinking Health Check**:
   ```
   - Submit simple problem
   - Verify thought process starts
   ```

## Visual Development

### Design Principles
- Comprehensive design checklist in `/context/design-principles.md`
- Brand style guide in `/context/style-guide.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** - Compare against `/context/design-principles.md` and `/context/style-guide.md`
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** - Review any provided context files or requirements
6. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** - Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review
Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

## 🚀 Cross-Platform Development & Deployment

### Current Development Workflow
1. **Dynamic IP Detection**: System automatically detects and configures for current network
2. **Cross-Platform Startup**: Node.js/Python scripts work on Windows, Linux, macOS, containers
3. **HTTPS Generation**: Automatic SSL certificate creation for mobile camera access
4. **Hot Reload**: Both frontend and backend support live development
5. **Comprehensive Testing**: Playwright E2E tests with visual verification

### Development Commands
```bash
# Cross-platform startup (replaces .bat/.ps1 files)
npm run dev                    # Start full development environment
npm run dev:backend           # Backend only  
npm run dev:frontend          # Frontend only
npm run test:e2e              # Run E2E test suite

# Production build
npm run build                 # Build optimized frontend
npm run start:prod           # Production server

# Testing & validation  
npm run test                 # All tests (unit + E2E)
npm run validate            # System health check
```

### Network Architecture (Current)
```
Mobile Device (Any IP)
    ↓ HTTPS (auto-generated cert)
Frontend Server (Dynamic IP:3000)
    ↓ HTTP Proxy (auto-configured)  
Backend Server (0.0.0.0:8000)
    ↓ API Calls
External Services (Google Books, OpenLibrary, AniList)
```

### Key Features Implemented ✅
- ✅ **Dynamic IP Detection**: Works on any network automatically
- ✅ **SSL Certificate Generation**: Programmatic HTTPS for mobile camera
- ✅ **Cross-Platform Scripts**: Replace Windows .bat files with Node.js
- ✅ **Container Ready**: Docker-friendly configuration
- ✅ **Mobile Optimized**: PWA with offline support and camera scanning
- ✅ **Comprehensive Testing**: E2E tests covering all major workflows

### Book Collection Management Features ✅

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

### Backend Issues (RESOLVED)
- ✅ Import path issues fixed - backend now starts properly
- ✅ Series metadata system implemented with complete volume tracking
- ✅ Series details page shows all volumes with owned/missing/wanted status

### Frontend Configuration  
- ✅ Frontend proxies API requests from `/api` to `http://localhost:8000`
- ✅ All API endpoints prefixed with `/api`
- ✅ CORS enabled (should be restricted in production)

---

## 🚨 URGENT Issues Needing Resolution (RESOLVED)

### 1. Series Volume Count Inconsistencies ✅
- **Issue**: Some series show incorrect completion ratios (e.g., "Citrus" showing 9/1 - more owned than total)
- **Root Cause**: Series metadata fetched from external APIs may be incomplete or incorrect
- **Impact**: Misleading completion percentages and user confusion
- **Status**: ✅ RESOLVED - Implemented SeriesValidationService with reconciliation

### 2. Missing Cover Images for Series Volumes ✅
- **Issue**: Volume entries in series details don't show cover images
- **Requirements**:
  - Use existing downloaded images from book data if available (match by ISBN)
  - Download and cache missing cover images to shared storage location
  - Store cover images in same location as book data for consistency
- **Status**: ✅ RESOLVED - Implemented ImageService with cover matching and download

### 3. Series Metadata Quality Control ✅
- **Issue**: External API data (AniList, Google Books) may provide inaccurate volume counts
- **Status**: ✅ RESOLVED - Added validation and manual override capabilities

### 4. Volume Status Synchronization ✅
- **Issue**: Need to ensure series volume status stays in sync with actual book ownership
- **Status**: ✅ RESOLVED - Implemented VolumeSyncService with automatic reconciliation

---

## 🔧 Technical Implementation (COMPLETED)

### Cover Image Management System ✅
```python
# Implemented functions:
async def match_existing_covers_to_volumes(series_name: str) -> Dict[int, str]:
    """Match existing book covers to series volumes by ISBN"""
    
async def download_missing_volume_covers(series_id: int) -> Dict[int, str]:
    """Download missing covers for series volumes"""
    
def get_cover_storage_path(isbn: str) -> str:
    """Get consistent storage path for cover images"""
```

### Series Metadata Validation ✅
```python
async def validate_series_metadata(series_name: str, api_data: Dict) -> Dict:
    """Validate and correct series metadata from external APIs"""
    
async def reconcile_series_with_owned_books(series_name: str) -> Dict:
    """Ensure series volumes match actual book ownership"""
```

### Data Consistency Tools ✅
- Background jobs to maintain data integrity
- User tools to report/fix incorrect series data
- Admin interface for manual series metadata management

---

## 🧪 Testing Framework & Guidelines

### Overview
BookTarr uses a comprehensive testing strategy with both backend and frontend tests to ensure reliability and correctness of all features.

### Backend Testing

#### Test Structure
- **Location**: `backend/tests/`
- **Framework**: pytest with async support
- **Test Types**: Unit tests, integration tests, service tests

#### Running Backend Tests

```bash
# Navigate to backend directory
cd backend

# Run all tests
python run_tests.py

# Run specific test categories
python -m pytest tests/test_series_validation.py -v
python -m pytest tests/test_image_service.py -v
python -m pytest tests/test_volume_sync.py -v

# Run with coverage
python -m pytest tests/ --cov=services --cov=routes --cov-report=html
```

#### Test Categories

1. **Series Validation Tests** (`test_series_validation.py`)
   - Volume count consistency validation
   - Series metadata reconciliation
   - Duplicate volume detection and removal
   - Orphaned volume identification

2. **Image Service Tests** (`test_image_service.py`)
   - Cover image download and caching
   - Image path management
   - Cover matching between books and series volumes
   - Image service configuration

3. **Volume Sync Tests** (`test_volume_sync.py`)
   - Book-to-volume synchronization
   - Ownership status updates
   - Series completion tracking
   - Metadata propagation

#### Writing New Backend Tests

```python
import pytest
from sqlmodel import Session, create_engine, SQLModel

@pytest.fixture
def test_db():
    """Create a test database"""
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    return engine

@pytest.fixture
def test_session(test_db):
    """Create a test session"""
    with Session(test_db) as session:
        yield session

@pytest.mark.asyncio
async def test_your_feature(test_session):
    """Test description"""
    # Test implementation
    assert result == expected
```

### Frontend Testing

#### Test Structure
- **Location**: `frontend/tests/`
- **Framework**: Playwright for E2E tests with screenshots
- **Browser Support**: Chrome, Firefox, Safari, Mobile

#### Running Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (first time only)
npm install
npx playwright install

# Run all E2E tests
npm run test:playwright

# Run specific test suite
npx playwright test tests/csv-import.spec.ts
npx playwright test tests/single-book-addition.spec.ts
npx playwright test tests/series-validation.spec.ts

# Run with UI mode (interactive)
npm run test:playwright:ui

# Run with debug mode
npm run test:playwright:debug

# Run visual tests only
npm run test:visual

# Use the comprehensive test runner
node run-e2e-tests.js
```

#### Test Categories with Screenshots

1. **CSV Import Tests** (`csv-import.spec.ts`)
   - CSV file upload interface
   - CSV parsing and validation
   - Import progress and results
   - Error handling for invalid CSV files
   - **Screenshots**: Upload interface, validation errors, import results

2. **Single Book Addition Tests** (`single-book-addition.spec.ts`)
   - ISBN search functionality
   - Title/author search
   - Metadata enrichment display
   - Manual book entry
   - **Screenshots**: Search forms, metadata display, add confirmation

3. **Series Validation Tests** (`series-validation.spec.ts`)
   - Series list with completion stats
   - Missing book identification
   - Volume status management
   - Series metadata display
   - Cover image handling
   - **Screenshots**: Series list, completion ratios, missing books, volume details

#### Writing New Frontend Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something @visual', async ({ page }) => {
    // Navigate to feature
    await page.click('button:has-text("Feature")');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/feature-screenshot.png',
      fullPage: true 
    });
    
    // Perform assertions
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Test Data Management

#### Backend Test Data
- Tests use in-memory SQLite databases
- Sample data fixtures are created in test setup
- Each test is isolated with its own database session

#### Frontend Test Data
- Tests can create temporary CSV files for upload testing
- Mock data should be realistic but clearly test data
- Screenshots are saved to `test-results/` directory

### Continuous Integration

#### Backend CI
```bash
# In CI environment
cd backend
python -m pytest tests/ --tb=short --strict-markers
```

#### Frontend CI
```bash
# In CI environment
cd frontend
npm run test:playwright -- --reporter=github
```

### Test Maintenance Guidelines

1. **Keep Tests Independent**: Each test should be able to run in isolation
2. **Use Descriptive Names**: Test names should clearly describe what is being tested
3. **Screenshot Everything**: Frontend tests should capture screenshots for visual verification
4. **Mock External APIs**: Use mocks for external API calls in unit tests
5. **Clean Up**: Tests should clean up any created files or data
6. **Regular Updates**: Update tests when features change

### Debugging Tests

#### Backend
```bash
# Run with verbose output
python -m pytest tests/test_file.py -v -s

# Run single test
python -m pytest tests/test_file.py::test_function_name -v

# Run with debugger
python -m pytest tests/test_file.py --pdb
```

#### Frontend
```bash
# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode (step through)
npx playwright test --debug

# Generate test code
npx playwright codegen localhost:3000
```

### Performance Testing

- Backend tests should complete within reasonable time limits
- Frontend tests include network idle waits to ensure proper loading
- Large datasets should use pagination or limiting in tests

### Visual Regression Testing

Frontend tests automatically capture screenshots that can be used for:
- Visual regression detection
- Documentation of UI behavior
- Debugging test failures
- Design review and approval

Screenshots are stored in `frontend/test-results/` and can be compared between test runs.

---

## 🎯 Recent Testing Improvements (Jan 2025)

### ✅ API Endpoint Consistency Resolution
**Issue**: Playwright tests were using different API endpoints than the manual UI, causing inconsistent behavior with cover art and metadata enrichment.

**Root Cause**: 
- Manual import process uses `/api/books/import` endpoint with `CSVImportService().import_handylib_csv()`
- Playwright tests were using `/api/import/csv` endpoint with different implementation
- Different endpoints had different metadata enrichment and cover art fetching behavior

**Resolution**:
1. **Updated all Playwright tests** to use `/api/books/import` endpoint (same as manual process)
2. **Added required parameters** to match manual import:
   - `format`: 'handylib'
   - `field_mapping`: '{}'
   - `skip_duplicates`: 'true' 
   - `enrich_metadata`: 'true'

**Test Files Updated**:
- `frontend/tests/clear-and-import.spec.ts` - Updated all import calls to use production endpoint

### ✅ DELETE Confirmation Security Enhancement
**Issue**: Settings page "Remove All Books & Series" was executing immediately without proper confirmation.

**Implementation**:
1. **Added DELETE confirmation modal** requiring users to type "DELETE" to confirm
2. **Updated test automation** to handle the confirmation popup properly
3. **Enhanced security** by preventing accidental data deletion

**Files Modified**:
- `frontend/src/components/SettingsPage.tsx`:
  - Added modal state management (`showDeleteModal`, `deleteConfirmText`)
  - Created confirmation modal with text input validation
  - Updated button to trigger modal instead of direct execution
- `frontend/tests/clear-and-import.spec.ts`:
  - Updated tests to interact with confirmation modal
  - Added proper wait conditions and input handling

### ✅ Test Timeout Optimization
**Issue**: Import tests were timing out due to metadata enrichment taking longer than default 30s timeout.

**Resolution**:
- Set import test timeout to 120 seconds (2 minutes)
- Set full workflow test timeout to 180 seconds (3 minutes)
- Tests now complete successfully with cover art fetching

### 🔧 Critical Testing Guidelines

#### **Always Use Production API Endpoints in Tests**
All Playwright tests MUST use the same API endpoints that the production UI uses:

```typescript
// ✅ CORRECT - Use same endpoint as manual import
const importResponse = await page.request.post('/api/books/import', {
  multipart: {
    'file': { name: 'file.csv', mimeType: 'text/csv', buffer: fileBuffer },
    'format': 'handylib',
    'field_mapping': '{}',
    'skip_duplicates': 'true',
    'enrich_metadata': 'true'
  }
});

// ❌ INCORRECT - Different endpoint than production
const importResponse = await page.request.post('/api/import/csv', {
  multipart: { 'file': { name: 'file.csv', buffer: fileBuffer } }
});
```

#### **Test Endpoint Verification Process**
Before writing new tests, verify which endpoints the UI actually uses:

1. **Inspect frontend component code** to find the exact API calls
2. **Check network tab** during manual testing to see actual requests
3. **Match test requests exactly** including all form parameters
4. **Verify response format expectations** match between UI and tests

#### **Required Parameters for `/api/books/import`**
When testing CSV import functionality, always include:
- `file`: The CSV file buffer
- `format`: Import format (e.g., 'handylib')
- `field_mapping`: Column mapping configuration (can be '{}' for defaults)
- `skip_duplicates`: Whether to skip duplicate entries ('true'/'false')
- `enrich_metadata`: Whether to fetch metadata from external APIs ('true'/'false')

### 🚀 How to Iterate on Testing

#### **1. Endpoint Discovery Process**
When adding tests for new functionality:

```bash
# 1. Find the frontend component
grep -r "fetch.*api" frontend/src/components/

# 2. Check what parameters it sends
# Look for FormData.append() calls or request body construction

# 3. Verify with manual testing
# Open browser dev tools, perform the action, check Network tab

# 4. Match exactly in tests
# Copy the exact URL, method, and parameters
```

#### **2. Test Development Workflow**
```bash
# 1. Write test using discovered endpoint
npx playwright test new-test.spec.ts --headed --project=chromium

# 2. Debug failures by checking actual vs expected
npx playwright test new-test.spec.ts --debug

# 3. Verify against manual process
# Perform same action manually and compare results

# 4. Update test if discrepancies found
# Ensure test matches manual behavior exactly
```

#### **3. API Endpoint Documentation**
Maintain this mapping of UI actions to API endpoints:

| UI Action | API Endpoint | Required Parameters |
|-----------|-------------|-------------------|
| Manual CSV Import | `POST /api/books/import` | file, format, field_mapping, skip_duplicates, enrich_metadata |
| Clear Books (Settings) | `POST /api/settings/remove-all-data` | confirmation: 'DELETE' |
| Clear Books (Keep Metadata) | `POST /api/settings/clear-books-keep-metadata` | None |
| Book Search | `GET /api/books/search` | q, type |
| Add Single Book | `POST /api/books` | isbn, title, author, etc. |

#### **4. Test Maintenance Checklist**
- [ ] All tests use production API endpoints
- [ ] All required parameters included in requests
- [ ] Response format expectations match UI behavior
- [ ] Test timeouts appropriate for operation duration
- [ ] Screenshots captured for visual verification
- [ ] Error cases tested with realistic scenarios

### 🔍 Debugging Test Failures

#### **Endpoint Mismatch Issues**
If tests pass but manual process behaves differently:
1. **Check API endpoint URLs** - ensure tests use same endpoints as UI
2. **Verify request parameters** - missing parameters cause different behavior
3. **Compare response handling** - ensure tests expect same response format
4. **Check timing** - some operations need appropriate wait times

#### **Common Test Debugging Commands**
```bash
# Run single test with full output
npx playwright test specific-test.spec.ts --headed --project=chromium

# Debug step-by-step
npx playwright test specific-test.spec.ts --debug

# Check what requests are being made
# Add console.log in test to see actual request/response

# Compare with manual process
# Use browser dev tools to see real API calls
```

---

## 🧪 **Testing Status Summary**

### **Current Test Health**: ✅ Excellent
- **Backend Tests**: ✅ API endpoints working, data integrity validated
- **Frontend E2E Tests**: ✅ Comprehensive test suite passing with real data
- **Critical Issues**: ✅ All resolved (API consistency, timeouts, confirmations)
- **Browser Support**: ✅ Chrome/Firefox passing, WebKit minor issues

### **Test Commands**:
```bash
# Backend Tests
cd backend && python run_tests.py

# Frontend E2E Tests
cd frontend && npx playwright test

# Specific Import Test  
npx playwright test tests/clear-and-import.spec.ts
```

**For detailed testing information, see the Testing sections in TASKLIST.md**




---

## 🎨 **Design & UX Status**

### **Current Design Health**: ✅ Excellent
- **Critical Design Issues**: ✅ All resolved (infinite loading, data integrity, React warnings)
- **Responsive Design**: ✅ Mobile-first approach with touch gesture support
- **Visual Hierarchy**: ✅ Clean typography and component structure
- **Browser Compatibility**: ✅ Chrome/Firefox fully functional

**For detailed design findings, tasks, and improvement plans, see TASKLIST.md**

---

## 📚 **Project Summary**

**BookTarr** is a production-ready book collection management system with:
- ✅ **Fully functional core features** (Library, Series, Import, Settings)
- ✅ **Data integrity** (100% valid series completion ratios)
- ✅ **Comprehensive testing suite** (E2E tests with real data)
- ✅ **Cross-platform development** (Dynamic IP, SSL, Node.js scripts)
- ✅ **Mobile responsiveness** (Touch gestures, PWA support)

### **Ready for Production** after completing 3 high-priority tasks in TASKLIST.md:
1. Add favicon and manifest icons
2. Clean up ESLint warnings
3. Implement React error boundaries

---

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing existing files to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

**IMPORTANT**: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
