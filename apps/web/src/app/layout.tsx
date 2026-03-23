import type { Metadata, Viewport } from 'next';
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
  description: 'Track your manga, light novels, and book collections. Import from CSV, scan barcodes, share libraries with friends.',
  keywords: ['book tracker', 'manga collection', 'library manager', 'ISBN scanner'],
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('booktarr-ui-theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light')}}catch(e){}})()`,
          }}
        />
      </head>
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
