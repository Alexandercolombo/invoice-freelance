/**
 * @fileoverview This is a server-only route handler for PDF generation.
 */

import { NextResponse } from 'next/server';

// Explicitly set runtime and dynamic configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Debug] Minimal PDF route called:', {
      invoiceId: params.id,
      url: request.url,
      runtime: process.env.NEXT_RUNTIME,
      method: request.method,
      nextRuntime: process.env.NEXT_RUNTIME,
      nodeVersion: process.version,
      env: process.env.NODE_ENV
    });
    
    return NextResponse.json({ 
      message: 'Hello PDF minimal route',
      params: params,
      runtime: process.env.NEXT_RUNTIME,
      nextRuntime: process.env.NEXT_RUNTIME,
      nodeVersion: process.version,
      env: process.env.NODE_ENV
    });
  } catch (err) {
    console.error('[Error] Minimal route error:', {
      error: err,
      message: (err as Error)?.message,
      stack: (err as Error)?.stack,
      runtime: process.env.NEXT_RUNTIME
    });
    
    return NextResponse.json({ 
      error: (err as Error).message,
      stack: (err as Error).stack,
      runtime: process.env.NEXT_RUNTIME
    }, { 
      status: 500 
    });
  }
} 