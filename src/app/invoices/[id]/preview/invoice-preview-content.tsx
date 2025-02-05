"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Task } from "@/types";
import { useClerk } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { LoadingState } from "@/components/loading-state";

interface InvoicePreviewContentProps {
  params: {
    id: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export function InvoicePreviewContent({ params, searchParams }: InvoicePreviewContentProps) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const { session } = useClerk();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const invoiceId = params.id as Id<"invoices">;

  const invoice = useQuery(api.invoices.getInvoice, {
    id: invoiceId,
  });

  const user = useQuery(api.users.get);

  // Show loading state while authentication is being checked
  if (!isLoaded) {
    return <LoadingState fullScreen message="Checking authentication..." />;
  }

  // Redirect to sign in if not authenticated
  if (!userId) {
    router.push("/sign-in");
    return null;
  }

  // Show loading state while data is being fetched
  if (invoice === undefined || user === undefined) {
    return <LoadingState fullScreen message="Loading invoice details..." />;
  }

  // Show error state if data fetch failed
  if (invoice === null || user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600">Error Loading Invoice</h1>
          <p className="mt-2 text-gray-600">Unable to load invoice details. Please try again.</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const validTasks = (invoice.tasks || []).filter(
    (task): task is NonNullable<typeof task> => task !== null
  );

  const dueDate = new Date(invoice.dueDate || new Date());
  const isPastDue = dueDate < new Date();

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      toast({
        title: "Starting download",
        description: "Preparing your invoice PDF...",
      });

      // Get the auth token
      const token = await session?.getToken({
        template: "convex"  // Match the template used in the API
      });
      
      if (!token) {
        throw new Error("Authentication required. Please sign in again.");
      }

      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.number}.pdf`;
      
      // Use a try-finally to ensure cleanup
      try {
        document.body.appendChild(link);
        link.click();
        toast({
          title: "Download complete",
          description: `Invoice #${invoice.number} has been downloaded successfully.`,
          variant: "default",
        });
      } finally {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download invoice",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice #{invoice.number}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(invoice.date).toLocaleDateString()} 
              {invoice.dueDate && ` · Due ${new Date(invoice.dueDate).toLocaleDateString()}`}
            </p>
          </div>
          <Button 
            onClick={handleDownload} 
            disabled={isDownloading}
            className="flex items-center gap-2"
          >
            <Download className={`h-4 w-4 ${isDownloading ? 'animate-spin' : ''}`} />
            {isDownloading ? "Generating PDF..." : "Download Invoice"}
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6 sm:p-8">
            <div className="grid gap-8 sm:grid-cols-2">
              {/* From Section */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">From</h2>
                <div className="mt-4 flex items-start space-x-4">
                  {user.logoUrl && (
                    <div className="flex-shrink-0">
                      <Image
                        src={user.logoUrl}
                        alt="Business Logo"
                        width={64}
                        height={64}
                        className="rounded-lg"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {user.businessName}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{user.email}</p>
                    {user.address && (
                      <p className="mt-2 whitespace-pre-line text-sm text-gray-500">
                        {user.address}
                      </p>
                    )}
                    {user.phone && (
                      <p className="mt-2 text-sm text-gray-500">{user.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bill To Section */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bill To</h2>
                <div className="mt-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    {invoice.client?.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{invoice.client?.email}</p>
                  {invoice.client?.address && (
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-500">
                      {invoice.client.address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Tasks</h2>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Description
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                          Hours
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                          Rate
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {validTasks.map((task) => (
                        <tr key={task._id}>
                          <td className="whitespace-pre-line py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                            {task.description}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-900">
                            {task.hours}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-900">
                            {formatCurrency(task.hourlyRate)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-900">
                            {formatCurrency(task.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200">
                        <th scope="row" colSpan={3} className="px-3 py-4 text-right text-sm font-semibold text-gray-900">
                          Subtotal
                        </th>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(invoice.subtotal || 0)}
                        </td>
                      </tr>
                      {invoice.tax && (
                        <tr className="border-t border-gray-200">
                          <th scope="row" colSpan={3} className="px-3 py-4 text-right text-sm font-semibold text-gray-900">
                            Tax ({invoice.tax}%)
                          </th>
                          <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-semibold text-gray-900">
                            {formatCurrency((invoice.subtotal || 0) * (invoice.tax / 100))}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <th scope="row" colSpan={3} className="px-3 py-4 text-right text-base font-semibold text-gray-900">
                          Total Due
                        </th>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-base font-semibold text-gray-900">
                          {formatCurrency(invoice.total || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {invoice.notes && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
                <div className="mt-4 whitespace-pre-line rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  {invoice.notes}
                </div>
              </div>
            )}

            {/* Payment Instructions */}
            {user.paymentInstructions && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900">Payment Instructions</h2>
                <div className="mt-4 whitespace-pre-line rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  {user.paymentInstructions}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 