/** @jsxImportSource react */

import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoicePDF from '@/components/invoices/pdf-template';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = getAuth(req);
  const invoiceId = params.id;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const invoice = await fetchQuery(api.invoices.getInvoice, { 
      id: invoiceId as Id<'invoices'>
    });

    if (!invoice) {
      return new Response('Invoice not found', { status: 404 });
    }

    // Get user data for PDF
    const user = await fetchQuery(api.users.get);

    // Generate actual PDF
    const pdfBuffer = await renderToBuffer(
      <InvoicePDF invoice={invoice} user={user} />
    );

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=invoice-${invoice.number}.pdf`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response('Failed to generate PDF', { status: 500 });
  }
} 