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
function drawLine(doc: jsPDF, startX: number, startY: number, endX: number, endY: number, color: string = "#E2E8F0", width: number = 0.1) {
  try {
    doc.setDrawColor(color);
    doc.setLineWidth(width);
    doc.line(startX, startY, endX, endY);
  } catch (error) {
    console.error('Error drawing line:', { startX, startY, endX, endY, error });
    throw error;
  }
}

function drawRect(doc: jsPDF, x: number, y: number, width: number, height: number, color: string = "#F8FAFC", radius: number = 2) {
  try {
    doc.setFillColor(color);
    doc.roundedRect(x, y, width, height, radius, radius, "F");
  } catch (error) {
    console.error('Error drawing rectangle:', { x, y, width, height, error });
    throw error;
  }
}

function setTextStyle(doc: jsPDF, size: number, color: string = "#1F2937", isBold: boolean = false) {
  try {
    doc.setFontSize(size);
    doc.setTextColor(color);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
  } catch (error) {
    console.error('Error setting text style:', { size, color, isBold, error });
    try {
      doc.setFont('times', isBold ? 'bold' : 'normal');
    } catch (fallbackError) {
      console.error('Fallback font also failed:', fallbackError);
      throw error;
    }
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

    const { jsPDF } = await import('jspdf');
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true,
      floatPrecision: 16
    });

    try {
      doc.setFont('helvetica', 'normal');
    } catch (fontError) {
      console.error('Helvetica font not available, falling back to default font:', fontError);
    }

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 25; // Increased margin for better spacing
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;
    const lineHeight = 8; // Increased line height for better readability

    // Add a subtle gradient background
    const gradient = doc.setFillColor(249, 250, 251); // Very light gray
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

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
        
        const processedText = String(text || '').replace(/[\u0080-\uffff]/g, (ch) => {
          return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
        });

        if (maxWidth) {
          doc.text(processedText, x, yPos, { align, maxWidth });
        } else {
          doc.text(processedText, x, yPos, { align });
        }
        
        return yPos + lineHeight;
      } catch (error) {
        console.error('Error writing text:', { text, x, yPos, options, error });
        try {
          const fallbackText = String(text || '').replace(/[^\x00-\x7F]/g, '');
          doc.text(fallbackText, x, yPos, { align: 'left' });
          return yPos + lineHeight;
        } catch (fallbackError) {
          console.error('Fallback text also failed:', fallbackError);
          throw error;
        }
      }
    };

    // Add a professional header bar
    drawRect(doc, 0, 0, pageWidth, 50, '#FFFFFF');
    drawLine(doc, margin, 50, pageWidth - margin, 50, '#E5E7EB', 0.75);

    // Company Information Section
    y = 35;
    writeText(userData?.businessName || '', margin, y, { 
      fontSize: 24, 
      color: '#1E40AF',
      isBold: true 
    });

    y += lineHeight * 1.5;
    if (userData?.address) {
      y = writeText(userData.address, margin, y, { 
        color: '#4B5563',
        fontSize: 10
      });
    }
    y = writeText(userData?.email || '', margin, y, { 
      color: '#4B5563',
      fontSize: 10
    });

    // Invoice Details Box
    y += lineHeight * 2;
    drawRect(doc, margin, y, contentWidth, lineHeight * 4, '#F9FAFB', 6);
    y += lineHeight;

    // Invoice number and date in a clean layout
    const invoiceNumberX = margin + 10;
    writeText('INVOICE', invoiceNumberX, y, { 
      fontSize: 14,
      color: '#6B7280'
    });
    writeText(`#${invoice.number}`, invoiceNumberX + 45, y, { 
      fontSize: 14,
      isBold: true,
      color: '#1E40AF'
    });

    // Right-aligned dates
    const dateX = pageWidth - margin - 60;
    writeText(`Date: ${new Date(invoice.date).toLocaleDateString()}`, dateX, y, { 
      fontSize: 10,
      align: 'right',
      color: '#374151'
    });
    y += lineHeight;

    if (invoice.dueDate) {
      writeText(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, dateX, y, { 
        fontSize: 10,
        align: 'right',
        color: invoice.status === 'overdue' ? '#DC2626' : '#374151'
      });
    }

    // Bill To Section with improved spacing
    y += lineHeight * 3;
    drawRect(doc, margin, y, contentWidth, lineHeight * 5, '#FFFFFF', 6);
    drawLine(doc, margin, y, margin + contentWidth, y, '#E5E7EB', 0.5);
    y += lineHeight;

    writeText('BILL TO', margin + 10, y, { 
      fontSize: 12,
      color: '#6B7280',
      isBold: true
    });
    y += lineHeight * 1.2;

    writeText(client.name || '', margin + 10, y, { 
      fontSize: 12,
      isBold: true,
      color: '#111827'
    });
    y += lineHeight;

    if (client.email) {
      writeText(client.email, margin + 10, y, { 
        fontSize: 10,
        color: '#4B5563'
      });
      y += lineHeight;
    }

    // Tasks Table with improved styling
    y += lineHeight * 2;
    
    // Table Header
    drawRect(doc, margin, y, contentWidth, lineHeight * 1.5, '#F3F4F6', 4);
    y += lineHeight * 0.75;
    
    // Column headers with proper alignment
    const col1Width = contentWidth * 0.4; // Description
    const col2Width = contentWidth * 0.2; // Hours
    const col3Width = contentWidth * 0.2; // Rate
    const col4Width = contentWidth * 0.2; // Amount

    writeText('Description', margin + 5, y, {
      fontSize: 10,
      isBold: true,
      color: '#374151'
    });
    writeText('Hours', margin + col1Width + 5, y, {
      fontSize: 10,
      isBold: true,
      color: '#374151',
      align: 'right'
    });
    writeText('Rate', margin + col1Width + col2Width + 5, y, {
      fontSize: 10,
      isBold: true,
      color: '#374151',
      align: 'right'
    });
    writeText('Amount', margin + col1Width + col2Width + col3Width + 5, y, {
      fontSize: 10,
      isBold: true,
      color: '#374151',
      align: 'right'
    });

    y += lineHeight * 1.25;
    drawLine(doc, margin, y - lineHeight * 0.5, margin + contentWidth, y - lineHeight * 0.5, '#E5E7EB', 0.5);

    // Table Content with zebra striping
    tasks.forEach((task, index) => {
      if (!task) return;

      if (index % 2 === 0) {
        drawRect(doc, margin, y - lineHeight * 0.5, contentWidth, lineHeight * 1.5, '#F9FAFB', 0);
      }

      writeText(task.description || '', margin + 5, y, {
        fontSize: 9,
        color: '#111827',
        maxWidth: col1Width - 10
      });

      writeText(String(task.hours || '0'), margin + col1Width + col2Width - 5, y, {
        fontSize: 9,
        color: '#111827',
        align: 'right'
      });

      writeText(formatCurrency(task.hourlyRate || 0), margin + col1Width + col2Width + col3Width - 5, y, {
        fontSize: 9,
        color: '#111827',
        align: 'right'
      });

      const amount = (task.hours || 0) * (task.hourlyRate || 0);
      writeText(formatCurrency(amount), margin + contentWidth - 5, y, {
        fontSize: 9,
        color: '#111827',
        align: 'right'
      });

      y += lineHeight * 1.5;
    });

    // Totals section with clean styling
    y += lineHeight;
    const totalsWidth = (col3Width + col4Width) * 1.2;
    const totalsX = pageWidth - margin - totalsWidth;

    // Subtotal
    drawLine(doc, totalsX, y - 2, pageWidth - margin, y - 2, '#E5E7EB', 0.5);
    y += lineHeight;
    writeText('Subtotal', totalsX, y, {
      fontSize: 10,
      color: '#6B7280'
    });
    writeText(formatCurrency(invoice.subtotal || 0), pageWidth - margin - 5, y, {
      fontSize: 10,
      align: 'right',
      color: '#374151'
    });

    // Tax if applicable
    if (invoice.tax) {
      y += lineHeight;
      writeText(`Tax (${invoice.tax}%)`, totalsX, y, {
        fontSize: 10,
        color: '#6B7280'
      });
      writeText(
        formatCurrency((invoice.subtotal || 0) * (invoice.tax / 100)),
        pageWidth - margin - 5,
        y,
        {
          fontSize: 10,
          align: 'right',
          color: '#374151'
        }
      );
    }

    // Total Due with emphasis
    y += lineHeight * 1.5;
    drawRect(doc, totalsX - 5, y - lineHeight * 0.75, totalsWidth + 10, lineHeight * 2, '#EEF2FF', 4);
    writeText('Total Due', totalsX, y, {
      fontSize: 12,
      isBold: true,
      color: '#1E40AF'
    });
    writeText(formatCurrency(invoice.total || 0), pageWidth - margin - 5, y, {
      fontSize: 12,
      isBold: true,
      align: 'right',
      color: '#1E40AF'
    });

    // Payment Instructions
    if (userData?.paymentInstructions) {
      y += lineHeight * 3;
      drawRect(doc, margin, y, contentWidth, lineHeight * 4, '#F9FAFB', 4);
      y += lineHeight;
      writeText('PAYMENT INSTRUCTIONS', margin + 5, y, {
        fontSize: 10,
        color: '#6B7280',
        isBold: true
      });
      y += lineHeight;
      writeText(userData.paymentInstructions, margin + 5, y, {
        fontSize: 9,
        color: '#4B5563',
        maxWidth: contentWidth - 10
      });
    }

    // Footer
    const footerY = pageHeight - 15;
    drawLine(doc, margin, footerY - 5, pageWidth - margin, footerY - 5, '#E5E7EB', 0.5);
    writeText('Thank you for your business', margin, footerY, {
      fontSize: 8,
      color: '#9CA3AF'
    });
    writeText(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - margin, footerY, {
      fontSize: 8,
      align: 'right',
      color: '#9CA3AF'
    });

    console.log('Generating final PDF buffer');
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
} 