export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { queryConvex } from '@/lib/server-convex';
import { formatCurrency } from '@/lib/shared-utils';
import { generatePDF } from '@/lib/pdf-generator.server';

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
      return new NextResponse('Unauthorized', { status: 401 });
    }
    console.log('[Debug] User authenticated:', { userId });

    const token = await authRequest.getToken({ template: 'convex' });
    if (!token) {
      console.error('[Error] Failed to get Convex token');
      return new NextResponse('Failed to get auth token', { status: 500 });
    }
    console.log('[Debug] Got Convex token');

    const invoiceId = params.id;
    if (!invoiceId) {
      console.log('[Debug] No invoice ID provided');
      return new NextResponse('Invoice ID is required', { status: 400 });
    }

    console.log('[Debug] Fetching invoice:', { invoiceId });
    const invoice = await queryConvex(token, 'invoices/get', { id: invoiceId });
    if (!invoice) {
      console.log('[Debug] Invoice not found:', { invoiceId });
      return new NextResponse('Invoice not found', { status: 404 });
    }
    console.log('[Debug] Invoice found:', { 
      invoiceId, 
      invoiceUserId: invoice.userId,
      requestUserId: userId,
      hasInvoiceNumber: !!invoice.invoiceNumber,
      hasTasks: Array.isArray(invoice.tasks),
      tasksCount: Array.isArray(invoice.tasks) ? invoice.tasks.length : 0
    });

    if (invoice.userId !== userId) {
      console.log('[Debug] Invoice ownership mismatch:', {
        invoiceUserId: invoice.userId,
        requestUserId: userId
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('[Debug] Fetching user data:', { userId });
    const user = await queryConvex(token, 'users/get', { id: userId });
    if (!user) {
      console.error('[Error] User not found:', { userId });
      return new NextResponse('User not found', { status: 404 });
    }
    console.log('[Debug] User data found:', {
      hasBusinessName: !!user.businessName,
      hasEmail: !!user.email
    });

    console.log('[Debug] Generating PDF');
    const pdfBuffer = await generatePDF({ invoice, user, formatCurrency });
    console.log('[Debug] PDF generated successfully');

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber || 'unknown'}.pdf"`,
      'Cache-Control': 'no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return new NextResponse(pdfBuffer, { headers });
  } catch (error) {
    console.error('[Error] PDF generation error:', {
      error,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
      params: params
    });
    
    return new NextResponse(JSON.stringify({ 
      error: 'PDF Generation Failed',
      message: (error as Error)?.message,
      details: 'An error occurred while generating the PDF. Please try again.'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 