# BookTarr V2 - Development Tasks

**Last Updated**: March 22, 2026
**Project Status**: Production Ready - All Features Implemented
**Deployment**: Vercel (booktarr.vercel.app) + Neon PostgreSQL

---

## All Features Complete

### Core Features
- [x] Login/Register (email + password)
- [x] Library page (books with covers, authors, series badges, search, filters)
- [x] Add book by ISBN (Google Books + OpenLibrary metadata)
- [x] Add book by title search (with search results preview)
- [x] Barcode scanner (ZXing library, camera permissions fixed)
- [x] CSV import (HandyLib format, synchronous with progress, auto-enrichment)
- [x] Book detail page (metadata, editions, reading progress)
- [x] Series management (create, search, enrich from AniList, reconcile)
- [x] Series auto-detection from book titles
- [x] Currently Reading (stats cards, empty state)
- [x] Wishlist (add books with wanted status)
- [x] Reading progress tracking (want to read, currently reading, finished, DNF, on hold)

### Library Sharing
- [x] Share library with other users (view/edit permissions)
- [x] Acceptance flow (pending → accept/reject)
- [x] Admin force share
- [x] User picker dropdown (shows all registered users)
- [x] "Show Shared" toggle on library page (purple "From [Name]" badges)
- [x] Pending share notification dot on nav avatar

### Settings
- [x] Account info (name, email, role display)
- [x] Metadata Sources (Google Books, OpenLibrary, AniList status)
- [x] Import & Export (CSV and JSON export)
- [x] Metadata Enrichment (batch enrichment with status)
- [x] Library Sharing management
- [x] Data Management (clear all books with confirmation)

### Infrastructure
- [x] Neon PostgreSQL with 19 tables
- [x] neon-http driver (all queries rewritten for compatibility)
- [x] Dark mode across all pages
- [x] Mobile hamburger menu
- [x] Camera permissions (Permissions-Policy: camera=(self))
- [x] Rate limiting on all API routes
- [x] Zod validation on all inputs
- [x] Structured logging (no console.log)
- [x] Auto-enrichment after CSV import
