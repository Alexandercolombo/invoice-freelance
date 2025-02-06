import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { queryConvex } from '@/lib/server-convex';

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

    return NextResponse.json({ invoice, user });
  } catch (error) {
    console.error('Error in invoice data route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 