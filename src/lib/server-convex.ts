import { ConvexHttpClient } from 'convex/browser';

export async function createServerConvexClient(token: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
  }

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client;
} 