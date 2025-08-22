/**
 * React Query hooks for book data management
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Book, Series } from '../types';
import { booktarrAPI } from '../services/api';
import { useAppContext } from '../context/AppContext';

// Query keys for consistent caching
export const bookQueryKeys = {
  all: ['books'] as const,
  lists: () => [...bookQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...bookQueryKeys.lists(), filters] as const,
  details: () => [...bookQueryKeys.all, 'detail'] as const,
  detail: (isbn: string) => [...bookQueryKeys.details(), isbn] as const,
  search: (query: string) => [...bookQueryKeys.all, 'search', query] as const,
};

export const seriesQueryKeys = {
  all: ['series'] as const,
  lists: () => [...seriesQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...seriesQueryKeys.lists(), filters] as const,
  details: () => [...seriesQueryKeys.all, 'detail'] as const,
  detail: (seriesName: string) => [...seriesQueryKeys.details(), seriesName] as const,
};

// Custom hook for fetching all books
export const useBooks = (options?: UseQueryOptions<Book[], Error>) => {
  return useQuery<Book[], Error>({
    queryKey: bookQueryKeys.lists(),
    queryFn: async () => {
      const response = await fetch('/api/books');
      if (!response.ok) {
        throw new Error('Failed to fetch books');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

// Custom hook for fetching book details
export const useBook = (isbn: string, options?: UseQueryOptions<Book, Error>) => {
  return useQuery<Book, Error>({
    queryKey: bookQueryKeys.detail(isbn),
    queryFn: async () => {
      const response = await fetch(`/api/books/${isbn}`);
      if (!response.ok) {
        throw new Error('Failed to fetch book details');
      }
      return response.json();
    },
    enabled: !!isbn,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

// Custom hook for searching books
export const useBookSearch = (query: string, options?: UseQueryOptions<Book[], Error>) => {
  return useQuery<Book[], Error>({
    queryKey: bookQueryKeys.search(query),
    queryFn: async () => {
      if (!query.trim()) return [];
      
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search books');
      }
      return response.json();
    },
    enabled: query.trim().length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

// Custom hook for fetching series
export const useSeries = (options?: UseQueryOptions<Series[], Error>) => {
  return useQuery<Series[], Error>({
    queryKey: seriesQueryKeys.lists(),
    queryFn: async () => {
      const response = await fetch('/api/series');
      if (!response.ok) {
        throw new Error('Failed to fetch series');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// Custom hook for fetching series details
export const useSeriesDetails = (seriesName: string, options?: UseQueryOptions<any, Error>) => {
  return useQuery({
    queryKey: seriesQueryKeys.detail(seriesName),
    queryFn: async () => {
      const response = await fetch(`/api/series/${encodeURIComponent(seriesName)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch series details');
      }
      return response.json();
    },
    enabled: !!seriesName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

// Mutation hooks with optimistic updates
export const useAddBookMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useAppContext();

  return useMutation({
    mutationFn: async (book: Partial<Book>) => {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add book');
      }
      
      return response.json();
    },
    onMutate: async (newBook) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: bookQueryKeys.lists() });

      // Snapshot the previous value
      const previousBooks = queryClient.getQueryData<Book[]>(bookQueryKeys.lists());

      // Optimistically update to the new value
      if (previousBooks && newBook.isbn) {
        const optimisticBook: Book = {
          isbn: newBook.isbn,
          title: newBook.title || 'Loading...',
          authors: newBook.authors || [],
          series: newBook.series,
          series_position: newBook.series_position,
          publisher: newBook.publisher,
          published_date: newBook.published_date,
          page_count: newBook.page_count,
          language: newBook.language || 'en',
          thumbnail_url: newBook.thumbnail_url,
          cover_url: newBook.cover_url,
          description: newBook.description,
          categories: newBook.categories || [],
          pricing: newBook.pricing || [],
          metadata_source: newBook.metadata_source || 'manual',
          added_date: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          // Add loading indicator
          _isOptimistic: true,
        } as Book & { _isOptimistic: boolean };

        queryClient.setQueryData<Book[]>(
          bookQueryKeys.lists(),
          [optimisticBook, ...previousBooks]
        );
      }

      // Return a context object with the snapshotted value
      return { previousBooks };
    },
    onError: (err, newBook, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBooks) {
        queryClient.setQueryData(bookQueryKeys.lists(), context.previousBooks);
      }
      
      showToast(`Failed to add book: ${err.message}`, 'error');
    },
    onSuccess: (data, variables) => {
      showToast(`"${data.title}" added successfully!`, 'success');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: bookQueryKeys.lists() });
    },
  });
};

export const useRemoveBookMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useAppContext();

  return useMutation({
    mutationFn: async (isbn: string) => {
      const response = await fetch(`/api/books/${isbn}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove book');
      }
      
      return response.json();
    },
    onMutate: async (deletedIsbn) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: bookQueryKeys.lists() });

      // Snapshot the previous value
      const previousBooks = queryClient.getQueryData<Book[]>(bookQueryKeys.lists());

      // Optimistically update to the new value
      if (previousBooks) {
        queryClient.setQueryData<Book[]>(
          bookQueryKeys.lists(),
          previousBooks.filter(book => book.isbn !== deletedIsbn)
        );
      }

      // Return a context object with the snapshotted value
      return { previousBooks };
    },
    onError: (err, deletedIsbn, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBooks) {
        queryClient.setQueryData(bookQueryKeys.lists(), context.previousBooks);
      }
      
      showToast(`Failed to remove book: ${err.message}`, 'error');
    },
    onSuccess: (data) => {
      showToast('Book removed successfully!', 'success');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: bookQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: seriesQueryKeys.lists() });
    },
  });
};

export const useUpdateBookMutation = () => {
  const queryClient = useQueryClient();
  const { showToast } = useAppContext();

  return useMutation({
    mutationFn: async ({ isbn, updates }: { isbn: string; updates: Partial<Book> }) => {
      const response = await fetch(`/api/books/${isbn}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update book');
      }
      
      return response.json();
    },
    onMutate: async ({ isbn, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: bookQueryKeys.detail(isbn) });
      await queryClient.cancelQueries({ queryKey: bookQueryKeys.lists() });

      // Snapshot the previous values
      const previousBook = queryClient.getQueryData<Book>(bookQueryKeys.detail(isbn));
      const previousBooks = queryClient.getQueryData<Book[]>(bookQueryKeys.lists());

      // Optimistically update the individual book
      if (previousBook) {
        queryClient.setQueryData<Book>(
          bookQueryKeys.detail(isbn),
          { ...previousBook, ...updates }
        );
      }

      // Optimistically update the books list
      if (previousBooks) {
        queryClient.setQueryData<Book[]>(
          bookQueryKeys.lists(),
          previousBooks.map(book => 
            book.isbn === isbn ? { ...book, ...updates } : book
          )
        );
      }

      return { previousBook, previousBooks };
    },
    onError: (err, { isbn }, context) => {
      // Roll back changes
      if (context?.previousBook) {
        queryClient.setQueryData(bookQueryKeys.detail(isbn), context.previousBook);
      }
      if (context?.previousBooks) {
        queryClient.setQueryData(bookQueryKeys.lists(), context.previousBooks);
      }
      
      showToast(`Failed to update book: ${err.message}`, 'error');
    },
    onSuccess: (data) => {
      showToast('Book updated successfully!', 'success');
    },
    onSettled: (data, error, { isbn }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: bookQueryKeys.detail(isbn) });
      queryClient.invalidateQueries({ queryKey: bookQueryKeys.lists() });
    },
  });
};

// Hook to prefetch related data
export const usePrefetchRelatedData = () => {
  const queryClient = useQueryClient();

  const prefetchBook = (isbn: string) => {
    queryClient.prefetchQuery({
      queryKey: bookQueryKeys.detail(isbn),
      queryFn: async () => {
        const response = await fetch(`/api/books/${isbn}`);
        if (!response.ok) throw new Error('Failed to fetch book');
        return response.json();
      },
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchSeries = (seriesName: string) => {
    queryClient.prefetchQuery({
      queryKey: seriesQueryKeys.detail(seriesName),
      queryFn: async () => {
        const response = await fetch(`/api/series/${encodeURIComponent(seriesName)}`);
        if (!response.ok) throw new Error('Failed to fetch series');
        return response.json();
      },
      staleTime: 10 * 60 * 1000,
    });
  };

  return { prefetchBook, prefetchSeries };
};

// Background refetch hook
export const useBackgroundSync = () => {
  const queryClient = useQueryClient();

  const syncAll = () => {
    queryClient.invalidateQueries({ queryKey: bookQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: seriesQueryKeys.all });
  };

  const syncBooks = () => {
    queryClient.invalidateQueries({ queryKey: bookQueryKeys.lists() });
  };

  const syncSeries = () => {
    queryClient.invalidateQueries({ queryKey: seriesQueryKeys.lists() });
  };

  return { syncAll, syncBooks, syncSeries };
};