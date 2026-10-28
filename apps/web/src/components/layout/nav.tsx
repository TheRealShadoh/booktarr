'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import {
  Menu,
  X,
  Bell,
  Library,
  Layers,
  ScanBarcode,
  CalendarDays,
  BookOpen,
  Heart,
  Search,
  Settings,
  LogOut,
  BookMarked,
  type LucideIcon,
} from 'lucide-react';

interface PendingSharesResponse {
  count: number;
}

interface UnreadActivityResponse {
  count: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: '/library', label: 'Library', icon: Library },
  { href: '/series', label: 'Series', icon: Layers },
  { href: '/currently-reading', label: 'Reading', icon: BookOpen },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/wanted', label: 'Wanted', icon: Search },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/scan', label: 'Scan', icon: ScanBarcode },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

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

  const { data: unreadActivityData } = useQuery<UnreadActivityResponse>({
    queryKey: ['monitoring', 'activity', 'unread'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/activity?unreadOnly=true');
      if (!response.ok) throw new Error('Failed to fetch unread activity count');
      return response.json() as Promise<UnreadActivityResponse>;
    },
    refetchInterval: 60_000,
    enabled: !!session,
  });

  const pendingCount = pendingData?.count ?? 0;
  const unreadActivityCount = unreadActivityData?.count ?? 0;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  const userInitial = session?.user?.name?.[0] || session?.user?.email?.[0] || 'U';

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      aria-label="Main navigation"
    >
      <div className="container mx-auto flex h-14 items-center gap-3 px-4">
        {/* Brand */}
        <Link
          href="/library"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight"
          aria-label="BookTarr home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookMarked className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">BookTarr</span>
        </Link>

        {/* Desktop links */}
        <div className="ml-4 hidden min-w-0 flex-1 items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline">{item.label}</span>
                <span className="sr-only lg:hidden">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          {/* Activity bell */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className={cn('relative', isActivePath(pathname, '/activity') && 'text-primary')}
          >
            <Link href="/activity" aria-label={`Activity${unreadActivityCount > 0 ? `, ${unreadActivityCount} unread` : ''}`}>
              <Bell className="h-5 w-5" aria-hidden="true" />
              <CountBadge count={unreadActivityCount} className="absolute -right-0.5 -top-0.5" />
            </Link>
          </Button>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Account menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || ''} />
                  <AvatarFallback className="text-xs">{userInitial.toUpperCase()}</AvatarFallback>
                </Avatar>
                {pendingCount > 0 && (
                  <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  {session?.user?.name && (
                    <p className="truncate text-sm font-medium">{session.user.name}</p>
                  )}
                  {session?.user?.email && (
                    <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Settings
                  {pendingCount > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {pendingCount} pending share{pendingCount === 1 ? '' : 's'}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav"
          className="absolute left-0 right-0 top-14 z-50 border-b bg-background p-3 shadow-lg md:hidden"
        >
          <div className="flex flex-col gap-1">
            {[...navItems, { href: '/activity', label: 'Activity', icon: Bell }, { href: '/settings', label: 'Settings', icon: Settings }].map(
              (item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-accent/15 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                    {item.href === '/activity' && (
                      <CountBadge count={unreadActivityCount} className="ml-auto h-5 min-w-5 text-xs" />
                    )}
                  </Link>
                );
              }
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
