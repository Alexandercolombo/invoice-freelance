import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { queryConvex } from '@/lib/server-convex';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Debug] Invoice data route called:', {
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
      requestUserId: userId 
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
    console.log('[Debug] User data found');

    return NextResponse.json({ invoice, user });
  } catch (error) {
    console.error('[Error] Invoice data route error:', {
      error,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
      params: params
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 