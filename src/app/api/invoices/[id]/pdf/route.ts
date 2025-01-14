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

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Helper functions for PDF styling
function drawLine(doc: jsPDF, startX: number, startY: number, endX: number, endY: number, color: string = "#E2E8F0") {
  doc.setDrawColor(color);
  doc.setLineWidth(0.1);  // Even thinner lines for a more refined look
  doc.line(startX, startY, endX, endY);
}

function drawRect(doc: jsPDF, x: number, y: number, width: number, height: number, color: string = "#F8FAFC") {
  doc.setFillColor(color);
  doc.roundedRect(x, y, width, height, 2, 2, "F");  // Slightly more rounded corners
}

// Add new helper for consistent text styling
function setTextStyle(doc: jsPDF, size: number, color: string, isBold: boolean = false) {
  doc.setFontSize(size);
  doc.setTextColor(color);
  // Note: You might need to add font support for bold if needed
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: Id<"invoices"> } }
) {
  let doc: jsPDF | null = null;

  try {
    console.log('Starting PDF generation process...');

    // Get auth from Clerk
    const { getToken } = auth();
    if (!getToken) {
      console.log('No getToken function found');
      return new NextResponse("Unauthorized - No token function", { status: 401 });
    }

    // Get a fresh Convex token
    try {
      const token = await getToken({ template: "convex" });
      if (!token) {
        console.log('Failed to get Convex token');
        return new NextResponse("Unauthorized - Failed to get token", { status: 401 });
      }
      console.log('Setting up Convex client with token...');
      client.setAuth(token);
    } catch (error) {
      console.error('Error getting Convex token:', error);
      return new NextResponse("Unauthorized - Token error", { status: 401 });
    }

    console.log('Fetching invoice data...');
    const invoice = await client.query(api.invoices.getInvoice, { 
      id: params.id as Id<"invoices">
    });
    
    if (!invoice) {
      console.log('Invoice not found:', params.id);
      return new NextResponse("Invoice not found", { status: 404 });
    }

    console.log('Fetching user data...');
    const convexUser = await client.query(api.users.get);
    if (!convexUser) {
      console.log('User not found');
      return new NextResponse("User not found", { status: 404 });
    }

    console.log('Initializing PDF document...');
    try {
      // Initialize PDF with premium settings
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        compress: true
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;  // Reduced margins
      let y = 25;  // Start content higher

      // Add sophisticated header design
      drawRect(doc, 0, 0, pageWidth, 35, "#F8FAFC");  // Shorter header
      drawLine(doc, 0, 35, pageWidth, 35, "#E2E8F0");
      
      // Business branding section
      setTextStyle(doc, 20, "#1E293B");  // Smaller business name
      doc.text(convexUser.businessName || 'Business Name', margin, y);
      
      // Invoice details in top right
      const rightCol = pageWidth - margin;
      setTextStyle(doc, 14, "#475569");
      doc.text("INVOICE", rightCol - 35, y);
      setTextStyle(doc, 12, "#64748B");
      doc.text(`#${invoice.number}`, rightCol - 35, y + 6);

      // Business details with refined typography
      y += 25;  // Less spacing after header
      setTextStyle(doc, 10, "#64748B");
      doc.text(convexUser.email || '', margin, y);
      if (convexUser.address) {
        y += 5;
        const addressLines = convexUser.address.split('\n');
        addressLines.forEach((line) => {
          doc.text(line.trim(), margin, y);
          y += 5;
        });
      }

      // Client section with enhanced layout (moved to right side)
      const clientSectionY = y - 15; // Align with business details
      const clientBoxWidth = 80;
      const clientBoxX = pageWidth - margin - clientBoxWidth;
      drawRect(doc, clientBoxX - 5, clientSectionY - 6, clientBoxWidth + 10, 35, "#F8FAFC");
      
      setTextStyle(doc, 11, "#475569");
      doc.text("BILL TO", clientBoxX, clientSectionY + 5);
      setTextStyle(doc, 12, "#1E293B");
      doc.text(invoice.client?.name || 'Client Name', clientBoxX, clientSectionY + 12);
      setTextStyle(doc, 10, "#64748B");
      if (invoice.client?.email) {
        doc.text(invoice.client.email, clientBoxX, clientSectionY + 19);
      }

      // Dates section with improved alignment
      y = clientSectionY + 45;
      const dateGrid = {
        col1: margin,
        col2: margin + 35,
        col3: margin + 90,
        col4: margin + 125
      };

      setTextStyle(doc, 10, "#64748B");
      doc.text("Invoice Date:", dateGrid.col1, y);
      setTextStyle(doc, 10, "#1E293B");
      doc.text(new Date(invoice.date).toLocaleDateString(), dateGrid.col2, y);

      if (invoice.dueDate) {
        setTextStyle(doc, 10, "#64748B");
        doc.text("Due Date:", dateGrid.col3, y);
        setTextStyle(doc, 10, "#1E293B");
        doc.text(new Date(invoice.dueDate).toLocaleDateString(), dateGrid.col4, y);
      }

      // Enhanced table styling
      y += 15;
      drawRect(doc, margin - 5, y - 6, pageWidth - (2 * margin) + 10, 12, "#F1F5F9");
      
      const tableHeaders = ['Description', 'Hours', 'Rate', 'Amount'];
      const colWidths = [
        pageWidth - 160,  // Adjusted column widths
        30,
        45,
        45
      ];
      
      setTextStyle(doc, 11, "#475569");
      let x = margin;
      tableHeaders.forEach((header, i) => {
        const xPos = i === 0 ? x : x + colWidths[i];
        doc.text(header, xPos, y, { align: i === 0 ? 'left' : 'right' });
        x += colWidths[i];
      });

      // Table content with zebra striping
      y += 12;
      setTextStyle(doc, 10, "#334155");
      const validTasks = (invoice.tasks || []).filter((task): task is NonNullable<typeof task> => task !== null);
      validTasks.forEach((task, index) => {
        if (index % 2 === 1) {
          drawRect(doc, margin - 5, y - 5, pageWidth - (2 * margin) + 10, 10, "#F8FAFC");
        }

        const hourlyRate = invoice.client?.hourlyRate || 0;
        const amount = task.hours * hourlyRate;
        
        x = margin;
        // Keep original text without splitting characters
        doc.text(task.description || '', x, y, { maxWidth: colWidths[0] - 5 });
        x += colWidths[0];
        
        ['hours', hourlyRate, amount].forEach((value, i) => {
          const text = i === 0 ? value.toString() : formatCurrency(value as number);
          doc.text(text, x + colWidths[i + 1], y, { align: 'right' });
          x += colWidths[i + 1];
        });
        
        y += 10;
      });

      // Premium total section
      y += 8;
      const totalWidth = 110;
      const totalX = pageWidth - margin - totalWidth;
      drawRect(doc, totalX, y - 6, totalWidth, 20, "#F1F5F9");
      
      setTextStyle(doc, 12, "#475569");
      doc.text("Total:", totalX + 10, y + 5);
      setTextStyle(doc, 14, "#1E293B");
      doc.text(formatCurrency(invoice.total), pageWidth - margin - 10, y + 5, { align: 'right' });

      // Elegant payment instructions
      if (convexUser.paymentInstructions) {
        y += 30;
        drawRect(doc, margin - 5, y - 6, pageWidth - (2 * margin) + 10, 40, "#F0F9FF");
        
        setTextStyle(doc, 11, "#0369A1");
        doc.text("Payment Instructions", margin + 10, y + 5);
        
        setTextStyle(doc, 10, "#334155");
        const maxWidth = pageWidth - (2 * margin) - 20;
        // Keep original text without splitting characters
        doc.text(convexUser.paymentInstructions, margin + 10, y + 15, { maxWidth });
      }

      // Professional notes section
      if (invoice.notes) {
        y += 50;
        setTextStyle(doc, 11, "#475569");
        doc.text("Notes", margin, y);
        
        setTextStyle(doc, 10, "#334155");
        y += 8;
        const maxWidth = pageWidth - (2 * margin);
        // Keep original text without splitting characters
        doc.text(invoice.notes, margin, y, { maxWidth });
      }

      // Sophisticated footer
      const footerY = pageHeight - 20;
      drawRect(doc, 0, footerY - 6, pageWidth, 26, "#F8FAFC");
      drawLine(doc, 0, footerY - 6, pageWidth, footerY - 6, "#E2E8F0");
      
      setTextStyle(doc, 10, "#64748B");
      doc.text("Thank you for your business", pageWidth / 2, footerY + 5, { align: 'center' });

      console.log('Generating PDF output...');
      const pdfOutput = doc.output('arraybuffer');

      console.log('Creating response...');
      return new NextResponse(pdfOutput, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.number}.pdf"`,
          'Content-Length': pdfOutput.byteLength.toString(),
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      return new NextResponse(
        `PDF Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse(
      `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  } finally {
    // Clean up
    if (doc) {
      try {
        // @ts-ignore - Internal cleanup
        doc.internal.events = null;
        // @ts-ignore - Internal cleanup
        doc.internal = null;
        doc = null;
      } catch (error) {
        console.error('Error cleaning up PDF document:', error);
      }
    }
  }
} 