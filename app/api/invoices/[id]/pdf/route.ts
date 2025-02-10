/**
 * @fileoverview This is a server-only route handler for PDF generation.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { queryConvex } from '@/lib/server-convex';
import { generateInvoiceHtml } from '@/lib/pdf/server-pdf-utils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  let browser;
  try {
    console.log('[Debug] PDF generation route called:', {
      invoiceId: params.id,
      url: request.url
    });

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
    const invoice = await queryConvex(token, 'invoices/getInvoice', { id: invoiceId });
    if (!invoice) {
      return NextResponse.json({
        error: 'Not Found',
        message: 'Invoice not found'
      }, { 
        status: 404
      });
    }

    if (invoice.userId !== userId) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'You do not have permission to access this invoice'
      }, { 
        status: 401
      });
    }

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

    // Dynamically import puppeteer
    const puppeteer = await import('puppeteer');
    
    browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    console.log('[Debug] Browser launched successfully');

    const page = await browser.newPage();
    console.log('[Debug] New page created');

    // Generate HTML using the server-only utility
    const html = generateInvoiceHtml(invoice, user);

    console.log('[Debug] Setting page content');
    await page.setContent(html, { waitUntil: 'networkidle0' });
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
      }
    });
    console.log('[Debug] PDF generated successfully');

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
      stack: (error as Error)?.stack
    });
    
    return NextResponse.json({
      error: 'PDF Generation Failed',
      message: (error as Error)?.message || 'An error occurred while generating the PDF',
      details: 'Please try again or contact support if the issue persists'
    }, {
      status: 500
    });
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