'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  success: number;
  failed: number;
  totalRows: number;
  errors: Array<{ row: number; error: string }>;
  message: string;
}

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'handylib' | 'generic'>('handylib');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [enrichMetadata, setEnrichMetadata] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const formData = new FormData();
      formData.append('file', selectedFile);
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
        const errorBody = await response.json().catch(() => ({ error: { message: 'Import failed' } }));
        const msg = (errorBody as { error?: { message?: string } }).error?.message ?? 'Import failed';
        throw new Error(msg);
      }

      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setImportResult(data);

      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['series'] });

      toast({
        title: 'Import Complete',
        description: `${data.success} books imported, ${data.failed} failed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (file) {
      setImportResult(null);
      importMutation.mutate(file);
    }
  };

  const handleClose = () => {
    if (!importMutation.isPending) {
      onOpenChange(false);
      setFile(null);
      setImportResult(null);
      importMutation.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Books</DialogTitle>
          <DialogDescription>
            Import books from a CSV file. Large files may take several minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {importMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {importMutation.error instanceof Error
                  ? importMutation.error.message
                  : 'Import failed'}
              </AlertDescription>
            </Alert>
          )}

          {importMutation.isPending && (
            <Alert>
              <AlertDescription>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span className="text-sm">
                    Importing... This may take a few minutes for large files. Please keep this dialog open.
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {importResult && (
            <Alert variant={importResult.failed > 0 ? 'default' : 'default'}>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-sm">
                    Import complete: {importResult.success} books imported, {importResult.failed} failed
                  </p>
                  {importResult.errors.length > 0 && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer select-none">
                        Show {importResult.errors.length} error{importResult.errors.length !== 1 ? 's' : ''}
                      </summary>
                      <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {importResult.errors.map((err) => (
                          <li key={err.row}>
                            Row {err.row}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
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
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as typeof format)}
              aria-disabled={importMutation.isPending}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="handylib" id="handylib" disabled={importMutation.isPending} />
                <Label htmlFor="handylib" className="font-normal">
                  HandyLib Format (recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="generic" id="generic" disabled={importMutation.isPending} />
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
                disabled={importMutation.isPending}
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
                disabled={importMutation.isPending}
              />
              <Label htmlFor="enrich-metadata" className="font-normal">
                Enrich metadata from Google Books
              </Label>
            </div>
          </div>

          {enrichMetadata && !importMutation.isPending && !importResult && (
            <Alert>
              <AlertDescription className="text-sm">
                Metadata enrichment may take longer but provides better book information
                including covers, descriptions, and author details.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={importMutation.isPending}
            >
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && (
              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
              >
                {importMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {importMutation.isPending ? 'Importing...' : 'Import'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
