import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { Id } from "convex/_generated/dataModel";
import { auth } from "@clerk/nextjs";

// Force Node.js runtime as Edge might not fully support jsPDF
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: Id<"invoices"> } }
) {
  try {
    // Auth checks
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    client.setAuth(token);

    // Fetch data
    const invoice = await client.query(api.invoices.getInvoice, { 
      id: params.id as Id<"invoices">
    });
    
    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    const convexUser = await client.query(api.users.get);
    if (!convexUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    try {
      // Create a basic PDF first to test
      const doc = new jsPDF();
      
      // Add basic content
      doc.setFontSize(20);
      doc.text("INVOICE", 20, 20);
      doc.setFontSize(16);
      doc.text(`#${invoice.number}`, 20, 30);
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 20, 40);
      doc.text(`Total: ${formatCurrency(invoice.total)}`, 20, 50);
      
      // Get PDF as base64
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.number}.pdf"`,
          'Content-Length': pdfBuffer.length.toString()
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
  }
} 