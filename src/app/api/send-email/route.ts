import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { gmailOAuth2Client, sendGmailEmail } from '@/lib/gmail';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { to, subject, body, pdfUrl } = await request.json();

    // Get user's Gmail refresh token from database
    const user = await db.query('users.getGmailToken', { userId });
    if (!user?.gmailRefreshToken) {
      return new NextResponse('Gmail not connected', { status: 400 });
    }

    // Set credentials using refresh token
    gmailOAuth2Client.setCredentials({
      refresh_token: user.gmailRefreshToken
    });

    // Send email
    await sendGmailEmail(gmailOAuth2Client, {
      to,
      subject,
      body,
      attachmentUrl: pdfUrl
    });

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Send email error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 