import puppeteer from 'puppeteer';
import 'server-only';

interface GeneratePDFParams {
  invoice: any;
  user: any;
  formatCurrency: (amount: number) => string;
}

export async function generatePDF({ invoice, user, formatCurrency }: GeneratePDFParams): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  // Create HTML template for the invoice
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice #${invoice.invoiceNumber}</title>
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
        <h1>Invoice #${invoice.invoiceNumber}</h1>
      </div>

      <div class="business-info">
        <h3>${user.businessName}</h3>
        <p>${user.email}</p>
      </div>

      <div class="invoice-details">
        <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
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
              <td>${task.description}</td>
              <td>${formatCurrency(task.rate)}</td>
              <td>${task.hours}</td>
              <td>${formatCurrency(task.rate * task.hours)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total">
        <p>Total: ${formatCurrency(invoice.total)}</p>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    }
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
} 