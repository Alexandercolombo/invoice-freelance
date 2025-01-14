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
function drawLine(doc: jsPDF, startX: number, startY: number, endX: number, endY: number, color: string = "#E5E7EB") {
  doc.setDrawColor(color);
  doc.setLineWidth(0.2);  // Thinner, more elegant lines
  doc.line(startX, startY, endX, endY);
}

function drawRect(doc: jsPDF, x: number, y: number, width: number, height: number, color: string = "#F9FAFB") {
  doc.setFillColor(color);
  doc.roundedRect(x, y, width, height, 1, 1, "F");  // Rounded corners for modern look
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
      // Initialize PDF with specific settings
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        compress: true
      });

      const pageWidth = doc.internal.pageSize.width;
      const margin = 25;  // Increased margins for better whitespace
      let y = 25;  // Start content slightly lower

      // Add header background with gradient effect
      drawRect(doc, 0, 0, pageWidth, 15, "#F3F4F6");
      drawLine(doc, 0, 15, pageWidth, 15, "#E5E7EB");

      // Add business info with improved typography
      doc.setFontSize(24);  // Larger business name
      doc.setTextColor(17, 24, 39);  // Darker text for better contrast
      doc.text(convexUser.businessName || 'Business Name', margin, y + 15);

      // Add invoice text with better positioning
      doc.setFontSize(14);
      doc.setTextColor(75, 85, 99);
      doc.text("INVOICE", pageWidth - margin - 40, y + 15);
      doc.setFontSize(12);
      doc.text(`#${invoice.number}`, pageWidth - margin - 40, y + 22);

      // Add business details with improved spacing
      y += 35;
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text(convexUser.email || '', margin, y);
      if (convexUser.address) {
        y += 6;  // Increased line spacing
        const addressLines = convexUser.address.split('\n');
        addressLines.forEach((line) => {
          doc.text(line.trim(), margin, y);
          y += 6;
        });
      }

      // Add client info with better visual hierarchy
      y = 55;
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(11);
      doc.text("BILL TO", pageWidth - margin - 85, y);
      y += 8;
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(invoice.client?.name || 'Client Name', pageWidth - margin - 85, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      if (invoice.client?.email) {
        doc.text(invoice.client.email, pageWidth - margin - 85, y);
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
      doc.text("Date:", dateCol1, y);
      doc.setTextColor(31, 41, 55);
      doc.text(new Date(invoice.date).toLocaleDateString(), dateCol2, y);

      if (invoice.dueDate) {
        doc.setTextColor(107, 114, 128);
        doc.text("Due Date:", dateCol3, y);
        doc.setTextColor(31, 41, 55);
        doc.text(new Date(invoice.dueDate).toLocaleDateString(), dateCol4, y);
      }

      // Add separator line
      y += 8;
      drawLine(doc, margin, y, pageWidth - margin, y);

      // Add table header
      y += 15;
      drawRect(doc, margin, y - 6, pageWidth - (2 * margin), 14, "#F8FAFC");  // Lighter background
      
      // Table headers
      const tableHeaders = ['Description', 'Hours', 'Rate', 'Amount'];
      const colWidths = [
        pageWidth - 190,  // Wider description column
        35,
        55,
        55
      ];
      const startX = margin + 5;  // Add padding to first column
      
      doc.setFontSize(11);  // Slightly larger headers
      doc.setTextColor(51, 65, 85);  // Slate-600 for better contrast
      
      // Draw table headers
      tableHeaders.forEach((header, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        if (i === 0) {
          doc.text(header, x, y);
        } else {
          doc.text(header, x + colWidths[i], y, { align: 'right' });
        }
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
        
        // Ensure text doesn't exceed column width
        const description = task.description || '';
        const maxWidth = colWidths[0] - 5; // Leave some padding
        doc.text(description, x, y, { maxWidth });
        x += colWidths[0];
        
        doc.text(task.hours.toString(), x + colWidths[1], y, { align: 'right' });
        x += colWidths[1];
        
        doc.text(formatCurrency(hourlyRate), x + colWidths[2], y, { align: 'right' });
        x += colWidths[2];
        
        doc.text(formatCurrency(amount), x + colWidths[3], y, { align: 'right' });
        
        y += 12;
      });

      // Add total section with enhanced styling
      y += 8;
      drawRect(doc, pageWidth - margin - 110, y - 6, 110, 24, "#F1F5F9");  // Larger total box
      doc.setFontSize(13);  // Larger total text
      doc.setTextColor(17, 24, 39);
      doc.text("Total:", pageWidth - margin - 90, y + 6);
      doc.setFontSize(14);  // Even larger total amount
      doc.text(formatCurrency(invoice.total), pageWidth - margin, y + 6, { align: 'right' });

      // Add payment instructions with improved styling
      if (convexUser.paymentInstructions) {
        y += 45;
        drawRect(doc, margin, y - 6, pageWidth - (2 * margin), 45, "#EFF6FF");
        doc.setFontSize(12);
        doc.setTextColor(37, 99, 235);  // Brighter blue
        doc.text("Payment Instructions", margin + 12, y + 6);
        y += 14;
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        const maxWidth = pageWidth - (2 * margin) - 24;
        doc.text(convexUser.paymentInstructions, margin + 12, y, { maxWidth });
      }

      // Add notes with better spacing
      if (invoice.notes) {
        y += 45;
        doc.setFontSize(12);
        doc.setTextColor(75, 85, 99);
        doc.text("Notes", margin, y);
        y += 8;
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        const maxWidth = pageWidth - (2 * margin);
        doc.text(invoice.notes, margin, y, { maxWidth });
      }

      // Add footer with improved styling
      const footerY = doc.internal.pageSize.height - 18;
      drawRect(doc, 0, footerY - 6, pageWidth, 24, "#F8FAFC");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text("Thank you for your business", pageWidth / 2, footerY, { align: 'center' });

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