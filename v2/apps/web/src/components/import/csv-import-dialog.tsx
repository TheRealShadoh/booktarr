'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ImportManager } from './import-manager';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    success: number;
    failed: number;
  };
  error?: string;
}

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'handylib' | 'generic'>('handylib');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [enrichMetadata, setEnrichMetadata] = useState(true);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Poll for job status
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/import/status/${currentJob.id}`);
        if (response.ok) {
          const job: ImportJob = await response.json();
          setCurrentJob(job);

          // If completed, show notification and refresh data
          if (job.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['books'] });
            queryClient.invalidateQueries({ queryKey: ['series'] });

            toast({
              title: 'Import Complete!',
              description: `Successfully imported ${job.progress.success} books. ${job.progress.failed} failed.`,
            });

            // Clear job after a delay
            setTimeout(() => {
              setCurrentJob(null);
              setFile(null);
            }, 3000);
          } else if (job.status === 'failed') {
            toast({
              title: 'Import Failed',
              description: job.error || 'An error occurred during import',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [currentJob, queryClient, toast]);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', format);
      formData.append('skipDuplicates', skipDuplicates.toString());
      formData.append('enrichMetadata', enrichMetadata.toString());

      if (format === 'generic') {
        formData.append('fieldMapping', JSON.stringify({}));
      }

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      return response.json();
    },
    onSuccess: (data: { jobId: string; totalRows: number }) => {
      // Create initial job state
      setCurrentJob({
        id: data.jobId,
        status: 'pending',
        progress: {
          total: data.totalRows,
          processed: 0,
          success: 0,
          failed: 0,
        },
      });

      toast({
        title: 'Import Started',
        description: `Processing ${data.totalRows} books in the background. You can close this dialog.`,
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (file) {
      importMutation.mutate(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Books</DialogTitle>
          <DialogDescription>
            Import books from CSV or manage existing imports
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="new-import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new-import">New Import</TabsTrigger>
            <TabsTrigger value="import-history">Import History</TabsTrigger>
          </TabsList>

          <TabsContent value="new-import" className="space-y-6">
          {importMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {importMutation.error instanceof Error
                  ? importMutation.error.message
                  : 'Import failed'}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importMutation.isPending}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>CSV Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="handylib" id="handylib" />
                <Label htmlFor="handylib" className="font-normal">
                  HandyLib Format (recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="generic" id="generic" />
                <Label htmlFor="generic" className="font-normal">
                  Generic CSV (custom mapping)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skip-duplicates"
                checked={skipDuplicates}
                onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
              />
              <Label htmlFor="skip-duplicates" className="font-normal">
                Skip duplicate books (by ISBN)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enrich-metadata"
                checked={enrichMetadata}
                onCheckedChange={(checked) => setEnrichMetadata(checked as boolean)}
              />
              <Label htmlFor="enrich-metadata" className="font-normal">
                Enrich metadata from Google Books
              </Label>
            </div>
          </div>

          {enrichMetadata && !currentJob && (
            <Alert>
              <AlertDescription className="text-sm">
                Metadata enrichment may take longer but provides better book information
                including covers, descriptions, and author details.
              </AlertDescription>
            </Alert>
          )}

          {currentJob && (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {currentJob.status === 'pending' && 'Starting import...'}
                        {currentJob.status === 'running' && 'Import in progress...'}
                        {currentJob.status === 'completed' && 'Import complete!'}
                        {currentJob.status === 'failed' && 'Import failed'}
                      </span>
                      <span>
                        {currentJob.progress.processed} / {currentJob.progress.total}
                      </span>
                    </div>
                    <Progress
                      value={(currentJob.progress.processed / currentJob.progress.total) * 100}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Success: {currentJob.progress.success}</span>
                      <span>Failed: {currentJob.progress.failed}</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              {currentJob.status === 'running' && (
                <p className="text-sm text-muted-foreground text-center">
                  You can close this dialog. Import will continue in the background.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
                  setFile(null);
                  setCurrentJob(null);
                }
              }}
            >
              {currentJob && (currentJob.status === 'pending' || currentJob.status === 'running')
                ? 'Close (Import continues)'
                : 'Cancel'}
            </Button>
            {!currentJob && (
              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
              >
                {importMutation.isPending ? 'Starting...' : 'Import'}
              </Button>
            )}
          </div>
          </TabsContent>

          <TabsContent value="import-history">
            <ImportManager />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
