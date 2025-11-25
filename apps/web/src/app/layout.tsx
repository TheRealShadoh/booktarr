import type { Metadata } from 'next';
// Temporarily disabled Google Fonts for offline builds
// import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/lib/providers/session-provider';
import { QueryProvider } from '@/lib/providers/query-provider';
import { ThemeProvider } from '@/lib/providers/theme-provider';
import { ToastProvider } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

// Temporarily using CSS font stack instead of Google Fonts
// const inter = Inter({
//   subsets: ['latin'],
//   display: 'swap',
//   fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
//   adjustFontFallback: false,
// });

export const metadata: Metadata = {
  title: 'BookTarr - Book Collection Manager',
  description: 'Manage your book collection with ease',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <ThemeProvider defaultTheme="dark" storageKey="booktarr-ui-theme">
          <SessionProvider>
            <QueryProvider>
              <ToastProvider>
                {children}
                <Toaster />
              </ToastProvider>
            </QueryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
