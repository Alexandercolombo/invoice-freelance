import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Debug] No Clerk auth, minimal route called:', {
      invoiceId: params.id,
      url: request.url,
      method: request.method,
      runtime: process.env.NEXT_RUNTIME,
      headers: Object.fromEntries(request.headers)
    });

    return NextResponse.json({
      message: 'Hello PDF minimal route, no Clerk',
      id: params.id,
      runtime: process.env.NEXT_RUNTIME
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    console.error('[Error] PDF route error:', err);
    return NextResponse.json({ 
      error: (err as Error).message,
      stack: (err as Error).stack
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
} 