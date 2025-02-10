export const runtime = 'nodejs';

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
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return new NextResponse('Invalid token', { status: 401 });
    }

    const invoiceId = params.id;
    if (!invoiceId) {
      return new NextResponse('Invoice ID is required', { status: 400 });
    }

    const invoice = await queryConvex(token, 'invoices/get', { id: invoiceId });
    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    const user = await queryConvex(token, 'users/get', { id: invoice.userId });
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