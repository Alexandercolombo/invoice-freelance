import { ConvexClient } from 'convex/browser';

export async function createServerConvexClient(token: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
  }

  const client = new ConvexClient(convexUrl);
  client.setAuth(token);
  return client;
}

export async function queryConvex(token: string, functionPath: string, args: any) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
  }

  const response = await fetch(`${convexUrl}/api/${functionPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    throw new Error(`Convex query failed: ${await response.text()}`);
  }

  return response.json();
} 