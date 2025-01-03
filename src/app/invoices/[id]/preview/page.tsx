"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Task {
  _id: Id<"tasks">;
  description: string;
  hours: number;
  date: string;
  amount: number;
  hourlyRate: number;
}

export default function InvoicePreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const user = useQuery(api.users.getUser);
  const invoice = useQuery(api.invoices.getInvoice, { id: params.id as Id<"invoices"> });

  // Show loading state while auth is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  // Redirect if not signed in
  if (!isSignedIn) {
    router.push("/sign-in");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Redirecting to sign in...</div>
      </div>
    );
  }

  // Show loading state while data is loading
  if (!invoice || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  // Filter out any null tasks
  const validTasks = invoice.tasks?.filter((task: Task | null): task is Task => task !== null) || [];

  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto">
      {/* Actions */}
      <div className="flex justify-between mb-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          Back
        </Button>
        <Button
          onClick={() => window.open(`/api/invoices/${invoice._id}/pdf`, '_blank')}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          {user.logoUrl && (
            <div className="mb-4">
              <Image
                src={user.logoUrl}
                alt="Business Logo"
                width={200}
                height={80}
                objectFit="contain"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900">{user.businessName}</h1>
          {user.address && (
            <p className="text-gray-600 whitespace-pre-line mt-2">{user.address}</p>
          )}
          {user.email && <p className="text-gray-600 mt-1">{user.email}</p>}
          {user.phone && <p className="text-gray-600 mt-1">{user.phone}</p>}
          {user.website && (
            <p className="text-gray-600 mt-1">
              <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {user.website}
              </a>
            </p>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h2>
          <p className="text-gray-600">#{invoice.number}</p>
          <div className="mt-4">
            <p className="text-gray-600">
              <span className="font-medium">Date: </span>
              {new Date(invoice.date).toLocaleDateString()}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Due Date: </span>
              {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-12">
        <h3 className="text-gray-500 font-medium mb-2">Bill To:</h3>
        <h4 className="text-xl font-bold text-gray-900">{invoice.client?.name}</h4>
        <p className="text-gray-600">{invoice.client?.email}</p>
      </div>

      {/* Tasks Table */}
      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-3 px-4 text-gray-600">Description</th>
            <th className="text-right py-3 px-4 text-gray-600">Hours</th>
            <th className="text-right py-3 px-4 text-gray-600">Rate</th>
            <th className="text-right py-3 px-4 text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody>
          {validTasks.map((task: Task) => {
            const hourlyRate = invoice.client?.hourlyRate || 0;
            const amount = task.hours * hourlyRate;
            return (
              <tr key={task._id} className="border-b border-gray-100">
                <td className="py-4 px-4 text-gray-800">{task.description}</td>
                <td className="py-4 px-4 text-gray-800 text-right">{task.hours}</td>
                <td className="py-4 px-4 text-gray-800 text-right">
                  {formatCurrency(hourlyRate)}
                </td>
                <td className="py-4 px-4 text-gray-800 text-right">
                  {formatCurrency(amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-64">
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Subtotal:</span>
            <span className="text-gray-800 font-medium">
              {formatCurrency(invoice.subtotal)}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Tax:</span>
            <span className="text-gray-800 font-medium">
              {formatCurrency(invoice.tax)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-gray-200">
            <span className="text-gray-900 font-bold">Total:</span>
            <span className="text-gray-900 font-bold">
              {formatCurrency(invoice.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes & Payment Instructions */}
      <div className="border-t-2 border-gray-100 pt-8">
        {invoice.notes && (
          <div className="mb-8">
            <h4 className="text-gray-500 font-medium mb-2">Notes:</h4>
            <p className="text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
        
        <div>
          <h4 className="text-gray-500 font-medium mb-2">Payment Instructions:</h4>
          <p className="text-gray-600 whitespace-pre-line">{user.paymentInstructions}</p>
        </div>
      </div>
    </div>
  );
} 