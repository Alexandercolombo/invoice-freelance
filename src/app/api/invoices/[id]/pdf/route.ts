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
    const authRequest = await auth();
    const { userId } = authRequest;
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const token = await authRequest.getToken({ template: 'convex' });
    if (!token) {
      return new NextResponse('Failed to get auth token', { status: 500 });
    }

    const invoiceId = params.id;
    if (!invoiceId) {
      return new NextResponse('Invoice ID is required', { status: 400 });
    }

    const invoice = await queryConvex(token, 'invoices/get', { id: invoiceId });
    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    if (invoice.userId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await queryConvex(token, 'users/get', { id: userId });
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const pdfBuffer = await generatePDF({ invoice, user, formatCurrency });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 