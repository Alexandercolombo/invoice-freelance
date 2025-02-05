export const runtime = 'nodejs';

import { NextRequest } from "next/server";
import { auth } from '@clerk/nextjs/server';
import { formatCurrency } from '@/lib/server-format-currency';

// Remove Edge runtime as it might be incompatible with Convex
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// Export GET as a named export for Next.js App Router
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

    // Get Convex-specific JWT token from Clerk
    const token = await authRequest.getToken({ template: "convex" });
    if (!token) {
      throw new Error('Failed to get Convex auth token from Clerk');
    }

    // Fetch invoice data from our data endpoint
    const dataResponse = await fetch(`${url.origin}/api/invoices/${id}/data`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!dataResponse.ok) {
      const error = await dataResponse.json();
      throw new Error(error.message || 'Failed to fetch invoice data');
    }

    const { invoice: invoiceData, user: userData } = await dataResponse.json();

    // For testing, return a simple text response
    const invoiceText = `
Invoice #${invoiceData.number}
Date: ${new Date(invoiceData.date).toLocaleDateString()}
From: ${userData.businessName}
Amount: ${formatCurrency(invoiceData.total || 0)}
    `;

    // Return plain text for testing
    return new Response(invoiceText, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `inline; filename="invoice-${invoiceData.number}.txt"`,
      }
    });

  } catch (error) {
    console.error('Error in invoice route:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate invoice',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 