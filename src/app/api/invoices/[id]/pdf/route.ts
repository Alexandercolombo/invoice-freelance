import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { Id } from "convex/_generated/dataModel";
import { clerkClient, auth } from "@clerk/nextjs";

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: Id<"invoices"> } }
) {
  let doc: jsPDF | null = null;

  try {
    console.log('Starting PDF generation process...');

    // Get auth from Clerk
    const { userId } = auth();
    if (!userId) {
      console.log('No user found in session');
      return new NextResponse("Unauthorized - No user found", { status: 401 });
    }

    // Get the user from Clerk
    const user = await clerkClient.users.getUser(userId);
    if (!user) {
      console.log('User not found in Clerk');
      return new NextResponse("Unauthorized - User not found", { status: 401 });
    }

    // Get a Convex token using the session token from the request
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        console.log('No authorization header found');
        return new NextResponse("Unauthorized - No token", { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      console.log('Setting up Convex client with token...');
      client.setAuth(token);
    } catch (error) {
      console.error('Error setting up Convex client:', error);
      return new NextResponse("Unauthorized - Token error", { status: 401 });
    }

    console.log('Fetching invoice data...');
    // Fetch data
    const invoice = await client.query(api.invoices.getInvoice, { 
      id: params.id as Id<"invoices">
    });
    
    if (!invoice) {
      console.log('Invoice not found:', params.id);
      return new NextResponse("Invoice not found", { status: 404 });
    }

    console.log('Fetching user data...');
    const convexUser = await client.query(api.users.get);
    if (!convexUser) {
      console.log('User not found:', userId);
      return new NextResponse("User not found", { status: 404 });
    }

    console.log('Initializing PDF document...');
    try {
      // Initialize PDF with specific settings
      doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        putOnlyUsedFonts: true
      });

      console.log('Adding content to PDF...');
      // Add content with error checking
      try {
        doc.setFontSize(20);
        doc.text("INVOICE", 40, 40);
      } catch (error) {
        console.error('Error adding invoice title:', error);
        throw error;
      }

      try {
        doc.setFontSize(16);
        doc.text(`#${invoice.number}`, 40, 70);
      } catch (error) {
        console.error('Error adding invoice number:', error);
        throw error;
      }

      try {
        doc.setFontSize(12);
        doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 40, 100);
        doc.text(`Total: ${formatCurrency(invoice.total)}`, 40, 130);
      } catch (error) {
        console.error('Error adding date and total:', error);
        throw error;
      }

      console.log('Generating PDF output...');
      // Generate PDF with error checking
      let pdfOutput: string | ArrayBuffer;
      try {
        pdfOutput = doc.output('arraybuffer');
      } catch (error) {
        console.error('Error generating PDF output:', error);
        throw error;
      }

      console.log('Creating response...');
      return new NextResponse(pdfOutput, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.number}.pdf"`,
          'Content-Length': pdfOutput.byteLength.toString(),
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      return new NextResponse(
        `PDF Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse(
      `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  } finally {
    // Clean up
    if (doc) {
      try {
        // @ts-ignore - Internal cleanup
        doc.internal.events = null;
        // @ts-ignore - Internal cleanup
        doc.internal = null;
        doc = null;
      } catch (error) {
        console.error('Error cleaning up PDF document:', error);
      }
    }
  }
} 