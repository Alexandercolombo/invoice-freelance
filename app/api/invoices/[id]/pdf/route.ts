/**
 * @fileoverview This is a server-only route handler for PDF generation.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateInvoiceHtml } from '@/lib/pdf/server-pdf-utils.server';
import chromium from 'chrome-aws-lambda';

// Explicitly set runtime and dynamic configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to query Convex
async function queryConvex(token: string, functionPath: string, args: any) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
  }

  const response = await fetch(`${convexUrl}/api/${functionPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(args),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Convex query failed: ${await response.text()}`);
  }

  return response.json();
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  let browser;
  try {
    console.log('[Debug] PDF generation route called:', {
      invoiceId: params.id,
      url: request.url,
      runtime: process.env.NEXT_RUNTIME
    });

    // Get the auth session
    const authRequest = await auth();
    const { userId } = authRequest;
    if (!userId) {
      console.log('[Debug] Unauthorized - No userId found');
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { 
        status: 401
      });
    }

    // Get the Convex token
    const token = await authRequest.getToken({ template: 'convex' });
    if (!token) {
      console.error('[Error] Failed to get Convex token');
      return NextResponse.json({
        error: 'Authentication Error',
        message: 'Failed to get authentication token'
      }, { 
        status: 500
      });
    }

    console.log('[Debug] Fetching data:', { userId, hasToken: !!token });

    const invoiceId = params.id;
    
    // Get invoice data with no-cache option
    console.log('[Debug] Fetching invoice data');
    const invoice = await queryConvex(token, 'invoices/get', { id: invoiceId });
    if (!invoice) {
      console.log('[Debug] Invoice not found:', { invoiceId });
      return NextResponse.json({
        error: 'Not Found',
        message: 'Invoice not found'
      }, { 
        status: 404
      });
    }

    if (invoice.userId !== userId) {
      console.log('[Debug] Unauthorized access:', { invoiceUserId: invoice.userId, requestUserId: userId });
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'You do not have permission to access this invoice'
      }, { 
        status: 401
      });
    }

    // Get user data with no-cache option
    console.log('[Debug] Fetching user data');
    const user = await queryConvex(token, 'users/get', {});
    if (!user) {
      console.error('[Error] User not found:', { userId });
      return NextResponse.json({
        error: 'Not Found',
        message: 'User data not found'
      }, { 
        status: 404
      });
    }

    // Validate required data
    if (!invoice || !user) {
      throw new Error('Missing required invoice or user data');
    }

    if (!Array.isArray(invoice.tasks) || invoice.tasks.length === 0) {
      throw new Error('Invoice has no tasks');
    }

    // Launch browser with chrome-aws-lambda
    console.log('[Debug] Launching browser');
    browser = await chromium.puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,
    });
    console.log('[Debug] Browser launched successfully');

    const page = await browser.newPage();
    console.log('[Debug] New page created');

    // Generate HTML using the server-only utility
    const html = generateInvoiceHtml(invoice, user);

    console.log('[Debug] Setting page content');
    await page.setContent(html, { 
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000
    });
    console.log('[Debug] Page content set successfully');

    console.log('[Debug] Generating PDF');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      timeout: 30000
    });
    console.log('[Debug] PDF generated successfully');

    // Close the browser before sending the response
    if (browser) {
      await browser.close();
      console.log('[Debug] Browser closed successfully');
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.number || 'unknown'}.pdf"`,
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('[Error] PDF generation error:', {
      error,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
      runtime: process.env.NEXT_RUNTIME
    });
    
    // Ensure browser is closed in case of error
    if (browser) {
      try {
        await browser.close();
        console.log('[Debug] Browser closed after error');
      } catch (closeError) {
        console.error('[Error] Failed to close browser:', closeError);
      }
    }

    return NextResponse.json({
      error: 'PDF Generation Failed',
      message: (error as Error)?.message || 'An error occurred while generating the PDF',
      details: 'Please try again or contact support if the issue persists'
    }, {
      status: 500
    });
  }
} 