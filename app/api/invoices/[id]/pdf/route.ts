import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Debug] PDF route called:', {
      invoiceId: params.id,
      url: request.url,
      method: request.method,
      runtime: process.env.NEXT_RUNTIME,
      headers: Object.fromEntries(request.headers)
    });

    // Try to get auth info from session cookie
    const sessionToken = request.headers.get('cookie')?.match(/__session=([^;]+)/)?.[1];
    
    if (!sessionToken) {
      console.log('[Debug] No session token found in cookies');
      return NextResponse.json({
        message: 'PDF generation started (public access)',
        id: params.id,
        runtime: process.env.NEXT_RUNTIME
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store'
        }
      });
    }

    // Log session token for debugging
    console.log('[Debug] Found session token:', {
      hasToken: !!sessionToken,
      tokenLength: sessionToken?.length
    });

    return NextResponse.json({
      message: 'PDF generation started (with session)',
      id: params.id,
      hasSession: true,
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