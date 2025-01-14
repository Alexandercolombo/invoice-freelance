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
      const margin = 30;  // Even larger margins for a more premium look
      let y = 35;  // Start content lower

      // Add sophisticated header design
      drawRect(doc, 0, 0, pageWidth, 50, "#F8FAFC");  // Taller header
      drawLine(doc, 0, 50, pageWidth, 50, "#E2E8F0");
      
      // Business branding section
      setTextStyle(doc, 28, "#1E293B");  // Larger, darker business name
      doc.text(convexUser.businessName || 'Business Name', margin, y);
      
      // Invoice details in top right
      const rightCol = pageWidth - margin;
      setTextStyle(doc, 16, "#475569");
      doc.text("INVOICE", rightCol - 45, y);
      setTextStyle(doc, 14, "#64748B");
      doc.text(`#${invoice.number}`, rightCol - 45, y + 8);

      // Business details with refined typography
      y += 45;  // More spacing after header
      setTextStyle(doc, 11, "#64748B");
      doc.text(convexUser.email || '', margin, y);
      if (convexUser.address) {
        y += 7;
        const addressLines = convexUser.address.split('\n');
        addressLines.forEach((line) => {
          doc.text(line.trim(), margin, y);
          y += 7;
        });
      }

      // Client section with enhanced layout
      const clientSectionY = y + 15;
      drawRect(doc, margin - 5, clientSectionY - 8, pageWidth - (2 * margin) + 10, 50, "#F8FAFC");
      
      setTextStyle(doc, 12, "#475569");
      doc.text("BILL TO", margin, clientSectionY + 5);
      setTextStyle(doc, 14, "#1E293B");
      doc.text(invoice.client?.name || 'Client Name', margin, clientSectionY + 15);
      setTextStyle(doc, 11, "#64748B");
      if (invoice.client?.email) {
        doc.text(invoice.client.email, margin, clientSectionY + 25);
      }

      // Dates section with improved alignment
      y = clientSectionY + 65;
      const dateGrid = {
        col1: margin,
        col2: margin + 45,
        col3: pageWidth - margin - 90,
        col4: pageWidth - margin - 30
      };

      setTextStyle(doc, 11, "#64748B");
      doc.text("Invoice Date:", dateGrid.col1, y);
      setTextStyle(doc, 11, "#1E293B");
      doc.text(new Date(invoice.date).toLocaleDateString(), dateGrid.col2, y);

      if (invoice.dueDate) {
        setTextStyle(doc, 11, "#64748B");
        doc.text("Due Date:", dateGrid.col3, y);
        setTextStyle(doc, 11, "#1E293B");
        doc.text(new Date(invoice.dueDate).toLocaleDateString(), dateGrid.col4, y);
      }

      // Enhanced table styling
      y += 20;
      drawRect(doc, margin - 5, y - 8, pageWidth - (2 * margin) + 10, 16, "#F1F5F9");
      
      const tableHeaders = ['Description', 'Hours', 'Rate', 'Amount'];
      const colWidths = [
        pageWidth - 200,  // Even wider description column
        40,
        60,
        60
      ];
      
      setTextStyle(doc, 12, "#475569");
      let x = margin;
      tableHeaders.forEach((header, i) => {
        if (i === 0) {
          doc.text(header, x, y);
        } else {
          doc.text(header, x + colWidths[i], y, { align: 'right' });
        }
        x += colWidths[i];
      });

      // Table content with zebra striping
      y += 15;
      setTextStyle(doc, 11, "#334155");
      const validTasks = (invoice.tasks || []).filter((task): task is NonNullable<typeof task> => task !== null);
      validTasks.forEach((task, index) => {
        if (index % 2 === 1) {
          drawRect(doc, margin - 5, y - 6, pageWidth - (2 * margin) + 10, 12, "#F8FAFC");
        }

        const hourlyRate = invoice.client?.hourlyRate || 0;
        const amount = task.hours * hourlyRate;
        
        x = margin;
        doc.text(task.description || '', x, y, { maxWidth: colWidths[0] - 10 });
        x += colWidths[0];
        
        ['hours', hourlyRate, amount].forEach((value, i) => {
          doc.text(
            i === 0 ? value.toString() : formatCurrency(value as number),
            x + colWidths[i + 1],
            y,
            { align: 'right' }
          );
          x += colWidths[i + 1];
        });
        
        y += 12;
      });

      // Premium total section
      y += 10;
      const totalWidth = 130;
      const totalX = pageWidth - margin - totalWidth;
      drawRect(doc, totalX, y - 8, totalWidth, 30, "#F1F5F9");
      
      setTextStyle(doc, 14, "#475569");
      doc.text("Total:", totalX + 15, y + 8);
      setTextStyle(doc, 16, "#1E293B");
      doc.text(formatCurrency(invoice.total), pageWidth - margin - 15, y + 8, { align: 'right' });

      // Elegant payment instructions
      if (convexUser.paymentInstructions) {
        y += 50;
        drawRect(doc, margin - 5, y - 8, pageWidth - (2 * margin) + 10, 55, "#F0F9FF");
        
        setTextStyle(doc, 13, "#0369A1");
        doc.text("Payment Instructions", margin + 15, y + 5);
        
        setTextStyle(doc, 11, "#334155");
        const maxWidth = pageWidth - (2 * margin) - 30;
        doc.text(convexUser.paymentInstructions, margin + 15, y + 20, { maxWidth });
      }

      // Professional notes section
      if (invoice.notes) {
        y += 70;
        setTextStyle(doc, 13, "#475569");
        doc.text("Notes", margin, y);
        
        setTextStyle(doc, 11, "#334155");
        y += 10;
        const maxWidth = pageWidth - (2 * margin);
        doc.text(invoice.notes, margin, y, { maxWidth });
      }

      // Sophisticated footer
      const footerY = pageHeight - 25;
      drawRect(doc, 0, footerY - 8, pageWidth, 33, "#F8FAFC");
      drawLine(doc, 0, footerY - 8, pageWidth, footerY - 8, "#E2E8F0");
      
      setTextStyle(doc, 11, "#64748B");
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