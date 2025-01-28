/** @jsxImportSource react */

import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoicePDF from '@/components/invoices/pdf-template';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = getAuth(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const invoice = await fetchQuery(api.invoices.getInvoiceById, {
      id: params.id as Id<'invoices'>
    });

    const user = await fetchQuery(api.users.getUserById, {
      id: userId as Id<'users'>
    });

    if (!invoice || !user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

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
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 