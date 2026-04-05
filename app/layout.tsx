import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://scripturestream.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Scripture Stream — Daily Bible Study',
    template: '%s | Scripture Stream',
  },
  description:
    'Read, study, and explore the Bible with AI-powered insights. Free Bible reader with historical context, verse explanations, and voice study.',
  keywords: [
    'Bible study',
    'Bible reader',
    'daily Bible',
    'scripture',
    'AI Bible study',
    'verse explanation',
    'Bible app',
    'Christian app',
    'Bible commentary',
    'devotional',
  ],
  authors: [{ name: 'Scripture Stream' }],
  creator: 'Scripture Stream',
  publisher: 'Scripture Stream',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: 'Scripture Stream',
    title: 'Scripture Stream — Daily Bible Study',
    description:
      'Read, study, and explore the Bible with AI-powered insights. Free Bible reader with historical context, verse explanations, and voice study.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Scripture Stream — Daily Bible Study',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scripture Stream — Daily Bible Study',
    description:
      'Read, study, and explore the Bible with AI-powered insights.',
    images: ['/og-image.png'],
    creator: '@scripturestream',
  },
  alternates: {
    canonical: APP_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publicEnv = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__=${JSON.stringify(publicEnv)}`,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
