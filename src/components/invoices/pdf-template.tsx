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
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Mirror the preview layout */}
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Invoice #{invoice.number}</Text>
            <Text style={{ marginTop: 4 }}>{new Date(invoice.date).toLocaleDateString()}</Text>
          </View>
          
          {user?.logoUrl && (
            <Image src={user.logoUrl} style={{ width: 100, height: 100 }} />
          )}
        </View>

        {/* Client/Business Info - Match preview structure */}
        <View style={styles.section}>
          <Text>Bill To:</Text>
          <Text>{invoice.client?.name}</Text>
          <Text>{invoice.client?.email}</Text>
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
          {invoice.tasks?.map(task => (
            <View key={task._id} style={styles.row}>
              <Text style={[styles.cell, { flex: 3 }]}>{task.description}</Text>
              <Text style={styles.cell}>{task.hours}</Text>
              <Text style={styles.cell}>{formatCurrency(invoice.client?.hourlyRate)}</Text>
              <Text style={styles.cell}>{formatCurrency(task.hours * invoice.client?.hourlyRate)}</Text>
            </View>
          ))}
        </View>

        {/* Totals - Match preview styling */}
        <View style={styles.totalRow}>
          <Text style={[styles.cell, { flex: 3 }]}>Subtotal:</Text>
          <Text style={styles.cell}>{formatCurrency(invoice.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.cell, { flex: 3 }]}>Tax ({invoice.taxRate}%):</Text>
          <Text style={styles.cell}>{formatCurrency(invoice.tax)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.cell, { flex: 3 }]}>Total Due:</Text>
          <Text style={styles.cell}>{formatCurrency(invoice.total)}</Text>
        </View>
      </Page>
    </Document>
  );
} 