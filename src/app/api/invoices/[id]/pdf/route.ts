/** @jsxImportSource react */
'use server';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatCurrency } from '@/lib/utils';

async function generatePDF(invoice: any, userData: any) {
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();
  
  // Add a blank page
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  
  // Embed the standard font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Set some basic properties
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  const lineHeight = 20;
  
  // Helper function to write text
  const writeText = (text: string, x: number, yPos: number, options: any = {}) => {
    const { fontSize = 12, font: textFont = font, color = rgb(0, 0, 0) } = options;
    page.drawText(text, {
      x,
      y: yPos,
      size: fontSize,
      font: textFont,
      color,
    });
    return yPos - lineHeight;
  };

  // Write header
  y = writeText(`Invoice #${invoice.number}`, margin, y, { fontSize: 24, font: boldFont });
  y = writeText(new Date(invoice.date).toLocaleDateString(), margin, y);
  y -= lineHeight;

  // Write client info
  y = writeText('Bill To:', margin, y, { font: boldFont });
  y = writeText(invoice.client?.name || 'Unknown Client', margin, y);
  if (invoice.client?.email) {
    y = writeText(invoice.client.email, margin, y);
  }
  y -= lineHeight * 2;

  // Write table header
  const colWidths = [300, 60, 80, 80];
  const startX = margin;
  y = writeText('Description', startX, y, { font: boldFont });
  y = writeText('Hours', startX + colWidths[0], y, { font: boldFont });
  y = writeText('Rate', startX + colWidths[0] + colWidths[1], y, { font: boldFont });
  y = writeText('Amount', startX + colWidths[0] + colWidths[1] + colWidths[2], y, { font: boldFont });
  y -= lineHeight;

  // Write tasks
  if (Array.isArray(invoice.tasks)) {
    for (const task of invoice.tasks) {
      const amount = (task.hours || 0) * (invoice.client?.hourlyRate || 0);
      y = writeText(task.description || 'No description', startX, y);
      y = writeText(String(task.hours || 0), startX + colWidths[0], y);
      y = writeText(formatCurrency(invoice.client?.hourlyRate || 0), startX + colWidths[0] + colWidths[1], y);
      y = writeText(formatCurrency(amount), startX + colWidths[0] + colWidths[1] + colWidths[2], y);
      y -= lineHeight;
    }
  }

  y -= lineHeight;

  // Write totals
  const totalsX = startX + colWidths[0] + colWidths[1];
  y = writeText('Subtotal:', totalsX, y, { font: boldFont });
  y = writeText(formatCurrency(invoice.subtotal || 0), totalsX + colWidths[2], y);
  
  y = writeText(`Tax (${invoice.taxRate || 0}%):`, totalsX, y, { font: boldFont });
  y = writeText(formatCurrency(invoice.tax || 0), totalsX + colWidths[2], y);
  
  y = writeText('Total Due:', totalsX, y, { font: boldFont });
  y = writeText(formatCurrency(invoice.total || 0), totalsX + colWidths[2], y);

  // Return the PDF as a buffer
  return await pdfDoc.save();
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