/** @jsxImportSource react */

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoicePDF from '@/components/invoices/pdf-template';
import { createElement } from 'react';
import { Document } from '@react-pdf/renderer';

export const runtime = 'nodejs';

// Helper function to transform Convex data to PDF template format
async function transformInvoiceForPDF(invoice: any) {
  return {
    _id: invoice._id,
    number: invoice.number,
    date: invoice.date,
    client: invoice.client ? {
      _id: invoice.client._id,
      name: invoice.client.name,
      email: invoice.client.email,
      hourlyRate: invoice.client.hourlyRate
    } : undefined,
    tasks: invoice.tasks?.map((task: any) => ({
      _id: task._id,
      description: task.description || '',
      hours: task.hours || 0
    })) || [],
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    taxRate: invoice.taxRate
  };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response | NextResponse> {
  try {
    // Get auth session
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate invoice ID format
    if (!params.id.startsWith('invoices_')) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }

    const invoiceId = params.id as Id<'invoices'>;
    
    // Fetch invoice and user data
    const [invoice, userData] = await Promise.all([
      fetchQuery(api.invoices.getInvoice, { id: invoiceId }),
      fetchQuery(api.users.get, {})
    ]);

    // Validate data exists and belongs to user
    if (!invoice || !userData) {
      return NextResponse.json({ error: 'Invoice or user data not found' }, { status: 404 });
    }

    if (invoice.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to invoice' }, { status: 403 });
    }

    // Transform and generate PDF
    const transformedInvoice = await transformInvoiceForPDF(invoice);

    try {
      const pdfBuffer = await renderToBuffer(
        createElement(Document, {},
          createElement(InvoicePDF, { invoice: transformedInvoice, user: userData })
        )
      );

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=invoice-${invoice.number}.pdf`,
          'Cache-Control': 'no-store'
        }
      });
    } catch (pdfError) {
      console.error('PDF rendering failed:', pdfError);
      return NextResponse.json(
        { error: 'Failed to render PDF' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF - ' + (error as Error).message },
      { status: 500 }
    );
  }
} 