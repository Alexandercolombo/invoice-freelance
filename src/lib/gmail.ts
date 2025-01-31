import { google } from 'googleapis';

// Gmail OAuth2 configuration
export const gmailOAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
);

// Scopes required for sending emails
export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// Function to generate OAuth URL
export const getGmailAuthUrl = () => {
  return gmailOAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent'
  });
};

// Function to create email message
export const createEmailMessage = ({ to, subject, body, attachmentUrl }: {
  to: string;
  subject: string;
  body: string;
  attachmentUrl?: string;
}) => {
  const message = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
    attachmentUrl ? `<p>View Invoice: <a href="${attachmentUrl}">Download PDF</a></p>` : ''
  ].join('\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Function to send email using Gmail API
export const sendGmailEmail = async (auth: any, emailData: {
  to: string;
  subject: string;
  body: string;
  attachmentUrl?: string;
}) => {
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = createEmailMessage(emailData);

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}; 