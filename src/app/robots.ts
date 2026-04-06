import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard', '/songs', '/artists', '/performances', '/export', '/settings', '/onboarding'] },
    sitemap: 'https://setlistroyalty.com/sitemap.xml',
  };
}
