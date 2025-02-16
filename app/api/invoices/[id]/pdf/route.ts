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
    const borderColor: [number, number, number] = [230, 230, 230]; // #e6e6e6
    
    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    const columnWidth = contentWidth / 2;
    
    let yPos = margin;
    
    // Add decorative header line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, 15, pageWidth - margin, 15);
    
    // Add logo if available
    if (userData.logoUrl) {
      try {
        doc.addImage(userData.logoUrl, 'PNG', margin, yPos, 40, 20, undefined, 'FAST');
        yPos += 25;
      } catch (error) {
        console.error('[Error] Failed to add logo:', error);
        yPos += 5;
      }
    }

    // Header with two columns
    // Left column - Business Information
    let leftYPos = yPos + 10; // Add padding after header line
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    if (userData.businessName) {
      doc.text(userData.businessName, margin, leftYPos);
      leftYPos += 12;
    }
    
    // Business Details with icons or bullet points
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    if (userData.address) {
      doc.setTextColor(...secondaryColor);
      doc.text('ADDRESS', margin, leftYPos);
      leftYPos += 5;
      doc.setTextColor(...textColor);
      const addressLines = doc.splitTextToSize(userData.address, columnWidth - 10);
      addressLines.forEach((line: string) => {
        doc.text(line.trim(), margin, leftYPos);
        leftYPos += 5;
      });
      leftYPos += 3;
    }
    
    if (userData.email) {
      doc.setTextColor(...secondaryColor);
      doc.text('EMAIL', margin, leftYPos);
      leftYPos += 5;
      doc.setTextColor(...textColor);
      doc.text(userData.email, margin, leftYPos);
      leftYPos += 8;
    }
    
    if (userData.phone) {
      doc.setTextColor(...secondaryColor);
      doc.text('PHONE', margin, leftYPos);
      leftYPos += 5;
      doc.setTextColor(...textColor);
      doc.text(userData.phone, margin, leftYPos);
      leftYPos += 8;
    }
    
    // Right column with invoice details
    let rightYPos = yPos + 10;
    const rightColumnX = margin + columnWidth + 10;
    
    // Large "INVOICE" text with background
    doc.setFillColor(...primaryColor);
    doc.rect(rightColumnX - 5, rightYPos - 8, 80, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('INVOICE', rightColumnX, rightYPos);
    rightYPos += 20;
    
    // Invoice number with larger, bold styling
    doc.setTextColor(...primaryColor);
    doc.setFontSize(24);
    doc.text(`#${invoiceData.number}`, rightColumnX, rightYPos);
    rightYPos += 25;
    
    // Client Information in a box
    doc.setDrawColor(...borderColor);
    doc.setFillColor(250, 250, 250);
    doc.rect(rightColumnX - 5, rightYPos - 5, columnWidth - 15, 40, 'F');
    doc.rect(rightColumnX - 5, rightYPos - 5, columnWidth - 15, 40, 'S');
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.text('BILL TO', rightColumnX, rightYPos + 5);
    
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.text(invoiceData.client.name, rightColumnX, rightYPos + 15);
    if (invoiceData.client.email) {
      doc.setFontSize(10);
      doc.setTextColor(...secondaryColor);
      doc.text(invoiceData.client.email, rightColumnX, rightYPos + 25);
    }
    rightYPos += 50;
    
    // Dates section with better formatting
    doc.setFillColor(250, 250, 250);
    doc.rect(rightColumnX - 5, rightYPos - 5, columnWidth - 15, 35, 'F');
    
    // Issue Date
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(9);
    doc.text('ISSUE DATE', rightColumnX, rightYPos + 5);
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.text(new Date(invoiceData.date).toLocaleDateString(), rightColumnX + 70, rightYPos + 5);
    
    // Due Date
    if (invoiceData.dueDate) {
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(9);
      doc.text('DUE DATE', rightColumnX, rightYPos + 20);
      doc.setTextColor(...textColor);
      doc.setFontSize(10);
      doc.text(new Date(invoiceData.dueDate).toLocaleDateString(), rightColumnX + 70, rightYPos + 20);
    }
    rightYPos += 45;
    
    // Set yPos to the lower of the two columns
    yPos = Math.max(leftYPos, rightYPos) + 10;
    
    // Tasks Table with enhanced styling
    // Table Headers with gradient-like effect
    const columns = ['Description', 'Hours', 'Rate', 'Amount'];
    const columnWidths = [contentWidth * 0.5, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.2];
    
    // Draw table header with gradient effect
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos - 5, contentWidth, 12, 'F');
    
    // Header text
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    let xPos = margin;
    columns.forEach((column, index) => {
      doc.text(column.toUpperCase(), xPos + 5, yPos + 2);
      xPos += columnWidths[index];
    });
    
    // Table Content with improved styling
    yPos += 15;
    doc.setTextColor(...textColor);
    let totalAmount = 0;
    
    // Add subtle table border
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.1);
    doc.rect(margin, yPos - 8, contentWidth, 0.1, 'S');
    
    invoiceData.tasks.forEach((task: any, index: number) => {
      // Check for page break
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = margin + 20;
        
        // Repeat header on new page
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPos - 5, contentWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        let headerX = margin;
        columns.forEach((column, i) => {
          doc.text(column.toUpperCase(), headerX + 5, yPos + 2);
          headerX += columnWidths[i];
        });
        yPos += 15;
      }
      
      // Calculate row values
      const amount = task.hours * task.hourlyRate;
      totalAmount += amount;
      
      // Alternating row backgrounds
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 5, contentWidth, 10, 'F');
      }
      
      // Draw row content
      xPos = margin;
      doc.setFontSize(9);
      doc.setTextColor(...textColor);
      
      // Description with word wrap
      const descriptionWidth = columnWidths[0] - 10;
      const descriptionLines = doc.splitTextToSize(task.description, descriptionWidth);
      doc.text(descriptionLines, xPos + 5, yPos);
      
      // Hours (right-aligned)
      xPos += columnWidths[0];
      doc.text(task.hours.toString(), xPos + columnWidths[1] - 5, yPos, { align: 'right' });
      
      // Rate (right-aligned with currency)
      xPos += columnWidths[1];
      doc.text(`$${task.hourlyRate.toFixed(2)}`, xPos + columnWidths[2] - 5, yPos, { align: 'right' });
      
      // Amount (right-aligned with currency)
      xPos += columnWidths[2];
      doc.text(`$${amount.toFixed(2)}`, xPos + columnWidths[3] - 5, yPos, { align: 'right' });
      
      // Add subtle row border
      doc.setDrawColor(...borderColor);
      yPos += 10;
      doc.line(margin, yPos - 2, margin + contentWidth, yPos - 2);
    });
    
    // Totals Section with enhanced styling
    yPos += 15;
    const totalsWidth = columnWidths[2] + columnWidths[3];
    const totalsX = pageWidth - margin - totalsWidth;
    
    // Draw totals box with subtle gradient
    doc.setFillColor(250, 250, 250);
    doc.rect(totalsX - 5, yPos - 8, totalsWidth + 10, 50, 'F');
    doc.setDrawColor(...borderColor);
    doc.rect(totalsX - 5, yPos - 8, totalsWidth + 10, 50, 'S');
    
    // Subtotal
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.text('SUBTOTAL', totalsX, yPos);
    doc.setTextColor(...textColor);
    doc.text(`$${invoiceData.subtotal.toFixed(2)}`, totalsX + totalsWidth, yPos, { align: 'right' });
    
    // Tax
    yPos += 12;
    doc.setTextColor(...secondaryColor);
    doc.text(`TAX (${invoiceData.tax}%)`, totalsX, yPos);
    doc.setTextColor(...textColor);
    const taxAmount = (invoiceData.subtotal * invoiceData.tax / 100);
    doc.text(`$${taxAmount.toFixed(2)}`, totalsX + totalsWidth, yPos, { align: 'right' });
    
    // Total with highlighted background
    yPos += 15;
    doc.setFillColor(...primaryColor);
    doc.rect(totalsX - 5, yPos - 5, totalsWidth + 10, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text('TOTAL', totalsX, yPos + 4);
    doc.text(`$${invoiceData.total.toFixed(2)}`, totalsX + totalsWidth, yPos + 4, { align: 'right' });
    
    // Payment Instructions with styled box
    if (userData.paymentInstructions) {
      yPos += 40;
      
      // Add payment instructions box
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(...borderColor);
      doc.rect(margin, yPos - 5, contentWidth, 40, 'F');
      doc.rect(margin, yPos - 5, contentWidth, 40, 'S');
      
      // Payment Instructions header
      doc.setTextColor(...primaryColor);
      doc.setFontSize(11);
      doc.text('PAYMENT INSTRUCTIONS', margin + 5, yPos + 5);
      
      // Instructions content
      doc.setFontSize(9);
      doc.setTextColor(...textColor);
      const instructionLines = doc.splitTextToSize(userData.paymentInstructions, contentWidth - 15);
      doc.text(instructionLines, margin + 5, yPos + 15);
    }
    
    // Add footer with page numbers and border
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Add footer border
      doc.setDrawColor(...borderColor);
      doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
      
      // Add page numbers
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