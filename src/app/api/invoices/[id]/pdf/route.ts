import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: Id<'invoices'> } }
) {
  const { userId } = getAuth(req);
  
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const invoice = await fetchQuery(api.invoices.getInvoice, { 
      id: params.id
    });

    if (!invoice) {
      return new Response('Invoice not found', { status: 404 });
    }

    // Mock PDF generation - replace with your actual PDF logic
    const mockPDF = new Blob([`Invoice ${invoice.number}`], { type: 'application/pdf' });
    
    return new Response(mockPDF, {
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