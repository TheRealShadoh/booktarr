/**
 * Series API Input Validators
 * Zod schemas for validating all series-related API inputs
 */

import { z } from 'zod';

/**
 * Create Series Schema
 */
export const createSeriesSchema = z.object({
  name: z.string().min(1, 'Series name is required').max(500),
  description: z.string().max(5000).optional(),
  totalVolumes: z.number().int().positive().max(10000).optional(),
  publisher: z.string().max(255).optional(),
  language: z.string().max(10).default('en'),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']).default('ongoing'),
  seriesType: z.enum(['manga', 'light_novel', 'book', 'comic', 'other']).default('book'),

  // External IDs
  anilistId: z.number().int().positive().optional(),
  malId: z.number().int().positive().optional(),

  // Metadata
  coverUrl: z.string().url().max(1000).optional().or(z.literal('')),
  startYear: z.number().int().min(1000).max(new Date().getFullYear() + 10).optional(),
  endYear: z.number().int().min(1000).max(new Date().getFullYear() + 10).optional(),
});

/**
 * Update Series Schema
 */
export const updateSeriesSchema = createSeriesSchema.partial();

/**
 * Add Book to Series Schema
 */
export const addBookToSeriesSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  volumeNumber: z.number().int().positive().max(10000).optional(),
  displayOrder: z.number().int().min(0).default(0),
});

/**
 * Remove Book from Series Schema
 */
export const removeBookFromSeriesSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
});

/**
 * Series Search Schema
 */
export const seriesSearchParamsSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']).optional(),
  seriesType: z.enum(['manga', 'light_novel', 'book', 'comic', 'other']).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Type exports
 */
export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>;
export type AddBookToSeries = z.infer<typeof addBookToSeriesSchema>;
export type RemoveBookFromSeries = z.infer<typeof removeBookFromSeriesSchema>;
export type SeriesSearchParams = z.infer<typeof seriesSearchParamsSchema>;
