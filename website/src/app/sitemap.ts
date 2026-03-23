import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://arqzero.dev';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/docs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/docs/install`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/docs/tools`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/docs/capabilities`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/docs/commands`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/docs/config`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/blog/introducing-arqzero`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
  ];
}
