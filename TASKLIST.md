# BookTarr V2 - Development Tasks

**Last Updated**: March 21, 2026
**Project Status**: Release Hardening - V2 Architecture Complete
**Deployment**: Vercel (booktarr.vercel.app) + Neon PostgreSQL

---

## Recent Changes (March 21, 2026)

### Security & Dependencies
- [x] Upgraded Next.js from 15.1.3 to 16.2.1 (fixed 6 CVEs including critical auth bypass)
- [x] Reduced npm audit vulnerabilities from 16 to 4 (remaining are dev-only esbuild/drizzle-kit)
- [x] Removed duplicate lockfile (apps/web/package-lock.json)

### Authentication & Authorization
- [x] Fixed OAuth provider config - providers now conditionally included only when env vars present
- [x] Added server-side auth check to dashboard layout - unauthenticated users redirected to /login
- [x] Added confirmation requirement to DELETE /api/books/clear (requires `confirm: "DELETE_ALL"`)

### API Hardening
- [x] Added rate limiting to 5 unprotected routes (currently-reading, series/books, enrich-metadata, reconcile, backfill-links)
- [x] Standardized error handling - all API routes now use handleError/Errors pattern
- [x] Added Zod validation to editions route (replacing manual status checks)
- [x] Added Zod validation to series/books route (bookId, volumeNumber)
- [x] Fixed reading progress status validation (z.enum instead of z.string with `as any`)

### Frontend Quality
- [x] Fixed dark mode on login, register, and auth error pages (bg-gray-50 -> bg-background)
- [x] Fixed error alert styling for dark mode across library, series, wishlist pages
- [x] Fixed import manager status badge colors for dark mode
- [x] Created shared API types file (types/api.ts) with BookWithRelations, ReadingStats, etc.
- [x] Replaced unsafe type casts (as any, as unknown) across library, currently-reading, book detail, series pages
- [x] Replaced console.log with structured logger across all services and API routes

---

## Remaining Tasks

### High Priority (Release Blockers)

- [ ] **Fix home page 500 error on Vercel** - Root page (/) returns 500 in production. The redirect logic may fail when auth session check errors. Needs investigation of Vercel runtime logs.
- [ ] **Fix /api/auth/session 500 error** - Session endpoint returns 500 on production. May be related to NEXTAUTH_SECRET or database connection config.
- [ ] **Next.js middleware deprecation** - Next.js 16 warns about "middleware" file convention being deprecated in favor of "proxy". Should migrate before next major version.

### Medium Priority (Quality)

- [ ] **Add pagination to library page** - Currently fetches with `limit: 10000` which loads all books at once. Should implement proper pagination UI.
- [ ] **Fix nav for unauthenticated users** - Shows "U" avatar instead of login/register link when not logged in.
- [ ] **Increase E2E test coverage** - Current tests mostly skip due to missing auth setup. Need proper test fixtures with authenticated user state.
- [ ] **Fix barcode scanner** - ZXing library not installed, actual barcode detection is a placeholder. Install @zxing/browser.

### Low Priority (Enhancements)

- [ ] Collections management
- [ ] Tag system
- [ ] Wishlist management
- [ ] CSV export
- [ ] Theme selector
- [ ] PWA offline support

---

## Verification Status

| Check | Status |
|-------|--------|
| TypeScript (strict mode) | Pass - zero errors |
| Next.js build | Pass - all routes compiled |
| npm audit | 4 moderate (dev-only) |
| Vercel deployment | Builds successfully |
| Health check (/api/health) | Pass - DB connected |
| Login page | Renders correctly |
| Register page | Renders correctly |

---

## Architecture

- **Stack**: Next.js 16 + TypeScript + PostgreSQL (Neon) + Drizzle ORM
- **Auth**: NextAuth.js v5 (beta.30) - Credentials + Google + GitHub OAuth
- **State**: TanStack Query + Zustand
- **UI**: shadcn/ui + Tailwind CSS v4 + Radix UI
- **Testing**: Playwright (E2E) + Vitest (unit)
- **Deployment**: Vercel (app) + Neon (database)
