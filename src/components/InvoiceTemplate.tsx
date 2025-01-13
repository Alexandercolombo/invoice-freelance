import { formatCurrency } from "@/lib/utils";

type InvoiceTemplateProps = {
  invoice: {
    number: string;
    date: string;
    dueDate?: string;
    totalAmount: number;
    totalHours: number;
    notes?: string;
  };
  client: {
    name: string;
    email?: string;
    address?: string;
  };
  tasks: Array<{
    description: string;
    date: string;
    hours: number;
    hourlyRate: number;
  }>;
  user: {
    businessName: string;
    paymentInstructions: string;
    logoUrl?: string;
  };
};

export default function InvoiceTemplate({
  invoice,
  client,
  tasks,
  user,
}: InvoiceTemplateProps) {
  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {user.logoUrl && (
            <img
              src={user.logoUrl}
              alt={user.businessName}
              className="h-16 w-auto mb-4"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{user.businessName}</h1>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold text-gray-900">INVOICE</h2>
          <p className="text-gray-600">{invoice.number}</p>
        </div>
      </div>

      {/* Client and Invoice Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-gray-600 font-medium mb-2">Bill To:</h3>
          <div className="text-gray-900">
            <p className="font-semibold">{client.name}</p>
            {client.email && <p>{client.email}</p>}
            {client.address && <p className="whitespace-pre-line">{client.address}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className="space-y-1">
            <div className="grid grid-cols-2">
              <span className="text-gray-600">Date:</span>
              <span className="text-gray-900">{new Date(invoice.date).toLocaleDateString()}</span>
            </div>
            {invoice.dueDate && (
              <div className="grid grid-cols-2">
                <span className="text-gray-600">Due Date:</span>
                <span className="text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <table className="min-w-full mb-8">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left py-3 px-4 text-gray-600">Description</th>
            <th className="text-left py-3 px-4 text-gray-600">Date</th>
            <th className="text-right py-3 px-4 text-gray-600">Hours</th>
            <th className="text-right py-3 px-4 text-gray-600">Rate</th>
            <th className="text-right py-3 px-4 text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="py-3 px-4 text-gray-900">{task.description}</td>
              <td className="py-3 px-4 text-gray-900">
                {task.date ? new Date(task.date).toLocaleDateString() : new Date().toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-gray-900 text-right">{task.hours}</td>
              <td className="py-3 px-4 text-gray-900 text-right">
                {formatCurrency(task.hourlyRate)}
              </td>
              <td className="py-3 px-4 text-gray-900 text-right">
                {formatCurrency(task.hours * task.hourlyRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-gray-600">Total Hours:</span>
            <span className="text-right text-gray-900">
              {invoice.totalHours}
            </span>
            <span className="text-gray-900 font-semibold">Total Amount:</span>
            <span className="text-right text-gray-900 font-semibold">
              {formatCurrency(invoice.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes and Payment Instructions */}
      <div className="space-y-4">
        {invoice.notes && (
          <div>
            <h3 className="text-gray-600 font-medium mb-2">Notes:</h3>
            <p className="text-gray-900 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
        <div>
          <h3 className="text-gray-600 font-medium mb-2">Payment Instructions:</h3>
          <p className="text-gray-900 whitespace-pre-line">
            {user.paymentInstructions}
          </p>
        </div>
      </div>
    </div>
  );
} 