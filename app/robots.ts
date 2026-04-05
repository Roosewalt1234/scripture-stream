import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scripturestream.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing'],
        disallow: [
          '/dashboard',
          '/read/',
          '/study/',
          '/settings/',
          '/morning-card/',
          '/api/',
          '/signin',
          '/signup',
          '/reset-password',
          '/callback',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
