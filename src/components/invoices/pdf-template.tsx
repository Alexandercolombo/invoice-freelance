import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/utils';

const styles = StyleSheet.create({
  page: { padding: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  section: { marginBottom: 10 },
  table: { display: "flex", width: "100%", marginBottom: 15 },
  row: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 8 },
  cell: { flex: 1, paddingHorizontal: 5 },
  totalRow: { flexDirection: "row", marginTop: 10, paddingTop: 10 }
});

// Update the invoice type to match Convex response
interface InvoicePDFProps {
  invoice: {
    _id: string;
    number: string;
    date: string;
    client?: {
      _id: string;
      name: string;
      email: string;
      hourlyRate?: number;
    };
    tasks: Array<{
      _id: string;
      description: string;
      hours: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    taxRate?: number;
  };
  user?: {
    _id?: string;
    logoUrl?: string;
  };
}

export default function InvoicePDF({ invoice, user }: InvoicePDFProps) {
  // Add fallback values for required fields
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
        {/* Mirror the preview layout */}
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Invoice #{safeInvoice.number}</Text>
            <Text style={{ marginTop: 4 }}>{new Date(safeInvoice.date).toLocaleDateString()}</Text>
          </View>
          
          {user?.logoUrl && (
            <Image src={user.logoUrl} style={{ width: 100, height: 100 }} />
          )}
        </View>

        {/* Client/Business Info - Match preview structure */}
        <View style={styles.section}>
          <Text>Bill To:</Text>
          <Text>{safeInvoice.client.name}</Text>
          {safeInvoice.client.email && <Text>{safeInvoice.client.email}</Text>}
        </View>

        {/* Tasks Table - Identical to preview */}
        <View style={styles.table}>
          {/* Table headers */}
          <View style={styles.row}>
            <Text style={[styles.cell, { flex: 3 }]}>Description</Text>
            <Text style={styles.cell}>Hours</Text>
            <Text style={styles.cell}>Rate</Text>
            <Text style={styles.cell}>Amount</Text>
          </View>

          {/* Task rows */}
          {safeInvoice.tasks.map(task => (
            <View key={task._id} style={styles.row}>
              <Text style={[styles.cell, { flex: 3 }]}>{task.description || 'No description'}</Text>
              <Text style={styles.cell}>{task.hours || 0}</Text>
              <Text style={styles.cell}>{formatCurrency(safeInvoice.client.hourlyRate || 0)}</Text>
              <Text style={styles.cell}>{formatCurrency((task.hours || 0) * (safeInvoice.client.hourlyRate || 0))}</Text>
            </View>
          ))}
        </View>

        {/* Totals - Match preview styling */}
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