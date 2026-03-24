'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Bell,
  Download,
  Search,
  Activity,
  RefreshCw,
  CheckCheck,
  Eye,
  Trash2,
  AlertCircle,
  Info,
} from 'lucide-react';

interface ActivityEntry {
  id: string;
  eventType:
    | 'download_queued'
    | 'download_complete'
    | 'download_failed'
    | 'search_started'
    | 'search_complete'
    | 'series_added'
    | 'series_monitored'
    | 'series_unmonitored'
    | 'info'
    | 'error';
  entityName: string;
  details?: string;
  timestamp: string;
  read: boolean;
}

interface ActivityResponse {
  items: ActivityEntry[];
  unreadCount: number;
  limit: number;
  offset: number;
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function EventIcon({ type }: { type: ActivityEntry['eventType'] }) {
  const cls = 'h-4 w-4 shrink-0';
  switch (type) {
    case 'download_queued':
      return <Download className={`${cls} text-blue-500`} />;
    case 'download_complete':
      return <Download className={`${cls} text-green-500`} />;
    case 'download_failed':
      return <AlertCircle className={`${cls} text-destructive`} />;
    case 'search_started':
    case 'search_complete':
      return <Search className={`${cls} text-muted-foreground`} />;
    case 'series_added':
      return <Activity className={`${cls} text-purple-500`} />;
    case 'series_monitored':
      return <Eye className={`${cls} text-primary`} />;
    case 'series_unmonitored':
      return <Eye className={`${cls} text-muted-foreground`} />;
    case 'error':
      return <AlertCircle className={`${cls} text-destructive`} />;
    default:
      return <Info className={`${cls} text-muted-foreground`} />;
  }
}

function eventTypeLabel(type: ActivityEntry['eventType']): string {
  const labels: Record<ActivityEntry['eventType'], string> = {
    download_queued: 'Download Queued',
    download_complete: 'Download Complete',
    download_failed: 'Download Failed',
    search_started: 'Search Started',
    search_complete: 'Search Complete',
    series_added: 'Series Added',
    series_monitored: 'Series Monitored',
    series_unmonitored: 'Series Unmonitored',
    info: 'Info',
    error: 'Error',
  };
  return labels[type] ?? type;
}

const ALL_EVENT_TYPES = 'all';

export default function ActivityPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>(ALL_EVENT_TYPES);

  const { data, isLoading, error, refetch } = useQuery<ActivityResponse>({
    queryKey: ['monitoring', 'activity'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/activity');
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json() as Promise<ActivityResponse>;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/monitoring/activity/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'All activity marked as read' });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'activity'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'activity', 'unread'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark all as read. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/monitoring/activity', {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to clear activity');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Activity log cleared' });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'activity'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'activity', 'unread'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to clear activity log.',
        variant: 'destructive',
      });
    },
  });

  const filteredEntries = (data?.items ?? []).filter((entry) => {
    if (typeFilter === ALL_EVENT_TYPES) return true;
    return entry.eventType === typeFilter;
  });

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Activity</h1>
            {unreadCount > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 text-xs">{unreadCount}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {data?.items.length ?? 0} total{' '}
            {(data?.items.length ?? 0) === 1 ? 'event' : 'events'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              {markAllReadMutation.isPending ? 'Marking...' : 'Mark All Read'}
            </Button>
          )}

          {(data?.items.length ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {clearAllMutation.isPending ? 'Clearing...' : 'Clear All'}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_EVENT_TYPES}>All Events</SelectItem>
            <SelectItem value="download_queued">Download Queued</SelectItem>
            <SelectItem value="download_complete">Download Complete</SelectItem>
            <SelectItem value="download_failed">Download Failed</SelectItem>
            <SelectItem value="search_started">Search Started</SelectItem>
            <SelectItem value="search_complete">Search Complete</SelectItem>
            <SelectItem value="series_added">Series Added</SelectItem>
            <SelectItem value="series_monitored">Series Monitored</SelectItem>
            <SelectItem value="series_unmonitored">Series Unmonitored</SelectItem>
            <SelectItem value="error">Errors</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <Skeleton className="mt-1 h-4 w-4 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between rounded-md bg-destructive/10 p-4 text-destructive">
          <span>Failed to load activity. Please try again.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredEntries.length === 0 && (
        <div className="rounded-lg border-2 border-dashed py-16 text-center">
          <Bell className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            {typeFilter !== ALL_EVENT_TYPES
              ? 'No events match this filter'
              : 'No activity yet'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {typeFilter !== ALL_EVENT_TYPES
              ? 'Try selecting a different event type.'
              : 'Activity will appear here as your monitoring system works.'}
          </p>
        </div>
      )}

      {/* Activity timeline */}
      {!isLoading && !error && filteredEntries.length > 0 && (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[1.1875rem] top-0 bottom-0 w-px bg-border" aria-hidden="true" />

          <div className="space-y-1">
            {filteredEntries.map((entry, index) => (
              <div
                key={entry.id}
                className={`relative flex items-start gap-4 rounded-lg px-3 py-3 transition-colors ${
                  !entry.read ? 'bg-primary/5' : 'hover:bg-muted/40'
                }`}
              >
                {/* Icon bubble on the timeline */}
                <div
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    !entry.read
                      ? 'bg-background border-primary/50'
                      : 'bg-background border-border'
                  }`}
                >
                  <EventIcon type={entry.eventType} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className={`text-sm font-medium ${!entry.read ? '' : 'text-foreground'}`}>
                      {entry.entityName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {eventTypeLabel(entry.eventType)}
                    </Badge>
                    {!entry.read && (
                      <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                    )}
                  </div>
                  {entry.details && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.details}</p>
                  )}
                </div>

                {/* Timestamp */}
                <time
                  dateTime={entry.timestamp}
                  title={new Date(entry.timestamp).toLocaleString()}
                  className="shrink-0 pt-1 text-xs text-muted-foreground"
                >
                  {getRelativeTime(entry.timestamp)}
                </time>

                {/* Connector line gap suppression for last item */}
                {index === filteredEntries.length - 1 && (
                  <div className="absolute left-[1.1875rem] bottom-0 top-8 w-px bg-background" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
