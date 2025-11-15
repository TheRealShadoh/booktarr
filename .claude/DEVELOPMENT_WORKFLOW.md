# 🔄 BookTarr Development Workflow

**Purpose**: Comprehensive guide for developing, testing, and deploying BookTarr features professionally.

**Last Updated**: November 15, 2025

---

## 📋 Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Daily Development Workflow](#daily-development-workflow)
3. [Feature Development Process](#feature-development-process)
4. [Testing Workflow](#testing-workflow)
5. [Code Review Process](#code-review-process)
6. [Deployment Process](#deployment-process)
7. [Troubleshooting](#troubleshooting)

---

## 🛠️ Development Environment Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm 7+
- Git
- VS Code (recommended) or your preferred IDE

### Initial Setup
```bash
# 1. Clone repository
git clone https://github.com/your-username/booktarr.git
cd booktarr

# 2. Install dependencies
npm install                          # Root dependencies
pip3 install -r backend/requirements.txt
cd frontend && npm install

# 3. Set up environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env files with your API keys

# 4. Initialize database
cd backend
python3 << EOF
from database import init_db
init_db()
print("Database initialized!")
EOF

# 5. Start development servers
npm run dev  # Starts both frontend and backend
```

### IDE Configuration

#### VS Code Extensions
- Python
- Pylance
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- GitLens
- Better Comments

#### VS Code Settings
```json
{
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 📅 Daily Development Workflow

### Morning Routine
```bash
# 1. Update local repository
git checkout main
git pull origin main

# 2. Create/switch to feature branch
git checkout -b feature/your-feature-name
# OR
git checkout feature/existing-feature

# 3. Check for dependency updates
npm outdated
cd backend && pip list --outdated

# 4. Start development servers
npm run dev

# 5. Run tests to ensure baseline
npm run test:quick
```

### During Development
```bash
# Make changes to code
# Save frequently (auto-format on save)

# Run relevant tests frequently
npm run test:watch  # Frontend tests
cd backend && pytest tests/ -v  # Backend tests

# Check linting
npm run lint
cd backend && flake8 .

# Commit frequently with meaningful messages
git add .
git commit -m "feat: add book filtering by genre"
```

### Evening Routine
```bash
# 1. Run full test suite
npm test

# 2. Check code quality
npm run lint
cd backend && flake8 . && mypy .

# 3. Commit final changes
git add .
git commit -m "feat: complete genre filtering feature"

# 4. Push to remote
git push origin feature/your-feature-name

# 5. Create pull request (if feature complete)
# Use GitHub web interface or gh CLI
```

---

## 🚀 Feature Development Process

### Step 1: Plan the Feature (1-2 hours)

**Create Feature Specification**
```markdown
# Feature: Genre-Based Book Filtering

## User Story
As a book collector
I want to filter my books by genre
So that I can easily find books in specific categories

## Acceptance Criteria
- [ ] User can select one or more genres from dropdown
- [ ] Book list updates in real-time as genres are selected
- [ ] Genre filter persists across page refreshes
- [ ] Shows count of books per genre
- [ ] Works on mobile devices

## Technical Design
**Backend Changes**:
- Add `genres` field to Book model (List[str])
- Create GET /api/genres endpoint
- Modify GET /api/books to accept genre filter

**Frontend Changes**:
- Create GenreFilter component
- Add genre state to URL params
- Update BookList to filter by genre
- Add genre chips to book cards

## Estimated Effort: 4-6 hours
```

**Break Down Tasks**
- [ ] Backend: Add genres field to Book model (30 min)
- [ ] Backend: Create genres endpoint (30 min)
- [ ] Backend: Update books endpoint with genre filter (1 hour)
- [ ] Backend: Write tests (1 hour)
- [ ] Frontend: Create GenreFilter component (1 hour)
- [ ] Frontend: Integrate with BookList (30 min)
- [ ] Frontend: Add URL params (30 min)
- [ ] Frontend: Write E2E tests (1 hour)
- [ ] Testing & polish (1 hour)

### Step 2: Implement Backend (2-3 hours)

**1. Update Models**
```python
# backend/models/book.py
from typing import List, Optional
from sqlmodel import Field, SQLModel

class Book(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    authors: List[str]
    genres: List[str] = Field(default_factory=list)  # NEW
    # ... other fields
```

**2. Create Service Function**
```python
# backend/services/book_service.py
async def get_books_by_genre(
    genre: str,
    session: Session
) -> List[Book]:
    """Get all books in a specific genre."""
    books = await session.exec(
        select(Book).where(Book.genres.contains([genre]))
    ).all()
    return books

async def get_all_genres(session: Session) -> List[str]:
    """Get list of all unique genres."""
    books = await session.exec(select(Book)).all()
    genres = set()
    for book in books:
        genres.update(book.genres)
    return sorted(list(genres))
```

**3. Create API Endpoint**
```python
# backend/routes/books.py
@router.get("/api/genres")
async def get_genres(session: Session = Depends(get_session)):
    """Get list of all genres."""
    genres = await get_all_genres(session)
    return {"genres": genres}

@router.get("/api/books")
async def get_books(
    genre: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get books, optionally filtered by genre."""
    if genre:
        books = await get_books_by_genre(genre, session)
    else:
        books = await session.exec(select(Book)).all()
    return {"books": books}
```

**4. Write Tests**
```python
# backend/tests/test_genres.py
import pytest
from services.book_service import get_all_genres, get_books_by_genre

@pytest.mark.asyncio
async def test_get_all_genres(session, sample_books):
    genres = await get_all_genres(session)
    assert "Fantasy" in genres
    assert "Science Fiction" in genres

@pytest.mark.asyncio
async def test_get_books_by_genre(session, sample_books):
    books = await get_books_by_genre("Fantasy", session)
    assert len(books) > 0
    assert all("Fantasy" in book.genres for book in books)
```

### Step 3: Implement Frontend (2-3 hours)

**1. Create Component**
```typescript
// frontend/src/components/GenreFilter.tsx
import { useQuery } from '@tanstack/react-query';

interface GenreFilterProps {
  selected: string[];
  onChange: (genres: string[]) => void;
}

export function GenreFilter({ selected, onChange }: GenreFilterProps) {
  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: () => fetch('/api/genres').then(r => r.json()),
  });

  const toggleGenre = (genre: string) => {
    if (selected.includes(genre)) {
      onChange(selected.filter(g => g !== genre));
    } else {
      onChange([...selected, genre]);
    }
  };

  return (
    <div className="genre-filter">
      <h3>Filter by Genre</h3>
      {genres?.genres.map((genre: string) => (
        <button
          key={genre}
          onClick={() => toggleGenre(genre)}
          className={selected.includes(genre) ? 'active' : ''}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}
```

**2. Integrate with Page**
```typescript
// frontend/src/pages/LibraryPage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GenreFilter } from '../components/GenreFilter';

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Load from URL params
  useEffect(() => {
    const genres = searchParams.get('genres')?.split(',') || [];
    setSelectedGenres(genres.filter(Boolean));
  }, [searchParams]);

  // Update URL params
  const handleGenreChange = (genres: string[]) => {
    setSelectedGenres(genres);
    if (genres.length > 0) {
      searchParams.set('genres', genres.join(','));
    } else {
      searchParams.delete('genres');
    }
    setSearchParams(searchParams);
  };

  // Fetch books with genre filter
  const { data: books } = useBooks({ genres: selectedGenres });

  return (
    <div>
      <GenreFilter selected={selectedGenres} onChange={handleGenreChange} />
      <BookList books={books} />
    </div>
  );
}
```

**3. Write Tests**
```typescript
// frontend/tests/genre-filter.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Genre Filter', () => {
  test('shows all available genres', async ({ page }) => {
    await page.goto('/library');

    await expect(page.locator('.genre-filter button')).toHaveCount(10);
    await expect(page.locator('.genre-filter')).toContainText('Fantasy');
    await expect(page.locator('.genre-filter')).toContainText('Science Fiction');
  });

  test('filters books when genre selected', async ({ page }) => {
    await page.goto('/library');

    // Click Fantasy genre
    await page.click('button:has-text("Fantasy")');

    // Wait for books to update
    await page.waitForResponse(/\/api\/books/);

    // Verify only fantasy books shown
    const books = page.locator('.book-card');
    await expect(books).toHaveCountGreaterThan(0);

    // Verify all books have Fantasy genre
    for (const book of await books.all()) {
      await expect(book.locator('.genres')).toContainText('Fantasy');
    }
  });

  test('persists filter in URL', async ({ page }) => {
    await page.goto('/library');
    await page.click('button:has-text("Fantasy")');

    // Check URL updated
    await expect(page).toHaveURL(/genres=Fantasy/);

    // Reload page
    await page.reload();

    // Verify filter still active
    await expect(page.locator('button:has-text("Fantasy")')).toHaveClass(/active/);
  });
});
```

### Step 4: Test & Polish (1-2 hours)

**Run All Tests**
```bash
# Backend
cd backend && pytest tests/ -v --cov

# Frontend
cd frontend && npm run test:playwright

# Manual testing
# - Test on Chrome, Firefox, Safari
# - Test on mobile device
# - Test edge cases (no genres, all genres, etc.)
```

**Polish UI**
- Add loading states
- Add empty states
- Ensure responsive design
- Add animations
- Check accessibility

---

## 🧪 Testing Workflow

### Backend Testing

**Run Tests**
```bash
cd backend

# All tests
pytest tests/ -v

# Specific test file
pytest tests/test_genres.py -v

# Specific test
pytest tests/test_genres.py::test_get_all_genres -v

# With coverage
pytest tests/ --cov=. --cov-report=html

# Fast tests only (skip slow)
pytest -m "not slow" -v
```

**Write Good Tests**
```python
# Follow AAA pattern: Arrange, Act, Assert

@pytest.mark.asyncio
async def test_create_book(session):
    # Arrange
    book_data = {
        "title": "Test Book",
        "isbn": "9781234567890"
    }

    # Act
    book = await create_book(book_data, session)

    # Assert
    assert book.id is not None
    assert book.title == "Test Book"
    assert book.isbn == "9781234567890"

# Use fixtures for common setup
@pytest.fixture
async def sample_book(session):
    book = Book(title="Sample", isbn="9780000000000")
    session.add(book)
    await session.commit()
    return book

# Clean up after tests
@pytest.fixture(autouse=True)
async def cleanup(session):
    yield
    # Delete all test data
    await session.exec(delete(Book))
    await session.commit()
```

### Frontend Testing

**E2E Tests with Playwright**
```bash
cd frontend

# All tests
npx playwright test

# Specific test
npx playwright test tests/genre-filter.spec.ts

# With UI (interactive)
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Specific browser
npx playwright test --project=chromium
```

**Write Good E2E Tests**
```typescript
// Use data-testid for reliable selectors
<button data-testid="add-book-button">Add Book</button>

test('adds new book', async ({ page }) => {
  await page.goto('/library');
  await page.click('[data-testid="add-book-button"]');
  // ... rest of test
});

// Wait for network requests
test('loads books', async ({ page }) => {
  await page.goto('/library');

  // Wait for API call
  await page.waitForResponse(/\/api\/books/);

  // Now assert
  await expect(page.locator('.book-card')).toHaveCount(10);
});

// Take screenshots
test('library page layout', async ({ page }) => {
  await page.goto('/library');
  await expect(page).toHaveScreenshot('library.png');
});
```

---

## 👀 Code Review Process

### Before Requesting Review

```bash
# 1. Self-review your changes
git diff main...HEAD

# 2. Run all tests
npm test

# 3. Check linting
npm run lint

# 4. Update documentation
# - Update CHANGELOG.md
# - Update relevant README sections
# - Add/update code comments

# 5. Create clear PR description
# Use the PR template
```

### PR Description Template
```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Added genre filtering to book list
- Created GenreFilter component
- Updated Book model with genres field

## Testing Done
- [x] Unit tests added/updated
- [x] E2E tests added/updated
- [x] Manual testing on Chrome, Firefox, Safari
- [x] Mobile testing on iOS and Android

## Screenshots
[Add before/after screenshots for UI changes]

## Checklist
- [x] Code follows project style guidelines
- [x] Tests pass locally
- [x] Documentation updated
- [x] No console errors or warnings
- [x] Accessible (keyboard navigation, screen readers)
- [x] Responsive (mobile, tablet, desktop)
```

---

## 🚀 Deployment Process

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version number bumped
- [ ] Database migrations created (if needed)
- [ ] Environment variables documented

### Deployment Steps

```bash
# 1. Merge to main
git checkout main
git merge --no-ff feature/your-feature
git push origin main

# 2. Tag release
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0

# 3. Build production bundle
npm run build

# 4. Run database migrations
cd backend
alembic upgrade head

# 5. Deploy (depends on platform)
# For Docker:
docker build -t booktarr:1.2.0 .
docker push booktarr:1.2.0

# For PaaS (Heroku, Railway, etc.):
git push heroku main

# 6. Verify deployment
curl https://your-app.com/api/health
# Open browser and test critical flows

# 7. Monitor for errors
# Check logs, error tracking, analytics
```

---

## 🔧 Troubleshooting

### Common Issues

**Backend won't start**
```bash
# Check if port is in use
lsof -ti:8000 | xargs kill -9

# Check database
ls -lh backend/booktarr.db

# Reinstall dependencies
pip3 install -r backend/requirements.txt

# Check Python version
python3 --version  # Should be 3.11+
```

**Frontend won't compile**
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+

# Try with verbose output
npm start -- --verbose
```

**Tests failing**
```bash
# Clear test cache
pytest --cache-clear

# Run specific failing test
pytest tests/test_file.py::test_name -vv

# Check for port conflicts
# Make sure dev servers aren't running
```

---

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [Python Testing Best Practices](https://docs.pytest.org/)

---

**Remember**: Good development is iterative. Start small, test often, commit frequently, and always keep the user experience in mind.
