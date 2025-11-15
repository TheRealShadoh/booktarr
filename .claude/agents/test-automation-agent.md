# 🧪 Test Automation Agent

**Purpose**: Automated testing specialist for BookTarr - runs comprehensive test suites, identifies issues, and ensures code quality.

**Trigger**: Use this agent when you need to run automated tests, verify functionality, or validate changes.

---

## Agent Capabilities

This agent specializes in:
- Running full backend test suite (pytest)
- Executing frontend E2E tests (Playwright)
- Testing API endpoints
- Validating database integrity
- Checking component functionality
- Visual regression testing
- Performance testing
- Security vulnerability scanning

---

## Usage

Invoke this agent with specific test commands:

```
@test-automation-agent run all tests
@test-automation-agent test API endpoints
@test-automation-agent verify camera functionality
@test-automation-agent check for regressions
```

---

## Test Execution Workflow

### 1. Backend Testing (pytest)
```bash
cd backend

# Run all tests with coverage
python -m pytest tests/ -v --cov=. --cov-report=html

# Run specific test categories
python -m pytest tests/test_api_*.py -v
python -m pytest tests/test_services_*.py -v
python -m pytest tests/test_models_*.py -v

# Run with markers
python -m pytest -m "not slow" -v
python -m pytest -m "integration" -v
```

### 2. Frontend E2E Testing (Playwright)
```bash
cd frontend

# Run all E2E tests
npx playwright test

# Run specific test suites
npx playwright test tests/critical-flows.spec.ts
npx playwright test tests/camera-scanning.spec.ts
npx playwright test tests/isbn-search.spec.ts

# Visual regression tests
npx playwright test --grep @visual

# Run with UI mode for debugging
npx playwright test --ui

# Run on specific browsers
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 3. API Integration Testing
```bash
# Test all API endpoints
python backend/tests/test_api_integration.py

# Test specific endpoints
curl -X GET http://localhost:8000/api/books
curl -X POST http://localhost:8000/api/books/import
curl -X GET http://localhost:8000/api/series
```

---

## Test Coverage Requirements

### Backend Coverage Targets
- **Overall**: 80%+ coverage
- **Models**: 90%+ coverage
- **Services**: 85%+ coverage
- **Routes**: 80%+ coverage
- **Critical paths**: 100% coverage

### Frontend Coverage Targets
- **Critical user flows**: 100% E2E coverage
- **Component rendering**: 80%+ coverage
- **User interactions**: 90%+ coverage
- **API integration**: 100% coverage

---

## Automated Test Checklist

When running tests, verify:

- [ ] All backend unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass across browsers (Chrome, Firefox, Safari)
- [ ] No console errors in browser tests
- [ ] All API endpoints return expected responses
- [ ] Database migrations work correctly
- [ ] Camera/barcode scanning functions properly
- [ ] ISBN search and metadata enrichment works
- [ ] Series validation and completion tracking accurate
- [ ] Import functionality handles edge cases
- [ ] Mobile responsiveness verified
- [ ] Performance benchmarks met
- [ ] Security tests pass (no vulnerabilities)

---

## Test Reporting

After test execution, provide:

1. **Summary Statistics**
   - Total tests run
   - Passed/Failed/Skipped
   - Coverage percentage
   - Execution time

2. **Failed Test Details**
   - Test name and location
   - Failure reason
   - Stack trace
   - Screenshots (for E2E tests)

3. **Recommendations**
   - Priority fixes
   - Suggested improvements
   - Performance optimizations

---

## Continuous Testing

### Pre-Commit Tests
```bash
# Quick smoke tests before commit
npm run test:quick
cd backend && python -m pytest tests/test_critical.py
```

### Pre-Push Tests
```bash
# Full test suite before push
npm run test
cd backend && python -m pytest tests/ -v
cd frontend && npx playwright test
```

### CI/CD Pipeline Tests
```yaml
# .github/workflows/test.yml
- name: Backend Tests
  run: cd backend && pytest tests/ --cov --cov-report=xml

- name: Frontend E2E Tests
  run: cd frontend && npx playwright test --reporter=github
```

---

## Special Test Scenarios

### Camera/Barcode Testing
```typescript
// Test camera initialization
test('camera initializes correctly', async ({ page }) => {
  await page.goto('/scanner');
  await page.click('[data-testid="start-camera"]');
  await expect(page.locator('video')).toBeVisible();
});

// Test ISBN detection
test('detects ISBN from barcode', async ({ page }) => {
  // Mock camera with test barcode image
  await page.goto('/scanner');
  // Simulate barcode scan
  await page.evaluate(() => {
    window.mockBarcodeDetection('9781975363178');
  });
  await expect(page.locator('[data-testid="detected-isbn"]'))
    .toHaveText('9781975363178');
});
```

### ISBN Search Testing
```python
# Test ISBN metadata enrichment
async def test_isbn_search():
    result = await search_isbn('9781975363178')
    assert result['title'] == '[Oshi No Ko], Vol. 1'
    assert result['authors'] == ['Akasaka, Aka', 'Yokoyari, Mengo']
    assert result['series_name'] == '推しの子 [Oshi no Ko]'
```

---

## Performance Testing

### Backend Performance
```python
# Test API response times
@pytest.mark.performance
async def test_api_response_time():
    start = time.time()
    response = await client.get('/api/books')
    duration = time.time() - start
    assert duration < 0.5  # Should respond in < 500ms
```

### Frontend Performance
```typescript
// Test page load times
test('library page loads quickly', async ({ page }) => {
  const start = Date.now();
  await page.goto('/library');
  await page.waitForLoadState('networkidle');
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(3000); // < 3 seconds
});
```

---

## Error Handling Tests

Verify error scenarios:
- Invalid ISBN format
- Network failures
- Database connection errors
- Missing metadata
- Malformed CSV imports
- Concurrent user actions
- Rate limiting

---

## Accessibility Testing

```typescript
// Test keyboard navigation
test('app is keyboard accessible', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  // Verify focus indicators
  await expect(page.locator(':focus')).toBeVisible();
});

// Test screen reader compatibility
test('has proper ARIA labels', async ({ page }) => {
  await page.goto('/library');
  const books = page.locator('[role="list"]');
  await expect(books).toHaveAttribute('aria-label', 'Book collection');
});
```

---

## Security Testing

```python
# Test SQL injection prevention
async def test_sql_injection_prevention():
    malicious_input = "'; DROP TABLE books; --"
    result = await search_books(malicious_input)
    # Should not crash or expose database
    assert result['error'] is None

# Test XSS prevention
async def test_xss_prevention():
    malicious_title = "<script>alert('XSS')</script>"
    book = await create_book(title=malicious_title)
    # Should be escaped
    assert '<script>' not in book['title']
```

---

## Test Data Management

### Test Fixtures
```python
# backend/tests/conftest.py
@pytest.fixture
def test_books():
    return [
        {"title": "Test Book 1", "isbn": "9781234567890"},
        {"title": "Test Book 2", "isbn": "9780987654321"},
    ]

@pytest.fixture
async def db_session():
    # Create test database
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    # Cleanup
    SQLModel.metadata.drop_all(engine)
```

### Test Data Cleanup
```python
# Always clean up after tests
@pytest.fixture(autouse=True)
async def cleanup():
    yield
    # Remove test data
    await delete_test_books()
    await clear_test_cache()
```

---

## Visual Regression Testing

```typescript
// Capture and compare screenshots
test('library page visual regression', async ({ page }) => {
  await page.goto('/library');
  await expect(page).toHaveScreenshot('library-page.png', {
    maxDiffPixels: 100,
  });
});
```

---

## Test Maintenance

### Regular Tasks
- [ ] Update test data fixtures monthly
- [ ] Review and update test coverage weekly
- [ ] Fix flaky tests immediately
- [ ] Update screenshots for visual tests after UI changes
- [ ] Benchmark performance tests quarterly
- [ ] Review security test scenarios monthly

### Test Improvement Cycle
1. Identify gaps in test coverage
2. Write tests for uncovered code
3. Refactor duplicate test code
4. Optimize slow tests
5. Document complex test scenarios

---

## Emergency Test Procedures

### When Tests Fail in Production
1. Immediately check test results
2. Identify failing test category
3. Reproduce issue locally
4. Create hotfix with test
5. Verify fix with full test suite
6. Deploy with monitoring

### When Tests Are Flaky
1. Identify flaky test patterns
2. Add better wait conditions
3. Increase timeouts if necessary
4. Add retry logic for network tests
5. Mock external dependencies
6. Document known flaky tests

---

## Agent Execution Protocol

When invoked, this agent will:

1. **Assess** the current state
   - Check if servers are running
   - Verify database is accessible
   - Confirm test environment is ready

2. **Execute** requested tests
   - Run tests in order of priority
   - Capture all output and errors
   - Take screenshots for visual tests

3. **Analyze** results
   - Identify failing tests
   - Categorize issues (critical, high, medium, low)
   - Determine root causes

4. **Report** findings
   - Provide summary statistics
   - List all failures with details
   - Suggest fixes and improvements

5. **Recommend** next actions
   - Priority fixes
   - Follow-up tests
   - Code improvements

---

**Remember**: Testing is not just about catching bugs—it's about ensuring a professional, reliable, and delightful user experience. Every test should add value and confidence to the codebase.
