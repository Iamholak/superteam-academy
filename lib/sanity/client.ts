import { createClient } from 'next-sanity';

export function getSanityClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const token = process.env.SANITY_API_TOKEN;
  if (!projectId || !dataset) return null;

  const isProd = process.env.NODE_ENV === 'production';
  const canPreviewDrafts = !isProd && Boolean(token);

  return createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    useCdn: isProd && !canPreviewDrafts,
    token,
    perspective: canPreviewDrafts ? 'drafts' : 'published',
  });
}
