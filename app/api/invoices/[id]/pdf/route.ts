/**
 * @fileoverview This is a server-only route handler for PDF generation.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[Debug] Minimal PDF route called:', {
      invoiceId: params.id,
      url: request.url,
      runtime: process.env.NEXT_RUNTIME
    });
    
    return NextResponse.json({ 
      message: 'Hello PDF minimal route',
      params: params,
      runtime: process.env.NEXT_RUNTIME
    });
  } catch (err) {
    console.error('[Error] Minimal route error:', err);
    return NextResponse.json({ 
      error: (err as Error).message,
      stack: (err as Error).stack
    }, { 
      status: 500 
    });
  }
} 