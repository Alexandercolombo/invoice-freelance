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
  invoice: any,
  userData: any,
  client: any,
  tasks: Task[]
): Promise<Buffer> {
  // Dynamically import jsPDF only when needed
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    filters: ["PDFA"] // Add PDF/A compliance for server-side safety
  });

  const margin = 20;
  let y = margin;
  const lineHeight = 10;

  // Helper function to write text
  const writeText = (text: string, x: number, yPos: number, options: any = {}) => {
    const { fontSize = 12, align = 'left' } = options;
    doc.setFontSize(fontSize);
    doc.text(text, x, yPos, { align });
    return yPos + lineHeight;
  };

  // Add header with company info
  y = writeText(userData?.businessName || 'Your Company', margin, y, { fontSize: 24 });
  y = writeText(userData?.email || '', margin, y);
  if (userData?.address) {
    y = writeText(userData.address, margin, y);
  }
  y += lineHeight;

  // Add invoice details
  y = writeText(`Invoice #${invoice.number}`, margin, y, { fontSize: 18 });
  y = writeText(`Date: ${new Date(invoice.date).toLocaleDateString()}`, margin, y);
  if (invoice.dueDate) {
    y = writeText(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, margin, y);
  }
  y += lineHeight;

  // Add client info
  y = writeText('Bill To:', margin, y, { fontSize: 14 });
  y = writeText(client?.name || 'Unknown Client', margin, y);
  if (client?.email) {
    y = writeText(client.email, margin, y);
  }
  if (client?.address) {
    y = writeText(client.address, margin, y);
  }
  y += lineHeight;

  // Add table headers
  const colWidths = [80, 25, 30, 35];
  const startX = margin;
  const headers = ['Description', 'Hours', 'Rate', 'Amount'];
  
  headers.forEach((header, index) => {
    let x = startX;
    if (index > 0) {
      x += colWidths.slice(0, index).reduce((a, b) => a + b, 0);
    }
    y = writeText(header, x, y, { fontSize: 12 });
  });
  y += 5;

  // Add tasks
  if (Array.isArray(tasks)) {
    for (const task of tasks) {
      const amount = (task.hours || 0) * (client?.hourlyRate || 0);
      let x = startX;
      
      // Description
      y = writeText(task.description || 'No description', x, y);
      
      // Hours
      x += colWidths[0];
      y = writeText(String(task.hours || 0), x, y);
      
      // Rate
      x += colWidths[1];
      y = writeText(formatCurrency(client?.hourlyRate || 0), x, y);
      
      // Amount
      x += colWidths[2];
      y = writeText(formatCurrency(amount), x, y);
      
      y += 5;
    }
  }

  y += lineHeight;

  // Add totals
  const totalsX = startX + colWidths[0] + colWidths[1];
  y = writeText('Subtotal:', totalsX, y);
  y = writeText(formatCurrency(invoice.subtotal || 0), totalsX + colWidths[2], y);
  
  y = writeText(`Tax (${invoice.tax || 0}%):`, totalsX, y);
  y = writeText(formatCurrency(invoice.tax || 0), totalsX + colWidths[2], y);
  
  y = writeText('Total Due:', totalsX, y);
  y = writeText(formatCurrency(invoice.total || 0), totalsX + colWidths[2], y);

  // Add payment instructions
  if (userData?.paymentInstructions) {
    y += lineHeight * 2;
    y = writeText('Payment Instructions:', margin, y, { fontSize: 12 });
    y = writeText(userData.paymentInstructions, margin, y);
  }

  // Add notes if available
  if (invoice.notes) {
    y += lineHeight * 2;
    y = writeText('Notes:', margin, y, { fontSize: 12 });
    y = writeText(invoice.notes, margin, y);
  }

  // Convert to Buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
} 