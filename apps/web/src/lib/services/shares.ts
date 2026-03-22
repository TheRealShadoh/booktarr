/**
 * ShareService - Library sharing CRUD operations
 * Handles creating, accepting, rejecting, and revoking library shares.
 * All queries use db.select().from().where() pattern for neon-http compatibility.
 */

import { db } from '../db';
import { libraryShares, users } from '@booktarr/database';
import { eq, and, or, desc } from 'drizzle-orm';

export class ShareService {
  /**
   * Get all sent and received shares for a user, hydrated with user info
   */
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

    // Hydrate sent shares with recipient info
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

    // Hydrate received shares with owner info
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

  /**
   * Create a new library share invitation
   */
  async createShare(ownerId: string, recipientEmail: string, permission: string) {
    // Find recipient by email
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

    // Check for existing share between these users
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

    // Enforce share limit (max 20 active shares)
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

    // Delete revoked share if exists, then create new one
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

  /**
   * Accept or reject a pending share (only the recipient can do this)
   */
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

  /**
   * Revoke a share (owner or recipient can revoke)
   */
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

  /**
   * Admin force-creates a share between two users (auto-accepted)
   */
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

  /**
   * Get all accepted shares where user is the recipient, with owner info
   */
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

  /**
   * Check if an accepted share exists between owner and recipient
   * Returns the share (with permission) or null
   */
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

  /**
   * Get count of pending incoming shares for a user
   */
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
