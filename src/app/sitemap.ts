import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://setlistroyalty.com', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://setlistroyalty.com/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://setlistroyalty.com/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];
}
