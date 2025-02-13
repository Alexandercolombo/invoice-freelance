import { NextResponse } from 'next/server';
import { generateInvoiceHtml } from '@/lib/pdf/server-pdf-utils.server';
import puppeteer from 'puppeteer-core';
import chrome from '@sparticuz/chromium';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

async function getInvoiceData(id: string) {
  // TODO: Replace with actual invoice data fetching
  return {
    number: id,
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    tasks: [
      {
        description: 'Test Task',
        hourlyRate: 100,
        hours: 2,
      }
    ],
    total: 200,
    notes: 'Test invoice for PDF generation'
  };
}

async function getUserData() {
  // TODO: Replace with actual user data fetching
  return {
    businessName: 'Test Business',
    email: 'test@example.com',
    address: '123 Test St',
    phone: '555-555-5555',
    paymentInstructions: 'Please pay within 30 days'
  };
}

async function generatePDF(html: string): Promise<Buffer> {
  console.log('[Debug] Starting PDF generation');
  
  const browser = await puppeteer.launch({
    args: chrome.args,
    defaultViewport: chrome.defaultViewport,
    executablePath: await chrome.executablePath(),
    headless: true,
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    return pdf;
  } finally {
    await browser.close();
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Log request details
    console.log('[Debug] PDF route called:', {
      invoiceId: params.id,
      url: request.url,
      method: request.method,
      runtime: process.env.NEXT_RUNTIME || 'nodejs'
    });

    // Get invoice and user data
    const [invoiceData, userData] = await Promise.all([
      getInvoiceData(params.id),
      getUserData()
    ]);

    if (!invoiceData) {
      console.error('[Error] Invoice not found:', params.id);
      return NextResponse.json({ 
        error: 'Invoice not found' 
      }, { 
        status: 404 
      });
    }

    // Generate HTML and PDF
    console.log('[Debug] Generating PDF for invoice:', params.id);
    const html = generateInvoiceHtml(invoiceData, userData);
    const pdfBuffer = await generatePDF(html);
    
    // Return PDF file
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${params.id}.pdf"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    console.error('[Error] PDF generation failed:', err);
    return NextResponse.json({ 
      error: 'PDF generation failed',
      details: (err as Error).message
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });
  }
} 