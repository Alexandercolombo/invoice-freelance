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
    const margin = 25;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;
    const lineHeight = 7;

    // Clean white background
    doc.setFillColor(255, 255, 255);
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

    // Header Section - Company Name and Invoice Title
    writeText(userData?.businessName || '', margin, y, { 
      fontSize: 24, 
      color: '#1E40AF',
      isBold: true 
    });

    // Invoice Details (Top Right)
    writeText('INVOICE', pageWidth - margin - 80, y, { 
      fontSize: 16,
      color: '#1E40AF',
      isBold: true,
      align: 'right'
    });

    y += lineHeight;
    writeText(`#${invoice.number}`, pageWidth - margin, y, { 
      fontSize: 12,
      color: '#374151',
      align: 'right'
    });

    y += lineHeight;
    writeText(`Date: ${new Date(invoice.date).toLocaleDateString()}`, pageWidth - margin, y, { 
      fontSize: 9,
      color: '#4B5563',
      align: 'right'
    });

    if (invoice.dueDate) {
      y += lineHeight;
      writeText(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, pageWidth - margin, y, { 
        fontSize: 9,
        color: invoice.status === 'overdue' ? '#DC2626' : '#4B5563',
        align: 'right'
      });
    }

    // Reset y position for address sections
    y = margin + lineHeight * 6;

    // Draw a subtle container for both address sections
    drawRect(doc, margin, y - lineHeight, contentWidth, lineHeight * 8, '#F9FAFB', 4);

    // Company Information (Left Column)
    const leftColX = margin + 15;
    const rightColX = pageWidth / 2 + 10;

    writeText('FROM', leftColX, y, { 
      fontSize: 10,
      color: '#6B7280',
      isBold: true
    });

    y += lineHeight * 1.5;
    if (userData?.address) {
      writeText(userData.address, leftColX, y, { 
        color: '#374151',
        fontSize: 10
      });
      y += lineHeight;
    }
    writeText(userData?.email || '', leftColX, y, { 
      color: '#374151',
      fontSize: 10
    });

    // Bill To Section (Right Column) - Aligned with From section
    let billToY = margin + lineHeight * 6; // Reset to same starting Y as From section
    writeText('BILL TO', rightColX, billToY, { 
      fontSize: 10,
      color: '#6B7280',
      isBold: true
    });

    billToY += lineHeight * 1.5;
    writeText(client.name || '', rightColX, billToY, { 
      fontSize: 10,
      isBold: true,
      color: '#374151'
    });

    if (client.email) {
      billToY += lineHeight;
      writeText(client.email, rightColX, billToY, { 
        fontSize: 10,
        color: '#374151'
      });
    }

    // Move to main content section - Tasks Table
    y = margin + lineHeight * 15; // Provide enough space after address sections

    // Subtle separator line
    drawLine(doc, margin, y - lineHeight, pageWidth - margin, y - lineHeight, '#E5E7EB', 0.5);

    // Tasks Table Header
    drawRect(doc, margin, y, contentWidth, lineHeight * 1.4, '#F8FAFC', 3);
    
    // Column definitions with better spacing
    const col1Width = contentWidth * 0.45; // Description
    const col2Width = contentWidth * 0.15; // Hours
    const col3Width = contentWidth * 0.20; // Rate
    const col4Width = contentWidth * 0.20; // Amount

    // Header text with better alignment
    writeText('Description', margin + 10, y + lineHeight, {
      fontSize: 10,
      isBold: true,
      color: '#374151'
    });
    writeText('Hours', margin + col1Width + col2Width - 20, y + lineHeight, {
      fontSize: 10,
      isBold: true,
      color: '#374151',
      align: 'right'
    });
    writeText('Rate', margin + col1Width + col2Width + col3Width - 20, y + lineHeight, {
      fontSize: 10,
      isBold: true,
      color: '#374151',
      align: 'right'
    });
    writeText('Amount', pageWidth - margin - 10, y + lineHeight, {
      fontSize: 10,
      isBold: true,
      color: '#374151',
      align: 'right'
    });

    y += lineHeight * 2;

    // Table Content with improved styling
    tasks.forEach((task, index) => {
      if (!task) return;

      // Subtle alternating background
      if (index % 2 === 0) {
        drawRect(doc, margin, y - lineHeight * 0.3, contentWidth, lineHeight * 1.4, '#F9FAFB', 0);
      }

      writeText(task.description || '', margin + 10, y, {
        fontSize: 10,
        color: '#374151',
        maxWidth: col1Width - 15
      });

      writeText(String(task.hours || '0'), margin + col1Width + col2Width - 20, y, {
        fontSize: 10,
        color: '#374151',
        align: 'right'
      });

      writeText(formatCurrency(task.hourlyRate || 0), margin + col1Width + col2Width + col3Width - 20, y, {
        fontSize: 10,
        color: '#374151',
        align: 'right'
      });

      const amount = (task.hours || 0) * (task.hourlyRate || 0);
      writeText(formatCurrency(amount), pageWidth - margin - 10, y, {
        fontSize: 10,
        color: '#374151',
        align: 'right'
      });

      y += lineHeight * 1.6;
    });

    // Totals section with improved layout
    y += lineHeight;
    const totalsWidth = contentWidth * 0.35;
    const totalsX = pageWidth - margin - totalsWidth;

    // Draw container for totals
    drawRect(doc, totalsX - 5, y - 2, totalsWidth + 5, lineHeight * 4, '#F8FAFC', 3);

    // Subtotal
    writeText('Subtotal', totalsX + 5, y, {
      fontSize: 10,
      color: '#6B7280'
    });
    writeText(formatCurrency(invoice.subtotal || 0), pageWidth - margin - 10, y, {
      fontSize: 10,
      align: 'right',
      color: '#374151'
    });

    // Tax if applicable
    if (invoice.tax) {
      y += lineHeight * 1.2;
      writeText(`Tax (${invoice.tax}%)`, totalsX + 5, y, {
        fontSize: 10,
        color: '#6B7280'
      });
      writeText(
        formatCurrency((invoice.subtotal || 0) * (invoice.tax / 100)),
        pageWidth - margin - 10,
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
    writeText('Total Due', totalsX + 5, y, {
      fontSize: 11,
      isBold: true,
      color: '#1E40AF'
    });
    writeText(formatCurrency(invoice.total || 0), pageWidth - margin - 10, y, {
      fontSize: 11,
      isBold: true,
      align: 'right',
      color: '#1E40AF'
    });

    // Payment Instructions in a clean container
    if (userData?.paymentInstructions) {
      y += lineHeight * 4;
      drawRect(doc, margin, y, contentWidth, lineHeight * 3, '#F9FAFB', 3);
      y += lineHeight;
      writeText('PAYMENT INSTRUCTIONS', margin + 10, y, {
        fontSize: 9,
        color: '#6B7280',
        isBold: true
      });
      y += lineHeight;
      writeText(userData.paymentInstructions, margin + 10, y, {
        fontSize: 9,
        color: '#4B5563',
        maxWidth: contentWidth - 20
      });
    }

    // Footer with subtle styling
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