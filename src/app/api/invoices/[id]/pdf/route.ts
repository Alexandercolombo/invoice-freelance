import { NextRequest } from "next/server";
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { generateInvoicePDF } from '@/lib/generatePDF';

// Remove Edge runtime as it might be incompatible with Convex
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// Export GET as a named export for Next.js App Router
export const GET = async (request: NextRequest) => {
  try {
    // Get Clerk auth
    const authRequest = await auth();
    const { userId } = authRequest;
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get the invoice ID from the URL
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 2]; // Get the ID from the URL path

    if (!id || typeof id !== 'string') {
      return new Response('Invalid invoice ID', { status: 400 });
    }

    const invoiceId = id as Id<'invoices'>;
    
    // Create an authenticated Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
    }
    
    // Get Convex-specific JWT token from Clerk
    const token = await authRequest.getToken({
      template: "convex"  // This must match the JWT template name in Clerk
    });
    
    if (!token) {
      throw new Error('Failed to get Convex auth token from Clerk');
    }

    // Initialize Convex client with auth token
    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(token);

    // First fetch invoice and user data using the authenticated client
    const invoiceData = await client.query(api.invoices.getInvoice, { id: invoiceId });
    const userData = await client.query(api.users.get, {});

    if (!invoiceData) {
      return new Response('Invoice not found', { status: 404 });
    }

    if (!userData) {
      return new Response('User data not found', { status: 404 });
    }

    if (invoiceData.userId !== userId) {
      return new Response('Unauthorized access to invoice', { status: 403 });
    }

    // Client data is already included in invoiceData
    const { client: invoiceClient, tasks } = invoiceData;

    if (!invoiceClient) {
      return new Response('Client data not found', { status: 404 });
    }

    try {
      const pdfBuffer = await generateInvoicePDF(invoiceData, userData, invoiceClient, tasks);

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF is empty');
      }

      // Format the date for the filename
      const formattedDate = new Date().toISOString().split('T')[0];
      const safeBusinessName = userData.businessName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const safeInvoiceNumber = invoiceData.number.replace(/[^a-z0-9]/gi, '-');
      
      // Create a professional filename
      const filename = `${safeBusinessName}-invoice-${safeInvoiceNumber}-${formattedDate}.pdf`;

      // Return PDF as a downloadable file with appropriate headers
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        }
      });
    } catch (pdfError) {
      console.error('PDF rendering failed:', pdfError);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate PDF',
        message: (pdfError as Error).message,
        code: 'PDF_GENERATION_ERROR'
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('PDF generation failed:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 