/** @jsxImportSource react */
'use server';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../../../../convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/utils';

// Define styles for PDF
const styles = StyleSheet.create({
  page: { padding: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  section: { marginBottom: 10 },
  table: { display: "flex", width: "100%", marginBottom: 15 },
  row: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 8 },
  cell: { flex: 1, paddingHorizontal: 5 },
  totalRow: { flexDirection: "row", marginTop: 10, paddingTop: 10 }
});

// Server-side PDF component
function PDFDocument({ invoice, user }: any) {
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Invoice #{safeInvoice.number}</Text>
            <Text style={{ marginTop: 4 }}>{new Date(safeInvoice.date).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text>Bill To:</Text>
          <Text>{safeInvoice.client.name}</Text>
          {safeInvoice.client.email && <Text>{safeInvoice.client.email}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.cell, { flex: 3 }]}>Description</Text>
            <Text style={styles.cell}>Hours</Text>
            <Text style={styles.cell}>Rate</Text>
            <Text style={styles.cell}>Amount</Text>
          </View>

          {safeInvoice.tasks.map((task: any) => (
            <View key={task._id} style={styles.row}>
              <Text style={[styles.cell, { flex: 3 }]}>{task.description || 'No description'}</Text>
              <Text style={styles.cell}>{task.hours || 0}</Text>
              <Text style={styles.cell}>{formatCurrency(safeInvoice.client.hourlyRate || 0)}</Text>
              <Text style={styles.cell}>
                {formatCurrency((task.hours || 0) * (safeInvoice.client.hourlyRate || 0))}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={[styles.cell, { flex: 3 }]}>Subtotal:</Text>
          <Text style={styles.cell}>{formatCurrency(safeInvoice.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.cell, { flex: 3 }]}>Tax ({safeInvoice.taxRate}%):</Text>
          <Text style={styles.cell}>{formatCurrency(safeInvoice.tax)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.cell, { flex: 3 }]}>Total Due:</Text>
          <Text style={styles.cell}>{formatCurrency(safeInvoice.total)}</Text>
        </View>
      </Page>
    </Document>
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