# 📚 BookTarr V2: Full-Stack Book Collection Management System

**Current Status**: V2 architecture complete (50%) - Modern Next.js 15 monorepo with PostgreSQL database. Migrated from V1 (Python FastAPI + React).

## 🚨 **MIGRATION STATUS**

**Date**: 2025-01-18
**V1 Status**: ✅ Removed - All V1 files deleted except `sample_data/HandyLib.csv`
**V2 Status**: ⏳ 50% Complete - Core backend and frontend done, features in progress
**Next Steps**: See `V1_FEATURES_TO_MIGRATE.md` for full feature list to implement

---

## 📋 **Task Management**

**IMPORTANT**: All development tasks are managed in `TASKLIST.md` - the single source of truth for task tracking, progress, and priorities.

### Task Management Guidelines:
- **Always use `TASKLIST.md`** for recording tasks, progress tracking, and priority management
- **Update task status** when starting work (⏳ Pending → 🔄 In Progress → ✅ Completed)
- **Run tests** before marking tasks complete
- **Update TASKLIST.md** with implementation details and results
- **Use the `library-app-developer` agent** for comprehensive code reviews and task planning

---

## 🏗️ **V2 System Architecture**

### **Technology Stack**

| Layer | V1 (Removed) | V2 (Current) |
|-------|--------------|--------------|
| **Frontend** | React 18 + CRA | Next.js 15 App Router + TypeScript Strict |
| **Backend** | Python FastAPI | Next.js API Routes + TypeScript |
| **Database** | SQLite + SQLModel | PostgreSQL 16 + Drizzle ORM |
| **Caching** | JSON files | Redis 7 + metadata_cache table |
| **Storage** | Local filesystem | MinIO (S3-compatible) |
| **Auth** | Basic custom | NextAuth.js v5 + OAuth (Google, GitHub) |
| **Multi-User** | Single user | Full RBAC (user, admin, readonly) |
| **Deployment** | Manual scripts | Docker Compose + Production-ready |

### **Architecture Diagram**
```
┌─────────────────────────────────────────────────────────────┐
│                    BookTarr V2 System                      │
├─────────────────────┬───────────────────────────────────────┤
│   Next.js 15 App    │      Backend (API Routes)            │
│                     │                                       │
│ ┌─────────────────┐ │ ┌───────────────┐ ┌─────────────────┐ │
│ │ Pages (App Dir) │ │ │   API Routes  │ │   Data Models   │ │
│ │ - Library       │ │ │ - Books (8)   │ │ - 18 Tables     │ │
│ │ - Series        │ │ │ - Series (7)  │ │ - Drizzle ORM   │ │
│ │ - Reading       │ │ │ - Reading (5) │ │ - Normalized    │ │
│ │ - Settings      │ │ │ - Auth (3)    │ │ - Relational    │ │
│ └─────────────────┘ │ └───────────────┘ └─────────────────┘ │
│                     │                                       │
│ ┌─────────────────┐ │ ┌───────────────┐ ┌─────────────────┐ │
│ │ State (TanStack)│ │ │   Services    │ │   External APIs │ │
│ │ - React Query   │ │ │ - Metadata    │ │ - Google Books  │ │
│ │ - Zustand       │ │ │ - Auth        │ │ - OpenLibrary   │ │
│ │ - NextAuth      │ │ │ - Cache       │ │ - AniList       │ │
│ └─────────────────┘ │ └───────────────┘ └─────────────────┘ │
├─────────────────────┴───────────────────────────────────────┤
│                    Database Layer                          │
│  PostgreSQL 16 + Redis 7 + MinIO (18 normalized tables)   │
└─────────────────────────────────────────────────────────────┘
```

### **Directory Structure**
```
/home/user/booktarr/
├── apps/
│   └── web/                   # Next.js 15 application
│       ├── src/
│       │   ├── app/           # App Router (pages + API routes)
│       │   │   ├── (dashboard)/  # Protected pages
│       │   │   │   ├── library/
│       │   │   │   ├── series/
│       │   │   │   └── reading/
│       │   │   └── api/       # 25 API route files
│       │   │       ├── books/
│       │   │       ├── series/
│       │   │       ├── reading/
│       │   │       └── auth/
│       │   ├── components/    # shadcn/ui components
│       │   ├── lib/
│       │   │   ├── auth/      # NextAuth.js v5
│       │   │   ├── services/  # 6 service layers
│       │   │   └── providers/ # React providers
│       │   └── types/         # TypeScript definitions
│       └── e2e/               # 8 Playwright tests
├── packages/
│   ├── database/              # Drizzle ORM
│   │   ├── src/schema/        # 5 schema files (18 tables)
│   │   └── migrations/        # SQL migrations
│   └── ui/                    # Shared UI components
├── sample_data/
│   └── HandyLib.csv           # 800+ books (preserved from V1)
├── context/
│   └── design-principles.md   # Design guidelines
├── docker-compose.yml         # PostgreSQL + Redis + MinIO
└── V1_FEATURES_TO_MIGRATE.md  # Full feature migration list
```

---

## ✅ **V2 Implemented Features**

### **Phase 1: Foundation (100% Complete)**
- ✅ Next.js 15 monorepo with Turbo
- ✅ PostgreSQL 16 + Drizzle ORM
- ✅ Redis 7 caching layer
- ✅ MinIO S3-compatible storage
- ✅ Docker Compose dev environment
- ✅ 18-table normalized database
- ✅ ESLint + Prettier strict config
- ✅ TypeScript strict mode (zero `any`)

### **Phase 2: Backend API (100% Complete)**
**Authentication System**
- ✅ NextAuth.js v5 with email/password
- ✅ Google OAuth integration
- ✅ GitHub OAuth integration
- ✅ JWT session management
- ✅ Role-based access control (user, admin, readonly)
- ✅ Protected routes middleware

**Book Management API** (8 endpoints)
- ✅ GET /api/books (filters, search, pagination)
- ✅ POST /api/books (ISBN, title search, manual)
- ✅ GET /api/books/[id]
- ✅ DELETE /api/books/[id]
- ✅ POST /api/books/search
- ✅ GET /api/books/[id]/editions
- ✅ POST /api/books/enrich
- ✅ POST /api/books/clear

**Series Management API** (7 endpoints)
- ✅ GET /api/series
- ✅ POST /api/series
- ✅ GET /api/series/[id]
- ✅ PATCH /api/series/[id]
- ✅ DELETE /api/series/[id]
- ✅ POST /api/series/[id]/books
- ✅ DELETE /api/series/[id]/books

**Reading Progress API** (5 endpoints)
- ✅ GET /api/reading/currently-reading
- ✅ POST /api/reading/start
- ✅ POST /api/reading/progress
- ✅ POST /api/reading/finish
- ✅ GET /api/reading/stats

**External API Clients**
- ✅ Google Books client
- ✅ OpenLibrary client
- ✅ AniList client (manga/light novels)
- ✅ Metadata service with 30-day caching
- ✅ Result deduplication and normalization

### **Phase 3: Frontend Pages (100% Complete)**
- ✅ Homepage with smart redirect
- ✅ Library page (book grid, search, filters)
- ✅ Series page (completion stats, progress bars)
- ✅ Login/register pages
- ✅ Currently reading page
- ✅ Book details page ([id])

**State Management**
- ✅ TanStack Query for server state
- ✅ Zustand for UI state
- ✅ NextAuth SessionProvider
- ✅ Query invalidation strategies

**UI Components** (shadcn/ui)
- ✅ Button, Card, Input, Dialog
- ✅ Table, Badge, Select, Dropdown
- ✅ Avatar, Skeleton, Progress
- ✅ Layout components (Nav, DashboardLayout)

---

## ✅ **V2 Feature Complete!**

**All required features have been implemented!**

### **Completed Features**
- ✅ **Barcode Scanner** (mobile camera) - Integrated with camera access, manual entry, and ISBN search
  - Location: Add Book dialog → Scan Barcode tab
  - Tests: `apps/web/e2e/barcode-scanner.spec.ts`
  - Docs: `apps/web/src/components/books/BARCODE_SCANNER.md`

### **Not Needed - Removed from Migration**
- ~~CSV Import System~~ (not required for V2)
- ~~Advanced Search & Filtering UI~~ (basic search is sufficient)
- ~~Reading Progress Tracking UI~~ (backend API exists but UI not needed)

### **Optional - Low Priority**
- ❌ Collections Management
- ❌ Tag System
- ❌ Wishlist Management
- ❌ PWA Features (offline support)
- ❌ Theme Selector

### **Test Coverage**
- ✅ **E2E Tests**: 6 test suites (auth, library, series, reading-progress, main-user-journey, barcode-scanner)
- ✅ **API Tests**: 3 test suites (auth, books, series)

---

## 🔧 **MCP Server Configuration & Best Practices**

### **Available MCP Servers**

This project has the following MCP (Model Context Protocol) servers configured:

#### **1. playwright** - Browser Automation & Testing
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

#### **2. context7** - Documentation Retrieval
- **Purpose**: Fetch up-to-date documentation for any library or framework
- **Key Commands**:
  - `mcp__context7__resolve-library-id` - Find library IDs (use first)
  - `mcp__context7__get-library-docs` - Retrieve documentation
- **Best Practices**:
  - Always resolve library ID first unless user provides exact format
  - Use for getting current API docs beyond knowledge cutoff
  - Specify topic parameter for focused documentation
  - Use appropriate token limit based on need

#### **3. sequential-thinking** - Structured Problem Solving
- **Purpose**: Break down complex problems with iterative thinking
- **Key Commands**:
  - `mcp__sequential-thinking__sequentialthinking` - Step-by-step analysis
- **Best Practices**:
  - Use for complex multi-step problems
  - Allow for revision and branching of thoughts
  - Mark thoughts as revisions when reconsidering
  - Continue until satisfactory solution reached

#### **4. browsermcp** - Simple Browser Control
- **Purpose**: Basic browser automation (simpler alternative to playwright)
- **Key Commands**:
  - `mcp__browsermcp__browser_navigate` - Navigate to URL
  - `mcp__browsermcp__browser_snapshot` - Get page structure
  - `mcp__browsermcp__browser_click` - Click elements
- **Best Practices**:
  - Use for simpler browser tasks
  - Prefer playwright for comprehensive testing
  - Good for quick web interactions

### **MCP Usage Guidelines**

1. **Tool Naming Convention**: All MCP tools follow format `mcp__[server]__[action]`
2. **Error Handling**: MCP tools may fail - always handle errors gracefully
3. **Performance**: MCP operations may be slow - set appropriate timeouts
4. **Security**: Never store credentials in MCP server configurations
5. **Debugging**: Use verbose output when troubleshooting MCP issues

### **Common MCP Workflows**

#### **Visual Testing Workflow**
```
1. Navigate: mcp__playwright__browser_navigate
2. Wait for load: mcp__playwright__browser_wait_for
3. Take snapshot: mcp__playwright__browser_snapshot
4. Interact: mcp__playwright__browser_click/type
5. Screenshot: mcp__playwright__browser_take_screenshot
6. Check errors: mcp__playwright__browser_console_messages
```

#### **Documentation Lookup Workflow**
```
1. Resolve ID: mcp__context7__resolve-library-id
2. Get docs: mcp__context7__get-library-docs
3. Apply learnings to code
```

#### **Problem Solving Workflow**
```
1. Define problem clearly
2. Use mcp__sequential-thinking__sequentialthinking
3. Iterate through thoughts
4. Revise as needed
5. Arrive at solution
```

---

## 🎨 **Visual Development**

### **Design Principles**
- Comprehensive design checklist in `/context/design-principles.md`
- When making visual (front-end, UI/UX) changes, always refer to this file for guidance

### **Quick Visual Check**
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** - Compare against `/context/design-principles.md`
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** - Review any provided context files or requirements
6. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** - Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### **Comprehensive Design Review**
Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

---

## 🚀 **Development & Deployment**

### **Development Commands**
```bash
# Install dependencies
npm install

# Start development environment
npm run dev                    # Full stack (Next.js + PostgreSQL + Redis)

# Database management
npm run db:generate           # Generate Drizzle migrations
npm run db:migrate            # Run migrations
npm run db:studio             # Open Drizzle Studio

# Testing
npm run test                  # Run all tests
npm run test:e2e             # E2E tests only

# Production build
npm run build                # Build for production
npm run start                # Start production server
```

### **Docker Deployment**
```bash
# Development
docker-compose up            # Start all services

# Production
docker-compose -f docker-compose.production.yml up -d
```

### **Environment Variables**
Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - NextAuth secret key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_ID` / `GITHUB_SECRET` - GitHub OAuth
- `S3_*` - MinIO/S3 storage configuration

---

## 🧪 **Testing Framework**

### **Current Test Status**
- **E2E Tests**: 8 tests (need 25+ more from V1)
- **Framework**: Playwright
- **Location**: `apps/web/e2e/`

### **Running Tests**
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test
npx playwright test apps/web/e2e/auth.spec.ts

# Debug mode
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui
```

### **Test Coverage Needed**
- ❌ CSV import tests
- ❌ Barcode scanner tests
- ❌ Advanced search tests
- ❌ Collections tests
- ❌ Tag management tests
- ❌ Visual regression tests

---

## 📚 **Sample Data**

### **HandyLib.csv** (Preserved from V1)
- **Location**: `sample_data/HandyLib.csv`
- **Size**: 307KB with 800+ books
- **Format**: 30 columns (Title, Author, ISBN, Series, Volume, etc.)
- **Usage**: Import via CSV import feature (to be implemented)

**Sample includes**:
- Complete manga series ([Oshi No Ko], A Sign of Affection, etc.)
- Full metadata (ISBNs, cover URLs, descriptions, ratings)
- Reading progress data
- Series information with volume numbers

---

## 🎯 **Next Steps**

### **Feature Development** ✅
**All required features are complete!**
- ✅ Barcode Scanner implemented with camera access and manual entry
- ✅ Integration with existing ISBN search
- ✅ Mobile-optimized UI
- ✅ Comprehensive testing

### **Optional Enhancements**
Consider implementing these optional features if needed:
- Collections Management
- Tag System
- Wishlist Management
- PWA Features (offline support)
- Theme Selector

### **Testing**
- ✅ **E2E Test Suite**: 6 comprehensive test files covering auth, library, series, user journeys, and barcode scanner
- ✅ **API Test Suite**: 3 integration test files covering auth, books, and series APIs
- 📖 **Test Documentation**: See `apps/web/TESTING.md` for detailed testing guide

### **Barcode Scanner Setup**
For full barcode detection, install the ZXing library:
```bash
cd apps/web && npm install @zxing/browser
```
See `apps/web/src/components/books/BARCODE_SCANNER.md` for implementation details.

### **Reference Documents**
- `V1_FEATURES_TO_MIGRATE.md` - Migration status (100% complete!)
- `apps/web/TESTING.md` - Testing guide and best practices
- `apps/web/src/components/books/BARCODE_SCANNER.md` - Barcode scanner documentation
- `TASKLIST.md` - Current task tracking
- `COMPLETION_SUMMARY.md` - V2 completion status
- `MIGRATION_GUIDE.md` - V1 to V2 migration details

---

## 📝 **Important Instructions**

### **Development Guidelines**
- **Always use `TASKLIST.md`** for task tracking
- **Reference `V1_FEATURES_TO_MIGRATE.md`** before implementing new features
- **Follow TypeScript strict mode** - zero `any` types
- **Use Drizzle ORM** for all database operations
- **Implement proper error handling** with try/catch and error boundaries
- **Write tests** for all new features
- **Document APIs** with JSDoc comments

### **Code Style**
- **TypeScript**: Strict mode, explicit types
- **React**: Functional components with hooks
- **API Routes**: NextRequest/NextResponse
- **Database**: Drizzle schema with relations
- **Formatting**: Prettier + ESLint

### **Security**
- **Authentication**: NextAuth.js v5 with OAuth
- **Authorization**: RBAC middleware on routes
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection**: Drizzle ORM prevents this
- **XSS**: React escapes by default
- **CSRF**: NextAuth handles this

---

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing existing files to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

**IMPORTANT**: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
