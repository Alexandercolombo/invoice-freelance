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

    // Dynamically import jsPDF only when needed
    const { jsPDF } = await import('jspdf');
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true,
      floatPrecision: 16
    });

    // Test font availability
    try {
      doc.setFont('helvetica', 'normal');
    } catch (fontError) {
      console.error('Helvetica font not available, falling back to default font:', fontError);
    }

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;
    const lineHeight = 7;

    // Add a subtle background pattern
    drawRect(doc, 0, 0, pageWidth, pageHeight, '#FFFFFF');
    for (let i = 0; i < pageHeight; i += 20) {
      drawLine(doc, 0, i, pageWidth, i, '#F8FAFC', 0.05);
    }

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

    // Add decorative header bar
    drawRect(doc, 0, 0, pageWidth, 40, '#F3F4F6');
    drawLine(doc, 0, 40, pageWidth, 40, '#E5E7EB', 0.5);

    // Add company logo placeholder or styled business name
    y = 30;
    drawRect(doc, margin, y - 15, 40, 40, '#FFFFFF', 4);
    y = writeText(userData?.businessName || 'Your Company', margin + 50, y, { 
      fontSize: 28, 
      color: '#1E40AF',
      isBold: true 
    });

    // Add contact info
    y += lineHeight;
    if (userData?.address) {
      y = writeText(userData.address, margin + 50, y, { 
        color: '#4B5563',
        fontSize: 9
      });
    }
    y = writeText(userData?.email || '', margin + 50, y, { 
      color: '#4B5563',
      fontSize: 9
    });
    y += lineHeight * 3;

    // Add invoice details in a professional box
    drawRect(doc, margin, y, contentWidth, lineHeight * 5, '#F8FAFC', 4);
    drawLine(doc, margin, y, margin + contentWidth, y, '#E5E7EB', 0.5);
    y += lineHeight * 1.5;

    // Invoice number and date with better formatting
    writeText(`INVOICE`, margin + 5, y, { 
      fontSize: 12,
      color: '#6B7280'
    });
    writeText(`#${invoice.number}`, margin + 25, y, { 
      fontSize: 12,
      isBold: true,
      color: '#1E40AF'
    });
    
    // Date information
    writeText(`Date: ${new Date(invoice.date).toLocaleDateString()}`, pageWidth - margin - 50, y, { 
      fontSize: 10,
      align: 'right',
      color: '#6B7280'
    });
    y += lineHeight;

    if (invoice.dueDate) {
      writeText(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, pageWidth - margin - 50, y, { 
        fontSize: 10,
        align: 'right',
        color: '#DC2626'
      });
    }
    y += lineHeight * 3;

    // Add client info in an elegant box
    drawRect(doc, margin, y, contentWidth / 2 - 5, lineHeight * 6, '#F9FAFB', 4);
    y += lineHeight;
    writeText('BILL TO', margin + 5, y, { 
      fontSize: 10,
      color: '#6B7280'
    });
    y += lineHeight;
    writeText(client.name || '', margin + 5, y, { 
      fontSize: 12,
      isBold: true
    });
    y += lineHeight;
    if (client.email) {
      writeText(client.email, margin + 5, y, { 
        fontSize: 10,
        color: '#4B5563'
      });
      y += lineHeight;
    }
    if (client.address) {
      writeText(client.address, margin + 5, y, { 
        fontSize: 10,
        color: '#4B5563'
      });
      y += lineHeight;
    }
    y += lineHeight * 2;

    // Add tasks table with professional styling
    const colWidths = [
      contentWidth * 0.45, // Description
      contentWidth * 0.15, // Hours
      contentWidth * 0.2,  // Rate
      contentWidth * 0.2   // Total
    ];
    
    // Table header with gradient effect
    drawRect(doc, margin, y - 2, contentWidth, lineHeight + 4, '#F3F4F6', 2);
    drawLine(doc, margin, y + lineHeight + 2, margin + contentWidth, y + lineHeight + 2, '#E5E7EB', 0.5);
    
    // Table headers
    const tableHeaders = ['Description', 'Hours', 'Rate', 'Total'];
    tableHeaders.forEach((header, i) => {
      let x = margin;
      if (i > 0) x += colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      writeText(header, x + 2, y, { 
        fontSize: 10,
        isBold: true,
        color: '#6B7280'
      });
    });
    y += lineHeight * 1.5;

    // Table content with zebra striping
    tasks.forEach((task, index) => {
      if (!task) return;

      if (index % 2 === 0) {
        drawRect(doc, margin, y - 2, contentWidth, lineHeight + 4, '#F9FAFB', 0);
      }

      let x = margin;
      
      // Description with proper wrapping
      writeText(String(task.description || ''), x + 2, y, { 
        fontSize: 9,
        maxWidth: colWidths[0] - 4
      });
      x += colWidths[0];
      
      // Hours
      writeText(String(task.hours || '0'), x + 2, y, { 
        fontSize: 9,
        align: 'right',
        maxWidth: colWidths[1] - 4
      });
      x += colWidths[1];
      
      // Rate
      writeText(formatCurrency(task.hourlyRate || 0), x + 2, y, { 
        fontSize: 9,
        align: 'right',
        maxWidth: colWidths[2] - 4
      });
      x += colWidths[2];
      
      // Total
      const total = (task.hours || 0) * (task.hourlyRate || 0);
      writeText(formatCurrency(total), x + 2, y, { 
        fontSize: 9,
        align: 'right',
        maxWidth: colWidths[3] - 4
      });
      
      y += lineHeight * 1.2;
    });

    y += lineHeight;

    // Add totals section with elegant styling
    const totalsWidth = colWidths[2] + colWidths[3];
    const totalsX = pageWidth - margin - totalsWidth;
    
    // Subtotal with separator
    drawLine(doc, totalsX, y - 2, pageWidth - margin, y - 2, '#E5E7EB', 0.5);
    y += lineHeight;
    writeText('Subtotal', totalsX, y, { 
      fontSize: 10,
      color: '#6B7280'
    });
    writeText(formatCurrency(invoice.subtotal || 0), pageWidth - margin - 2, y, { 
      fontSize: 10,
      align: 'right',
      color: '#374151'
    });
    y += lineHeight;
    
    // Tax if applicable
    if (invoice.tax) {
      writeText(`Tax (${invoice.tax}%)`, totalsX, y, { 
        fontSize: 10,
        color: '#6B7280'
      });
      writeText(
        formatCurrency((invoice.subtotal || 0) * (invoice.tax / 100)),
        pageWidth - margin - 2,
        y,
        { 
          fontSize: 10,
          align: 'right',
          color: '#374151'
        }
      );
      y += lineHeight;
    }
    
    // Total Due with emphasis
    drawRect(doc, totalsX - 2, y - 2, totalsWidth + 4, lineHeight + 4, '#EEF2FF', 4);
    writeText('Total Due', totalsX, y, { 
      fontSize: 11,
      isBold: true,
      color: '#1E40AF'
    });
    writeText(formatCurrency(invoice.total || 0), pageWidth - margin - 2, y, { 
      fontSize: 11,
      isBold: true,
      align: 'right',
      color: '#1E40AF'
    });
    y += lineHeight * 3;

    // Add payment instructions in a professional box
    if (userData?.paymentInstructions) {
      drawRect(doc, margin, y, contentWidth, lineHeight * 5, '#F9FAFB', 4);
      y += lineHeight;
      writeText('PAYMENT INSTRUCTIONS', margin + 5, y, { 
        fontSize: 10,
        color: '#6B7280'
      });
      y += lineHeight;
      writeText(userData.paymentInstructions, margin + 5, y, { 
        fontSize: 9,
        color: '#4B5563',
        maxWidth: contentWidth - 10
      });
      y += lineHeight * 2;
    }

    // Add notes in a subtle box if available
    if (invoice.notes) {
      y += lineHeight;
      drawRect(doc, margin, y, contentWidth, lineHeight * 4, '#F9FAFB', 4);
      y += lineHeight;
      writeText('NOTES', margin + 5, y, { 
        fontSize: 10,
        color: '#6B7280'
      });
      y += lineHeight;
      writeText(invoice.notes, margin + 5, y, { 
        fontSize: 9,
        color: '#4B5563',
        maxWidth: contentWidth - 10
      });
    }

    // Add footer
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

    throw new Error(`Failed to generate PDF: ${(error as Error).message}. Context: Invoice #${invoice?.number}`);
  }
} 