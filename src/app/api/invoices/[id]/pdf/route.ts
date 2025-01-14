import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { Id } from "convex/_generated/dataModel";
import { auth } from "@clerk/nextjs";

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function safeText(text: string | undefined | null): string {
  if (!text) return '';
  // Remove any non-printable characters and normalize whitespace
  return text.replace(/[^\x20-\x7E\n]/g, '').trim();
}

function drawText(doc: jsPDF, text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }) {
  try {
    doc.text(safeText(text), x, y, options);
  } catch (error) {
    console.error('Error in drawText:', error);
    // Fallback to basic text if alignment fails
    try {
      doc.text(safeText(text), x, y);
    } catch (error) {
      console.error('Fallback text drawing failed:', error);
    }
  }
}

function drawLine(doc: jsPDF, startX: number, startY: number, endX: number, endY: number, color: string = "#E5E7EB") {
  try {
    doc.setDrawColor(color);
    doc.setLineWidth(0.5);
    doc.line(startX, startY, endX, endY);
  } catch (error) {
    console.error('Error in drawLine:', error);
  }
}

function drawRect(doc: jsPDF, x: number, y: number, width: number, height: number, color: string = "#F9FAFB") {
  try {
    doc.setFillColor(color);
    doc.rect(x, y, width, height, "F");
  } catch (error) {
    console.error('Error in drawRect:', error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: Id<"invoices"> } }
) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No auth token provided');
      return new NextResponse("Unauthorized - No token provided", { status: 401 });
    }

    // Get the current session
    const { userId } = auth();
    if (!userId) {
      console.error('No user ID found in session');
      return new NextResponse("Unauthorized - No user found", { status: 401 });
    }

    // Get the Convex token from the Authorization header
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('Invalid auth token format');
      return new NextResponse("Unauthorized - Invalid token", { status: 401 });
    }

    // Set up Convex client with auth token
    client.setAuth(token);

    // Fetch invoice data
    console.log('Fetching invoice:', params.id);
    const invoice = await client.query(api.invoices.getInvoice, { 
      id: params.id as Id<"invoices">
    });
    
    if (!invoice) {
      console.error('Invoice not found:', params.id);
      return new NextResponse("Invoice not found", { status: 404 });
    }
    console.log('Invoice fetched successfully');

    // Get user data from Convex
    console.log('Fetching user data');
    const convexUser = await client.query(api.users.get);
    if (!convexUser) {
      console.error('User not found for ID:', userId);
      return new NextResponse("User not found", { status: 404 });
    }
    console.log('User data fetched successfully');

    // Create PDF document
    console.log('Creating PDF document');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });
    
    try {
      const pageWidth = doc.internal.pageSize.width;
      const margin = 40;
      let y = 40;

      // Add header background
      drawRect(doc, 0, 0, pageWidth, 24, "#F9FAFB");

      // Format invoice number
      const formattedNumber = safeText(invoice.number) || 'N/A';
      
      // Add business info
      doc.setFontSize(24);
      doc.setTextColor(31, 41, 55);
      drawText(doc, convexUser.businessName || 'Business Name', margin, y + 15);

      // Add invoice text
      doc.setFontSize(14);
      doc.setTextColor(107, 114, 128);
      drawText(doc, "INVOICE", pageWidth - margin - 70, y + 15);
      doc.setFontSize(12);
      drawText(doc, `#${formattedNumber}`, pageWidth - margin - 70, y + 30);

      // Add business details
      y += 30;
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      drawText(doc, convexUser.email || '', margin, y);
      if (convexUser.address) {
        y += 5;
        const addressLines = convexUser.address.split('\n');
        addressLines.forEach((line) => {
          drawText(doc, line, margin, y);
          y += 5;
        });
      }

      // Add client info
      y = 50;
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(10);
      drawText(doc, "BILL TO", pageWidth - margin - 80, y);
      y += 7;
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      drawText(doc, invoice.client?.name || 'Client Name', pageWidth - margin - 80, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      if (invoice.client?.email) {
        drawText(doc, invoice.client.email, pageWidth - margin - 80, y);
      }

      // Add dates
      y += 20;
      doc.setFontSize(10);
      const dateCol1 = margin;
      const dateCol2 = margin + 40;
      const dateCol3 = pageWidth - margin - 80;
      const dateCol4 = pageWidth - margin - 25;

      // Date section
      doc.setTextColor(107, 114, 128);
      drawText(doc, "Date:", dateCol1, y);
      doc.setTextColor(31, 41, 55);
      const formattedDate = new Date(invoice.date).toLocaleDateString();
      drawText(doc, formattedDate, dateCol2, y);

      if (invoice.dueDate) {
        doc.setTextColor(107, 114, 128);
        drawText(doc, "Due Date:", dateCol3, y);
        doc.setTextColor(31, 41, 55);
        const formattedDueDate = new Date(invoice.dueDate).toLocaleDateString();
        drawText(doc, formattedDueDate, dateCol4, y);
      }

      // Add separator line
      y += 8;
      drawLine(doc, margin, y, pageWidth - margin, y);

      // Add table header
      y += 15;
      drawRect(doc, margin, y - 5, pageWidth - (2 * margin), 12, "#F9FAFB");
      
      // Table headers
      const tableHeaders = ['Description', 'Hours', 'Rate', 'Amount'];
      const colWidths = [
        pageWidth - 180,
        30,
        50,
        50
      ];
      const startX = margin;
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      
      // Draw table headers
      tableHeaders.forEach((header, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        drawText(doc, header, x + (i === 0 ? 0 : colWidths[i]), y, { 
          align: i === 0 ? 'left' : 'right' 
        });
      });

      // Table rows
      y += 12;
      doc.setTextColor(31, 41, 55);
      const validTasks = (invoice.tasks || []).filter((task): task is NonNullable<typeof task> => task !== null);
      validTasks.forEach((task, index) => {
        const hourlyRate = invoice.client?.hourlyRate || 0;
        const amount = task.hours * hourlyRate;
        
        if (index % 2 === 1) {
          drawRect(doc, margin, y - 5, pageWidth - (2 * margin), 10, "#F9FAFB");
        }

        let x = startX;
        
        drawText(doc, task.description ?? '', x, y);
        x += colWidths[0];
        
        drawText(doc, task.hours.toString(), x + colWidths[1], y, { align: 'right' });
        x += colWidths[1];
        
        drawText(doc, formatCurrency(hourlyRate), x + colWidths[2], y, { align: 'right' });
        x += colWidths[2];
        
        drawText(doc, formatCurrency(amount), x + colWidths[3], y, { align: 'right' });
        
        y += 12;
      });

      // Add total section
      y += 5;
      drawRect(doc, pageWidth - margin - 100, y - 5, 100, 20, "#F9FAFB");
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      drawText(doc, "Total:", pageWidth - margin - 80, y + 5);
      drawText(doc, formatCurrency(invoice.total), pageWidth - margin, y + 5, { align: 'right' });

      // Add payment instructions
      if (convexUser.paymentInstructions) {
        y += 40;
        drawRect(doc, margin, y - 5, pageWidth - (2 * margin), 40, "#EFF6FF");
        doc.setFontSize(11);
        doc.setTextColor(59, 130, 246);
        drawText(doc, "Payment Instructions", margin + 10, y + 5);
        y += 12;
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        drawText(doc, convexUser.paymentInstructions, margin + 10, y);
      }

      // Add notes
      if (invoice.notes) {
        y += 40;
        doc.setFontSize(11);
        doc.setTextColor(107, 114, 128);
        drawText(doc, "Notes", margin, y);
        y += 7;
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        drawText(doc, invoice.notes, margin, y);
      }

      // Add footer
      const footerY = doc.internal.pageSize.height - 15;
      drawRect(doc, 0, footerY - 5, pageWidth, 20, "#F3F4F6");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      drawText(doc, "Thank you for your business", pageWidth / 2, footerY, { align: 'center' });

      console.log('PDF generated successfully');
      
      try {
        const pdfOutput = doc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfOutput);
        
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${formattedNumber}.pdf"`,
            'Cache-Control': 'no-store'
          },
        });
      } catch (bufferError) {
        console.error('Error creating PDF buffer:', bufferError);
        return new NextResponse(
          `Error creating PDF buffer: ${bufferError instanceof Error ? bufferError.message : 'Unknown error'}`,
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      return new NextResponse(
        `Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new NextResponse(
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
} 