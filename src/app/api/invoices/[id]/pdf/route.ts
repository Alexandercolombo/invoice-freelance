import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { generateInvoicePDF } from '@/lib/generatePDF';

// Configure for pure Node.js runtime without React/JSX
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response | NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!params.id || typeof params.id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const invoiceId = params.id as Id<'invoices'>;
    
    // First fetch invoice and user data
    const [invoice, userData] = await Promise.all([
      fetchQuery(api.invoices.getInvoice, { id: invoiceId }),
      fetchQuery(api.users.get, {})
    ]);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!userData) {
      return NextResponse.json({ error: 'User data not found' }, { status: 404 });
    }

    if (invoice.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to invoice' }, { status: 403 });
    }

    // Then fetch client data
    const client = await fetchQuery(api.clients.get, { id: invoice.clientId });

    if (!client) {
      return NextResponse.json({ error: 'Client data not found' }, { status: 404 });
    }

    // Get tasks data from the invoice
    const tasks = invoice.tasks || [];

    try {
      const pdfBuffer = await generateInvoicePDF(invoice, userData, client, tasks);

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF is empty');
      }

      // Return PDF as a downloadable file
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
        { error: 'Failed to render PDF: ' + (pdfError as Error).message },
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