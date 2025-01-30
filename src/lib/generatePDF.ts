import { formatCurrency } from "./utils";
import { Task } from "@/types";
import type { jsPDF } from "jspdf";

// Ensure this module is treated as server-side only
export const dynamic = 'force-dynamic';

interface PDFTask {
  description: string;
  hours: number;
}

interface PDFClient {
  name: string;
  email: string;
  hourlyRate: number;
}

interface PDFUser {
  businessName: string;
  email: string;
  address?: string;
  paymentInstructions: string;
}

interface PDFInvoice {
  number: string;
  date: string;
  dueDate?: string;
  notes?: string;
  total: number;
}

// Helper functions for PDF styling
function drawLine(doc: jsPDF, startX: number, startY: number, endX: number, endY: number, color: string = "#E2E8F0") {
  try {
    doc.setDrawColor(color);
    doc.setLineWidth(0.1);
    doc.line(startX, startY, endX, endY);
  } catch (error) {
    console.error('Error drawing line:', { startX, startY, endX, endY, error });
    throw error;
  }
}

function drawRect(doc: jsPDF, x: number, y: number, width: number, height: number, color: string = "#F8FAFC") {
  try {
    doc.setFillColor(color);
    doc.roundedRect(x, y, width, height, 2, 2, "F");
  } catch (error) {
    console.error('Error drawing rectangle:', { x, y, width, height, error });
    throw error;
  }
}

function setTextStyle(doc: jsPDF, size: number, color: string = "#1F2937", isBold: boolean = false) {
  try {
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
  } catch (error) {
    console.error('Error setting text style:', { size, color, isBold, error });
    throw error;
  }
}

export async function generateInvoicePDF(
  invoice: any,
  userData: any,
  client: any,
  tasks: Task[]
): Promise<Buffer> {
  // Validate input data
  if (!invoice) throw new Error('Invoice data is required');
  if (!userData) throw new Error('User data is required');
  if (!client) throw new Error('Client data is required');
  if (!Array.isArray(tasks)) throw new Error('Tasks must be an array');

  try {
    console.log('Starting PDF generation with:', {
      invoiceNumber: invoice.number,
      businessName: userData.businessName,
      clientName: client.name,
      tasksCount: tasks.length
    });

    // Dynamically import jsPDF only when needed
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });

    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;
    const lineHeight = 7;

    // Helper function to write text safely with proper styling
    const writeText = (text: string, x: number, yPos: number, options: any = {}) => {
      try {
        const { 
          fontSize = 10,
          color = "#1F2937",
          align = 'left',
          isBold = false,
          maxWidth
        } = options;
        
        setTextStyle(doc, fontSize, color, isBold);
        
        const processedText = String(text || '');
        if (maxWidth) {
          doc.text(processedText, x, yPos, { align, maxWidth });
        } else {
          doc.text(processedText, x, yPos, { align });
        }
        
        return yPos + lineHeight;
      } catch (error) {
        console.error('Error writing text:', { text, x, yPos, options, error });
        throw error;
      }
    };

    // Add header with company info
    console.log('Adding company header');
    y = writeText(userData?.businessName || 'Your Company', margin, y, { 
      fontSize: 24, 
      color: '#1E40AF',
      isBold: true 
    });
    y += lineHeight / 2;

    if (userData?.address) {
      y = writeText(userData.address, margin, y, { color: '#4B5563' });
    }
    y = writeText(userData?.email || '', margin, y, { color: '#4B5563' });
    y += lineHeight * 2;

    // Add invoice details in a box
    console.log('Adding invoice details');
    drawRect(doc, margin, y, contentWidth, lineHeight * 4, '#F3F4F6');
    y += lineHeight;
    
    // Invoice number and date on the same line
    writeText(`Invoice #${invoice.number}`, margin + 5, y, { 
      fontSize: 14,
      isBold: true
    });
    writeText(`Date: ${new Date(invoice.date).toLocaleDateString()}`, pageWidth - margin - 50, y, { 
      fontSize: 12,
      align: 'right' 
    });
    y += lineHeight;

    if (invoice.dueDate) {
      writeText(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, pageWidth - margin - 50, y, { 
        fontSize: 12,
        align: 'right',
        color: '#DC2626'
      });
    }
    y += lineHeight * 2;

    // Add client info in a subtle box
    drawRect(doc, margin, y, contentWidth / 2 - 5, lineHeight * 5, '#F9FAFB');
    y += lineHeight;
    writeText('Bill To:', margin + 5, y, { fontSize: 12, isBold: true });
    y += lineHeight;
    writeText(client.name || '', margin + 5, y, { fontSize: 11 });
    y += lineHeight;
    if (client.email) {
      writeText(client.email, margin + 5, y, { fontSize: 11, color: '#4B5563' });
      y += lineHeight;
    }
    if (client.address) {
      writeText(client.address, margin + 5, y, { fontSize: 11, color: '#4B5563' });
      y += lineHeight;
    }
    y += lineHeight * 1.5;

    // Add tasks table with styling
    const colWidths = [
      contentWidth * 0.45, // Description
      contentWidth * 0.15, // Hours
      contentWidth * 0.2,  // Rate
      contentWidth * 0.2   // Total
    ];
    
    // Table header background
    drawRect(doc, margin, y - 2, contentWidth, lineHeight + 4, '#F3F4F6');
    
    // Table headers
    const tableHeaders = ['Description', 'Hours', 'Rate', 'Total'];
    tableHeaders.forEach((header, i) => {
      let x = margin;
      if (i > 0) x += colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      writeText(header, x + 2, y, { fontSize: 11, isBold: true });
    });
    y += lineHeight * 1.5;

    // Table content with alternating backgrounds
    tasks.forEach((task, index) => {
      if (!task) return;

      // Alternate row backgrounds
      if (index % 2 === 0) {
        drawRect(doc, margin, y - 2, contentWidth, lineHeight + 4, '#F9FAFB');
      }

      let x = margin;
      
      // Description (with word wrap if needed)
      writeText(String(task.description || ''), x + 2, y, { 
        fontSize: 10,
        maxWidth: colWidths[0] - 4
      });
      x += colWidths[0];
      
      // Hours
      writeText(String(task.hours || '0'), x + 2, y, { 
        fontSize: 10,
        align: 'right',
        maxWidth: colWidths[1] - 4
      });
      x += colWidths[1];
      
      // Rate
      writeText(formatCurrency(task.hourlyRate || 0), x + 2, y, { 
        fontSize: 10,
        align: 'right',
        maxWidth: colWidths[2] - 4
      });
      x += colWidths[2];
      
      // Total
      const total = (task.hours || 0) * (task.hourlyRate || 0);
      writeText(formatCurrency(total), x + 2, y, { 
        fontSize: 10,
        align: 'right',
        maxWidth: colWidths[3] - 4
      });
      
      y += lineHeight * 1.2;
    });

    y += lineHeight;

    // Add totals section with styling
    const totalsWidth = colWidths[2] + colWidths[3];
    const totalsX = pageWidth - margin - totalsWidth;
    
    // Subtotal
    drawLine(doc, totalsX, y - 2, pageWidth - margin, y - 2);
    y += lineHeight;
    writeText('Subtotal:', totalsX, y, { fontSize: 11, isBold: true });
    writeText(formatCurrency(invoice.subtotal || 0), pageWidth - margin - 2, y, { 
      fontSize: 11,
      align: 'right'
    });
    y += lineHeight;
    
    // Tax if applicable
    if (invoice.tax) {
      writeText(`Tax (${invoice.tax}%):`, totalsX, y, { fontSize: 11, isBold: true });
      writeText(
        formatCurrency((invoice.subtotal || 0) * (invoice.tax / 100)),
        pageWidth - margin - 2,
        y,
        { fontSize: 11, align: 'right' }
      );
      y += lineHeight;
    }
    
    // Total Due with emphasis
    drawRect(doc, totalsX - 2, y - 2, totalsWidth + 4, lineHeight + 4, '#EEF2FF');
    writeText('Total Due:', totalsX, y, { 
      fontSize: 12,
      isBold: true,
      color: '#1E40AF'
    });
    writeText(formatCurrency(invoice.total || 0), pageWidth - margin - 2, y, { 
      fontSize: 12,
      isBold: true,
      align: 'right',
      color: '#1E40AF'
    });
    y += lineHeight * 2;

    // Add payment instructions if available
    if (userData?.paymentInstructions) {
      drawRect(doc, margin, y, contentWidth, lineHeight * 4, '#F9FAFB');
      y += lineHeight;
      writeText('Payment Instructions:', margin + 5, y, { 
        fontSize: 11,
        isBold: true
      });
      y += lineHeight;
      writeText(userData.paymentInstructions, margin + 5, y, { 
        fontSize: 10,
        color: '#4B5563',
        maxWidth: contentWidth - 10
      });
      y += lineHeight * 2;
    }

    // Add notes if available
    if (invoice.notes) {
      y += lineHeight;
      writeText('Notes:', margin, y, { 
        fontSize: 11,
        isBold: true
      });
      y += lineHeight;
      writeText(invoice.notes, margin, y, { 
        fontSize: 10,
        color: '#4B5563',
        maxWidth: contentWidth
      });
    }

    console.log('Generating final PDF buffer');
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  } catch (error) {
    console.error('PDF generation failed:', {
      error,
      invoice: {
        number: invoice?.number,
        date: invoice?.date,
        total: invoice?.total
      },
      userData: {
        businessName: userData?.businessName,
        email: userData?.email
      },
      client: {
        name: client?.name,
        email: client?.email
      },
      tasksCount: tasks?.length
    });

    // Throw a more detailed error
    throw new Error(`Failed to generate PDF: ${(error as Error).message}. Context: Invoice #${invoice?.number}`);
  }
} 