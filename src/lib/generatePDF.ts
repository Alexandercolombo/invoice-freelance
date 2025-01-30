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

// Helper function to set text style
function setTextStyle(doc: jsPDF, fontSize: number, color: string, isBold: boolean = false) {
  doc.setFontSize(fontSize);
  doc.setTextColor(color);
  doc.setFont('helvetica', isBold ? 'bold' : 'normal');
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
    const margin = 20; // Slightly reduced margins
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

    // Header Section with improved spacing and alignment
    // Draw a subtle header background
    drawRect(doc, margin, y - 2, contentWidth, 15, '#F8FAFC', 4);
    
    // Company name with better positioning and emphasis
    writeText(userData?.businessName || '', margin + 2, y + 4, { 
      fontSize: 20, 
      color: '#1E3A8A',
      isBold: true 
    });

    // Invoice number and details with improved alignment
    writeText('INVOICE', pageWidth - margin - 40, y + 4, { 
      fontSize: 16,
      color: '#1E3A8A',
      isBold: true,
      align: 'right'
    });

    y += lineHeight + 2;
    writeText(`#${invoice.number}`, pageWidth - margin, y + 4, { 
      fontSize: 12,
      color: '#374151',
      align: 'right'
    });

    // Date information with consistent spacing
    y += lineHeight + 5;
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

    // Reset y position for address sections with more space
    y = margin + 25;

    // Draw a subtle container for both address sections
    drawRect(doc, margin, y, contentWidth, 40, '#F9FAFB', 4);

    // From section with improved spacing
    const leftColX = margin + 10;
    const rightColX = pageWidth / 2 + 5;

    writeText('FROM', leftColX, y + 6, { 
      fontSize: 10,
      color: '#6B7280',
      isBold: true
    });

    y += lineHeight * 1.5;
    if (userData?.address) {
      writeText(userData.address, leftColX, y + 6, { 
        color: '#374151',
        fontSize: 10,
        maxWidth: contentWidth / 2 - 20
      });
      y += lineHeight;
    }
    writeText(userData?.email || '', leftColX, y + 6, { 
      color: '#374151',
      fontSize: 10
    });

    // Bill To section with matching alignment
    let billToY = margin + 25;
    writeText('BILL TO', rightColX, billToY + 6, { 
      fontSize: 10,
      color: '#6B7280',
      isBold: true
    });

    billToY += lineHeight * 1.5;
    writeText(client.name || '', rightColX, billToY + 6, { 
      fontSize: 10,
      isBold: true,
      color: '#374151'
    });

    if (client.email) {
      billToY += lineHeight;
      writeText(client.email, rightColX, billToY + 6, { 
        fontSize: 10,
        color: '#374151'
      });
    }

    // Move to tasks section with proper spacing
    y = margin + 75;

    // Tasks section with improved table styling
    drawRect(doc, margin, y, contentWidth, lineHeight * 1.5, '#F8FAFC', 3);

    // Column definitions with better proportions
    const col1Width = contentWidth * 0.45; // Description
    const col2Width = contentWidth * 0.15; // Hours
    const col3Width = contentWidth * 0.20; // Rate
    const col4Width = contentWidth * 0.20; // Amount

    // Table header with consistent alignment
    writeText('Description', margin + 5, y + 5, {
      fontSize: 10,
      isBold: true,
      color: '#374151'
    });

    writeText('Hours', margin + col1Width + 15, y + 5, {
      fontSize: 10,
      isBold: true,
      color: '#374151',
      align: 'right'
    });

    writeText('Rate', margin + col1Width + col2Width + 15, y + 5, {
      fontSize: 10,
      isBold: true,
      color: '#374151',
      align: 'right'
    });

    writeText('Amount', pageWidth - margin - 5, y + 5, {
      fontSize: 10,
      isBold: true,
      color: '#374151',
      align: 'right'
    });

    y += lineHeight * 2;

    // Table content with improved row styling
    tasks.forEach((task, index) => {
      if (!task) return;

      // Alternating row backgrounds
      if (index % 2 === 0) {
        drawRect(doc, margin, y - 3, contentWidth, lineHeight * 1.4, '#F9FAFB', 0);
      }

      writeText(task.description || '', margin + 5, y, {
        fontSize: 10,
        color: '#374151',
        maxWidth: col1Width - 10
      });

      writeText(String(task.hours || '0'), margin + col1Width + 15, y, {
        fontSize: 10,
        color: '#374151',
        align: 'right'
      });

      writeText(formatCurrency(task.hourlyRate || 0), margin + col1Width + col2Width + 15, y, {
        fontSize: 10,
        color: '#374151',
        align: 'right'
      });

      const amount = (task.hours || 0) * (task.hourlyRate || 0);
      writeText(formatCurrency(amount), pageWidth - margin - 5, y, {
        fontSize: 10,
        color: '#374151',
        align: 'right'
      });

      y += lineHeight * 1.4;
    });

    // Totals section with enhanced styling
    y += lineHeight * 1.5;
    const totalsWidth = contentWidth * 0.35;
    const totalsX = pageWidth - margin - totalsWidth;

    // Draw container for totals
    drawRect(doc, totalsX - 5, y - 2, totalsWidth + 5, lineHeight * 4.5, '#F8FAFC', 3);

    // Subtotal
    writeText('Subtotal', totalsX + 5, y + 2, {
      fontSize: 10,
      color: '#6B7280'
    });
    writeText(formatCurrency(invoice.subtotal || 0), pageWidth - margin - 5, y + 2, {
      fontSize: 10,
      align: 'right',
      color: '#374151'
    });

    // Tax if applicable
    if (invoice.tax) {
      y += lineHeight * 1.2;
      writeText(`Tax (${invoice.tax}%)`, totalsX + 5, y + 2, {
        fontSize: 10,
        color: '#6B7280'
      });
      writeText(
        formatCurrency((invoice.subtotal || 0) * (invoice.tax / 100)),
        pageWidth - margin - 5,
        y + 2,
        {
          fontSize: 10,
          align: 'right',
          color: '#374151'
        }
      );
    }

    // Total Due with enhanced emphasis
    y += lineHeight * 1.5;
    writeText('Total Due', totalsX + 5, y + 2, {
      fontSize: 11,
      isBold: true,
      color: '#1E3A8A'
    });
    writeText(formatCurrency(invoice.total || 0), pageWidth - margin - 5, y + 2, {
      fontSize: 11,
      isBold: true,
      align: 'right',
      color: '#1E3A8A'
    });

    // Payment Instructions with improved styling
    if (userData?.paymentInstructions) {
      y += lineHeight * 4;
      drawRect(doc, margin, y, contentWidth, lineHeight * 4, '#F9FAFB', 3);
      y += lineHeight;
      writeText('PAYMENT INSTRUCTIONS', margin + 5, y, {
        fontSize: 9,
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