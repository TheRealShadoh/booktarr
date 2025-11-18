'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookCopy, Check, X, Heart, HelpCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface Edition {
  id: string;
  isbn10?: string | null;
  isbn13?: string | null;
  format?: string | null;
  publisher?: string | null;
  publishedDate?: string | null;
  pages?: number | null;
  coverUrl?: string | null;
  coverThumbnailUrl?: string | null;
  userStatus?: string | null;
}

interface BookEditionsManagerProps {
  bookId: string;
  editions: Edition[];
}

export function BookEditionsManager({ bookId, editions }: BookEditionsManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateEditionMutation = useMutation({
    mutationFn: async ({
      editionId,
      status,
      isNew,
    }: {
      editionId: string;
      status: 'owned' | 'wanted' | 'missing' | null;
      isNew: boolean;
    }) => {
      if (status === null) {
        // Remove edition
        const response = await fetch(
          `/api/books/${bookId}/editions?editionId=${editionId}`,
          { method: 'DELETE' }
        );
        if (!response.ok) throw new Error('Failed to remove edition');
        return response.json();
      }

      // Add or update edition
      const method = isNew ? 'POST' : 'PATCH';
      const response = await fetch(`/api/books/${bookId}/editions`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editionId, status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update edition');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      const actionText =
        variables.status === null
          ? 'removed from'
          : variables.isNew
          ? 'added to'
          : 'updated in';
      toast({
        title: 'Success',
        description: `Edition ${actionText} your collection.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status?: string | null) => {
    if (!status) return null;

    const config: Record<
      string,
      { label: string; className: string; icon: React.ReactNode }
    > = {
      owned: {
        label: 'Owned',
        className: 'bg-green-500',
        icon: <Check className="h-3 w-3" />,
      },
      wanted: {
        label: 'Wanted',
        className: 'bg-blue-500',
        icon: <Heart className="h-3 w-3" />,
      },
      missing: {
        label: 'Missing',
        className: 'bg-gray-500',
        icon: <HelpCircle className="h-3 w-3" />,
      },
    };

    const { label, className, icon } = config[status] || {
      label: status,
      className: 'bg-gray-500',
      icon: null,
    };

    return (
      <Badge className={className}>
        {icon}
        <span className="ml-1">{label}</span>
      </Badge>
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookCopy className="h-5 w-5" />
          Available Editions ({editions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {editions.map((edition) => (
            <div
              key={edition.id}
              className={`border rounded-lg p-4 transition-colors ${
                edition.userStatus ? 'bg-accent/50 border-primary' : ''
              }`}
            >
              <div className="flex gap-4">
                {/* Edition Cover */}
                {(edition.coverUrl || edition.coverThumbnailUrl) && (
                  <div className="shrink-0">
                    <div className="relative w-16 h-24 rounded overflow-hidden bg-muted">
                      <Image
                        src={
                          edition.coverThumbnailUrl ||
                          edition.coverUrl ||
                          '/placeholder-book.svg'
                        }
                        alt={`${edition.format || 'Edition'} cover`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  </div>
                )}

                {/* Edition Info */}
                <div className="flex-1 space-y-2">
                  {/* Format and Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {edition.format && (
                        <h3 className="font-semibold">{edition.format}</h3>
                      )}
                      {getStatusBadge(edition.userStatus)}
                    </div>

                    {/* Action Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant={edition.userStatus ? 'outline' : 'default'}
                          size="sm"
                          disabled={updateEditionMutation.isPending}
                        >
                          {edition.userStatus ? 'Change' : 'Add to Collection'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onSelect={() =>
                            updateEditionMutation.mutate({
                              editionId: edition.id,
                              status: 'owned',
                              isNew: !edition.userStatus,
                            })
                          }
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Mark as Owned
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            updateEditionMutation.mutate({
                              editionId: edition.id,
                              status: 'wanted',
                              isNew: !edition.userStatus,
                            })
                          }
                        >
                          <Heart className="mr-2 h-4 w-4" />
                          Mark as Wanted
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            updateEditionMutation.mutate({
                              editionId: edition.id,
                              status: 'missing',
                              isNew: !edition.userStatus,
                            })
                          }
                        >
                          <HelpCircle className="mr-2 h-4 w-4" />
                          Mark as Missing
                        </DropdownMenuItem>
                        {edition.userStatus && (
                          <>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() =>
                                updateEditionMutation.mutate({
                                  editionId: edition.id,
                                  status: null,
                                  isNew: false,
                                })
                              }
                            >
                              <X className="mr-2 h-4 w-4" />
                              Remove from Collection
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Edition Details */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {(edition.isbn13 || edition.isbn10) && (
                      <span>
                        ISBN:{' '}
                        <code className="text-xs">
                          {edition.isbn13 || edition.isbn10}
                        </code>
                      </span>
                    )}
                    {edition.publisher && <span>{edition.publisher}</span>}
                    {edition.publishedDate && (
                      <span>{formatDate(edition.publishedDate)}</span>
                    )}
                    {edition.pages && <span>{edition.pages} pages</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {editions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No editions found for this book.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
