import { ConvexClient } from 'convex/browser';

// Mark this file as server-only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function createServerConvexClient(token: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
  }

  const client = new ConvexClient(convexUrl);
  await client.setAuth(() => Promise.resolve(token));
  return client;
}

export async function queryConvex(token: string, functionPath: string, args: any) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
  }

  console.log('[Debug] Querying Convex:', {
    functionPath,
    args,
    hasToken: !!token
  });

  const response = await fetch(`${convexUrl}/api/${functionPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Error] Convex query failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Convex query failed: ${errorText}`);
  }

  const data = await response.json();
  console.log('[Debug] Convex query response:', {
    functionPath,
    hasData: !!data
  });

  return data;
} 