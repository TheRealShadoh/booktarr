'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Pause, Play, X, Trash2 } from 'lucide-react';

interface ImportJob {
  id: string;
  status: 'pending' | 'running' | 'paused' | 'cancelled' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    success: number;
    failed: number;
  };
  errors: Array<{
    row: number;
    error: string;
  }>;
  startedAt: Date;
  completedAt?: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
  error?: string;
  filename?: string;
}

export function ImportManager() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/import/jobs');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Poll for updates every 2 seconds
    const interval = setInterval(fetchJobs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleJobAction = async (jobId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      const response = await fetch(`/api/import/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: data.message,
        });
        fetchJobs();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Action failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform action',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/import/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Import deleted',
        });
        fetchJobs();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Delete failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete import',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-gray-100 text-gray-800',
      running: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status as keyof typeof statusColors] || statusColors.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading imports...</div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">No import history</p>
        <p className="text-sm text-muted-foreground mt-1">Start an import to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <Alert key={job.id} className="relative">
          <AlertDescription>
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusBadge(job.status)}
                  {job.filename && (
                    <span className="text-sm font-medium">{job.filename}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Controls */}
                  {job.status === 'running' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleJobAction(job.id, 'pause')}
                      title="Pause import"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  {job.status === 'paused' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleJobAction(job.id, 'resume')}
                      title="Resume import"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  {(job.status === 'running' || job.status === 'paused' || job.status === 'pending') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleJobAction(job.id, 'cancel')}
                      title="Cancel import"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {['completed', 'failed', 'cancelled'].includes(job.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteJob(job.id)}
                      title="Delete import"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {job.progress.processed} / {job.progress.total}
                  </span>
                </div>
                <Progress
                  value={(job.progress.processed / job.progress.total) * 100}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Success: {job.progress.success}</span>
                  <span>Failed: {job.progress.failed}</span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground">
                <div>Started: {new Date(job.startedAt).toLocaleString()}</div>
                {job.completedAt && (
                  <div>Completed: {new Date(job.completedAt).toLocaleString()}</div>
                )}
                {job.pausedAt && (
                  <div>Paused: {new Date(job.pausedAt).toLocaleString()}</div>
                )}
              </div>

              {/* Error message */}
              {job.error && (
                <div className="text-sm text-destructive">
                  Error: {job.error}
                </div>
              )}

              {/* Error details */}
              {job.errors.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    {job.errors.length} row(s) failed (click to expand)
                  </summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {job.errors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="text-destructive">
                        Row {error.row}: {error.error}
                      </div>
                    ))}
                    {job.errors.length > 10 && (
                      <div className="text-muted-foreground">
                        ... and {job.errors.length - 10} more
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
