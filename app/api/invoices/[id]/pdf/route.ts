import { NextResponse, NextRequest } from 'next/server';
import { generateInvoiceHtml } from '@/lib/pdf/server-pdf-utils.server';
import puppeteer from 'puppeteer-core';
import chrome from '@sparticuz/chromium';
import { ConvexClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { getAuth } from '@clerk/nextjs/server';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

async function getInvoiceData(id: string, request: NextRequest) {
  try {
    // Get the user's session from Clerk
    const { userId, getToken } = getAuth(request);
    if (!userId) {
      throw new Error('You must be logged in to perform this action');
    }

    // Get the Convex auth token
    const token = await getToken({ template: 'convex' });
    if (!token) {
      throw new Error('Failed to get authentication token');
    }

    // Create a new Convex client instance for this request
    const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await convex.setAuth(() => Promise.resolve(token));

    try {
      // Convert string ID to Convex ID
      const invoiceId = Id.fromString(id) as Id<"invoices">;
      
      // Get invoice data from Convex
      const invoice = await convex.query(api.invoices.getInvoice, { 
        id: invoiceId
      });

      if (!invoice) {
        throw new Error(`Invoice not found with ID: ${id}`);
      }

      return invoice;
    } catch (err) {
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

async function getUserData(userId: string, request: NextRequest) {
  try {
    // Get the user's session from Clerk
    const { getToken } = getAuth(request);
    const token = await getToken({ template: 'convex' });
    if (!token) {
      throw new Error('Failed to get authentication token');
    }

    // Create a new Convex client instance for this request
    const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await convex.setAuth(() => Promise.resolve(token));

    // Get user profile from Convex
    const user = await convex.query(api.users.get, {});
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }

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

async function generatePDF(html: string): Promise<Buffer> {
  console.log('[Debug] Starting PDF generation');
  
  const browser = await puppeteer.launch({
    args: [...chrome.args, '--hide-scrollbars', '--disable-web-security'],
    defaultViewport: chrome.defaultViewport,
    executablePath: await chrome.executablePath(),
    headless: true
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'load', 'domcontentloaded']
    });
    
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
    
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function GET(
  request: NextRequest,
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

    // Get invoice data with auth
    const invoiceData = await getInvoiceData(params.id, request);

    // Get user data with auth
    const userData = await getUserData(invoiceData.userId, request);

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
    
    // Return appropriate error response
    if (err instanceof Error) {
      if (err.message.includes('Invoice not found')) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      if (err.message.includes('User not found')) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      if (err.message.includes('must be logged in')) {
        return NextResponse.json({ error: err.message }, { status: 401 });
      }
      if (err.message.includes('Failed to get authentication token')) {
        return NextResponse.json({ error: err.message }, { status: 401 });
      }
    }
    
    return NextResponse.json({ 
      error: 'PDF generation failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });
  }
} 