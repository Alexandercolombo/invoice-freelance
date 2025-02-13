import { NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Log request details
    console.log('[Debug] PDF route called:', {
      invoiceId: params.id,
      url: request.url,
      method: request.method,
      runtime: process.env.NEXT_RUNTIME || 'nodejs',
      isEdge: process.env.NEXT_RUNTIME === 'edge',
      headers: {
        ...Object.fromEntries(request.headers),
        cookie: '(redacted)'
      }
    });

    // Basic response for now
    return NextResponse.json({
      message: 'PDF generation endpoint reached',
      id: params.id,
      runtime: process.env.NEXT_RUNTIME || 'nodejs',
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
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
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });
  }
} 