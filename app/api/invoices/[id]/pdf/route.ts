import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Debug] Minimal route called:', {
      invoiceId: params.id,
      url: request.url,
      runtime: process.env.NEXT_RUNTIME
    });
    return NextResponse.json({
      message: 'Hello PDF minimal route',
      id: params.id,
      runtime: process.env.NEXT_RUNTIME
    });
  } catch (err) {
    console.error('[Error] Minimal route error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
} 