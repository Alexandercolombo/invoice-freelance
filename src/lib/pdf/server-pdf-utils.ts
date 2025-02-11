/**
 * @fileoverview This is a server-only file for generating PDF documents.
 * This file should NOT be imported by any client-side code.
 * All PDF generation should happen on the server through API routes.
 */

// Internal formatting functions to avoid any imports
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function generateInvoiceHtml(invoice: any, user: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice #${invoice.number || 'N/A'}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        .header {
          margin-bottom: 30px;
        }
        .business-info {
          margin-bottom: 30px;
        }
        .invoice-details {
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f8f9fa;
        }
        .total {
          text-align: right;
          font-size: 1.2em;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Invoice #${invoice.number || 'N/A'}</h1>
      </div>

      <div class="business-info">
        <h3>${user.businessName || 'Business Name Not Set'}</h3>
        <p>${user.email || 'Email Not Set'}</p>
        ${user.address ? `<p>${user.address}</p>` : ''}
        ${user.phone ? `<p>${user.phone}</p>` : ''}
      </div>

      <div class="invoice-details">
        <p><strong>Date:</strong> ${formatDate(invoice.date)}</p>
        <p><strong>Due Date:</strong> ${invoice.dueDate ? formatDate(invoice.dueDate) : 'Due Date Not Set'}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Rate</th>
            <th>Hours</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.tasks.map((task: any) => `
            <tr>
              <td>${task.description || 'No Description'}</td>
              <td>${formatCurrency(task.hourlyRate || 0)}</td>
              <td>${task.hours || 0}</td>
              <td>${formatCurrency((task.hourlyRate || 0) * (task.hours || 0))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total">
        <p>Total: ${formatCurrency(invoice.total || 0)}</p>
      </div>

      ${invoice.notes ? `
        <div class="notes">
          <h4>Notes</h4>
          <p>${invoice.notes}</p>
        </div>
      ` : ''}

      ${user.paymentInstructions ? `
        <div class="payment-instructions">
          <h4>Payment Instructions</h4>
          <p>${user.paymentInstructions}</p>
        </div>
      ` : ''}
    </body>
    </html>
  `;
} 