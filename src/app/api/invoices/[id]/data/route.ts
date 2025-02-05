export const runtime = 'nodejs';

import { NextRequest } from "next/server";
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

export async function GET(request: NextRequest) {
  try {
    // Authenticate via Clerk
    const authRequest = await auth();
    const { userId } = authRequest;
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Extract invoice ID from the URL
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 2];
    if (!id) return new Response('Invalid invoice ID', { status: 400 });
    const invoiceId = id as unknown as Id<'invoices'>;

    // Initialize Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
    }

    // Get Convex-specific JWT token from Clerk
    const token = await authRequest.getToken({ template: "convex" });
    if (!token) {
      throw new Error('Failed to get Convex auth token from Clerk');
    }

    // Create Convex client
    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(token);

    // Fetch invoice and user data
    const invoiceData = await client.query(api.invoices.getInvoice, { id: invoiceId });
    const userData = await client.query(api.users.get, {});

    if (!invoiceData || !userData) {
      return new Response('Invoice or user data not found', { status: 404 });
    }

    // Ensure the invoice belongs to the authenticated user
    if (invoiceData.userId !== userId) {
      return new Response('Unauthorized access to invoice', { status: 403 });
    }

    // Return the data as JSON
    return new Response(JSON.stringify({ invoice: invoiceData, user: userData }), {
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Error fetching invoice data:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch invoice data',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 