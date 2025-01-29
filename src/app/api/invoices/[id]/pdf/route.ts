/** @jsxImportSource react */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { formatCurrency } from '@/lib/utils';
import { jsPDF } from 'jspdf';

// Configure for Node.js runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function generatePDF(invoice: any, userData: any): Promise<Buffer> {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;
  const lineHeight = 10;

  // Helper function to write text
  const writeText = (text: string, x: number, yPos: number, options: any = {}) => {
    const { fontSize = 12, align = 'left' } = options;
    doc.setFontSize(fontSize);
    doc.text(text, x, yPos, { align });
    return yPos + lineHeight;
  };

  // Add header
  y = writeText(`Invoice #${invoice.number}`, margin, y, { fontSize: 24 });
  y = writeText(new Date(invoice.date).toLocaleDateString(), margin, y);
  y += lineHeight;

  // Add client info
  y = writeText('Bill To:', margin, y, { fontSize: 14 });
  y = writeText(invoice.client?.name || 'Unknown Client', margin, y);
  if (invoice.client?.email) {
    y = writeText(invoice.client.email, margin, y);
  }
  y += lineHeight;

  // Add table headers
  const colWidths = [80, 25, 30, 35];
  const startX = margin;
  const headers = ['Description', 'Hours', 'Rate', 'Amount'];
  
  headers.forEach((header, index) => {
    let x = startX;
    if (index > 0) {
      x += colWidths.slice(0, index).reduce((a, b) => a + b, 0);
    }
    y = writeText(header, x, y, { fontSize: 12 });
  });
  y += 5;

  // Add tasks
  if (Array.isArray(invoice.tasks)) {
    for (const task of invoice.tasks) {
      const amount = (task.hours || 0) * (invoice.client?.hourlyRate || 0);
      let x = startX;
      
      // Description
      y = writeText(task.description || 'No description', x, y);
      
      // Hours
      x += colWidths[0];
      y = writeText(String(task.hours || 0), x, y);
      
      // Rate
      x += colWidths[1];
      y = writeText(formatCurrency(invoice.client?.hourlyRate || 0), x, y);
      
      // Amount
      x += colWidths[2];
      y = writeText(formatCurrency(amount), x, y);
      
      y += 5;
    }
  }

  y += lineHeight;

  // Add totals
  const totalsX = startX + colWidths[0] + colWidths[1];
  y = writeText('Subtotal:', totalsX, y);
  y = writeText(formatCurrency(invoice.subtotal || 0), totalsX + colWidths[2], y);
  
  y = writeText(`Tax (${invoice.taxRate || 0}%):`, totalsX, y);
  y = writeText(formatCurrency(invoice.tax || 0), totalsX + colWidths[2], y);
  
  y = writeText('Total Due:', totalsX, y);
  y = writeText(formatCurrency(invoice.total || 0), totalsX + colWidths[2], y);

  // Convert to Buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

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

    try {
      const pdfBuffer = await generatePDF(invoice, userData);

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF is empty');
      }

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