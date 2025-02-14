// Force Node.js runtime and disable response caching
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const maxDuration = 60;

import { NextResponse, NextRequest } from 'next/server';
import { generateInvoiceHtml } from '@/lib/pdf/server-pdf-utils.server';
import puppeteer from 'puppeteer-core';
import chrome from '@sparticuz/chromium';
import { ConvexClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';

// Initialize Chrome with specific configuration for serverless
const getChrome = async () => {
  const executablePath = await chrome.executablePath();
  
  if (!executablePath) {
    throw new Error("Chrome executable path not found");
  }

  return await puppeteer.launch({
    args: [
      ...chrome.args,
      '--hide-scrollbars',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ],
    defaultViewport: {
      width: 1200,
      height: 1553 // A4 size at 96 DPI
    },
    executablePath,
    headless: true,
    ignoreHTTPSErrors: true
  });
};

async function getInvoiceData(id: string, token: string) {
  try {
    console.log('[Debug] Getting invoice data with token:', { id, hasToken: !!token });
    
    // Create a new Convex client instance for this request
    const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await convex.setAuth(() => Promise.resolve(token));

    try {
      // Get invoice data from Convex
      const invoice = await convex.query(api.invoices.getInvoice, { 
        id: id as unknown as Id<"invoices">
      });

      if (!invoice) {
        throw new Error(`Invoice not found with ID: ${id}`);
      }

      // Log invoice data for debugging
      console.log('[Debug] Invoice data:', {
        invoice: {
          id: invoice._id,
          userId: invoice.userId,
          number: invoice.number
        }
      });

      return invoice;
    } catch (err) {
      console.error('[Error] Failed to query invoice:', err);
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

async function getUserData(userId: string, token: string) {
  try {
    console.log('[Debug] Getting user data with token:', { userId, hasToken: !!token });
    
    // Create a new Convex client instance for this request
    const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await convex.setAuth(() => Promise.resolve(token));

    // Get user profile from Convex
    const user = await convex.query(api.users.get, {});
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }

    // Log user data for debugging
    console.log('[Debug] User data:', {
      user: {
        id: user._id,
        businessName: user.businessName
      }
    });

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
  let browser;
  
  try {
    browser = await getChrome();
    console.log('[Debug] Chrome launched successfully');
    
    const page = await browser.newPage();
    console.log('[Debug] New page created');
    
    await page.setContent(html, { 
      waitUntil: ['domcontentloaded', 'networkidle0']
    });
    console.log('[Debug] HTML content set');
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      preferCSSPageSize: true
    });
    
    console.log('[Debug] PDF generated successfully');
    return Buffer.from(pdf);
  } catch (error) {
    console.error('[Error] Failed to generate PDF:', error);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('[Debug] Browser closed successfully');
      } catch (error) {
        console.error('[Error] Failed to close browser:', error);
      }
    }
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

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/, '');
    
    if (!token) {
      console.error('[Error] No authorization token provided');
      return NextResponse.json(
        { error: 'No authorization token provided' },
        { status: 401 }
      );
    }

    // Get invoice data with auth
    console.log('[Debug] Fetching invoice data');
    const invoiceData = await getInvoiceData(params.id, token);

    // Get user data with auth
    console.log('[Debug] Fetching user data');
    const userData = await getUserData(invoiceData.userId, token);

    // Generate HTML and PDF
    console.log('[Debug] Generating PDF for invoice:', params.id);
    const html = generateInvoiceHtml(invoiceData, userData);
    console.log('[Debug] HTML generated, creating PDF');
    const pdfBuffer = await generatePDF(html);
    console.log('[Debug] PDF generated successfully');
    
    // Return PDF file
    return new NextResponse(pdfBuffer, {
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
      if (err.message.includes('Invalid invoice ID')) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.message.includes('Chrome executable path not found')) {
        return NextResponse.json({ 
          error: 'PDF generation failed',
          details: 'Chrome initialization failed'
        }, { status: 500 });
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