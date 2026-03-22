'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type SharePermission = 'view' | 'full';
type ShareStatus = 'pending' | 'accepted' | 'rejected';

interface Share {
  id: string;
  permission: SharePermission;
  status: ShareStatus;
  ownerEmail?: string;
  ownerName?: string;
  recipientEmail?: string;
  recipientName?: string;
}

interface SharesResponse {
  sent: Share[];
  received: Share[];
}

const PERMISSION_LABELS: Record<SharePermission, string> = {
  view: 'View Only',
  full: 'Full Access',
};

const STATUS_VARIANT: Record<ShareStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  accepted: 'default',
  rejected: 'destructive',
};

function PermissionBadge({ permission }: { permission: SharePermission }) {
  return (
    <Badge variant="outline" className="text-xs">
      {PERMISSION_LABELS[permission] ?? permission}
    </Badge>
  );
}

function StatusBadge({ status }: { status: ShareStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'outline'} className="text-xs capitalize">
      {status}
    </Badge>
  );
}

export function ShareManager() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<SharePermission>('view');

  // Admin force-share state
  const [adminOwnerEmail, setAdminOwnerEmail] = useState('');
  const [adminRecipientEmail, setAdminRecipientEmail] = useState('');
  const [adminPermission, setAdminPermission] = useState<SharePermission>('view');

  const isAdmin = session?.user?.role === 'admin';

  // Fetch all shares
  const { data: sharesData, isLoading } = useQuery<SharesResponse>({
    queryKey: ['shares'],
    queryFn: async () => {
      const response = await fetch('/api/shares');
      if (!response.ok) throw new Error('Failed to fetch shares');
      return response.json() as Promise<SharesResponse>;
    },
  });

  // Send invitation mutation
  const sendInviteMutation = useMutation({
    mutationFn: async ({ email, permission }: { email: string; permission: SharePermission }) => {
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, permission }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to send invitation' }));
        throw new Error((err as { error?: string }).error ?? 'Failed to send invitation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Invitation sent', description: `An invitation has been sent to ${inviteEmail}.` });
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      setInviteEmail('');
      setInvitePermission('view');
      setInviteOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Accept / reject mutation
  const respondMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'accept' | 'reject' }) => {
      const response = await fetch(`/api/shares/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error('Failed to update share');
      return response.json();
    },
    onSuccess: (_data, variables) => {
      toast({ title: variables.action === 'accept' ? 'Share accepted' : 'Share rejected' });
      queryClient.invalidateQueries({ queryKey: ['shares'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Revoke / remove mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/shares/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to remove share');
    },
    onSuccess: () => {
      toast({ title: 'Share removed' });
      queryClient.invalidateQueries({ queryKey: ['shares'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Admin force-share mutation
  const adminShareMutation = useMutation({
    mutationFn: async ({
      ownerEmail,
      recipientEmail,
      permission,
    }: {
      ownerEmail: string;
      recipientEmail: string;
      permission: SharePermission;
    }) => {
      const response = await fetch('/api/admin/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerEmail, recipientEmail, permission }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to force share' }));
        throw new Error((err as { error?: string }).error ?? 'Failed to force share');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Force share created' });
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      setAdminOwnerEmail('');
      setAdminRecipientEmail('');
      setAdminPermission('view');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const sent = sharesData?.sent ?? [];
  const received = sharesData?.received ?? [];

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) {
      toast({ title: 'Email required', description: 'Please enter an email address.', variant: 'destructive' });
      return;
    }
    sendInviteMutation.mutate({ email: inviteEmail.trim(), permission: invitePermission });
  };

  const handleAdminForceShare = () => {
    if (!adminOwnerEmail.trim() || !adminRecipientEmail.trim()) {
      toast({ title: 'Fields required', description: 'Please fill in both email fields.', variant: 'destructive' });
      return;
    }
    adminShareMutation.mutate({
      ownerEmail: adminOwnerEmail.trim(),
      recipientEmail: adminRecipientEmail.trim(),
      permission: adminPermission,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Share your library with other BookTarr users or accept shares from others.
        </p>
        <Button onClick={() => setInviteOpen(true)}>Share My Library</Button>
      </div>

      {/* Outgoing shares */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Sent Invitations</h3>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading shares...
          </div>
        )}
        {!isLoading && sent.length === 0 && (
          <p className="text-sm text-muted-foreground">No outgoing shares yet.</p>
        )}
        {sent.map((share) => (
          <div
            key={share.id}
            className="flex items-center justify-between rounded-md border px-4 py-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {share.recipientName ?? share.recipientEmail ?? 'Unknown user'}
              </p>
              {share.recipientName && share.recipientEmail && (
                <p className="text-xs text-muted-foreground">{share.recipientEmail}</p>
              )}
              <div className="flex items-center gap-2">
                <PermissionBadge permission={share.permission} />
                <StatusBadge status={share.status} />
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate(share.id)}
              disabled={deleteMutation.isPending}
            >
              Revoke
            </Button>
          </div>
        ))}
      </div>

      {/* Incoming shares */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Received Shares</h3>
        {!isLoading && received.length === 0 && (
          <p className="text-sm text-muted-foreground">No incoming shares.</p>
        )}
        {received.map((share) => (
          <div
            key={share.id}
            className="flex items-center justify-between rounded-md border px-4 py-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {share.ownerName ?? share.ownerEmail ?? 'Unknown user'}
              </p>
              {share.ownerName && share.ownerEmail && (
                <p className="text-xs text-muted-foreground">{share.ownerEmail}</p>
              )}
              <div className="flex items-center gap-2">
                <PermissionBadge permission={share.permission} />
                <StatusBadge status={share.status} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {share.status === 'pending' && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => respondMutation.mutate({ id: share.id, action: 'accept' })}
                    disabled={respondMutation.isPending}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => respondMutation.mutate({ id: share.id, action: 'reject' })}
                    disabled={respondMutation.isPending}
                  >
                    Reject
                  </Button>
                </>
              )}
              {share.status === 'accepted' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(share.id)}
                  disabled={deleteMutation.isPending}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Admin section */}
      {isAdmin && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="text-sm">Admin: Force Share</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="admin-owner-email">Owner Email</Label>
                <Input
                  id="admin-owner-email"
                  type="email"
                  placeholder="owner@example.com"
                  value={adminOwnerEmail}
                  onChange={(e) => setAdminOwnerEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-recipient-email">Recipient Email</Label>
                <Input
                  id="admin-recipient-email"
                  type="email"
                  placeholder="recipient@example.com"
                  value={adminRecipientEmail}
                  onChange={(e) => setAdminRecipientEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="admin-permission">Permission</Label>
                <Select
                  value={adminPermission}
                  onValueChange={(v) => setAdminPermission(v as SharePermission)}
                >
                  <SelectTrigger id="admin-permission" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="full">Full Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAdminForceShare}
                disabled={adminShareMutation.isPending}
              >
                {adminShareMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Force Share
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send invitation dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share My Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="invite-email">User Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="friend@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendInvite();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-permission">Permission</Label>
              <Select
                value={invitePermission}
                onValueChange={(v) => setInvitePermission(v as SharePermission)}
              >
                <SelectTrigger id="invite-permission" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="full">Full Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={sendInviteMutation.isPending}
            >
              {sendInviteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
