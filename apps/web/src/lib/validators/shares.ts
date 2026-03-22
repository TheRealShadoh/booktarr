/**
 * Library Sharing Validators
 * Zod schemas for validating all share-related API inputs
 */

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
