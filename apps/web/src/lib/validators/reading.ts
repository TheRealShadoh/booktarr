/**
 * Reading Progress API Input Validators
 * Zod schemas for validating all reading progress API inputs
 */

import { z } from 'zod';

/**
 * Start Reading Schema
 */
export const startReadingSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  startDate: z.string().datetime().optional(),
});

/**
 * Update Reading Progress Schema
 */
export const updateProgressSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  currentPage: z.number().int().min(0).max(100000),
  totalPages: z.number().int().positive().max(100000).optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Finish Reading Schema
 */
export const finishReadingSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  finishDate: z.string().datetime().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  review: z.string().max(5000).optional(),
  favorite: z.boolean().default(false),
});

/**
 * Reading Stats Query Schema
 */
export const readingStatsQuerySchema = z.object({
  year: z.number().int().min(2000).max(new Date().getFullYear() + 1).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

/**
 * Type exports
 */
export type StartReadingInput = z.infer<typeof startReadingSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
export type FinishReadingInput = z.infer<typeof finishReadingSchema>;
export type ReadingStatsQuery = z.infer<typeof readingStatsQuerySchema>;
