import { NextResponse } from 'next/server';
import { generateInvoiceHtml } from '@/lib/pdf/server-pdf-utils.server';
import puppeteer from 'puppeteer-core';
import chrome from '@sparticuz/chromium';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function getInvoiceData(id: string) {
  try {
    // Get invoice data from Convex
    const invoice = await convex.query(api.invoices.getById, { id });
    if (!invoice) return null;

    // Get tasks for this invoice
    const tasks = await convex.query(api.tasks.getByInvoiceId, { invoiceId: id });
    
    return {
      ...invoice,
      tasks: tasks || []
    };
  } catch (err) {
    console.error('[Error] Failed to fetch invoice data:', err);
    return null;
  }
}

async function getUserData(userId: string) {
  try {
    // Get user profile from Convex
    const profile = await convex.query(api.users.getProfile, { userId });
    if (!profile) return null;

    return {
      businessName: profile.businessName,
      email: profile.email,
      address: profile.address,
      phone: profile.phone,
      paymentInstructions: profile.paymentInstructions
    };
  } catch (err) {
    console.error('[Error] Failed to fetch user data:', err);
    return null;
  }
}

async function generatePDF(html: string): Promise<Buffer> {
  console.log('[Debug] Starting PDF generation');
  
  const browser = await puppeteer.launch({
    args: [...chrome.args, '--hide-scrollbars', '--disable-web-security'],
    defaultViewport: chrome.defaultViewport,
    executablePath: await chrome.executablePath(),
    headless: true,
    ignoreHTTPSErrors: true
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

    // Get invoice data
    const invoiceData = await getInvoiceData(params.id);
    if (!invoiceData) {
      console.error('[Error] Invoice not found:', params.id);
      return NextResponse.json({ 
        error: 'Invoice not found' 
      }, { 
        status: 404 
      });
    }

    // Get user data
    const userData = await getUserData(invoiceData.userId);
    if (!userData) {
      console.error('[Error] User data not found for invoice:', params.id);
      return NextResponse.json({ 
        error: 'User data not found' 
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