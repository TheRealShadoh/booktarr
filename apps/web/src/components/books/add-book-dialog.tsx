'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarcodeScanner } from './barcode-scanner';

interface AddBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBookDialog({ open, onOpenChange }: AddBookDialogProps) {
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<'owned' | 'wanted' | 'missing'>('owned');
  const [format, setFormat] = useState('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addBookMutation = useMutation({
    mutationFn: async (data: {
      isbn?: string;
      title?: string;
      author?: string;
      status: string;
      edition?: { format?: string };
    }) => {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add book');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({
        title: 'Book added!',
        description: `${data.book.title} has been added to your library.`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setIsbn('');
    setTitle('');
    setAuthor('');
    setStatus('owned');
    setFormat('');
    onOpenChange(false);
  };

  const handleAddByIsbn = () => {
    if (!isbn.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an ISBN',
        variant: 'destructive',
      });
      return;
    }

    addBookMutation.mutate({
      isbn: isbn.trim(),
      status,
      edition: format ? { format } : undefined,
    });
  };

  const handleAddByTitle = () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title',
        variant: 'destructive',
      });
      return;
    }

    addBookMutation.mutate({
      title: title.trim(),
      author: author.trim() || undefined,
      status,
      edition: format ? { format } : undefined,
    });
  };

  const handleBarcodeScan = (scannedIsbn: string) => {
    setIsbn(scannedIsbn);
    toast({
      title: 'Barcode scanned!',
      description: `ISBN: ${scannedIsbn}`,
    });
    // Automatically search for the book
    addBookMutation.mutate({
      isbn: scannedIsbn,
      status,
      edition: format ? { format } : undefined,
    });
  };

  const handleScanError = (error: string) => {
    toast({
      title: 'Scanner Error',
      description: error,
      variant: 'destructive',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a Book</DialogTitle>
          <DialogDescription>
            Search by ISBN, scan a barcode, or search by title to add a book to your library.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="isbn" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="isbn">ISBN Search</TabsTrigger>
            <TabsTrigger value="scan">
              <Camera className="mr-1 h-3 w-3" />
              Scan Barcode
            </TabsTrigger>
            <TabsTrigger value="title">Title Search</TabsTrigger>
          </TabsList>

          <TabsContent value="isbn" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                placeholder="Enter ISBN-10 or ISBN-13"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddByIsbn()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="format-isbn">Format (Optional)</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="format-isbn">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardcover">Hardcover</SelectItem>
                  <SelectItem value="paperback">Paperback</SelectItem>
                  <SelectItem value="ebook">E-book</SelectItem>
                  <SelectItem value="audiobook">Audiobook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-isbn">Ownership Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as 'owned' | 'wanted' | 'missing')}
              >
                <SelectTrigger id="status-isbn">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owned">Owned</SelectItem>
                  <SelectItem value="wanted">Wanted</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddByIsbn}
              className="w-full"
              disabled={addBookMutation.isPending}
            >
              {addBookMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Book...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search and Add
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            <BarcodeScanner onScan={handleBarcodeScan} onError={handleScanError} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="isbn-manual">ISBN (Manual Entry)</Label>
              <Input
                id="isbn-manual"
                placeholder="Enter ISBN-10 or ISBN-13"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddByIsbn()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="format-scan">Format (Optional)</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="format-scan">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardcover">Hardcover</SelectItem>
                  <SelectItem value="paperback">Paperback</SelectItem>
                  <SelectItem value="ebook">E-book</SelectItem>
                  <SelectItem value="audiobook">Audiobook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-scan">Ownership Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as 'owned' | 'wanted' | 'missing')}
              >
                <SelectTrigger id="status-scan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owned">Owned</SelectItem>
                  <SelectItem value="wanted">Wanted</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddByIsbn}
              className="w-full"
              disabled={addBookMutation.isPending || !isbn.trim()}
            >
              {addBookMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Book...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search and Add
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="title" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter book title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddByTitle()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author (Optional)</Label>
              <Input
                id="author"
                placeholder="Enter author name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddByTitle()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="format-title">Format (Optional)</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="format-title">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardcover">Hardcover</SelectItem>
                  <SelectItem value="paperback">Paperback</SelectItem>
                  <SelectItem value="ebook">E-book</SelectItem>
                  <SelectItem value="audiobook">Audiobook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-title">Ownership Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as 'owned' | 'wanted' | 'missing')}
              >
                <SelectTrigger id="status-title">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owned">Owned</SelectItem>
                  <SelectItem value="wanted">Wanted</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddByTitle}
              className="w-full"
              disabled={addBookMutation.isPending}
            >
              {addBookMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Book...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search and Add
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
