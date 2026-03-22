# BookTarr V2 - Development Tasks

**Last Updated**: March 22, 2026
**Project Status**: Feature Complete - Production Ready
**Deployment**: Vercel (booktarr.vercel.app) + Neon PostgreSQL

---

## Session Summary (March 21-22, 2026)

### Major Features Implemented
- [x] Real barcode scanner with ZXing library
- [x] Search results preview before adding books
- [x] Library sharing system (view/edit permissions, acceptance flow, admin force-share)
- [x] Create Series dialog with type selector
- [x] Wishlist add-book with status=wanted

### Infrastructure Fixes
- [x] Switched to neon-http driver (Vercel serverless compatible)
- [x] Rewrote ALL multi-table join queries for neon-http compatibility
- [x] Ran database migrations on Neon (all 18 + library_shares = 19 tables)
- [x] Fixed book creation: authors linked, covers saved, metadata cached
- [x] Fixed CSV import for HandyLib format (semicolon authors, Volume column, cover URLs)
- [x] Node.js version pinned to 20.x/22.x
- [x] OAuth buttons hidden when providers not configured
- [x] Dark mode fixes across all pages
- [x] API hardening (rate limiting, Zod validation, standardized error handling)
- [x] Replaced console.log with structured logger

### Working Features
| Feature | Status |
|---------|--------|
| Register/Login | Working |
| Library page | Working (books, covers, authors, search, filters) |
| Add book by ISBN | Working (Google Books + OpenLibrary) |
| Add book by title | Working (with search preview) |
| Barcode scanner | Working (ZXing) |
| CSV import (HandyLib) | Fixed (author splitting, volumes, covers) |
| Series page | Working (create, search, enrich, reconcile) |
| Currently Reading | Working (empty state, progress tracking) |
| Wishlist | Working (add with wanted status) |
| Settings | Working (enrichment, sharing, clear books) |
| Library Sharing | Working (invite, accept/reject, revoke, admin force) |
| Show Shared toggle | Working (merged view with owner badges) |
| Health check | Stable (neon-http, 4ms latency) |
| Dark mode | Working across all pages |

### Known Limitations
- First request after cold start may be slow (~2-3s)
- Foreign key constraints not applied on Neon (tables work but no cascade deletes)
- Settings "Account", "Metadata Sources", "Import & Export" sections are placeholders
- No pagination on library page (loads up to 100 books)
