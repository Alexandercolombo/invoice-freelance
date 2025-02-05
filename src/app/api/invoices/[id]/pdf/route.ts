import { NextRequest } from "next/server";
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { formatCurrency } from '@/lib/utils';

// Remove Edge runtime as it might be incompatible with Convex
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// Helper function to write text
async function writeText(doc: any, text: string, x: number, y: number, options: {
  fontSize?: number;
  color?: string;
  align?: 'left' | 'right' | 'center';
  maxWidth?: number;
  isBold?: boolean;
} = {}) {
  const { fontSize = 10, color = '#000000', align = 'left', maxWidth, isBold = false } = options;
  
  doc.setFontSize(fontSize);
  doc.setTextColor(color);
  doc.setFont('helvetica', isBold ? 'bold' : 'normal');
  
  if (align === 'right') {
    const textWidth = maxWidth || doc.getTextWidth(text);
    doc.text(text, x - textWidth, y);
  } else if (align === 'center') {
    const textWidth = maxWidth || doc.getTextWidth(text);
    doc.text(text, x - (textWidth / 2), y);
  } else {
    if (maxWidth) {
      doc.text(text, x, y, { maxWidth });
    } else {
      doc.text(text, x, y);
    }
  }
}

// Helper function to draw rectangles
function drawRect(doc: any, x: number, y: number, width: number, height: number, color: string = "#F8FAFC", radius: number = 2) {
  doc.setFillColor(color);
  doc.roundedRect(x, y, width, height, radius, radius, "F");
}

// Export GET as a named export for Next.js App Router
export async function GET(request: NextRequest) {
  try {
    // Get Clerk auth
    const authRequest = await auth();
    const { userId } = authRequest;
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
    
    // Create an authenticated Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
    }
    
    // Get Convex-specific JWT token from Clerk
    const token = await authRequest.getToken({
      template: "convex"
    });
    
    if (!token) {
      throw new Error('Failed to get Convex auth token from Clerk');
    }

    // Initialize Convex client with auth token
    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(token);

    // First fetch invoice and user data using the authenticated client
    const invoiceData = await client.query(api.invoices.getInvoice, { id: invoiceId });
    const userData = await client.query(api.users.get, {});

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
    const { client: invoiceClient, tasks } = invoiceData;

    if (!invoiceClient) {
      return new Response('Client data not found', { status: 404 });
    }

    try {
      // Dynamically import jsPDF only when needed
      const jsPDF = (await import('jspdf')).default;
      
      // Create PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set up dimensions
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let y = margin;

      // Header Section
      await writeText(doc, userData.businessName || '', margin + 2, y + 6, { 
        fontSize: 20, 
        color: '#111827',
        isBold: true 
      });

      await writeText(doc, 'INVOICE', pageWidth - margin - 40, y + 6, { 
        fontSize: 16,
        color: '#111827',
        isBold: true,
        align: 'right'
      });

      y += 9;
      await writeText(doc, `#${invoiceData.number}`, pageWidth - margin, y + 4, { 
        fontSize: 12,
        color: '#4B5563',
        align: 'right'
      });

      // Date information
      y += 9;
      await writeText(doc, `Date: ${new Date(invoiceData.date).toLocaleDateString()}`, pageWidth - margin, y + 2, { 
        fontSize: 10,
        color: '#4B5563',
        align: 'right'
      });

      // Address sections
      y = margin + 35;
      drawRect(doc, margin, y, contentWidth, 50, '#F9FAFB');

      // From section
      const leftColX = margin + 10;
      const rightColX = pageWidth / 2 + 5;

      await writeText(doc, 'FROM', leftColX, y + 6, { 
        fontSize: 10,
        color: '#6B7280',
        isBold: true
      });

      y += 10;
      await writeText(doc, userData.businessName || '', leftColX, y + 6, { 
        fontSize: 12,
        color: '#111827',
        isBold: true
      });

      if (userData.address) {
        y += 7;
        await writeText(doc, userData.address, leftColX, y + 6, { 
          color: '#4B5563',
          fontSize: 10,
          maxWidth: contentWidth / 2 - 20
        });
      }

      // Bill To section
      let billToY = margin + 35;
      await writeText(doc, 'BILL TO', rightColX, billToY + 6, { 
        fontSize: 10,
        color: '#6B7280',
        isBold: true
      });

      billToY += 10;
      await writeText(doc, invoiceClient.name, rightColX, billToY + 6, { 
        fontSize: 12,
        isBold: true,
        color: '#111827'
      });

      if (invoiceClient.email) {
        billToY += 7;
        await writeText(doc, invoiceClient.email, rightColX, billToY + 6, { 
          fontSize: 10,
          color: '#4B5563'
        });
      }

      // Tasks section
      y = margin + 95;
      drawRect(doc, margin, y, contentWidth, 10, '#F8FAFC');

      // Column headers
      const col1Width = contentWidth * 0.45;
      const col2Width = contentWidth * 0.15;
      const col3Width = contentWidth * 0.20;
      const col4Width = contentWidth * 0.20;

      await writeText(doc, 'Description', margin + 5, y + 7, {
        fontSize: 10,
        isBold: true,
        color: '#6B7280'
      });

      await writeText(doc, 'Hours', margin + col1Width + 15, y + 7, {
        fontSize: 10,
        isBold: true,
        color: '#6B7280',
        align: 'right'
      });

      await writeText(doc, 'Rate', margin + col1Width + col2Width + 15, y + 7, {
        fontSize: 10,
        isBold: true,
        color: '#6B7280',
        align: 'right'
      });

      await writeText(doc, 'Amount', pageWidth - margin - 5, y + 7, {
        fontSize: 10,
        isBold: true,
        color: '#6B7280',
        align: 'right'
      });

      y += 15;

      // Task rows
      for (const task of tasks) {
        if (!task) continue;

        if (tasks.indexOf(task) % 2 === 0) {
          drawRect(doc, margin, y - 3, contentWidth, 10, '#F9FAFB');
        }

        await writeText(doc, task.description || '', margin + 5, y + 3, {
          fontSize: 10,
          color: '#111827',
          maxWidth: col1Width - 10
        });

        await writeText(doc, String(task.hours || '0'), margin + col1Width + 15, y + 3, {
          fontSize: 10,
          color: '#111827',
          align: 'right'
        });

        await writeText(doc, formatCurrency(task.hourlyRate || 0), margin + col1Width + col2Width + 15, y + 3, {
          fontSize: 10,
          color: '#111827',
          align: 'right'
        });

        await writeText(doc, formatCurrency(task.amount || 0), pageWidth - margin - 5, y + 3, {
          fontSize: 10,
          color: '#111827',
          align: 'right'
        });

        y += 10;
      }

      // Totals section
      y += 10;
      const totalsWidth = contentWidth * 0.35;
      const totalsX = pageWidth - margin - totalsWidth;

      drawRect(doc, totalsX - 5, y - 2, totalsWidth + 5, 35, '#F8FAFC');

      await writeText(doc, 'Subtotal', totalsX + 5, y + 2, {
        fontSize: 10,
        color: '#6B7280'
      });
      await writeText(doc, formatCurrency(invoiceData.subtotal || 0), pageWidth - margin - 5, y + 2, {
        fontSize: 10,
        align: 'right',
        color: '#111827'
      });

      if (invoiceData.tax) {
        y += 8;
        await writeText(doc, `Tax (${invoiceData.tax}%)`, totalsX + 5, y + 2, {
          fontSize: 10,
          color: '#6B7280'
        });
        await writeText(
          doc,
          formatCurrency((invoiceData.subtotal || 0) * (invoiceData.tax / 100)),
          pageWidth - margin - 5,
          y + 2,
          {
            fontSize: 10,
            align: 'right',
            color: '#111827'
          }
        );
      }

      y += 10;
      drawRect(doc, totalsX - 5, y - 2, totalsWidth + 5, 12, '#EBF5FF');
      await writeText(doc, 'Total Due', totalsX + 5, y + 2, {
        fontSize: 12,
        isBold: true,
        color: '#2563EB'
      });
      await writeText(doc, formatCurrency(invoiceData.total || 0), pageWidth - margin - 5, y + 2, {
        fontSize: 12,
        isBold: true,
        align: 'right',
        color: '#2563EB'
      });

      // Payment Instructions
      if (userData.paymentInstructions) {
        y += 30;
        drawRect(doc, margin, y, contentWidth, 30, '#F8FAFC');
        y += 7;
        await writeText(doc, 'PAYMENT INSTRUCTIONS', margin + 5, y, {
          fontSize: 9,
          color: '#6B7280',
          isBold: true
        });
        y += 7;
        await writeText(doc, userData.paymentInstructions, margin + 5, y, {
          fontSize: 9,
          color: '#4B5563',
          maxWidth: contentWidth - 10
        });
      }

      // Footer
      const footerY = pageHeight - 15;
      doc.setDrawColor('#E5E7EB');
      doc.setLineWidth(0.5);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      await writeText(doc, 'Thank you for your business', margin, footerY, {
        fontSize: 8,
        color: '#6B7280'
      });
      await writeText(doc, `Generated on ${new Date().toLocaleDateString()}`, pageWidth - margin, footerY, {
        fontSize: 8,
        align: 'right',
        color: '#6B7280'
      });

      // Generate PDF buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      // Format filename
      const formattedDate = new Date().toISOString().split('T')[0];
      const safeBusinessName = (userData.businessName || 'invoice').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const safeInvoiceNumber = invoiceData.number.replace(/[^a-z0-9]/gi, '-');
      const filename = `${safeBusinessName}-invoice-${safeInvoiceNumber}-${formattedDate}.pdf`;

      // Return PDF as downloadable file
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        }
      });
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return new Response(JSON.stringify({
        error: 'Failed to generate PDF',
        message: pdfError instanceof Error ? pdfError.message : 'Unknown error occurred'
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Error in PDF generation route:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 