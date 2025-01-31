import { gmailOAuth2Client } from '@/lib/gmail';
import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return new NextResponse('No code provided', { status: 400 });
    }

    // Exchange code for tokens
    const { tokens } = await gmailOAuth2Client.getToken(code);
    const { refresh_token, access_token } = tokens;

    if (!refresh_token) {
      return new NextResponse('No refresh token received', { status: 400 });
    }

    // Store the refresh token in your database
    await db.mutation('users.updateGmailToken', {
      userId,
      refreshToken: refresh_token
    });

    // Redirect back to the invoices page with success message
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: '/dashboard/invoices?gmailConnected=true'
      }
    });
  } catch (error) {
    console.error('Google callback error:', error);
    return new NextResponse('Authentication failed', { status: 500 });
  }
} 