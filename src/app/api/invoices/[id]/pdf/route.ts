import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { Id } from "convex/_generated/dataModel";
import { auth } from "@clerk/nextjs";
import { Task } from "@/types";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const runtime = 'nodejs';

// Helper functions for styling
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
    // Get the current session
    const { userId, getToken } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the Convex token
    const token = await getToken({ template: "convex" });
    if (!token) {
      return new NextResponse("Failed to get Convex token", { status: 401 });
    }

    client.setAuth(token);

    // Fetch invoice data first
    const invoice = await client.query(api.invoices.getInvoice, { 
      id: params.id as Id<"invoices">
    });
    
    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    // Get user data from Convex
    const convexUser = await client.query(api.users.get);
    if (!convexUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Create PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let y = 20;

    // Add header background - making it more subtle
    drawRect(doc, 0, 0, pageWidth, 12, "#F9FAFB");

    // Simplify invoice number to just use the sequential number
    const simpleNumber = String(parseInt(invoice.number.split('-').pop() || '1')).padStart(3, '0');
    const formattedNumber = simpleNumber; // Just use the simple sequential number
    
    // Add business info with better styling
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55);
    doc.text(convexUser.businessName || '', margin, y + 15);

    // Add "INVOICE" text with more subtle styling
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text("INVOICE", pageWidth - margin - 35, y + 15);
    doc.setFontSize(10);
    doc.text(`#${formattedNumber}`, pageWidth - margin - 35, y + 22);

    // Add business details with better spacing
    y += 30; // Reduced from 35
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(convexUser.email || '', margin, y);
    if (convexUser.address) {
      y += 5;
      doc.text(convexUser.address, margin, y);
    }

    // Add client info with better alignment
    y = 50; // Adjusted for better spacing
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(10);
    doc.text("BILL TO", pageWidth - margin - 80, y);
    y += 7;
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text(invoice.client?.name || '', pageWidth - margin - 80, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    if (invoice.client?.email) {
      doc.text(invoice.client.email, pageWidth - margin - 80, y);
    }

    // Add dates with cleaner layout
    y += 20; // Reduced spacing
    doc.setFontSize(10);
    const dateCol1 = margin;
    const dateCol2 = margin + 40; // Reduced spacing
    const dateCol3 = pageWidth - margin - 80;
    const dateCol4 = pageWidth - margin - 25;

    // Date section with better alignment
    doc.setTextColor(107, 114, 128);
    doc.text("Date:", dateCol1, y);
    doc.setTextColor(31, 41, 55);
    doc.text(new Date(invoice.date).toLocaleDateString(), dateCol2, y);

    // Only show due date if it exists
    if (invoice.dueDate) {
      doc.setTextColor(107, 114, 128);
      doc.text("Due Date:", dateCol3, y);
      doc.setTextColor(31, 41, 55);
      doc.text(new Date(invoice.dueDate).toLocaleDateString(), dateCol4, y);
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

    // Get PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Set response headers
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/pdf');
    responseHeaders.set('Content-Disposition', `attachment; filename=invoice-${formattedNumber}.pdf`);

    return new NextResponse(pdfBuffer, { headers: responseHeaders });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
} 