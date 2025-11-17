'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RatingStars } from './rating-stars';
import type { ReadingStatus } from './reading-status-badge';

interface ReadingProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
  currentProgress?: {
    status: ReadingStatus;
    currentPage?: number;
    totalPages?: number;
    rating?: number;
    review?: string;
  };
}

export function ReadingProgressDialog({
  open,
  onOpenChange,
  bookId,
  bookTitle,
  currentProgress,
}: ReadingProgressDialogProps) {
  const [status, setStatus] = useState<ReadingStatus>(currentProgress?.status || 'want_to_read');
  const [currentPage, setCurrentPage] = useState(currentProgress?.currentPage?.toString() || '0');
  const [totalPages, setTotalPages] = useState(currentProgress?.totalPages?.toString() || '');
  const [rating, setRating] = useState(currentProgress?.rating || 0);
  const [review, setReview] = useState(currentProgress?.review || '');

  const queryClient = useQueryClient();

  useEffect(() => {
    if (currentProgress) {
      setStatus(currentProgress.status);
      setCurrentPage(currentProgress.currentPage?.toString() || '0');
      setTotalPages(currentProgress.totalPages?.toString() || '');
      setRating(currentProgress.rating || 0);
      setReview(currentProgress.review || '');
    }
  }, [currentProgress]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reading/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          status,
          currentPage: currentPage ? parseInt(currentPage, 10) : undefined,
          totalPages: totalPages ? parseInt(totalPages, 10) : undefined,
          rating: rating > 0 ? rating : undefined,
          review: review || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update progress');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['reading-stats'] });
      queryClient.invalidateQueries({ queryKey: ['currently-reading'] });
      onOpenChange(false);
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  const progressPercentage =
    totalPages && currentPage
      ? Math.min(100, Math.round((parseInt(currentPage, 10) / parseInt(totalPages, 10)) * 100))
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Reading Progress</DialogTitle>
          <DialogDescription>{bookTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="status">Reading Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ReadingStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="want_to_read">Want to Read</SelectItem>
                <SelectItem value="currently_reading">Currently Reading</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="dnf">Did Not Finish</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === 'currently_reading' || status === 'finished') && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPage">Current Page</Label>
                    <Input
                      id="currentPage"
                      type="number"
                      min="0"
                      value={currentPage}
                      onChange={(e) => setCurrentPage(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalPages">Total Pages</Label>
                    <Input
                      id="totalPages"
                      type="number"
                      min="0"
                      value={totalPages}
                      onChange={(e) => setTotalPages(e.target.value)}
                    />
                  </div>
                </div>

                {totalPages && currentPage && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Progress</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} />
                  </div>
                )}
              </div>
            </>
          )}

          {status === 'finished' && (
            <>
              <div className="space-y-2">
                <Label>Rating</Label>
                <RatingStars rating={rating} interactive onChange={setRating} size="lg" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="review">Review (optional)</Label>
                <Textarea
                  id="review"
                  placeholder="Write your thoughts about this book..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  rows={4}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Progress'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
