'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';

interface PendingSharesResponse {
  count: number;
}

const navItems = [
  { href: '/library', label: 'Library' },
  { href: '/series', label: 'Series' },
  { href: '/currently-reading', label: 'Currently Reading' },
  { href: '/wishlist', label: 'Wishlist' },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const { data: pendingData } = useQuery<PendingSharesResponse>({
    queryKey: ['shares', 'pending'],
    queryFn: async () => {
      const response = await fetch('/api/shares/pending');
      if (!response.ok) throw new Error('Failed to fetch pending shares');
      return response.json() as Promise<PendingSharesResponse>;
    },
    refetchInterval: 60_000,
    enabled: !!session,
  });

  const pendingCount = pendingData?.count ?? 0;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/library" className="text-2xl font-bold">
            BookTarr
          </Link>

          <div className="hidden gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === item.href
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarImage src={session?.user?.image || ''} />
                  <AvatarFallback>
                    {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                {pendingCount > 0 && (
                  <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {session?.user?.name && (
                    <p className="font-medium">{session.user.name}</p>
                  )}
                  {session?.user?.email && (
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {session.user.email}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
