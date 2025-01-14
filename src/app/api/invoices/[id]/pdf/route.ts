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

// Helper functions for styling
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
      const margin = 40; // Increased margin for better readability
      let y = 40;

      // Add header background
      drawRect(doc, 0, 0, pageWidth, 24, "#F9FAFB");

      // Format invoice number
      const formattedNumber = invoice.number || 'N/A';
      
      // Add business info - handle potential undefined values
      doc.setFontSize(24);
      doc.setTextColor(31, 41, 55);
      const businessName = convexUser.businessName || 'Business Name';
      doc.text(businessName, margin, y + 15);

      // Add invoice text
      doc.setFontSize(14);
      doc.setTextColor(107, 114, 128);
      doc.text("INVOICE", pageWidth - margin - 70, y + 15);
      doc.setFontSize(12);
      doc.text(`#${formattedNumber}`, pageWidth - margin - 70, y + 30);

      // Add business details
      y += 30;
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(convexUser.email || '', margin, y);
      if (convexUser.address) {
        y += 5;
        const addressLines = convexUser.address.split('\n');
        addressLines.forEach((line) => {
          doc.text(line.trim(), margin, y);
          y += 5;
        });
      }

      // Add client info
      y = 50;
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(10);
      doc.text("BILL TO", pageWidth - margin - 80, y);
      y += 7;
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text(invoice.client?.name || 'Client Name', pageWidth - margin - 80, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      if (invoice.client?.email) {
        doc.text(invoice.client.email, pageWidth - margin - 80, y);
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
      const formattedDate = new Date(invoice.date).toLocaleDateString();
      doc.text(formattedDate, dateCol2, y);

      if (invoice.dueDate) {
        doc.setTextColor(107, 114, 128);
        doc.text("Due Date:", dateCol3, y);
        doc.setTextColor(31, 41, 55);
        const formattedDueDate = new Date(invoice.dueDate).toLocaleDateString();
        doc.text(formattedDueDate, dateCol4, y);
      }

      // Add separator line with subtle color
      y += 8; // Reduced spacing
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, pageWidth - margin, y);

      // Add table header with background
      y += 15;
      const tableTop = y;
      drawRect(doc, margin, y - 5, pageWidth - (2 * margin), 12, "#F9FAFB");
      
      // Table headers
      const tableHeaders = ['Description', 'Hours', 'Rate', 'Amount'];
      // Adjust column widths (total should be pageWidth - 2*margin)
      const colWidths = [
        pageWidth - 180, // Description (wider)
        30,             // Hours
        50,             // Rate
        50              // Amount
      ];
      const startX = margin;
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      
      // Draw table headers with proper alignment
      tableHeaders.forEach((header, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        if (i === 0) {
          doc.text(header, x, y); // Left align description
        } else {
          doc.text(header, x + colWidths[i], y, { align: 'right' }); // Right align numbers
        }
      });

      // Table rows
      y += 12;
      doc.setTextColor(31, 41, 55);
      const validTasks = (invoice.tasks || []).filter((task): task is NonNullable<typeof task> => task !== null);
      validTasks.forEach((task, index) => {
        const hourlyRate = invoice.client?.hourlyRate || 0;
        const amount = task.hours * hourlyRate;
        
        // Alternate row background
        if (index % 2 === 1) {
          drawRect(doc, margin, y - 5, pageWidth - (2 * margin), 10, "#F9FAFB");
        }

        let x = startX;
        
        // Description (left-aligned)
        doc.text(task.description ?? '', x, y);
        x += colWidths[0];
        
        // Hours (right-aligned)
        doc.text(task.hours.toString(), x + colWidths[1], y, { align: 'right' });
        x += colWidths[1];
        
        // Rate (right-aligned)
        doc.text(formatCurrency(hourlyRate), x + colWidths[2], y, { align: 'right' });
        x += colWidths[2];
        
        // Amount (right-aligned)
        doc.text(formatCurrency(amount), x + colWidths[3], y, { align: 'right' });
        
        y += 12;
      });

      // Add total section with background
      y += 5;
      drawRect(doc, pageWidth - margin - 100, y - 5, 100, 20, "#F9FAFB");
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text("Total:", pageWidth - margin - 80, y + 5);
      doc.setFontSize(12);
      doc.text(formatCurrency(invoice.total), pageWidth - margin, y + 5, { align: 'right' });

      // Add payment instructions in a styled box
      if (convexUser.paymentInstructions) {
        y += 40;
        drawRect(doc, margin, y - 5, pageWidth - (2 * margin), 40, "#EFF6FF");
        doc.setFontSize(11);
        doc.setTextColor(59, 130, 246);
        doc.text("Payment Instructions", margin + 10, y + 5);
        y += 12;
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.text(convexUser.paymentInstructions, margin + 10, y);
      }

      // Add notes if they exist
      if (invoice.notes) {
        y += 40;
        doc.setFontSize(11);
        doc.setTextColor(107, 114, 128);
        doc.text("Notes", margin, y);
        y += 7;
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.text(invoice.notes, margin, y);
      }

      // Add footer
      const footerY = doc.internal.pageSize.height - 15;
      drawRect(doc, 0, footerY - 5, pageWidth, 20, "#F3F4F6");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("Thank you for your business", pageWidth / 2, footerY, { align: 'center' });

      console.log('PDF generated successfully');
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${formattedNumber}.pdf"`,
          'Cache-Control': 'no-store'
        },
      });
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