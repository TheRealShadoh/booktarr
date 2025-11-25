/**
 * Book API Input Validators
 * Zod schemas for validating all book-related API inputs
 */

import { z } from 'zod';

/**
 * ISBN validation patterns
 */
const ISBN_10_PATTERN = /^\d{9}[\dX]$/;
const ISBN_13_PATTERN = /^\d{13}$/;

/**
 * Create Book Schema
 */
export const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  subtitle: z.string().max(500, 'Subtitle too long').optional(),
  description: z.string().max(5000, 'Description too long').optional(),

  // ISBNs (optional but validated if provided)
  isbn10: z
    .string()
    .regex(ISBN_10_PATTERN, 'Invalid ISBN-10 format')
    .optional()
    .or(z.literal('')),
  isbn13: z
    .string()
    .regex(ISBN_13_PATTERN, 'Invalid ISBN-13 format')
    .optional()
    .or(z.literal('')),

  // Publishing details
  language: z.string().max(10).default('en'),
  publisher: z.string().max(255).optional(),
  publishedDate: z.string().max(50).optional(), // YYYY-MM-DD or YYYY
  pageCount: z.number().int().positive().max(50000).optional(),

  // Categories/genres
  categories: z.array(z.string().max(100)).max(20).optional(),

  // Edition details
  format: z
    .enum(['hardcover', 'paperback', 'ebook', 'audiobook', 'manga', 'other'])
    .optional(),
  edition: z.string().max(100).optional(),

  // External IDs
  googleBooksId: z.string().max(100).optional(),
  openLibraryId: z.string().max(100).optional(),
  goodreadsId: z.string().max(100).optional(),

  // Cover images
  coverUrl: z.string().url().max(1000).optional().or(z.literal('')),
  coverThumbnailUrl: z.string().url().max(1000).optional().or(z.literal('')),

  // Authors (array of author names or IDs)
  authors: z.array(z.string().max(255)).min(1, 'At least one author required').max(20).optional(),

  // Ownership status
  status: z.enum(['owned', 'wanted', 'missing', 'loaned']).default('owned'),
  acquisitionDate: z.string().max(50).optional(),
  location: z.string().max(255).optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Search/Query Parameters Schema
 */
export const bookSearchParamsSchema = z.object({
  search: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
  status: z.enum(['owned', 'wanted', 'missing', 'loaned']).optional(),
  format: z.enum(['hardcover', 'paperback', 'ebook', 'audiobook', 'manga', 'other']).optional(),
  readingStatus: z.enum(['not_started', 'reading', 'completed', 'on_hold']).optional(),
  minRating: z.number().min(0).max(5).optional(),
  yearMin: z.number().int().min(1000).max(new Date().getFullYear() + 10).optional(),
  yearMax: z.number().int().min(1000).max(new Date().getFullYear() + 10).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Update Book Schema (partial)
 */
export const updateBookSchema = createBookSchema.partial();

/**
 * ISBN Search Schema
 */
export const isbnSearchSchema = z.object({
  isbn: z.string().refine(
    (val) => ISBN_10_PATTERN.test(val) || ISBN_13_PATTERN.test(val),
    'Invalid ISBN format'
  ),
});

/**
 * Metadata Search Schema
 */
export const metadataSearchSchema = z.object({
  query: z.string().min(1).max(500),
  source: z.enum(['google', 'openlibrary', 'anilist', 'all']).default('all'),
  limit: z.number().int().min(1).max(50).default(10),
});

/**
 * Bulk Operations Schema
 */
export const bulkDeleteSchema = z.object({
  bookIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * Book ID Parameter Schema (for route params)
 */
export const bookIdParamSchema = z.object({
  id: z.string().uuid('Invalid book ID format'),
});

/**
 * Book Search Schema (for search API)
 */
export const bookSearchSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1).max(500).optional(),
  author: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(50).default(10).optional(),
}).refine(
  (data) => data.isbn || data.title,
  'Either ISBN or title must be provided'
);

/**
 * Type exports
 */
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type BookSearchParams = z.infer<typeof bookSearchParamsSchema>;
export type ISBNSearch = z.infer<typeof isbnSearchSchema>;
export type MetadataSearch = z.infer<typeof metadataSearchSchema>;
export type BulkDelete = z.infer<typeof bulkDeleteSchema>;
export type BookIdParam = z.infer<typeof bookIdParamSchema>;
export type BookSearch = z.infer<typeof bookSearchSchema>;
