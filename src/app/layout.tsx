import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e40af',
};

export const metadata: Metadata = {
  title: 'Skiii - Backcountry Ski Tour Guide',
  description:
    'Plan your backcountry ski tours with real-time avalanche, weather, and snow conditions for Lake Tahoe.',
  keywords: [
    'backcountry skiing',
    'ski touring',
    'avalanche forecast',
    'Lake Tahoe',
    'Sierra Nevada',
    'backcountry conditions',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Skiii',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
