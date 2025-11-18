# BookTarr V2 Testing Guide

This document describes the testing strategy and how to run tests for BookTarr V2.

## Test Structure

### 1. E2E Tests (Playwright)
**Location**: `apps/web/e2e/`

**Test Files**:
- `auth.spec.ts` - Authentication flow tests
- `library.spec.ts` - Library page tests
- `series.spec.ts` - Series page tests
- `reading-progress.spec.ts` - Reading progress tests
- `main-user-journey.spec.ts` - Complete user journey tests

### 2. API Integration Tests (Vitest)
**Location**: `apps/web/src/tests/api/`

**Test Files**:
- `auth.api.test.ts` - Authentication API tests
- `books.api.test.ts` - Books API tests
- `series.api.test.ts` - Series API tests

---

## Running Tests

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/main-user-journey.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### API Integration Tests (Vitest)

```bash
# Run all unit/integration tests
npm run test

# Run in UI mode
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest src/tests/api/books.api.test.ts

# Run in watch mode
npx vitest --watch
```

---

## Test Coverage

### E2E Test Coverage

#### Authentication
- ✅ Display login page
- ✅ Navigate to register page
- ✅ Show validation errors
- ✅ Complete registration flow
- ✅ Login with valid credentials

#### Main User Journey
- ✅ Register new user
- ✅ Navigate to library
- ✅ Browse series
- ✅ Add books
- ✅ Navigate between pages

#### Library Page
- ✅ Display library elements
- ✅ Load book grid
- ✅ Search functionality

#### Series Page
- ✅ Display series list
- ✅ Show completion stats
- ✅ Navigate to series details

### API Test Coverage

#### Authentication API
- ✅ User registration with validation
- ✅ Email format validation
- ✅ Password strength validation
- ✅ Prevent duplicate emails
- ✅ User login with correct credentials
- ✅ Reject invalid passwords
- ✅ Password hashing with bcrypt
- ✅ User role management

#### Books API
- ✅ Create new book
- ✅ Validate required fields
- ✅ Validate ISBN format
- ✅ List all books
- ✅ Pagination support
- ✅ Get book by ID
- ✅ Return 404 for non-existent book
- ✅ Delete book
- ✅ Search books by title/ISBN

#### Series API
- ✅ Create new series
- ✅ Validate required fields
- ✅ List all series
- ✅ Get series by ID with books
- ✅ Update series properties
- ✅ Add book to series
- ✅ Delete series
- ✅ Cascade delete series books

---

## Writing New Tests

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page');
  });

  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/path');

    // Interact
    await page.getByRole('button', { name: /click me/i }).click();

    // Assert
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### API Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { db } from '../../lib/db';

describe('API Feature', () => {
  it('should test something', async () => {
    // Arrange
    const testData = { name: 'Test' };

    // Act
    const result = await db.insert(table).values(testData);

    // Assert
    expect(result).toBeDefined();
  });
});
```

---

## Test Best Practices

### General
1. **Keep tests simple** - One test should test one thing
2. **Use descriptive names** - Test names should describe what they test
3. **Clean up after tests** - Remove test data in `afterAll`/`afterEach`
4. **Avoid hardcoded waits** - Use Playwright's auto-waiting features
5. **Mock external APIs** - Don't call real external services in tests

### E2E Tests
1. **Use semantic selectors** - Prefer `getByRole`, `getByLabel` over CSS selectors
2. **Test user journeys** - Test complete flows, not just isolated components
3. **Handle auth states** - Set up auth in `beforeEach` if needed
4. **Take screenshots on failure** - Playwright does this automatically
5. **Test responsive design** - Use viewport sizes to test mobile/desktop

### API Tests
1. **Test validation** - Ensure API validates input correctly
2. **Test error cases** - Not just happy paths
3. **Use transactions** - Rollback database changes after tests
4. **Test edge cases** - Empty results, null values, etc.
5. **Verify HTTP status codes** - When testing actual HTTP endpoints

---

## Continuous Integration

### GitHub Actions
Tests run automatically on:
- Pull requests
- Push to main branch
- Manual workflow dispatch

### Running Tests Locally Before Commit

```bash
# Run all tests
npm run test && npm run test:e2e

# Quick check (unit tests only)
npm run test

# Full validation
npm run lint && npm run test && npm run test:e2e
```

---

## Debugging Failed Tests

### Playwright
```bash
# Run with debugger
npx playwright test --debug

# Run specific test in headed mode
npx playwright test e2e/auth.spec.ts --headed

# View trace
npx playwright show-trace trace.zip
```

### Vitest
```bash
# Run with verbose output
npx vitest --reporter=verbose

# Run single test
npx vitest -t "test name"

# Debug with Node debugger
node --inspect-brk ./node_modules/.bin/vitest
```

---

## Test Data

### Test Users
Tests create temporary users with unique emails:
```typescript
const testEmail = `test-${Date.now()}@example.com`;
```

### Test Books
Sample test books are created in test setup:
```typescript
{
  title: 'Test Book',
  isbn13: '9781234567890',
  description: 'A test book'
}
```

### Cleanup
All test data is automatically cleaned up in `afterAll` hooks.

---

## Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: All user journeys covered

---

## Troubleshooting

### Common Issues

#### Playwright: "Browser not found"
```bash
npx playwright install
```

#### Vitest: "Module not found"
```bash
npm install
```

#### Database connection errors
```bash
# Ensure PostgreSQL is running
docker-compose up -d postgres

# Run migrations
npm run db:migrate
```

#### Tests timing out
- Increase timeout in test file:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

---

## Next Steps

### Planned Test Additions
- ❌ Barcode scanner tests (pending implementation)
- ❌ Visual regression tests
- ❌ Performance tests
- ❌ Accessibility tests
- ❌ Mobile-specific tests

---

For more information, see:
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
