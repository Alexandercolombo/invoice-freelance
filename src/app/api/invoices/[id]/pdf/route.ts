export const runtime = 'nodejs';

import { NextRequest } from "next/server";
import { auth } from '@clerk/nextjs/server';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import puppeteer from 'puppeteer';
import { formatCurrency } from '@/lib/server-format-currency';

// Remove Edge runtime as it might be incompatible with Convex
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// Helper function to write text
async function writeText(doc: any, text: string, x: number, y: number, options: {
  fontSize?: number;
  color?: string;
  align?: 'left' | 'right' | 'center';
  maxWidth?: number;
  isBold?: boolean;
} = {}) {
  const { fontSize = 10, color = '#000000', align = 'left', maxWidth, isBold = false } = options;
  
  doc.setFontSize(fontSize);
  doc.setTextColor(color);
  doc.setFont('helvetica', isBold ? 'bold' : 'normal');
  
  if (align === 'right') {
    const textWidth = maxWidth || doc.getTextWidth(text);
    doc.text(text, x - textWidth, y);
  } else if (align === 'center') {
    const textWidth = maxWidth || doc.getTextWidth(text);
    doc.text(text, x - (textWidth / 2), y);
  } else {
    if (maxWidth) {
      doc.text(text, x, y, { maxWidth });
    } else {
      doc.text(text, x, y);
    }
  }
}

// Helper function to draw rectangles
function drawRect(doc: any, x: number, y: number, width: number, height: number, color: string = "#F8FAFC", radius: number = 2) {
  doc.setFillColor(color);
  doc.roundedRect(x, y, width, height, radius, radius, "F");
}

// Export GET as a named export for Next.js App Router
export async function GET(request: NextRequest) {
  try {
    // Authenticate via Clerk (or your auth handler)
    const authRequest = await auth();
    const { userId } = authRequest;
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Extract invoice ID from the URL
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const id = segments[segments.length - 2];
    if (!id) return new Response('Invalid invoice ID', { status: 400 });
    const invoiceId = id as unknown as Id<'invoices'>;

    // Initialize Convex client to fetch data
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
    }

    // Get Convex-specific JWT token from Clerk
    const token = await authRequest.getToken({ template: "convex" });
    if (!token) {
      throw new Error('Failed to get Convex auth token from Clerk');
    }

    // Create Convex client with the auth token
    const convexModule = await import('convex/browser');
    const { ConvexHttpClient } = convexModule;
    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(token);

    // Fetch invoice and user data via the client
    const invoiceData = await client.query(api.invoices.getInvoice, { id: invoiceId });
    const userData = await client.query(api.users.get, {});

    if (!invoiceData || !userData) {
      return new Response('Invoice or user data not found', { status: 404 });
    }

    // Ensure the invoice belongs to the authenticated user
    if (invoiceData.userId !== userId) {
      return new Response('Unauthorized access to invoice', { status: 403 });
    }

    // Use Puppeteer to generate the PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Render an HTML template for the invoice while preserving your design and styles
    const invoiceHTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Invoice #${invoiceData.number}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { font-size: 24px; margin-bottom: 10px; }
      p { font-size: 16px; margin: 5px 0; }
      /* Add additional custom styles here to match your invoice preview design */
    </style>
  </head>
  <body>
    <h1>Invoice #${invoiceData.number}</h1>
    <p>Date: ${invoiceData.date}</p>
    <p>Business: ${userData.businessName}</p>
    <p>Total: ${formatCurrency(invoiceData.total)}</p>
    <!-- Render additional invoice details, tasks, and formatting as needed -->
  </body>
</html>`;

    await page.setContent(invoiceHTML, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const filename = `invoice-${invoiceData.number}.pdf`;
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error in PDF generation route:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 