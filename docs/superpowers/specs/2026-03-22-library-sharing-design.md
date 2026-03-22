# Library Sharing - Design Spec

**Date**: 2026-03-22
**Status**: Approved

## Overview

Allow users to share their book libraries with other users. Supports view-only and full edit access. User-level shares require acceptance; admin can force shares between any users.

## Data Model

### New Table: `library_shares`

```sql
CREATE TABLE library_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(10) NOT NULL DEFAULT 'view', -- 'view' | 'edit'
  status VARCHAR(10) NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected' | 'revoked'
  forced_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(owner_id, shared_with_id)
);

CREATE INDEX idx_library_shares_owner ON library_shares(owner_id);
CREATE INDEX idx_library_shares_recipient ON library_shares(shared_with_id);
CREATE INDEX idx_library_shares_status ON library_shares(status);
```

### Drizzle Schema

Add to `packages/database/src/schema/users.ts`:

```typescript
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

## API Endpoints

### User Endpoints

**GET /api/shares** — List shares (sent and received)
- Returns `{ sent: Share[], received: Share[] }`
- Sent: shares where `owner_id = currentUser`
- Received: shares where `shared_with_id = currentUser`
- Includes user name/email for the other party

**POST /api/shares** — Create share invitation
- Body: `{ email: string, permission: 'view' | 'edit' }`
- Looks up user by email
- Creates share with `status: 'pending'`
- Validation: no self-share, no duplicates, max 20 shares per user

**PATCH /api/shares/[id]** — Accept or reject a share
- Body: `{ action: 'accept' | 'reject' }`
- Only the recipient can accept/reject
- Sets `accepted_at` on accept

**DELETE /api/shares/[id]** — Revoke or remove a share
- Owner can revoke any share they created
- Recipient can remove any share from their view
- Sets `status: 'revoked'`

### Admin Endpoint

**POST /api/admin/shares** — Force share between any two users
- Body: `{ ownerEmail: string, recipientEmail: string, permission: 'view' | 'edit' }`
- Requires `session.user.role === 'admin'`
- Creates share with `status: 'accepted'`, `forced_by_admin: true`
- Bypasses acceptance flow

### Shared Library Access

**GET /api/shares/[userId]/books** — Browse shared library
- Requires an accepted share where `owner_id = userId` and `shared_with_id = currentUser`
- Reuses existing `BookService.getUserBooks()` with the owner's userId
- Returns books with `sharedFrom: { id, name, email }` metadata

## Frontend

### Settings Page — Library Sharing Section

Located below existing settings sections:

- **Share My Library** button opens dialog:
  - Email input to search for user
  - Permission selector (View Only / Full Access)
  - Send Invitation button
- **Outgoing Shares** list:
  - Shows recipient name, email, permission, status
  - Revoke button for each
- **Incoming Shares** list:
  - Shows owner name, email, permission, status
  - Accept / Reject buttons for pending
  - Remove button for accepted

### Library Page — Shared Books Toggle

- New toggle/filter in the search bar area: "Show shared"
- When enabled:
  - Fetches books from all accepted incoming shares
  - Merges with own books
  - Each shared book has a colored badge: "From [Owner Name]"
- When disabled (default): shows only own books

### Admin Panel

Visible in settings when `user.role === 'admin'`:
- Force Share section with owner email, recipient email, permission selector
- Force Share button (no acceptance needed)

### Notifications

- Small dot indicator on nav when pending incoming shares exist
- Toast notification on share creation success/failure

## Permission Rules

| Action | View Permission | Edit Permission |
|--------|----------------|-----------------|
| Browse books | Yes | Yes |
| View book details | Yes | Yes |
| View reading progress | Yes | Yes |
| Add books | No | Yes |
| Remove books | No | Yes |
| Update reading progress | No | Yes |

## Constraints

- Max 20 outgoing shares per user
- No self-sharing
- No duplicate shares (unique on owner_id + shared_with_id)
- Revoked shares can be re-created as new shares
- Admin force shares are logged with `forced_by_admin` flag

## Zod Validators

```typescript
const createShareSchema = z.object({
  email: z.string().email(),
  permission: z.enum(['view', 'edit']),
});

const updateShareSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

const adminForceShareSchema = z.object({
  ownerEmail: z.string().email(),
  recipientEmail: z.string().email(),
  permission: z.enum(['view', 'edit']),
});
```

## Implementation Order

1. Database schema (Drizzle table + migration)
2. Share service (CRUD operations)
3. API routes (user + admin)
4. Settings page UI (share management)
5. Library page integration (shared books toggle)
6. Notification indicator
