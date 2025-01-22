import { jsPDF } from "jspdf";
import { formatCurrency } from "./utils";
import { Id } from "convex/_generated/dataModel";

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
  doc.setDrawColor(color);
  doc.setLineWidth(0.1);
  doc.line(startX, startY, endX, endY);
}

function drawRect(doc: jsPDF, x: number, y: number, width: number, height: number, color: string = "#F8FAFC") {
  doc.setFillColor(color);
  doc.roundedRect(x, y, width, height, 2, 2, "F");
}

function setTextStyle(doc: jsPDF, size: number, color: string, isBold: boolean = false) {
  doc.setFontSize(size);
  doc.setTextColor(color);
}

export async function generateInvoicePDF(
  invoiceData: any,
  userData: any,
  clientData: any,
  tasksData: any[]
): Promise<Blob> {
  // Validate required data
  if (!invoiceData?.number) throw new Error("Invoice number is required");
  if (!userData?.businessName) throw new Error("Business name is required");
  if (!clientData?.name) throw new Error("Client name is required");
  if (!Array.isArray(tasksData)) throw new Error("Tasks must be an array");

  // Extract only the fields we need
  const invoice: PDFInvoice = {
    number: invoiceData.number,
    date: invoiceData.date || new Date().toISOString(),
    dueDate: invoiceData.dueDate,
    notes: invoiceData.notes,
    total: invoiceData.total || 0,
  };

  const user: PDFUser = {
    businessName: userData.businessName,
    email: userData.email || '',
    address: userData.address,
    paymentInstructions: userData.paymentInstructions || 'Payment details not provided',
  };

  const client: PDFClient = {
    name: clientData.name,
    email: clientData.email || '',
    hourlyRate: clientData.hourlyRate || 0,
  };

  const tasks: PDFTask[] = tasksData.map(task => ({
    description: task.description || 'No description provided',
    hours: task.hours || 0,
  }));

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });

    // Set default font to ensure consistent rendering
    doc.setFont("helvetica");

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    let y = 25;

    // Header
    drawRect(doc, 0, 0, pageWidth, 35, "#F8FAFC");
    drawLine(doc, 0, 35, pageWidth, 35, "#E2E8F0");
    
    // Business branding
    setTextStyle(doc, 20, "#1E293B");
    doc.text(user.businessName, margin, y);
    
    // Invoice details
    const rightCol = pageWidth - margin;
    setTextStyle(doc, 14, "#475569");
    doc.text("INVOICE", rightCol - 35, y);
    setTextStyle(doc, 12, "#64748B");
    doc.text(`#${invoice.number}`, rightCol - 35, y + 6);

    // Business details
    y += 25;
    setTextStyle(doc, 10, "#64748B");
    if (user.email) {
      doc.text(user.email, margin, y);
      y += 5;
    }
    if (user.address) {
      const addressLines = user.address.split('\n');
      addressLines.forEach((line) => {
        if (line.trim()) {
          doc.text(line.trim(), margin, y);
          y += 5;
        }
      });
    }

    // Client section
    const clientSectionY = Math.min(y, 80); // Prevent overflow
    const clientBoxWidth = 80;
    const clientBoxX = pageWidth - margin - clientBoxWidth;
    drawRect(doc, clientBoxX - 5, clientSectionY - 6, clientBoxWidth + 10, 35, "#F8FAFC");
    
    setTextStyle(doc, 11, "#475569");
    doc.text("BILL TO", clientBoxX, clientSectionY + 5);
    setTextStyle(doc, 12, "#1E293B");
    doc.text(client.name, clientBoxX, clientSectionY + 12);
    if (client.email) {
      setTextStyle(doc, 10, "#64748B");
      doc.text(client.email, clientBoxX, clientSectionY + 19);
    }

    // Dates section
    y = clientSectionY + 45;
    const dateGrid = {
      col1: margin,
      col2: margin + 35,
      col3: margin + 90,
      col4: margin + 125
    };

    setTextStyle(doc, 10, "#64748B");
    doc.text("Invoice Date:", dateGrid.col1, y);
    setTextStyle(doc, 10, "#1E293B");
    doc.text(new Date(invoice.date).toLocaleDateString(), dateGrid.col2, y);

    if (invoice.dueDate) {
      try {
        const formattedDueDate = new Date(invoice.dueDate).toLocaleDateString();
        setTextStyle(doc, 10, "#64748B");
        doc.text("Due Date:", dateGrid.col3, y);
        setTextStyle(doc, 10, "#1E293B");
        doc.text(formattedDueDate, dateGrid.col4, y);
      } catch (error) {
        console.error("Error formatting due date:", error);
      }
    }

    // Table header
    y += 15;
    drawRect(doc, margin - 5, y - 6, pageWidth - (2 * margin) + 10, 12, "#F1F5F9");
    
    const tableHeaders = ['Description', 'Hours', 'Rate', 'Amount'];
    const colWidths = [pageWidth - 160, 30, 45, 45];
    
    setTextStyle(doc, 11, "#475569");
    let x = margin;
    tableHeaders.forEach((header, i) => {
      const xPos = i === 0 ? x : x + colWidths[i];
      doc.text(header, xPos, y, { align: i === 0 ? 'left' : 'right' });
      x += colWidths[i];
    });

    // Table content
    y += 12;
    setTextStyle(doc, 10, "#334155");
    tasks.forEach((task, index) => {
      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin + 10;
      }

      if (index % 2 === 1) {
        drawRect(doc, margin - 5, y - 5, pageWidth - (2 * margin) + 10, 10, "#F8FAFC");
      }

      const amount = task.hours * client.hourlyRate;
      
      x = margin;
      // Ensure description fits
      const description = task.description.length > 50 
        ? task.description.substring(0, 47) + '...'
        : task.description;
      doc.text(description, x, y, { maxWidth: colWidths[0] - 5 });
      x += colWidths[0];
      
      ['hours', client.hourlyRate, amount].forEach((value, i) => {
        const text = i === 0 ? value.toString() : formatCurrency(value as number);
        doc.text(text, x + colWidths[i + 1], y, { align: 'right' });
        x += colWidths[i + 1];
      });
      
      y += 10;
    });

    // Total section
    y += 8;
    const totalWidth = 110;
    const totalX = pageWidth - margin - totalWidth;
    drawRect(doc, totalX, y - 6, totalWidth, 20, "#F1F5F9");
    
    setTextStyle(doc, 12, "#475569");
    doc.text("Total:", totalX + 10, y + 5);
    setTextStyle(doc, 14, "#1E293B");
    doc.text(formatCurrency(invoice.total), pageWidth - margin - 10, y + 5, { align: 'right' });

    // Payment instructions
    if (user.paymentInstructions) {
      y += 30;
      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin + 10;
      }
      drawRect(doc, margin - 5, y - 6, pageWidth - (2 * margin) + 10, 40, "#F0F9FF");
      
      setTextStyle(doc, 11, "#0369A1");
      doc.text("Payment Instructions", margin + 10, y + 5);
      
      setTextStyle(doc, 10, "#334155");
      doc.text(user.paymentInstructions, margin + 10, y + 15, { maxWidth: pageWidth - (2 * margin) - 20 });
    }

    // Notes section
    if (invoice.notes) {
      y += 50;
      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin + 10;
      }
      setTextStyle(doc, 11, "#475569");
      doc.text("Notes", margin, y);
      
      setTextStyle(doc, 10, "#334155");
      y += 8;
      doc.text(invoice.notes, margin, y, { maxWidth: pageWidth - (2 * margin) });
    }

    // Footer
    const footerY = pageHeight - 20;
    drawRect(doc, 0, footerY - 6, pageWidth, 26, "#F8FAFC");
    drawLine(doc, 0, footerY - 6, pageWidth, footerY - 6, "#E2E8F0");
    
    setTextStyle(doc, 10, "#64748B");
    doc.text("Thank you for your business", pageWidth / 2, footerY + 5, { align: 'center' });

    return new Blob([doc.output('blob')], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate PDF');
  }
} 