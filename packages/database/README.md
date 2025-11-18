# @booktarr/database

Production-grade database schema for BookTarr v2 using Drizzle ORM and PostgreSQL.

## Overview

This package provides a comprehensive, type-safe database schema designed with lessons learned from BookTarr v1. The schema is optimized for:

- **Multi-user support** from day 1
- **Scalability** with PostgreSQL and proper indexing
- **Type safety** through Drizzle ORM's TypeScript-first approach
- **Data integrity** with proper normalization and constraints
- **Performance** with strategic denormalization and caching

## Key Improvements Over v1

### 1. Books vs. Editions Separation
**Problem in v1**: One book could have multiple ISBNs/formats, causing confusion
**Solution**: Separate `books` (abstract work) from `editions` (specific format)

```typescript
// One book can have multiple editions
Book: "The Way of Kings"
  ├─ Edition: Hardcover (ISBN: 978-0765326355)
  ├─ Edition: Paperback (ISBN: 978-0765365279)
  ├─ Edition: Kindle (ASIN: B003P2WO5E)
  └─ Edition: Audiobook (ASIN: B003ZWFO7E)
```

### 2. Normalized Authors
**Problem in v1**: Authors stored as text array, duplicates and inconsistencies
**Solution**: Separate `authors` table with many-to-many `book_authors` junction

Benefits:
- Single source of truth for author data
- Supports multiple roles (author, illustrator, translator)
- Easy to query "all books by author X"

### 3. Fixed Series Volume Counting
**Problem in v1**: Series showing "9/1" completion (more owned than total)
**Root Cause**: External APIs provide incomplete/incorrect metadata
**Solution**: Dual tracking with `series_volumes` table

```typescript
series_books: Actual books in user's library
series_volumes: Expected volumes from metadata (AniList, Google Books)
```

This allows:
- Accurate completion percentages
- Detection of missing volumes
- Manual overrides when APIs are wrong

### 4. Built-in Metadata Caching
**Problem in v1**: Repeated API calls for same book data
**Solution**: `metadata_cache` table with TTL

Benefits:
- Reduce API rate limiting issues
- Faster metadata lookups
- Offline-capable metadata access

### 5. Multi-User Design
**Problem in v1**: Single-user only, `user_id` always = 1
**Solution**: Full NextAuth.js integration with roles

Features:
- Email/password + OAuth (Google, GitHub)
- Role-based access control (admin, user, readonly)
- Proper session management

## Schema Design

### Core Entities

#### Users & Authentication
- `users` - User accounts with email/password or OAuth
- `accounts` - OAuth provider accounts (Google, GitHub, etc.)
- `sessions` - Active user sessions (JWT)
- `verification_tokens` - Email verification tokens

#### Books & Content
- `books` - Core book metadata (format-agnostic)
- `authors` - Normalized author entities
- `book_authors` - Many-to-many junction (book ↔ author)
- `editions` - Specific formats/versions of books (ISBN, ASIN, etc.)
- `user_books` - User's collection (owned, wanted, missing)

#### Series
- `series` - Series metadata (name, total volumes, status)
- `series_books` - Links books to series with volume numbers
- `series_volumes` - Expected volumes (for tracking missing ones)

#### Reading & Wishlist
- `reading_progress` - Reading status, progress, ratings, reviews
- `reading_goals` - Annual reading goals (50 books/year, etc.)
- `wishlists` - Books user wants to acquire
- `price_tracking` - Historical price data for wishlist items
- `pre_orders` - Track pre-ordered books

#### Metadata
- `metadata_cache` - Cached API responses from Google Books, OpenLibrary, etc.

## Database Relationships

```
┌─────────┐
│  users  │
└────┬────┘
     │ 1:N
     ├─────────────────┐
     │                 │
┌────▼────┐      ┌─────▼──────┐
│accounts │      │  sessions  │
└─────────┘      └────────────┘

┌──────────┐          ┌─────────┐
│  books   │◄───N:M───┤ authors │
└────┬─────┘          └─────────┘
     │                      ▲
     │ 1:N                  │
     │              (book_authors)
┌────▼─────┐
│ editions │
└────┬─────┘
     │ N:1
     │
┌────▼────────┐
│ user_books  │◄─── users (1:N)
└─────────────┘

┌───────┐          ┌──────────────┐
│series │◄───1:N───┤series_books  │
└───┬───┘          └──────┬───────┘
    │                     │ N:1
    │ 1:N                 ▼
    │              ┌──────────┐
    └──────────────►  books   │
         ▲         └──────────┘
         │ 1:N
   ┌─────┴────────────┐
   │ series_volumes   │
   └──────────────────┘
```

## Usage

### Install Dependencies

```bash
npm install
```

### Environment Variables

```bash
DATABASE_URL=postgresql://booktarr:booktarr@localhost:5432/booktarr
```

### Generate Migrations

```bash
npm run db:generate
```

### Run Migrations

```bash
npm run db:migrate
```

### Push Schema (Development)

```bash
npm run db:push
```

### Drizzle Studio (Database GUI)

```bash
npm run db:studio
```

## Example Queries

### Get all books by an author

```typescript
import { db } from '@booktarr/database';
import { books, authors, bookAuthors } from '@booktarr/database';
import { eq } from 'drizzle-orm';

const authorBooks = await db
  .select()
  .from(books)
  .innerJoin(bookAuthors, eq(books.id, bookAuthors.bookId))
  .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
  .where(eq(authors.name, 'Brandon Sanderson'));
```

### Get user's library with reading progress

```typescript
const userLibrary = await db
  .select()
  .from(userBooks)
  .innerJoin(editions, eq(userBooks.editionId, editions.id))
  .innerJoin(books, eq(editions.bookId, books.id))
  .leftJoin(readingProgress, eq(readingProgress.bookId, books.id))
  .where(eq(userBooks.userId, userId));
```

### Get series completion percentage

```typescript
const seriesCompletion = await db
  .select({
    seriesId: series.id,
    seriesName: series.name,
    totalVolumes: series.totalVolumes,
    ownedVolumes: sql<number>`COUNT(DISTINCT ${seriesBooks.volumeNumber})`,
  })
  .from(series)
  .leftJoin(seriesBooks, eq(series.id, seriesBooks.seriesId))
  .leftJoin(userBooks, eq(seriesBooks.bookId, userBooks.bookId))
  .where(eq(userBooks.userId, userId))
  .groupBy(series.id);
```

## Best Practices

### 1. Always Use Transactions for Multi-Table Updates

```typescript
await db.transaction(async (tx) => {
  const book = await tx.insert(books).values({...}).returning();
  await tx.insert(bookAuthors).values({
    bookId: book.id,
    authorId: authorId,
  });
});
```

### 2. Use Prepared Statements for Repeated Queries

```typescript
const getBookByISBN = db
  .select()
  .from(books)
  .innerJoin(editions, eq(books.id, editions.bookId))
  .where(eq(editions.isbn13, sql.placeholder('isbn')))
  .prepare('get_book_by_isbn');

const result = await getBookByISBN.execute({ isbn: '9780765326355' });
```

### 3. Leverage Metadata Cache

```typescript
// Check cache first
const cached = await db
  .select()
  .from(metadataCache)
  .where(
    and(
      eq(metadataCache.source, 'google_books'),
      eq(metadataCache.identifier, isbn),
      gt(metadataCache.expiresAt, new Date())
    )
  );

if (cached.length > 0) {
  return cached[0].data;
}

// If not cached or expired, fetch from API and cache
const apiData = await fetchFromGoogleBooks(isbn);
await db.insert(metadataCache).values({
  source: 'google_books',
  identifier: isbn,
  identifierType: 'isbn13',
  data: apiData,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
});
```

## Type Safety

All tables have full TypeScript inference:

```typescript
import { books } from '@booktarr/database';

// ✅ Type-safe: All fields inferred
const newBook: typeof books.$inferInsert = {
  title: 'The Way of Kings',
  subtitle: 'The Stormlight Archive, Book One',
  // TypeScript will error if required fields are missing
};

// ✅ Type-safe select
const selectedBook: typeof books.$inferSelect = await db
  .select()
  .from(books)
  .where(eq(books.id, bookId))
  .limit(1);
```

## Performance Considerations

### Indexes
- All foreign keys are indexed
- Common query fields (title, ISBN, status) are indexed
- Compound indexes for common JOIN patterns

### Denormalization
- `reading_goals.booksRead` - Updated via trigger/background job
- `series.totalVolumes` - Cached from external APIs
- Metadata cache reduces API calls

### Query Optimization
- Use `.limit()` for paginated results
- Use `.select()` to fetch only required fields
- Leverage prepared statements for frequent queries
- Use `.leftJoin()` instead of multiple queries

## Migration Strategy

From BookTarr v1:
1. Export existing data to JSON
2. Run new schema migrations
3. Transform and import data using migration scripts
4. Validate data integrity
5. Update application to use new schema

See `../../scripts/migrate-from-v1.ts` for migration tooling.

## License

Private - Part of BookTarr v2
