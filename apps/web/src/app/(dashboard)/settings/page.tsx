'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ShareManager } from '@/components/sharing/share-manager';
import { AddBookDialog } from '@/components/books/add-book-dialog';
import { ExternalLink, Server, Globe, Trash2, Plus, RefreshCw, Star, Layers } from 'lucide-react';

// ---- Download Clients types ----
interface DownloadClient {
  id: string;
  name: string;
  type: 'deluge' | 'sabnzbd';
  host: string;
  category?: string | null;
  enabled: boolean;
}

interface DownloadClientsResponse {
  clients: DownloadClient[];
}

type DownloadClientType = 'deluge' | 'sabnzbd';

// ---- Indexers types ----
interface Indexer {
  id: string;
  name: string;
  type: 'torznab' | 'newznab';
  url: string;
  categories?: string | null;
  enabled: boolean;
}

interface IndexersResponse {
  indexers: Indexer[];
}

type IndexerType = 'torznab' | 'newznab';

// ---- Import Lists types ----
interface ImportList {
  id: string;
  name: string;
  source: 'anilist_reading' | 'anilist_planning' | 'manual';
  sourceConfig: { anilistUsername?: string } | null;
  autoMonitor: boolean;
  lastSynced: string | null;
  syncInterval: number;
  enabled: boolean;
}

interface ImportListsResponse {
  items: ImportList[];
  total: number;
}

type ImportListSource = 'anilist_reading' | 'anilist_planning' | 'manual';

// ---- Quality Profiles types ----
type BookFormat = 'hardcover' | 'paperback' | 'ebook' | 'audiobook' | 'manga';

const ALL_FORMATS: BookFormat[] = ['hardcover', 'paperback', 'ebook', 'audiobook', 'manga'];

const FORMAT_LABELS: Record<BookFormat, string> = {
  hardcover: 'Hardcover',
  paperback: 'Paperback',
  ebook: 'Ebook',
  audiobook: 'Audiobook',
  manga: 'Manga',
};

interface QualityProfile {
  id: string;
  name: string;
  formatPreferences: BookFormat[];
  isDefault: boolean;
}

interface QualityProfilesResponse {
  profiles: QualityProfile[];
  total: number;
}

interface DuplicateBook {
  userBookId: string;
  bookId: string;
  title: string;
  isbn: string | null;
  coverUrl: string | null;
  createdAt: string;
}

interface DuplicateGroup {
  normalizedTitle: string;
  volume: string;
  books: DuplicateBook[];
  /** userBookId selected to keep; all others will be deleted */
  keepId?: string;
}

interface DuplicatesResult {
  duplicateGroups: DuplicateGroup[];
  totalDuplicates: number;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [changeName, setChangeName] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentStatus, setEnrichmentStatus] = useState<{
    count: number;
    lastRun?: {
      processed: number;
      enriched: number;
      failed: number;
    };
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [duplicatesResult, setDuplicatesResult] = useState<DuplicatesResult | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ---- Download Clients state ----
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientType, setNewClientType] = useState<DownloadClientType>('deluge');
  const [newClientHost, setNewClientHost] = useState('');
  const [newClientApiKey, setNewClientApiKey] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientCategory, setNewClientCategory] = useState('');
  const [testingClientId, setTestingClientId] = useState<string | null>(null);

  // ---- Indexers state ----
  const [addIndexerOpen, setAddIndexerOpen] = useState(false);
  const [newIndexerName, setNewIndexerName] = useState('');
  const [newIndexerType, setNewIndexerType] = useState<IndexerType>('torznab');
  const [newIndexerUrl, setNewIndexerUrl] = useState('');
  const [newIndexerApiKey, setNewIndexerApiKey] = useState('');
  const [newIndexerCategories, setNewIndexerCategories] = useState('');
  const [testingIndexerId, setTestingIndexerId] = useState<string | null>(null);

  // ---- Import Lists state ----
  const [addImportListOpen, setAddImportListOpen] = useState(false);
  const [newImportListName, setNewImportListName] = useState('');
  const [newImportListSource, setNewImportListSource] = useState<ImportListSource>('anilist_reading');
  const [newImportListUsername, setNewImportListUsername] = useState('');
  const [newImportListAutoMonitor, setNewImportListAutoMonitor] = useState(true);
  const [newImportListInterval, setNewImportListInterval] = useState('24');
  const [syncingImportListId, setSyncingImportListId] = useState<string | null>(null);

  // ---- Quality Profiles state ----
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileFormats, setNewProfileFormats] = useState<BookFormat[]>(['hardcover', 'paperback', 'ebook']);
  const [newProfileIsDefault, setNewProfileIsDefault] = useState(false);

  // ---- Fetch download clients ----
  const { data: clientsData, isLoading: clientsLoading } = useQuery<DownloadClientsResponse>({
    queryKey: ['monitoring', 'clients'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/clients');
      if (!response.ok) throw new Error('Failed to fetch download clients');
      return response.json() as Promise<DownloadClientsResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ---- Fetch indexers ----
  const { data: indexersData, isLoading: indexersLoading } = useQuery<IndexersResponse>({
    queryKey: ['monitoring', 'indexers'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/indexers');
      if (!response.ok) throw new Error('Failed to fetch indexers');
      return response.json() as Promise<IndexersResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ---- Fetch import lists ----
  const { data: importListsData, isLoading: importListsLoading } = useQuery<ImportListsResponse>({
    queryKey: ['monitoring', 'imports'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/imports');
      if (!response.ok) throw new Error('Failed to fetch import lists');
      return response.json() as Promise<ImportListsResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ---- Fetch quality profiles ----
  const { data: profilesData, isLoading: profilesLoading } = useQuery<QualityProfilesResponse>({
    queryKey: ['monitoring', 'profiles'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/profiles');
      if (!response.ok) throw new Error('Failed to fetch quality profiles');
      return response.json() as Promise<QualityProfilesResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ---- Add quality profile ----
  const addProfileMutation = useMutation({
    mutationFn: async (payload: { name: string; formatPreferences: BookFormat[]; isDefault: boolean }) => {
      const response = await fetch('/api/monitoring/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to add profile' }));
        throw new Error((err as { error?: string }).error ?? 'Failed to add profile');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Quality profile added' });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'profiles'] });
      setAddProfileOpen(false);
      setNewProfileName('');
      setNewProfileFormats(['hardcover', 'paperback', 'ebook']);
      setNewProfileIsDefault(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ---- Set profile as default ----
  const setDefaultProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/monitoring/profiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitoring', 'profiles'] }),
    onError: () => toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' }),
  });

  // ---- Delete quality profile ----
  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/monitoring/profiles/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete profile');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Profile removed' });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'profiles'] });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete profile', variant: 'destructive' }),
  });

  const handleAddProfile = () => {
    if (!newProfileName.trim()) {
      toast({ title: 'Name required', description: 'Please enter a name for this profile.', variant: 'destructive' });
      return;
    }
    if (newProfileFormats.length === 0) {
      toast({ title: 'Format required', description: 'Select at least one format.', variant: 'destructive' });
      return;
    }
    addProfileMutation.mutate({
      name: newProfileName.trim(),
      formatPreferences: newProfileFormats,
      isDefault: newProfileIsDefault,
    });
  };

  const toggleFormat = (fmt: BookFormat) => {
    setNewProfileFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
    );
  };

  // ---- Add download client ----
  const addClientMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      type: DownloadClientType;
      host: string;
      apiKey?: string;
      password?: string;
      category?: string;
    }) => {
      const response = await fetch('/api/monitoring/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to add client' }));
        throw new Error((err as { error?: string }).error ?? 'Failed to add client');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Download client added' });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'clients'] });
      setAddClientOpen(false);
      setNewClientName('');
      setNewClientType('deluge');
      setNewClientHost('');
      setNewClientApiKey('');
      setNewClientPassword('');
      setNewClientCategory('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ---- Toggle / delete download client ----
  const toggleClientMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await fetch(`/api/monitoring/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error('Failed to update client');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitoring', 'clients'] }),
    onError: () => toast({ title: 'Error', description: 'Failed to update client', variant: 'destructive' }),
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/monitoring/clients/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete client');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Client removed' });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'clients'] });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete client', variant: 'destructive' }),
  });

  const handleTestClient = async (id: string) => {
    setTestingClientId(id);
    try {
      const response = await fetch(`/api/monitoring/clients/${id}/test`, { method: 'POST' });
      const result = await response.json() as { success?: boolean; message?: string };
      if (result.success) {
        toast({ title: 'Connection successful', description: result.message ?? 'Client is reachable.' });
      } else {
        toast({ title: 'Connection failed', description: result.message ?? 'Could not reach the client.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Test failed', description: 'Unexpected error testing client.', variant: 'destructive' });
    } finally {
      setTestingClientId(null);
    }
  };

  // ---- Add indexer ----
  const addIndexerMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      type: IndexerType;
      url: string;
      apiKey?: string;
      categories?: string;
    }) => {
      const response = await fetch('/api/monitoring/indexers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to add indexer' }));
        throw new Error((err as { error?: string }).error ?? 'Failed to add indexer');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Indexer added' });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'indexers'] });
      setAddIndexerOpen(false);
      setNewIndexerName('');
      setNewIndexerType('torznab');
      setNewIndexerUrl('');
      setNewIndexerApiKey('');
      setNewIndexerCategories('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ---- Toggle / delete indexer ----
  const toggleIndexerMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await fetch(`/api/monitoring/indexers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error('Failed to update indexer');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitoring', 'indexers'] }),
    onError: () => toast({ title: 'Error', description: 'Failed to update indexer', variant: 'destructive' }),
  });

  const deleteIndexerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/monitoring/indexers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete indexer');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Indexer removed' });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'indexers'] });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete indexer', variant: 'destructive' }),
  });

  const handleTestIndexer = async (id: string) => {
    setTestingIndexerId(id);
    try {
      const response = await fetch(`/api/monitoring/indexers/${id}/test`, { method: 'POST' });
      const result = await response.json() as { success?: boolean; message?: string };
      if (result.success) {
        toast({ title: 'Connection successful', description: result.message ?? 'Indexer is reachable.' });
      } else {
        toast({ title: 'Connection failed', description: result.message ?? 'Could not reach the indexer.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Test failed', description: 'Unexpected error testing indexer.', variant: 'destructive' });
    } finally {
      setTestingIndexerId(null);
    }
  };

  const handleAddClient = () => {
    if (!newClientName.trim() || !newClientHost.trim()) {
      toast({ title: 'Required fields missing', description: 'Name and host URL are required.', variant: 'destructive' });
      return;
    }
    addClientMutation.mutate({
      name: newClientName.trim(),
      type: newClientType,
      host: newClientHost.trim(),
      ...(newClientType === 'sabnzbd' && newClientApiKey.trim() ? { apiKey: newClientApiKey.trim() } : {}),
      ...(newClientType === 'deluge' && newClientPassword.trim() ? { password: newClientPassword.trim() } : {}),
      ...(newClientCategory.trim() ? { category: newClientCategory.trim() } : {}),
    });
  };

  const handleAddIndexer = () => {
    if (!newIndexerName.trim() || !newIndexerUrl.trim()) {
      toast({ title: 'Required fields missing', description: 'Name and URL are required.', variant: 'destructive' });
      return;
    }
    addIndexerMutation.mutate({
      name: newIndexerName.trim(),
      type: newIndexerType,
      url: newIndexerUrl.trim(),
      ...(newIndexerApiKey.trim() ? { apiKey: newIndexerApiKey.trim() } : {}),
      ...(newIndexerCategories.trim() ? { categories: newIndexerCategories.trim() } : {}),
    });
  };

  // ---- Import Lists mutations ----
  const addImportListMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      source: ImportListSource;
      sourceConfig?: { anilistUsername: string };
      autoMonitor: boolean;
      syncInterval: number;
    }) => {
      const response = await fetch('/api/monitoring/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to add import list' }));
        throw new Error((err as { error?: string }).error ?? 'Failed to add import list');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Import list added' });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'imports'] });
      setAddImportListOpen(false);
      setNewImportListName('');
      setNewImportListSource('anilist_reading');
      setNewImportListUsername('');
      setNewImportListAutoMonitor(true);
      setNewImportListInterval('24');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleImportListMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const response = await fetch(`/api/monitoring/imports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error('Failed to update import list');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitoring', 'imports'] }),
    onError: () => toast({ title: 'Error', description: 'Failed to update import list', variant: 'destructive' }),
  });

  const deleteImportListMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/monitoring/imports/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete import list');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Import list removed' });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'imports'] });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete import list', variant: 'destructive' }),
  });

  const handleSyncImportList = async (id: string) => {
    setSyncingImportListId(id);
    try {
      const response = await fetch(`/api/monitoring/imports/${id}/sync`, { method: 'POST' });
      const result = await response.json() as {
        success?: boolean;
        imported?: number;
        skipped?: number;
        errors?: number;
        error?: string;
      };
      if (response.ok && result.success) {
        const imported = result.imported ?? 0;
        const skipped = result.skipped ?? 0;
        toast({
          title: 'Sync complete',
          description: `${imported} series imported, ${skipped} already tracked.${result.errors ? ` ${result.errors} errors.` : ''}`,
        });
        queryClient.invalidateQueries({ queryKey: ['monitoring', 'imports'] });
        queryClient.invalidateQueries({ queryKey: ['series'] });
      } else {
        toast({ title: 'Sync failed', description: result.error ?? 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Sync failed', description: 'Unexpected error during sync.', variant: 'destructive' });
    } finally {
      setSyncingImportListId(null);
    }
  };

  const handleAddImportList = () => {
    if (!newImportListName.trim()) {
      toast({ title: 'Required fields missing', description: 'Name is required.', variant: 'destructive' });
      return;
    }
    if (newImportListSource !== 'manual' && !newImportListUsername.trim()) {
      toast({ title: 'Required fields missing', description: 'AniList username is required.', variant: 'destructive' });
      return;
    }
    const interval = parseInt(newImportListInterval, 10);
    if (isNaN(interval) || interval < 1) {
      toast({ title: 'Invalid interval', description: 'Sync interval must be at least 1 hour.', variant: 'destructive' });
      return;
    }
    addImportListMutation.mutate({
      name: newImportListName.trim(),
      source: newImportListSource,
      ...(newImportListSource !== 'manual' && newImportListUsername.trim()
        ? { sourceConfig: { anilistUsername: newImportListUsername.trim() } }
        : {}),
      autoMonitor: newImportListAutoMonitor,
      syncInterval: interval,
    });
  };

  const checkEnrichmentStatus = async () => {
    try {
      const response = await fetch('/api/books/enrich');
      if (response.ok) {
        const data = await response.json();
        setEnrichmentStatus({ count: data.count });
      } else {
        // If the status check fails (e.g. rate limit, transient error), assume
        // there may be books needing enrichment so the button stays enabled.
        setEnrichmentStatus({ count: 1 });
      }
    } catch (error) {
      logger.error('Error checking enrichment status:', error instanceof Error ? error : new Error(String(error)));
      // Enable button by default when the status check cannot be completed.
      setEnrichmentStatus({ count: 1 });
    }
  };

  const fetchBookCount = async () => {
    try {
      const response = await fetch('/api/books?limit=1');
      if (response.ok) {
        const data = await response.json();
        setBookCount(data.total ?? data.books?.length ?? 0);
      }
    } catch (error) {
      logger.error('Error fetching book count:', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const fetchAllBooks = async () => {
    const response = await fetch('/api/books?limit=10000');
    if (!response.ok) throw new Error('Failed to fetch books');
    const data = await response.json();
    return (data.books ?? data) as Record<string, unknown>[];
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const books = await fetchAllBooks();
      const headers = ['Title', 'Author', 'ISBN', 'Publisher', 'Format', 'Pages', 'Series', 'Status'];
      const rows = books.map((book) => [
        book.title ?? '',
        book.author ?? '',
        book.isbn ?? '',
        book.publisher ?? '',
        book.format ?? '',
        book.pageCount ?? '',
        book.seriesName ?? '',
        book.status ?? '',
      ]);
      const csvContent = [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'booktarr-library.csv';
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: `Exported ${books.length} books as CSV` });
    } catch (error) {
      logger.error('Error exporting CSV:', error instanceof Error ? error : new Error(String(error)));
      toast({ title: 'Error', description: 'Failed to export library', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const books = await fetchAllBooks();
      const jsonContent = JSON.stringify(books, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'booktarr-library.json';
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: `Exported ${books.length} books as JSON` });
    } catch (error) {
      logger.error('Error exporting JSON:', error instanceof Error ? error : new Error(String(error)));
      toast({ title: 'Error', description: 'Failed to export library', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleChangeName = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Coming soon', description: 'Profile updates coming soon' });
  };

  const handleEnrichBooks = async () => {
    setIsEnriching(true);

    try {
      const response = await fetch('/api/books/enrich?batchSize=10', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to enrich books');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: `Enriched ${result.enriched} out of ${result.processed} books`,
      });

      // Update status
      setEnrichmentStatus({
        count: Math.max(0, (enrichmentStatus?.count || 0) - result.enriched),
        lastRun: {
          processed: result.processed,
          enriched: result.enriched,
          failed: result.failed,
        },
      });

      // Invalidate book queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['books'] });
    } catch (error) {
      logger.error('Error enriching books:', error instanceof Error ? error : new Error(String(error)));
      toast({
        title: 'Error',
        description: 'Failed to enrich books. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleClearBooks = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast({
        title: 'Error',
        description: 'Please type DELETE to confirm',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/books/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_ALL' }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear books');
      }

      toast({
        title: 'Success',
        description: 'All books have been removed from your library',
      });

      // Invalidate all book-related queries
      queryClient.invalidateQueries({ queryKey: ['books'] });

      // Reset and close dialog
      setDeleteConfirmText('');
      setShowDeleteDialog(false);
    } catch (error) {
      logger.error('Error clearing books:', error instanceof Error ? error : new Error(String(error)));
      toast({
        title: 'Error',
        description: 'Failed to clear books. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleScanDuplicates = async () => {
    setIsScanning(true);
    setDuplicatesResult(null);
    setDuplicateGroups([]);
    try {
      const response = await fetch('/api/books/duplicates');
      if (!response.ok) throw new Error('Failed to scan for duplicates');
      const data: DuplicatesResult = await response.json();
      setDuplicatesResult(data);
      // Initialise each group with the newest book pre-selected to keep
      setDuplicateGroups(
        data.duplicateGroups.map((group) => {
          const sorted = [...group.books].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          return { ...group, keepId: sorted[0]?.userBookId };
        })
      );
    } catch (error) {
      logger.error('Error scanning duplicates:', error instanceof Error ? error : new Error(String(error)));
      toast({ title: 'Error', description: 'Failed to scan for duplicates', variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleKeepNewest = (groupIndex: number) => {
    setDuplicateGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        const sorted = [...group.books].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return { ...group, keepId: sorted[0]?.userBookId };
      })
    );
  };

  const getIdsToDelete = (groups: DuplicateGroup[]): string[] =>
    groups.flatMap((group) =>
      group.books
        .filter((b) => b.userBookId !== group.keepId)
        .map((b) => b.userBookId)
    );

  const handleRemoveAllDuplicates = async () => {
    const idsToDelete = getIdsToDelete(duplicateGroups);
    if (idsToDelete.length === 0) {
      toast({ title: 'Nothing to remove', description: 'No duplicates are marked for deletion.' });
      return;
    }
    setIsCleaningDuplicates(true);
    try {
      const response = await fetch('/api/books/duplicates/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userBookIds: idsToDelete }),
      });
      if (!response.ok) throw new Error('Failed to remove duplicates');
      const result = await response.json() as { deleted: number };
      toast({ title: 'Success', description: `Removed ${result.deleted} duplicate ${result.deleted === 1 ? 'entry' : 'entries'}` });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setDuplicatesResult(null);
      setDuplicateGroups([]);
    } catch (error) {
      logger.error('Error removing duplicates:', error instanceof Error ? error : new Error(String(error)));
      toast({ title: 'Error', description: 'Failed to remove duplicates', variant: 'destructive' });
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  // Check enrichment status and book count on mount
  useEffect(() => {
    checkEnrichmentStatus();
    fetchBookCount();
  }, []);

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your BookTarr preferences and account settings
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Name</Label>
              <p className="text-sm font-medium">{session?.user?.name ?? 'Not set'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{session?.user?.email ?? 'Not set'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Role</Label>
              <div>
                <Badge variant="secondary">{(session?.user as { role?: string } | undefined)?.role ?? 'user'}</Badge>
              </div>
            </div>
            <form onSubmit={handleChangeName} className="space-y-2 pt-2">
              <Label htmlFor="change-name" className="text-muted-foreground">Change Display Name</Label>
              <div className="flex gap-2">
                <Input
                  id="change-name"
                  placeholder="New display name"
                  value={changeName}
                  onChange={(e) => setChangeName(e.target.value)}
                  className="max-w-sm"
                  disabled
                />
                <Button type="submit" variant="outline" disabled>
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Profile name changes coming soon.</p>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata Sources</CardTitle>
            <CardDescription>Where book and series metadata is fetched from</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">Google Books</p>
                  <p className="text-xs text-muted-foreground">Primary source for book metadata, covers, and descriptions</p>
                </div>
                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">OpenLibrary</p>
                  <p className="text-xs text-muted-foreground">Fallback source for ISBN lookups and cover images</p>
                </div>
                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">AniList</p>
                  <p className="text-xs text-muted-foreground">Manga and light novel series metadata, volume counts</p>
                </div>
                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Services</CardTitle>
            <CardDescription>Connect your Amazon reading libraries to track eBooks and audiobooks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Kindle &amp; Audible</p>
              <p className="text-sm text-muted-foreground">
                Add books from your Kindle or Audible library using any of the methods below.
              </p>
            </div>

            <div className="space-y-3">
              {/* Method 1 */}
              <div className="rounded-lg border p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">1. Manual ASIN Entry</p>
                  <p className="text-xs text-muted-foreground">Add books one at a time using their Amazon ASIN identifier.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddBook(true)}
                >
                  Open Add Book Dialog
                </Button>
              </div>

              {/* Method 2 */}
              <div className="rounded-lg border p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">2. Kindle CSV Export</p>
                  <p className="text-xs text-muted-foreground">Export your entire Kindle library at once using a Chrome extension.</p>
                </div>
                <a
                  href="https://chromewebstore.google.com/detail/cnmmnejiklbbkapmjegmldhaejjiejbo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 hover:no-underline"
                >
                  Kindle Book List Downloader
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Method 3 */}
              <div className="rounded-lg border p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">3. Audible CSV Export</p>
                  <p className="text-xs text-muted-foreground">Export your Audible library using a Chrome extension.</p>
                </div>
                <a
                  href="https://github.com/joonaspaakko/audible-library-extractor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 hover:no-underline"
                >
                  Audible Library Extractor
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Method 4 */}
              <div className="rounded-lg border p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">4. Amazon Order History</p>
                  <p className="text-xs text-muted-foreground">Download your full Amazon purchase history from the Amazon Privacy Central page.</p>
                </div>
                <a
                  href="https://www.amazon.com/gp/privacycentral"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 hover:no-underline"
                >
                  Amazon Privacy Central
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import &amp; Export</CardTitle>
            <CardDescription>Manage your library data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Export Library</Label>
              {bookCount !== null && (
                <p className="text-sm text-muted-foreground">
                  Your library contains <span className="font-medium text-foreground">{bookCount}</span> {bookCount === 1 ? 'book' : 'books'}.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export as CSV'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportJSON}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export as JSON'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata Enrichment</CardTitle>
            <CardDescription>Automatically fetch missing book metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Enrich Books</Label>
              <p className="text-sm text-muted-foreground">
                Fetch missing metadata (descriptions, covers, page counts) from Google Books API.
                Rate limited to prevent API throttling.
              </p>
              {enrichmentStatus && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {enrichmentStatus.count} books need enrichment
                  </p>
                  {enrichmentStatus.lastRun && (
                    <p className="text-sm text-muted-foreground">
                      Last run: {enrichmentStatus.lastRun.enriched} enriched, {enrichmentStatus.lastRun.failed} failed
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={handleEnrichBooks}
                  disabled={isEnriching || !enrichmentStatus?.count}
                >
                  {isEnriching ? 'Enriching...' : 'Enrich Next 10 Books'}
                </Button>
                <Button
                  variant="outline"
                  onClick={checkEnrichmentStatus}
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duplicate Detection</CardTitle>
            <CardDescription>Find and remove duplicate books in your library</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Scan Library</Label>
              <p className="text-sm text-muted-foreground">
                Detects duplicate entries by matching normalized titles and volume numbers.
              </p>
              <Button
                variant="outline"
                onClick={handleScanDuplicates}
                disabled={isScanning}
              >
                {isScanning ? 'Scanning...' : 'Scan for Duplicates'}
              </Button>
            </div>

            {duplicatesResult && (
              <div className="space-y-4">
                <p className="text-sm font-medium">
                  {duplicatesResult.duplicateGroups.length === 0
                    ? 'No duplicates found.'
                    : `Found ${duplicatesResult.duplicateGroups.length} duplicate ${duplicatesResult.duplicateGroups.length === 1 ? 'group' : 'groups'} (${duplicatesResult.totalDuplicates} extra ${duplicatesResult.totalDuplicates === 1 ? 'copy' : 'copies'})`}
                </p>

                {duplicateGroups.map((group, groupIndex) => (
                  <div key={`${group.normalizedTitle}-${group.volume}`} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {group.books[0]?.title ?? group.normalizedTitle}
                        {group.volume !== 'none' && (
                          <span className="ml-1 text-muted-foreground">Vol. {group.volume}</span>
                        )}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleKeepNewest(groupIndex)}
                      >
                        Keep Newest
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {group.books.map((book) => {
                        const isKept = book.userBookId === group.keepId;
                        return (
                          <div
                            key={book.userBookId}
                            className={`flex items-center gap-3 rounded p-2 text-sm ${isKept ? 'bg-muted/50' : 'opacity-60'}`}
                          >
                            {book.coverUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={book.coverUrl}
                                alt={book.title}
                                className="h-10 w-7 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{book.title}</p>
                              {book.isbn && (
                                <p className="text-xs text-muted-foreground">ISBN: {book.isbn}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Added: {new Date(book.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={isKept ? 'default' : 'secondary'}>
                              {isKept ? 'Keep' : 'Remove'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {duplicatesResult.duplicateGroups.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleRemoveAllDuplicates}
                    disabled={isCleaningDuplicates}
                  >
                    {isCleaningDuplicates
                      ? 'Removing...'
                      : (() => {
                          const count = getIdsToDelete(duplicateGroups).length;
                          return `Remove All Duplicates (${count} extra ${count === 1 ? 'copy' : 'copies'})`;
                        })()}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Library Sharing</CardTitle>
            <CardDescription>Share your library with other BookTarr users</CardDescription>
          </CardHeader>
          <CardContent>
            <ShareManager />
          </CardContent>
        </Card>

        {/* ---- Download Clients card ---- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Download Clients</CardTitle>
                <CardDescription>Configure clients for automated downloading</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddClientOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {clientsLoading && (
              <p className="text-sm text-muted-foreground">Loading clients...</p>
            )}
            {!clientsLoading && (clientsData?.clients ?? []).length === 0 && (
              <div className="rounded-lg border-2 border-dashed py-8 text-center">
                <Server className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No download clients configured. Add one to enable automated downloading.
                </p>
              </div>
            )}
            {(clientsData?.clients ?? []).map((client) => (
              <div
                key={client.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{client.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {client.type.toUpperCase()} &middot; {client.host}
                    {client.category ? ` · ${client.category}` : ''}
                  </p>
                </div>
                <Badge
                  variant={client.enabled ? 'default' : 'secondary'}
                  className="shrink-0 cursor-pointer select-none"
                  onClick={() =>
                    toggleClientMutation.mutate({ id: client.id, enabled: !client.enabled })
                  }
                >
                  {client.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestClient(client.id)}
                  disabled={testingClientId === client.id}
                >
                  {testingClientId === client.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteClientMutation.mutate(client.id)}
                  disabled={deleteClientMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ---- Indexers card ---- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Indexers</CardTitle>
                <CardDescription>Configure Torznab and Newznab indexers for searching</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddIndexerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Indexer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {indexersLoading && (
              <p className="text-sm text-muted-foreground">Loading indexers...</p>
            )}
            {!indexersLoading && (indexersData?.indexers ?? []).length === 0 && (
              <div className="rounded-lg border-2 border-dashed py-8 text-center">
                <Globe className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No indexers configured. Add one to enable searching for missing volumes.
                </p>
              </div>
            )}
            {(indexersData?.indexers ?? []).map((indexer) => (
              <div
                key={indexer.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{indexer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {indexer.type.toUpperCase()} &middot; {indexer.url}
                    {indexer.categories ? ` · ${indexer.categories}` : ''}
                  </p>
                </div>
                <Badge
                  variant={indexer.enabled ? 'default' : 'secondary'}
                  className="shrink-0 cursor-pointer select-none"
                  onClick={() =>
                    toggleIndexerMutation.mutate({ id: indexer.id, enabled: !indexer.enabled })
                  }
                >
                  {indexer.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestIndexer(indexer.id)}
                  disabled={testingIndexerId === indexer.id}
                >
                  {testingIndexerId === indexer.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteIndexerMutation.mutate(indexer.id)}
                  disabled={deleteIndexerMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ---- Import Lists card ---- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Import Lists</CardTitle>
                <CardDescription>Auto-import series from external reading lists like AniList</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddImportListOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Import List
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {importListsLoading && (
              <p className="text-sm text-muted-foreground">Loading import lists...</p>
            )}
            {!importListsLoading && (importListsData?.items ?? []).length === 0 && (
              <div className="rounded-lg border-2 border-dashed py-8 text-center">
                <Globe className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No import lists configured. Add one to auto-import series from AniList.
                </p>
              </div>
            )}
            {(importListsData?.items ?? []).map((list) => {
              const sourceLabel =
                list.source === 'anilist_reading' ? 'AniList Reading'
                : list.source === 'anilist_planning' ? 'AniList Planning'
                : 'Manual';
              const lastSyncedLabel = list.lastSynced
                ? new Date(list.lastSynced).toLocaleString()
                : 'Never';
              return (
                <div
                  key={list.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{list.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sourceLabel}
                      {list.sourceConfig?.anilistUsername ? ` · @${list.sourceConfig.anilistUsername}` : ''}
                      {' · '}Synced: {lastSyncedLabel}
                    </p>
                  </div>
                  <Badge
                    variant={list.enabled ? 'default' : 'secondary'}
                    className="shrink-0 cursor-pointer select-none"
                    onClick={() =>
                      toggleImportListMutation.mutate({ id: list.id, enabled: !list.enabled })
                    }
                  >
                    {list.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncImportList(list.id)}
                    disabled={syncingImportListId === list.id}
                    title="Sync now"
                  >
                    {syncingImportListId === list.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteImportListMutation.mutate(list.id)}
                    disabled={deleteImportListMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ---- Quality Profiles card ---- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Quality Profiles</CardTitle>
                <CardDescription>Define preferred book formats for acquisition (e.g. Physical Preferred, Ebook Only)</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddProfileOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {profilesLoading && (
              <p className="text-sm text-muted-foreground">Loading profiles...</p>
            )}
            {!profilesLoading && (profilesData?.profiles ?? []).length === 0 && (
              <div className="rounded-lg border-2 border-dashed py-8 text-center">
                <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No quality profiles yet. Add one to track preferred formats per series.
                </p>
              </div>
            )}
            {(profilesData?.profiles ?? []).map((profile) => (
              <div
                key={profile.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{profile.name}</p>
                    {profile.isDefault && (
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" aria-label="Default profile" />
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {profile.formatPreferences.map((fmt, idx) => (
                      <Badge key={fmt} variant="secondary" className="text-xs">
                        {idx + 1}. {FORMAT_LABELS[fmt]}
                      </Badge>
                    ))}
                  </div>
                </div>
                {!profile.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDefaultProfileMutation.mutate(profile.id)}
                    disabled={setDefaultProfileMutation.isPending}
                    className="shrink-0 text-xs"
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteProfileMutation.mutate(profile.id)}
                  disabled={deleteProfileMutation.isPending}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Manage your library data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Clear All Books</Label>
              <p className="text-sm text-muted-foreground">
                Remove all books from your library. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                Clear All Books
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddBookDialog
        open={showAddBook}
        onOpenChange={setShowAddBook}
        defaultStatus="owned"
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete all books from your library. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <span className="font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmText('');
                setShowDeleteDialog(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearBooks}
              disabled={deleteConfirmText !== 'DELETE' || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete All Books'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Add Quality Profile Dialog ---- */}
      <Dialog open={addProfileOpen} onOpenChange={setAddProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Quality Profile</DialogTitle>
            <DialogDescription>
              Choose which formats to search for and in what order of preference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                placeholder="e.g. Physical Preferred"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Formats (checked = included, order shown as priority number)</Label>
              <div className="space-y-2">
                {ALL_FORMATS.map((fmt) => {
                  const checked = newProfileFormats.includes(fmt);
                  const priority = newProfileFormats.indexOf(fmt) + 1;
                  return (
                    <div key={fmt} className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <input
                        type="checkbox"
                        id={`fmt-${fmt}`}
                        checked={checked}
                        onChange={() => toggleFormat(fmt)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <Label htmlFor={`fmt-${fmt}`} className="flex-1 cursor-pointer font-normal">
                        {FORMAT_LABELS[fmt]}
                      </Label>
                      {checked && (
                        <Badge variant="secondary" className="text-xs tabular-nums">
                          #{priority}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Formats are prioritised in the order they are checked.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              <input
                type="checkbox"
                id="profile-default"
                checked={newProfileIsDefault}
                onChange={(e) => setNewProfileIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="profile-default" className="font-normal cursor-pointer flex-1">
                Set as default profile
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProfileOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProfile} disabled={addProfileMutation.isPending}>
              {addProfileMutation.isPending ? 'Adding...' : 'Add Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Add Import List Dialog ---- */}
      <Dialog open={addImportListOpen} onOpenChange={setAddImportListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Import List</DialogTitle>
            <DialogDescription>
              Configure an external reading list to auto-import series into BookTarr.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="import-list-name">Name</Label>
              <Input
                id="import-list-name"
                placeholder="e.g. My AniList Reading"
                value={newImportListName}
                onChange={(e) => setNewImportListName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="import-list-source">Source</Label>
              <Select
                value={newImportListSource}
                onValueChange={(v) => setNewImportListSource(v as ImportListSource)}
              >
                <SelectTrigger id="import-list-source" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anilist_reading">AniList Reading (Currently Reading)</SelectItem>
                  <SelectItem value="anilist_planning">AniList Planning (Plan to Read)</SelectItem>
                  <SelectItem value="manual">Manual (no auto-sync)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newImportListSource !== 'manual' && (
              <div className="space-y-1">
                <Label htmlFor="import-list-username">AniList Username</Label>
                <Input
                  id="import-list-username"
                  placeholder="e.g. myanilistuser"
                  value={newImportListUsername}
                  onChange={(e) => setNewImportListUsername(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="import-list-interval">Sync Interval (hours)</Label>
              <Input
                id="import-list-interval"
                type="number"
                min={1}
                max={8760}
                placeholder="24"
                value={newImportListInterval}
                onChange={(e) => setNewImportListInterval(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Auto-monitor imported series</p>
                <p className="text-xs text-muted-foreground">
                  Automatically enable monitoring for series added from this list
                </p>
              </div>
              <Badge
                variant={newImportListAutoMonitor ? 'default' : 'secondary'}
                className="cursor-pointer select-none"
                onClick={() => setNewImportListAutoMonitor((v) => !v)}
              >
                {newImportListAutoMonitor ? 'On' : 'Off'}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddImportListOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddImportList}
              disabled={addImportListMutation.isPending}
            >
              {addImportListMutation.isPending ? 'Adding...' : 'Add Import List'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Add Download Client Dialog ---- */}
      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Download Client</DialogTitle>
            <DialogDescription>
              Configure a download client to handle automated downloads.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="client-name">Name</Label>
              <Input
                id="client-name"
                placeholder="e.g. My Deluge"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-type">Type</Label>
              <Select
                value={newClientType}
                onValueChange={(v) => setNewClientType(v as DownloadClientType)}
              >
                <SelectTrigger id="client-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deluge">Deluge</SelectItem>
                  <SelectItem value="sabnzbd">SABnzbd</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="client-host">Host URL</Label>
              <Input
                id="client-host"
                placeholder="http://localhost:8112"
                value={newClientHost}
                onChange={(e) => setNewClientHost(e.target.value)}
              />
            </div>
            {newClientType === 'sabnzbd' && (
              <div className="space-y-1">
                <Label htmlFor="client-apikey">API Key</Label>
                <Input
                  id="client-apikey"
                  placeholder="SABnzbd API key"
                  value={newClientApiKey}
                  onChange={(e) => setNewClientApiKey(e.target.value)}
                />
              </div>
            )}
            {newClientType === 'deluge' && (
              <div className="space-y-1">
                <Label htmlFor="client-password">Password</Label>
                <Input
                  id="client-password"
                  type="password"
                  placeholder="Deluge web password"
                  value={newClientPassword}
                  onChange={(e) => setNewClientPassword(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="client-category">Category (optional)</Label>
              <Input
                id="client-category"
                placeholder="e.g. books"
                value={newClientCategory}
                onChange={(e) => setNewClientCategory(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddClientOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddClient} disabled={addClientMutation.isPending}>
              {addClientMutation.isPending ? 'Adding...' : 'Add Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Add Indexer Dialog ---- */}
      <Dialog open={addIndexerOpen} onOpenChange={setAddIndexerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Indexer</DialogTitle>
            <DialogDescription>
              Configure a Torznab or Newznab indexer for searching missing volumes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="indexer-name">Name</Label>
              <Input
                id="indexer-name"
                placeholder="e.g. Prowlarr"
                value={newIndexerName}
                onChange={(e) => setNewIndexerName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="indexer-type">Type</Label>
              <Select
                value={newIndexerType}
                onValueChange={(v) => setNewIndexerType(v as IndexerType)}
              >
                <SelectTrigger id="indexer-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="torznab">Torznab</SelectItem>
                  <SelectItem value="newznab">Newznab</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="indexer-url">URL</Label>
              <Input
                id="indexer-url"
                placeholder="http://localhost:9696/1/api"
                value={newIndexerUrl}
                onChange={(e) => setNewIndexerUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="indexer-apikey">API Key</Label>
              <Input
                id="indexer-apikey"
                placeholder="Indexer API key"
                value={newIndexerApiKey}
                onChange={(e) => setNewIndexerApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="indexer-categories">Categories (optional)</Label>
              <Input
                id="indexer-categories"
                placeholder="e.g. 7020,7030"
                value={newIndexerCategories}
                onChange={(e) => setNewIndexerCategories(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated Newznab category IDs to limit search scope.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddIndexerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddIndexer} disabled={addIndexerMutation.isPending}>
              {addIndexerMutation.isPending ? 'Adding...' : 'Add Indexer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
