import type { MetadataRoute } from 'next';

// Bloqueia todos os robôs — sistema interno.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
