/** @jsxImportSource react */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { formatCurrency } from '@/lib/utils';
import PDFDocument from 'pdfkit';

// Configure for Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function generatePDF(invoice: any, userData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      // Collect data chunks
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add content to PDF
      doc
        .fontSize(24)
        .text(`Invoice #${invoice.number}`, { align: 'left' })
        .fontSize(12)
        .text(new Date(invoice.date).toLocaleDateString())
        .moveDown();

      // Add client info
      doc
        .fontSize(14)
        .text('Bill To:', { continued: true })
        .text(invoice.client?.name || 'Unknown Client')
        .text(invoice.client?.email || '')
        .moveDown();

      // Add table headers
      const tableTop = doc.y;
      const colWidths = [300, 60, 80, 80];
      const startX = 50;

      doc
        .fontSize(12)
        .text('Description', startX, tableTop)
        .text('Hours', startX + colWidths[0], tableTop)
        .text('Rate', startX + colWidths[0] + colWidths[1], tableTop)
        .text('Amount', startX + colWidths[0] + colWidths[1] + colWidths[2], tableTop)
        .moveDown();

      // Add tasks
      let y = doc.y;
      if (Array.isArray(invoice.tasks)) {
        for (const task of invoice.tasks) {
          const amount = (task.hours || 0) * (invoice.client?.hourlyRate || 0);
          doc
            .text(task.description || 'No description', startX, y)
            .text(String(task.hours || 0), startX + colWidths[0], y)
            .text(formatCurrency(invoice.client?.hourlyRate || 0), startX + colWidths[0] + colWidths[1], y)
            .text(formatCurrency(amount), startX + colWidths[0] + colWidths[1] + colWidths[2], y);
          y = doc.y + 10;
        }
      }

      // Add totals
      doc.moveDown();
      const totalsX = startX + colWidths[0] + colWidths[1];
      doc
        .text('Subtotal:', totalsX)
        .text(formatCurrency(invoice.subtotal || 0), totalsX + colWidths[2])
        .text(`Tax (${invoice.taxRate || 0}%):`, totalsX)
        .text(formatCurrency(invoice.tax || 0), totalsX + colWidths[2])
        .text('Total Due:', totalsX)
        .text(formatCurrency(invoice.total || 0), totalsX + colWidths[2]);

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
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