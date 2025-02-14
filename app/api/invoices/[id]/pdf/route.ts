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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add business info
    if (userData.businessName) {
      doc.setFontSize(20);
      doc.text(userData.businessName, 20, 20);
    }
    
    // Add invoice number
    doc.setFontSize(16);
    doc.text(`Invoice #${invoiceData.number}`, 20, 40);
    
    // Add dates
    doc.setFontSize(12);
    doc.text(`Date: ${new Date(invoiceData.date).toLocaleDateString()}`, 20, 50);
    if (invoiceData.dueDate) {
      doc.text(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, 20, 60);
    }
    
    // Add business details
    doc.setFontSize(10);
    let yPos = 80;
    if (userData.address) {
      const addressLines = userData.address.split('\n');
      addressLines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 10;
      });
    }
    if (userData.email) {
      doc.text(`Email: ${userData.email}`, 20, yPos);
      yPos += 10;
    }
    if (userData.phone) {
      doc.text(`Phone: ${userData.phone}`, 20, yPos);
      yPos += 10;
    }
    
    // Add client info
    yPos += 10;
    doc.setFontSize(12);
    doc.text('Bill To:', 20, yPos);
    yPos += 10;
    doc.text(invoiceData.client.name, 20, yPos);
    yPos += 10;
    if (invoiceData.client.email) {
      doc.text(invoiceData.client.email, 20, yPos);
      yPos += 10;
    }
    
    // Add tasks table
    yPos += 20;
    const columns = ['Description', 'Hours', 'Rate', 'Amount'];
    const columnWidths = [100, 20, 30, 30];
    const startX = 20;
    let currentX = startX;
    
    // Table header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    columns.forEach((column, index) => {
      doc.text(column, currentX, yPos);
      currentX += columnWidths[index];
    });
    
    // Table content
    doc.setFont('helvetica', 'normal');
    invoiceData.tasks.forEach((task: any) => {
      yPos += 10;
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      currentX = startX;
      doc.text(task.description, currentX, yPos);
      currentX += columnWidths[0];
      doc.text(task.hours.toString(), currentX, yPos);
      currentX += columnWidths[1];
      doc.text(`$${task.hourlyRate}`, currentX, yPos);
      currentX += columnWidths[2];
      doc.text(`$${(task.hours * task.hourlyRate).toFixed(2)}`, currentX, yPos);
    });
    
    // Add totals
    yPos += 20;
    doc.text(`Subtotal: $${invoiceData.subtotal.toFixed(2)}`, pageWidth - 60, yPos);
    yPos += 10;
    doc.text(`Tax (${invoiceData.tax}%): $${(invoiceData.subtotal * invoiceData.tax / 100).toFixed(2)}`, pageWidth - 60, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: $${invoiceData.total.toFixed(2)}`, pageWidth - 60, yPos);
    
    // Add payment instructions
    if (userData.paymentInstructions) {
      yPos += 30;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Payment Instructions:', 20, yPos);
      yPos += 10;
      const instructionLines = userData.paymentInstructions.split('\n');
      instructionLines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
        yPos += 10;
      });
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