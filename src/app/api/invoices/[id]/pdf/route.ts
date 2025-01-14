import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { Id } from "convex/_generated/dataModel";
import { auth } from "@clerk/nextjs";

export const runtime = 'nodejs';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: Id<"invoices"> } }
) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No auth token provided');
      return new NextResponse("Unauthorized - No token provided", { status: 401 });
    }

    // Get the current session
    const { userId } = auth();
    if (!userId) {
      console.error('No user ID found in session');
      return new NextResponse("Unauthorized - No user found", { status: 401 });
    }

    // Get the Convex token from the Authorization header
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('Invalid auth token format');
      return new NextResponse("Unauthorized - Invalid token", { status: 401 });
    }

    // Set up Convex client with auth token
    client.setAuth(token);

    // Fetch invoice data
    console.log('Fetching invoice:', params.id);
    const invoice = await client.query(api.invoices.getInvoice, { 
      id: params.id as Id<"invoices">
    });
    
    if (!invoice) {
      console.error('Invoice not found:', params.id);
      return new NextResponse("Invoice not found", { status: 404 });
    }

    // Get user data from Convex
    console.log('Fetching user data');
    const convexUser = await client.query(api.users.get);
    if (!convexUser) {
      console.error('User not found for ID:', userId);
      return new NextResponse("User not found", { status: 404 });
    }

    // Create PDF document with basic settings
    const doc = new jsPDF();
    
    try {
      // Basic header
      doc.setFontSize(20);
      doc.text(convexUser.businessName || 'Business Name', 20, 20);
      
      // Invoice number
      doc.setFontSize(16);
      doc.text(`Invoice #${invoice.number}`, 20, 30);
      
      // Date
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 20, 40);
      
      // Client info
      if (invoice.client?.name) {
        doc.text(`Bill To: ${invoice.client.name}`, 20, 60);
      }
      if (invoice.client?.email) {
        doc.text(invoice.client.email, 20, 70);
      }
      
      // Tasks
      let y = 90;
      doc.text('Description', 20, y);
      doc.text('Hours', 120, y);
      doc.text('Rate', 150, y);
      doc.text('Amount', 180, y);
      
      y += 10;
      const validTasks = (invoice.tasks || []).filter((task): task is NonNullable<typeof task> => task !== null);
      validTasks.forEach((task) => {
        const hourlyRate = invoice.client?.hourlyRate || 0;
        const amount = task.hours * hourlyRate;
        
        doc.text(task.description || '', 20, y);
        doc.text(task.hours.toString(), 120, y);
        doc.text(formatCurrency(hourlyRate), 150, y);
        doc.text(formatCurrency(amount), 180, y);
        
        y += 10;
      });
      
      // Total
      y += 10;
      doc.text(`Total: ${formatCurrency(invoice.total)}`, 150, y);
      
      // Generate PDF buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.number}.pdf"`,
        },
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      return new NextResponse(
        `Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new NextResponse(
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
} 