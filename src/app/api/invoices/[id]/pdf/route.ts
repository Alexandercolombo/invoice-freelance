import { NextRequest } from "next/server";
import { auth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { generateInvoicePDF } from '@/lib/generatePDF';

// Configure for Edge runtime for better performance on Vercel
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Add revalidation period of 1 hour for PDFs
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
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
    
    // First fetch invoice and user data
    const invoiceData = await fetchQuery(api.invoices.getInvoice, { id: invoiceId });
    const userData = await fetchQuery(api.users.get, {});

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
    const { client, tasks } = invoiceData;

    if (!client) {
      return new Response('Client data not found', { status: 404 });
    }

    try {
      const pdfBuffer = await generateInvoicePDF(invoiceData, userData, client, tasks);

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF is empty');
      }

      // Return PDF as a downloadable file with appropriate headers
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=invoice-${invoiceData.number}.pdf`,
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200',
          'Content-Length': pdfBuffer.length.toString(),
          'ETag': `"${invoiceData._id}-${invoiceData.updatedAt}"`,
          'Last-Modified': new Date(invoiceData.updatedAt).toUTCString()
        }
      });
    } catch (pdfError) {
      console.error('PDF rendering failed:', pdfError);
      return new Response('Failed to render PDF: ' + (pdfError as Error).message, { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('PDF generation failed:', error);
    return new Response('Failed to generate PDF - ' + (error as Error).message, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 