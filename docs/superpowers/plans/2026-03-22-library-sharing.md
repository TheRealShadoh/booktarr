# Library Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to share book libraries with other users, with view/edit permissions, acceptance flow, and admin force-share.

**Architecture:** New `library_shares` table with a `ShareService` for CRUD. API routes follow existing patterns (auth check, rate limit, Zod validation, handleError). Frontend adds a sharing section to settings page and a shared-books toggle to library page. All DB queries use simple `db.select().from().where()` patterns (no joins or relational `with:` queries) for neon-http compatibility.

**Tech Stack:** Drizzle ORM, Zod, Next.js API routes, React Query, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-22-library-sharing-design.md`

---

### Task 1: Database Schema

**Files:**
- Modify: `packages/database/src/schema/users.ts`
- Modify: `packages/database/src/schema/index.ts`

- [x] **Step 1: Add libraryShares table to schema**

In `packages/database/src/schema/users.ts`, add after the existing `sessions` table:

```typescript
import { boolean, unique } from 'drizzle-orm/pg-core';

export const libraryShares = pgTable('library_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sharedWithId: uuid('shared_with_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permission: varchar('permission', { length: 10 }).notNull().default('view'),
  status: varchar('status', { length: 10 }).notNull().default('pending'),
  forcedByAdmin: boolean('forced_by_admin').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { mode: 'date' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  uniqueShare: unique().on(table.ownerId, table.sharedWithId),
}));
```

- [x] **Step 2: Verify export in index.ts**

Check `packages/database/src/schema/index.ts` exports `users.ts`. It should already re-export everything via `export * from './users'`.

- [ ] **Step 3: Create table on Neon**

Run the SQL directly since drizzle-kit push is interactive:

```bash
source <(grep -v '^#' .env.local | sed 's/^/export /') && node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql.query(\`CREATE TABLE IF NOT EXISTS library_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  shared_with_id UUID NOT NULL,
  permission VARCHAR(10) NOT NULL DEFAULT 'view',
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  forced_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(owner_id, shared_with_id)
)\`).then(() => console.log('Table created'))
  .then(() => sql.query('CREATE INDEX IF NOT EXISTS idx_library_shares_owner ON library_shares(owner_id)'))
  .then(() => sql.query('CREATE INDEX IF NOT EXISTS idx_library_shares_recipient ON library_shares(shared_with_id)'))
  .then(() => sql.query('CREATE INDEX IF NOT EXISTS idx_library_shares_status ON library_shares(status)'))
  .then(() => console.log('Indexes created'))
  .catch(e => console.error(e.message));
"
```

- [x] **Step 4: Build to verify schema compiles**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 5: Commit**

```bash
git add packages/database/src/schema/users.ts
git commit -m "feat: Add library_shares table schema"
```

---

### Task 2: Zod Validators

**Files:**
- Create: `apps/web/src/lib/validators/shares.ts`

- [x] **Step 1: Create share validators**

```typescript
import { z } from 'zod';

export const createShareSchema = z.object({
  email: z.string().email('Invalid email address'),
  permission: z.enum(['view', 'edit']),
});

export const updateShareSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

export const adminForceShareSchema = z.object({
  ownerEmail: z.string().email('Invalid owner email'),
  recipientEmail: z.string().email('Invalid recipient email'),
  permission: z.enum(['view', 'edit']),
});

export type CreateShareInput = z.infer<typeof createShareSchema>;
export type UpdateShareInput = z.infer<typeof updateShareSchema>;
export type AdminForceShareInput = z.infer<typeof adminForceShareSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/validators/shares.ts
git commit -m "feat: Add Zod validators for library sharing"
```

---

### Task 3: Share Service

**Files:**
- Create: `apps/web/src/lib/services/shares.ts`

IMPORTANT: All queries must use `db.select().from().where()` pattern. No `db.query.xxx.findFirst()` or joins.

- [x] **Step 1: Create ShareService**

```typescript
import { db } from '../db';
import { libraryShares, users } from '@booktarr/database';
import { eq, and, or, desc } from 'drizzle-orm';

export class ShareService {
  async getSharesForUser(userId: string) {
    const sent = await db
      .select()
      .from(libraryShares)
      .where(eq(libraryShares.ownerId, userId))
      .orderBy(desc(libraryShares.createdAt));

    const received = await db
      .select()
      .from(libraryShares)
      .where(eq(libraryShares.sharedWithId, userId))
      .orderBy(desc(libraryShares.createdAt));

    // Hydrate with user info
    const hydratedSent = await Promise.all(
      sent.map(async (share) => {
        const [recipient] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, share.sharedWithId))
          .limit(1);
        return { ...share, user: recipient };
      })
    );

    const hydratedReceived = await Promise.all(
      received.map(async (share) => {
        const [owner] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, share.ownerId))
          .limit(1);
        return { ...share, user: owner };
      })
    );

    return { sent: hydratedSent, received: hydratedReceived };
  }

  async createShare(ownerId: string, recipientEmail: string, permission: string) {
    // Find recipient
    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.email, recipientEmail))
      .limit(1);

    if (!recipient) {
      throw new Error('User not found with that email');
    }

    if (recipient.id === ownerId) {
      throw new Error('Cannot share library with yourself');
    }

    // Check for existing share
    const [existing] = await db
      .select()
      .from(libraryShares)
      .where(
        and(
          eq(libraryShares.ownerId, ownerId),
          eq(libraryShares.sharedWithId, recipient.id)
        )
      )
      .limit(1);

    if (existing && existing.status !== 'revoked') {
      throw new Error('Share already exists with this user');
    }

    // Check share limit (max 20)
    const sentShares = await db
      .select({ id: libraryShares.id })
      .from(libraryShares)
      .where(
        and(
          eq(libraryShares.ownerId, ownerId),
          or(
            eq(libraryShares.status, 'pending'),
            eq(libraryShares.status, 'accepted')
          )
        )
      );

    if (sentShares.length >= 20) {
      throw new Error('Maximum of 20 active shares reached');
    }

    // Delete revoked share if exists, then create new
    if (existing?.status === 'revoked') {
      await db.delete(libraryShares).where(eq(libraryShares.id, existing.id));
    }

    const [share] = await db
      .insert(libraryShares)
      .values({
        ownerId,
        sharedWithId: recipient.id,
        permission,
        status: 'pending',
      })
      .returning();

    return share;
  }

  async updateShareStatus(shareId: string, userId: string, action: 'accept' | 'reject') {
    const [share] = await db
      .select()
      .from(libraryShares)
      .where(eq(libraryShares.id, shareId))
      .limit(1);

    if (!share) {
      throw new Error('Share not found');
    }

    if (share.sharedWithId !== userId) {
      throw new Error('Only the recipient can accept or reject');
    }

    if (share.status !== 'pending') {
      throw new Error('Share is not pending');
    }

    const [updated] = await db
      .update(libraryShares)
      .set({
        status: action === 'accept' ? 'accepted' : 'rejected',
        acceptedAt: action === 'accept' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(libraryShares.id, shareId))
      .returning();

    return updated;
  }

  async revokeShare(shareId: string, userId: string) {
    const [share] = await db
      .select()
      .from(libraryShares)
      .where(eq(libraryShares.id, shareId))
      .limit(1);

    if (!share) {
      throw new Error('Share not found');
    }

    // Owner or recipient can revoke
    if (share.ownerId !== userId && share.sharedWithId !== userId) {
      throw new Error('Not authorized to revoke this share');
    }

    const [updated] = await db
      .update(libraryShares)
      .set({ status: 'revoked', updatedAt: new Date() })
      .where(eq(libraryShares.id, shareId))
      .returning();

    return updated;
  }

  async adminForceShare(ownerEmail: string, recipientEmail: string, permission: string) {
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.email, ownerEmail))
      .limit(1);

    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.email, recipientEmail))
      .limit(1);

    if (!owner) throw new Error('Owner not found');
    if (!recipient) throw new Error('Recipient not found');
    if (owner.id === recipient.id) throw new Error('Cannot share with self');

    // Delete any existing share between these users
    await db
      .delete(libraryShares)
      .where(
        and(
          eq(libraryShares.ownerId, owner.id),
          eq(libraryShares.sharedWithId, recipient.id)
        )
      );

    const [share] = await db
      .insert(libraryShares)
      .values({
        ownerId: owner.id,
        sharedWithId: recipient.id,
        permission,
        status: 'accepted',
        forcedByAdmin: true,
        acceptedAt: new Date(),
      })
      .returning();

    return share;
  }

  async getAcceptedSharesForRecipient(userId: string) {
    const shares = await db
      .select()
      .from(libraryShares)
      .where(
        and(
          eq(libraryShares.sharedWithId, userId),
          eq(libraryShares.status, 'accepted')
        )
      );

    return Promise.all(
      shares.map(async (share) => {
        const [owner] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, share.ownerId))
          .limit(1);
        return { ...share, owner };
      })
    );
  }

  async hasAcceptedShare(ownerId: string, recipientId: string) {
    const [share] = await db
      .select({ id: libraryShares.id, permission: libraryShares.permission })
      .from(libraryShares)
      .where(
        and(
          eq(libraryShares.ownerId, ownerId),
          eq(libraryShares.sharedWithId, recipientId),
          eq(libraryShares.status, 'accepted')
        )
      )
      .limit(1);

    return share || null;
  }

  async getPendingCountForUser(userId: string): Promise<number> {
    const pending = await db
      .select({ id: libraryShares.id })
      .from(libraryShares)
      .where(
        and(
          eq(libraryShares.sharedWithId, userId),
          eq(libraryShares.status, 'pending')
        )
      );

    return pending.length;
  }
}
```

- [x] **Step 2: Build to verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/services/shares.ts
git commit -m "feat: Add ShareService for library sharing CRUD"
```

---

### Task 4: API Routes

**Files:**
- Create: `apps/web/src/app/api/shares/route.ts`
- Create: `apps/web/src/app/api/shares/[id]/route.ts`
- Create: `apps/web/src/app/api/shares/[userId]/books/route.ts`
- Create: `apps/web/src/app/api/shares/pending/route.ts`
- Create: `apps/web/src/app/api/admin/shares/route.ts`

- [ ] **Step 1: Create GET/POST /api/shares**

`apps/web/src/app/api/shares/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareService } from '@/lib/services/shares';
import { createShareSchema } from '@/lib/validators/shares';
import { handleError, Errors } from '@/lib/api-error';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const shareService = new ShareService();

export async function GET(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rl = await rateLimit(clientId, 'api');
    if (!rl.success) throw Errors.rateLimitExceeded(rl.retryAfter);

    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const shares = await shareService.getSharesForUser(session.user.id);
    return NextResponse.json(shares);
  } catch (error) {
    return handleError(error).toResponse();
  }
}

export async function POST(req: Request) {
  try {
    const clientId = getClientIdentifier(req);
    const rl = await rateLimit(clientId, 'api');
    if (!rl.success) throw Errors.rateLimitExceeded(rl.retryAfter);

    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const body = await req.json();
    const { email, permission } = createShareSchema.parse(body);

    const share = await shareService.createShare(session.user.id, email, permission);

    logger.info('Library share created', {
      ownerId: session.user.id,
      recipientEmail: email,
      permission,
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
```

- [ ] **Step 2: Create PATCH/DELETE /api/shares/[id]**

`apps/web/src/app/api/shares/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareService } from '@/lib/services/shares';
import { updateShareSchema } from '@/lib/validators/shares';
import { handleError, Errors } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const shareService = new ShareService();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const { id } = await params;
    const body = await req.json();
    const { action } = updateShareSchema.parse(body);

    const share = await shareService.updateShareStatus(id, session.user.id, action);

    logger.info('Library share updated', {
      shareId: id,
      userId: session.user.id,
      action,
    });

    return NextResponse.json(share);
  } catch (error) {
    return handleError(error).toResponse();
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const { id } = await params;
    const share = await shareService.revokeShare(id, session.user.id);

    logger.info('Library share revoked', {
      shareId: id,
      userId: session.user.id,
    });

    return NextResponse.json(share);
  } catch (error) {
    return handleError(error).toResponse();
  }
}
```

- [ ] **Step 3: Create GET /api/shares/[userId]/books**

`apps/web/src/app/api/shares/[userId]/books/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareService } from '@/lib/services/shares';
import { BookService } from '@/lib/services/books';
import { handleError, Errors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const shareService = new ShareService();
const bookService = new BookService();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const { userId: ownerId } = await params;

    // Verify accepted share exists
    const share = await shareService.hasAcceptedShare(ownerId, session.user.id);
    if (!share) throw Errors.forbidden('No active share with this user');

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const result = await bookService.getUserBooks(ownerId, { limit });

    // Get owner info
    const { db } = await import('@/lib/db');
    const { users } = await import('@booktarr/database');
    const { eq } = await import('drizzle-orm');
    const [owner] = await db.select({ id: users.id, name: users.name, email: users.email })
      .from(users).where(eq(users.id, ownerId)).limit(1);

    return NextResponse.json({
      books: result.books,
      sharedFrom: owner,
      permission: share.permission,
      total: result.total,
    });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
```

- [ ] **Step 4: Create GET /api/shares/pending**

`apps/web/src/app/api/shares/pending/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareService } from '@/lib/services/shares';
import { handleError, Errors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const shareService = new ShareService();

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();

    const count = await shareService.getPendingCountForUser(session.user.id);
    return NextResponse.json({ count });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
```

- [ ] **Step 5: Create POST /api/admin/shares**

`apps/web/src/app/api/admin/shares/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ShareService } from '@/lib/services/shares';
import { adminForceShareSchema } from '@/lib/validators/shares';
import { handleError, Errors } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const shareService = new ShareService();

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw Errors.unauthorized();
    if (session.user.role !== 'admin') throw Errors.forbidden('Admin access required');

    const body = await req.json();
    const { ownerEmail, recipientEmail, permission } = adminForceShareSchema.parse(body);

    const share = await shareService.adminForceShare(ownerEmail, recipientEmail, permission);

    logger.info('Admin force share created', {
      adminId: session.user.id,
      ownerEmail,
      recipientEmail,
      permission,
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    return handleError(error).toResponse();
  }
}
```

- [ ] **Step 6: Build to verify all routes compile**

Run: `npm run build`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/shares/ apps/web/src/app/api/admin/
git commit -m "feat: Add library sharing API routes"
```

---

### Task 5: Share Management UI Component

**Files:**
- Create: `apps/web/src/components/sharing/share-manager.tsx`

- [ ] **Step 1: Create ShareManager component**

This component handles the entire sharing UI: create shares, view outgoing/incoming, accept/reject/revoke. Used in the settings page.

Key elements:
- "Share My Library" button → dialog with email input + permission selector
- Outgoing shares list with revoke buttons
- Incoming shares list with accept/reject buttons
- Uses React Query for data fetching (`queryKey: ['shares']`)
- Uses mutations for create/update/delete with query invalidation
- Admin force-share section (visible when `session.user.role === 'admin'`)

- [ ] **Step 2: Build and verify**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/sharing/
git commit -m "feat: Add ShareManager component for library sharing UI"
```

---

### Task 6: Settings Page Integration

**Files:**
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Add ShareManager to settings page**

Import and add `<ShareManager />` component after the existing settings sections. Wrap in a Card with title "Library Sharing".

- [ ] **Step 2: Build and verify**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/settings/page.tsx
git commit -m "feat: Add library sharing section to settings page"
```

---

### Task 7: Library Page Shared Books Toggle

**Files:**
- Modify: `apps/web/src/app/(dashboard)/library/page.tsx`

- [ ] **Step 1: Add shared books toggle and fetch logic**

Add a "Show shared" toggle button next to the search/filter bar. When enabled:
1. Fetch accepted shares via `GET /api/shares`
2. For each accepted incoming share, fetch books via `GET /api/shares/[userId]/books`
3. Merge into the books array with `sharedFrom` metadata
4. Display shared books with a colored badge showing owner name

Use React Query with `enabled` flag tied to the toggle state.

- [ ] **Step 2: Build and verify**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/library/page.tsx
git commit -m "feat: Add shared books toggle to library page"
```

---

### Task 8: Nav Notification Indicator

**Files:**
- Modify: `apps/web/src/components/layout/nav.tsx`

- [ ] **Step 1: Add pending share indicator**

Add a React Query hook to poll `GET /api/shares/pending` every 60 seconds. If `count > 0`, show a small red dot on the avatar button.

```tsx
// Inside Nav component
const { data: pendingShares } = useQuery({
  queryKey: ['shares-pending'],
  queryFn: async () => {
    const r = await fetch('/api/shares/pending');
    if (!r.ok) return { count: 0 };
    return r.json();
  },
  refetchInterval: 60000,
});

// On the avatar button, add:
{pendingShares?.count > 0 && (
  <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-destructive" />
)}
```

- [ ] **Step 2: Build and verify**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/nav.tsx
git commit -m "feat: Add pending share notification dot to nav"
```

---

### Task 9: Create Table on Neon & Final Build

- [ ] **Step 1: Pull env and create table**

```bash
vercel env pull .env.local --environment=production --yes
```

Then run the table creation SQL from Task 1, Step 3.

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: All routes compile, no errors

- [ ] **Step 3: Push to deploy**

```bash
git push origin main
```

- [ ] **Step 4: Test on production**

1. Login as chris@booktarr.test
2. Go to Settings → Library Sharing
3. Share library with another user's email
4. Login as the other user, accept the share
5. Go to Library, toggle "Show shared"
6. Verify shared books appear with owner badge

- [ ] **Step 5: Clean up .env.local**

```bash
rm .env.local
```
