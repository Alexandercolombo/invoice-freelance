import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { Id } from "convex/_generated/dataModel";
import { auth } from "@clerk/nextjs";

// Force Edge runtime since we're having issues with Node
export const runtime = 'edge';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function drawLine(doc: jsPDF, startX: number, startY: number, endX: number, endY: number, color: string = "#E5E7EB") {
  doc.setDrawColor(color);
  doc.setLineWidth(0.5);
  doc.line(startX, startY, endX, endY);
}

function drawRect(doc: jsPDF, x: number, y: number, width: number, height: number, color: string = "#F9FAFB") {
  doc.setFillColor(color);
  doc.rect(x, y, width, height, "F");
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: Id<"invoices"> } }
) {
  try {
    // Auth checks remain the same
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse("Unauthorized - No token provided", { status: 401 });
    }

    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized - No user found", { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return new NextResponse("Unauthorized - Invalid token", { status: 401 });
    }

    client.setAuth(token);

    // Fetch data
    const invoice = await client.query(api.invoices.getInvoice, { 
      id: params.id as Id<"invoices">
    });
    
    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    const convexUser = await client.query(api.users.get);
    if (!convexUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Create PDF with minimal settings
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    try {
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      let y = 20;

      console.log('Adding content to PDF');
      // Add header background
      drawRect(doc, 0, 0, pageWidth, 12, "#F9FAFB");

      // Add business info
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.text(convexUser.businessName || 'Business Name', margin, y + 15);

      // Add invoice text
      doc.setFontSize(12);
      doc.setTextColor(107, 114, 128);
      doc.text("INVOICE", pageWidth - margin - 35, y + 15);
      doc.setFontSize(10);
      doc.text(`#${invoice.number}`, pageWidth - margin - 35, y + 22);

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

      // Add total section
      y += 5;
      drawRect(doc, pageWidth - margin - 100, y - 5, 100, 20, "#F9FAFB");
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text("Total:", pageWidth - margin - 80, y + 5);
      doc.text(formatCurrency(invoice.total), pageWidth - margin, y + 5, { align: 'right' });

      // Add payment instructions
      if (convexUser.paymentInstructions) {
        y += 40;
        drawRect(doc, margin, y - 5, pageWidth - (2 * margin), 40, "#EFF6FF");
        doc.setFontSize(11);
        doc.setTextColor(59, 130, 246);
        doc.text("Payment Instructions", margin + 10, y + 5);
        y += 12;
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        const maxWidth = pageWidth - (2 * margin) - 20;
        doc.text(convexUser.paymentInstructions, margin + 10, y, { maxWidth });
      }

      // Add notes
      if (invoice.notes) {
        y += 40;
        doc.setFontSize(11);
        doc.setTextColor(107, 114, 128);
        doc.text("Notes", margin, y);
        y += 7;
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        const maxWidth = pageWidth - (2 * margin);
        doc.text(invoice.notes, margin, y, { maxWidth });
      }

      // Add footer
      const footerY = doc.internal.pageSize.height - 15;
      drawRect(doc, 0, footerY - 5, pageWidth, 20, "#F3F4F6");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("Thank you for your business", pageWidth / 2, footerY, { align: 'center' });

      // Generate PDF data
      const pdfOutput = doc.output('arraybuffer');
      
      // Create response with proper headers
      return new Response(pdfOutput, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.number}.pdf"`,
          'Content-Length': pdfOutput.byteLength.toString(),
          'Cache-Control': 'no-store'
        }
      });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      return new Response(
        `PDF Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
} 