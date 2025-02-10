export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { queryConvex } from '@/lib/server-convex';
import { formatCurrency } from '@/lib/shared-utils';
import { generatePDF } from './lib/pdf-generator';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Debug] PDF generation route called:', {
      invoiceId: params.id,
      url: request.url
    });

    const authRequest = await auth();
    const { userId } = authRequest;
    if (!userId) {
      console.log('[Debug] Unauthorized - No userId found');
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = await authRequest.getToken({ template: 'convex' });
    if (!token) {
      console.error('[Error] Failed to get Convex token');
      return new NextResponse(JSON.stringify({
        error: 'Authentication Error',
        message: 'Failed to get authentication token'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[Debug] Fetching data:', { userId, hasToken: !!token });

    const invoiceId = params.id;
    const invoice = await queryConvex(token, 'invoices/getInvoice', { id: invoiceId });
    if (!invoice) {
      return new NextResponse(JSON.stringify({
        error: 'Not Found',
        message: 'Invoice not found'
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (invoice.userId !== userId) {
      return new NextResponse(JSON.stringify({
        error: 'Unauthorized',
        message: 'You do not have permission to access this invoice'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await queryConvex(token, 'users/get', {});
    if (!user) {
      console.error('[Error] User not found:', { userId });
      return new NextResponse(JSON.stringify({
        error: 'Not Found',
        message: 'User data not found'
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[Debug] Generating PDF with data:', {
      hasInvoice: !!invoice,
      hasUser: !!user,
      userId,
      userTokenIdentifier: user.tokenIdentifier
    });

    const pdfBuffer = await generatePDF({ invoice, user, formatCurrency });

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
    
    return new NextResponse(JSON.stringify({
      error: 'PDF Generation Failed',
      message: (error as Error)?.message || 'An error occurred while generating the PDF',
      details: 'Please try again or contact support if the issue persists'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 