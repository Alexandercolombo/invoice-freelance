import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { auth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

// Configure for pure Node.js runtime without React/JSX
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function generateInvoicePDF(invoice: any, userData: any, client: any, tasks: any[]) {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        bufferPages: true,
        size: 'A4',
        margin: 50,
      });

      // Collect the PDF data chunks
      const chunks: Buffer[] = [];
      doc.on('data', chunks.push.bind(chunks));

      // Add content to the PDF
      doc
        .fontSize(25)
        .text(`Invoice #${invoice.number}`, 50, 50)
        .fontSize(12)
        .text(`From: ${userData.name}`, 50, 100)
        .text(`To: ${client.name}`, 50, 120)
        .text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 50, 140);

      // Add tasks
      let y = 200;
      doc.text('Tasks:', 50, y);
      y += 20;

      tasks.forEach((task) => {
        doc
          .text(`${task.description}`, 50, y)
          .text(`${task.hours} hours @ $${task.rate}/hr = $${task.hours * task.rate}`, 300, y);
        y += 20;
      });

      // Add total
      doc
        .text('Total:', 50, y + 20)
        .text(`$${invoice.total}`, 300, y + 20);

      // Finalize the PDF
      doc.end();

      // When the PDF is done being written, resolve with the buffer
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!context.params.id || typeof context.params.id !== 'string') {
      return new Response('Invalid invoice ID', { status: 400 });
    }

    const invoiceId = context.params.id as Id<'invoices'>;
    
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

      // Return PDF as a downloadable file
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=invoice-${invoiceData.number}.pdf`,
          'Cache-Control': 'no-store'
        }
      });
    } catch (pdfError) {
      console.error('PDF rendering failed:', pdfError);
      return new Response('Failed to render PDF: ' + (pdfError as Error).message, { status: 500 });
    }
  } catch (error) {
    console.error('PDF generation failed:', error);
    return new Response('Failed to generate PDF - ' + (error as Error).message, { status: 500 });
  }
} 