// Configure route options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { jsPDF } from 'jspdf';
import { ConvexClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';

async function getInvoiceData(id: string, token: string) {
  try {
    console.log('[Debug] Getting invoice data with token:', { id, hasToken: !!token });
    
    // Create a new Convex client instance for this request
    const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await convex.setAuth(() => Promise.resolve(token));

    try {
      // Get invoice data from Convex
      const invoice = await convex.query(api.invoices.getInvoice, { 
        id: id as unknown as Id<"invoices">
      });

      if (!invoice) {
        throw new Error(`Invoice not found with ID: ${id}`);
      }

      // Log invoice data for debugging
      console.log('[Debug] Invoice data:', {
        invoice: {
          id: invoice._id,
          userId: invoice.userId,
          number: invoice.number
        }
      });

      return invoice;
    } catch (err) {
      console.error('[Error] Failed to query invoice:', err);
      if (err instanceof Error && err.message.includes('Invalid ID')) {
        throw new Error(`Invalid invoice ID format: ${id}`);
      }
      throw err;
    }
  } catch (err) {
    console.error('[Error] Failed to fetch invoice data:', err);
    throw err;
  }
}

async function getUserData(userId: string, token: string) {
  try {
    console.log('[Debug] Getting user data with token:', { userId, hasToken: !!token });
    
    // Create a new Convex client instance for this request
    const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await convex.setAuth(() => Promise.resolve(token));

    // Get user profile from Convex
    const user = await convex.query(api.users.get, {});
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }

    // Log user data for debugging
    console.log('[Debug] User data:', {
      user: {
        id: user._id,
        businessName: user.businessName
      }
    });

    return {
      businessName: user.businessName,
      email: user.email,
      address: user.address,
      phone: user.phone,
      paymentInstructions: user.paymentInstructions
    };
  } catch (err) {
    console.error('[Error] Failed to fetch user data:', err);
    throw err;
  }
}

function generatePDF(invoiceData: any, userData: any): Buffer {
  console.log('[Debug] Starting PDF generation with jsPDF');
  
  try {
    // Create PDF with better default styling
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont('helvetica');
    
    // Define colors with proper typing
    const primaryColor: [number, number, number] = [41, 71, 226];  // #2947e2
    const textColor: [number, number, number] = [51, 51, 51];     // #333333
    const secondaryColor: [number, number, number] = [128, 128, 128]; // #808080
    
    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    const columnWidth = contentWidth / 2;
    
    let yPos = margin;
    
    // Add logo if available
    if (userData.logoUrl) {
      try {
        doc.addImage(userData.logoUrl, 'PNG', margin, yPos, 40, 20, undefined, 'FAST');
        yPos += 25; // Space after logo
      } catch (error) {
        console.error('[Error] Failed to add logo:', error);
        // Continue without logo if there's an error
        yPos += 5;
      }
    }

    // Header with two columns
    // Left column - Business Information
    let leftYPos = yPos;
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    if (userData.businessName) {
      doc.text(userData.businessName, margin, leftYPos);
      leftYPos += 10;
    }
    
    // Business Details
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    if (userData.address) {
      const addressLines = doc.splitTextToSize(userData.address, columnWidth - 10);
      addressLines.forEach((line: string) => {
        doc.text(line.trim(), margin, leftYPos);
        leftYPos += 5;
      });
    }
    if (userData.email) {
      doc.text(userData.email, margin, leftYPos);
      leftYPos += 5;
    }
    if (userData.phone) {
      doc.text(userData.phone, margin, leftYPos);
      leftYPos += 5;
    }
    
    // Right column - Invoice Details & Client Information
    let rightYPos = yPos;
    const rightColumnX = margin + columnWidth + 10;
    
    // Invoice Title and Number
    doc.setFontSize(28);
    doc.setTextColor(...primaryColor);
    doc.text('INVOICE', rightColumnX, rightYPos);
    rightYPos += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(...textColor);
    doc.text(`#${invoiceData.number}`, rightColumnX, rightYPos);
    rightYPos += 15;
    
    // Client Information
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('Bill To:', rightColumnX, rightYPos);
    rightYPos += 8;
    
    doc.setFontSize(12);
    doc.setTextColor(...textColor);
    doc.text(invoiceData.client.name, rightColumnX, rightYPos);
    if (invoiceData.client.email) {
      rightYPos += 6;
      doc.setFontSize(10);
      doc.text(invoiceData.client.email, rightColumnX, rightYPos);
    }
    rightYPos += 15;
    
    // Dates
    doc.setFontSize(10);
    doc.text(`Issue Date: ${new Date(invoiceData.date).toLocaleDateString()}`, rightColumnX, rightYPos);
    rightYPos += 6;
    if (invoiceData.dueDate) {
      doc.text(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, rightColumnX, rightYPos);
      rightYPos += 6;
    }
    
    // Set yPos to the lower of the two columns
    yPos = Math.max(leftYPos, rightYPos) + 20;
    
    // Tasks Table - Full Width
    // Table Headers
    const columns = ['Description', 'Hours', 'Rate', 'Amount'];
    const columnWidths = [contentWidth * 0.5, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.2];
    
    // Draw table header background
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
    
    // Draw header text
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    let xPos = margin;
    columns.forEach((column, index) => {
      doc.text(column, xPos + 2, yPos);
      xPos += columnWidths[index];
    });
    
    // Table Content
    yPos += 8;
    doc.setTextColor(...textColor);
    let totalAmount = 0;
    
    invoiceData.tasks.forEach((task: any) => {
      // Check if we need a new page
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = margin + 10;
      }
      
      // Calculate row values
      const amount = task.hours * task.hourlyRate;
      totalAmount += amount;
      
      // Draw alternating row background
      if (invoiceData.tasks.indexOf(task) % 2 === 0) {
        doc.setFillColor(247, 247, 247);
        doc.rect(margin, yPos - 5, contentWidth, 8, 'F');
      }
      
      // Draw row content
      xPos = margin;
      doc.setFontSize(9);
      
      // Description (with word wrap if needed)
      const descriptionWidth = columnWidths[0] - 4;
      const descriptionLines = doc.splitTextToSize(task.description, descriptionWidth);
      doc.text(descriptionLines, xPos + 2, yPos);
      
      // Hours
      xPos += columnWidths[0];
      doc.text(task.hours.toString(), xPos + 2, yPos);
      
      // Rate
      xPos += columnWidths[1];
      doc.text(`$${task.hourlyRate.toFixed(2)}`, xPos + 2, yPos);
      
      // Amount
      xPos += columnWidths[2];
      doc.text(`$${amount.toFixed(2)}`, xPos + 2, yPos);
      
      yPos += 10;
    });
    
    // Totals Section - Aligned to right
    yPos += 10;
    const totalsWidth = columnWidths[2] + columnWidths[3];
    const totalsX = pageWidth - margin - totalsWidth;
    
    // Draw totals box with subtle styling
    doc.setFillColor(250, 250, 250);
    doc.rect(totalsX, yPos - 5, totalsWidth, 35, 'F');
    doc.setDrawColor(...primaryColor);
    doc.rect(totalsX, yPos - 5, totalsWidth, 35, 'S');
    
    // Subtotal
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text('Subtotal:', totalsX + 5, yPos);
    doc.text(`$${invoiceData.subtotal.toFixed(2)}`, totalsX + totalsWidth - 25, yPos);
    
    // Tax
    yPos += 10;
    doc.text(`Tax (${invoiceData.tax}%):`, totalsX + 5, yPos);
    const taxAmount = (invoiceData.subtotal * invoiceData.tax / 100);
    doc.text(`$${taxAmount.toFixed(2)}`, totalsX + totalsWidth - 25, yPos);
    
    // Total
    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('Total:', totalsX + 5, yPos);
    doc.text(`$${invoiceData.total.toFixed(2)}`, totalsX + totalsWidth - 25, yPos);
    
    // Payment Instructions - Full width at bottom
    if (userData.paymentInstructions) {
      yPos += 30;
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text('Payment Instructions', margin, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      const instructionLines = doc.splitTextToSize(userData.paymentInstructions, contentWidth);
      doc.text(instructionLines, margin, yPos);
    }
    
    // Add footer with page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...secondaryColor);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    console.log('[Debug] PDF generated successfully with jsPDF');
    return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    console.error('[Error] Failed to generate PDF with jsPDF:', error);
    throw error;
  }
}

const handler = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    // Log request details
    console.log('[Debug] PDF route called:', {
      invoiceId: params.id,
      url: request.url,
      method: request.method
    });

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/, '');
    
    if (!token) {
      console.error('[Error] No authorization token provided');
      return new Response(
        JSON.stringify({ error: 'No authorization token provided' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Get invoice data with auth
    console.log('[Debug] Fetching invoice data');
    const invoiceData = await getInvoiceData(params.id, token);
    if (!invoiceData) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Get user data with auth
    console.log('[Debug] Fetching user data');
    const userData = await getUserData(invoiceData.userId, token);
    if (!userData) {
      return new Response(
        JSON.stringify({ error: 'User data not found' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Generate PDF
    console.log('[Debug] Generating PDF for invoice:', params.id);
    const pdfBuffer = generatePDF(invoiceData, userData);
    console.log('[Debug] PDF generated successfully, size:', pdfBuffer.length);
    
    // Return PDF file with proper headers
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceData.number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('[Error] Failed to generate PDF:', error);
    
    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: `Failed to generate PDF: ${errorMessage}` }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};

export { handler as GET }; 