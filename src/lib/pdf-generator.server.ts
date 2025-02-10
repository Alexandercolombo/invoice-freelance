import puppeteer from 'puppeteer';
// import 'server-only';

interface GeneratePDFParams {
  invoice: any;
  user: any;
  formatCurrency: (amount: number) => string;
}

export async function generatePDF({ invoice, user, formatCurrency }: GeneratePDFParams): Promise<Buffer> {
  let browser;
  try {
    console.log('[Debug] Starting PDF generation:', {
      hasInvoice: !!invoice,
      hasUser: !!user,
      invoiceNumber: invoice?.invoiceNumber,
      hasTasks: Array.isArray(invoice?.tasks),
      tasksCount: Array.isArray(invoice?.tasks) ? invoice.tasks.length : 0
    });

    // Validate required data
    if (!invoice || !user) {
      throw new Error('Missing required invoice or user data');
    }

    if (!Array.isArray(invoice.tasks) || invoice.tasks.length === 0) {
      throw new Error('Invoice has no tasks');
    }

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    console.log('[Debug] Browser launched successfully');

    const page = await browser.newPage();
    console.log('[Debug] New page created');

    // Create HTML template for the invoice
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${invoice.invoiceNumber || 'N/A'}</title>
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
          <h1>Invoice #${invoice.invoiceNumber || 'N/A'}</h1>
        </div>

        <div class="business-info">
          <h3>${user.businessName || 'Business Name Not Set'}</h3>
          <p>${user.email || 'Email Not Set'}</p>
        </div>

        <div class="invoice-details">
          <p><strong>Date:</strong> ${invoice.date ? new Date(invoice.date).toLocaleDateString() : 'Date Not Set'}</p>
          <p><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Due Date Not Set'}</p>
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
                <td>${formatCurrency(task.rate || 0)}</td>
                <td>${task.hours || 0}</td>
                <td>${formatCurrency((task.rate || 0) * (task.hours || 0))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <p>Total: ${formatCurrency(invoice.total || 0)}</p>
        </div>
      </body>
      </html>
    `;

    console.log('[Debug] Setting page content');
    await page.setContent(html, { waitUntil: 'networkidle0' });
    console.log('[Debug] Page content set successfully');

    console.log('[Debug] Generating PDF');
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
    console.log('[Debug] PDF generated successfully');

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('[Error] PDF generation failed:', {
      error,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
      invoiceData: {
        hasInvoice: !!invoice,
        hasUser: !!user,
        invoiceNumber: invoice?.invoiceNumber,
        hasTasks: Array.isArray(invoice?.tasks)
      }
    });
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('[Debug] Browser closed successfully');
      } catch (error) {
        console.error('[Error] Failed to close browser:', error);
      }
    }
  }
} 