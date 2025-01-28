/** @jsxImportSource react */
'use server';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { renderToBuffer, PDFViewer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/utils';

// Register a default font
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxP.ttf' }
  ]
});

// Define styles for PDF
const styles = StyleSheet.create({
  page: { 
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: { 
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 20 
  },
  section: { 
    marginBottom: 10 
  },
  table: { 
    display: "flex" as const,
    width: "100%",
    marginBottom: 15 
  },
  row: { 
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    paddingVertical: 8 
  },
  cell: { 
    flex: 1,
    paddingHorizontal: 5 
  },
  totalRow: { 
    flexDirection: "row" as const,
    marginTop: 10,
    paddingTop: 10 
  }
});

interface PDFDocumentProps {
  invoice: {
    _id: string;
    number: string;
    date: string;
    client?: {
      _id: string;
      name: string;
      email?: string;
      hourlyRate?: number;
    };
    tasks?: Array<{
      _id: string;
      description?: string;
      hours?: number;
    }>;
    subtotal?: number;
    tax?: number;
    total?: number;
    taxRate?: number;
  };
  user?: {
    _id?: string;
    logoUrl?: string;
  };
}

// Server-side PDF component
function PDFDocument({ invoice, user }: PDFDocumentProps) {
  const safeInvoice = {
    ...invoice,
    number: invoice.number || 'NO-NUMBER',
    date: invoice.date || new Date().toISOString(),
    client: invoice.client || {
      _id: 'unknown',
      name: 'Unknown Client',
      email: '',
      hourlyRate: 0,
    },
    tasks: Array.isArray(invoice.tasks) ? invoice.tasks : [],
    subtotal: invoice.subtotal || 0,
    tax: invoice.tax || 0,
    total: invoice.total || 0,
    taxRate: invoice.taxRate || 0,
  };

  return createElement(Document, null,
    createElement(Page, { style: styles.page },
      createElement(View, { style: styles.header },
        createElement(View, null,
          createElement(Text, { style: { fontSize: 24 } }, `Invoice #${safeInvoice.number}`),
          createElement(Text, { style: { marginTop: 4 } }, new Date(safeInvoice.date).toLocaleDateString())
        )
      ),
      createElement(View, { style: styles.section },
        createElement(Text, null, "Bill To:"),
        createElement(Text, null, safeInvoice.client.name),
        safeInvoice.client.email && createElement(Text, null, safeInvoice.client.email)
      ),
      createElement(View, { style: styles.table },
        createElement(View, { style: styles.row },
          createElement(Text, { style: { ...styles.cell, flex: 3 } }, "Description"),
          createElement(Text, { style: styles.cell }, "Hours"),
          createElement(Text, { style: styles.cell }, "Rate"),
          createElement(Text, { style: styles.cell }, "Amount")
        ),
        ...safeInvoice.tasks.map(task =>
          createElement(View, { key: task._id, style: styles.row },
            createElement(Text, { style: { ...styles.cell, flex: 3 } }, task.description || 'No description'),
            createElement(Text, { style: styles.cell }, String(task.hours || 0)),
            createElement(Text, { style: styles.cell }, formatCurrency(safeInvoice.client.hourlyRate || 0)),
            createElement(Text, { style: styles.cell }, 
              formatCurrency((task.hours || 0) * (safeInvoice.client.hourlyRate || 0))
            )
          )
        )
      ),
      createElement(View, { style: styles.totalRow },
        createElement(Text, { style: { ...styles.cell, flex: 3 } }, "Subtotal:"),
        createElement(Text, { style: styles.cell }, formatCurrency(safeInvoice.subtotal))
      ),
      createElement(View, { style: styles.totalRow },
        createElement(Text, { style: { ...styles.cell, flex: 3 } }, `Tax (${safeInvoice.taxRate}%)`),
        createElement(Text, { style: styles.cell }, formatCurrency(safeInvoice.tax))
      ),
      createElement(View, { style: styles.totalRow },
        createElement(Text, { style: { ...styles.cell, flex: 3 } }, "Total Due:"),
        createElement(Text, { style: styles.cell }, formatCurrency(safeInvoice.total))
      )
    )
  );
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response | NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!params.id || typeof params.id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const invoiceId = params.id as Id<'invoices'>;
    
    const [invoice, userData] = await Promise.all([
      fetchQuery(api.invoices.getInvoice, { id: invoiceId }),
      fetchQuery(api.users.get, {})
    ]);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!userData) {
      return NextResponse.json({ error: 'User data not found' }, { status: 404 });
    }

    if (invoice.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to invoice' }, { status: 403 });
    }

    try {
      const pdfBuffer = await renderToBuffer(
        createElement(PDFDocument, { invoice, user: userData })
      );

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF is empty');
      }

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=invoice-${invoice.number}.pdf`,
          'Cache-Control': 'no-store'
        }
      });
    } catch (pdfError) {
      console.error('PDF rendering failed:', pdfError);
      return NextResponse.json(
        { error: 'Failed to render PDF: ' + (pdfError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF - ' + (error as Error).message },
      { status: 500 }
    );
  }
} 