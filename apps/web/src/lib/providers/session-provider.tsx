'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Type assertion needed due to React type version mismatch between next-auth and app
  return <NextAuthSessionProvider>{children as React.ReactNode}</NextAuthSessionProvider>;
}
