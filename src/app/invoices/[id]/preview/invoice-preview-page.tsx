"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/shared-utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Task } from "@/types";
import { useClerk } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface InvoicePreviewPageProps {
  params: {
    id: string;
  };
}

export function InvoicePreviewPage({ params }: InvoicePreviewPageProps) {
  const { userId } = useAuth();
  const router = useRouter();
  const { session } = useClerk();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const invoiceId = params.id as Id<"invoices">;

  const invoice = useQuery(api.invoices.getInvoice, {
    id: invoiceId,
  });

  const user = useQuery(api.users.get);

  if (!userId) {
    router.push("/sign-in");
    return null;
  }

  if (!invoice || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
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

      // Get the auth token
      const token = await session?.getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoice #{invoice.number}</h1>
        <Button onClick={handleDownload} disabled={isDownloading}>
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? "Downloading..." : "Download PDF"}
        </Button>
      </div>

      <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <h2 className="mb-2 text-lg font-semibold">From</h2>
            <div className="flex items-center space-x-4">
              {user.logoUrl && (
                <Image
                  src={user.logoUrl}
                  alt="Business Logo"
                  width={64}
                  height={64}
                  className="rounded-lg"
                />
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {user.businessName}
                </h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            {user.address && (
              <p className="mt-4 text-sm text-gray-600 whitespace-pre-line">
                {user.address}
              </p>
            )}
            {user.phone && (
              <p className="mt-2 text-sm text-gray-600">{user.phone}</p>
            )}
          </div>
          <div>
            <h2 className="mb-2 text-lg font-semibold">Bill To</h2>
            <div className="mt-2">
              <h4 className="text-lg font-bold text-gray-900">
                {invoice.client?.name}
              </h4>
              <p className="text-sm text-gray-600">{invoice.client?.email}</p>
              {invoice.client?.address && (
                <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                  {invoice.client.address}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">
                <span className="font-medium">Invoice Date:</span>{" "}
                {new Date(invoice.date).toLocaleDateString()}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Due Date:</span>{" "}
                <span
                  className={`font-medium ${
                    isPastDue ? "text-red-500" : "text-gray-900"
                  }`}
                >
                  {dueDate.toLocaleDateString()}
                </span>
              </p>
            </div>
            <div>
              <p className="text-gray-600">
                <span className="font-medium">Status:</span>{" "}
                <span
                  className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                    invoice.status === "paid"
                      ? "bg-green-100 text-green-800"
                      : invoice.status === "sent"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {invoice.status.charAt(0).toUpperCase() +
                    invoice.status.slice(1)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Tasks</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {validTasks.map((task) => {
                  const hourlyRate = invoice.client?.hourlyRate || 0;
                  const amount = task.hours * hourlyRate;
                  return (
                    <tr key={task._id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {task.description}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                        {task.hours}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(hourlyRate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(amount)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50">
                  <td
                    colSpan={3}
                    className="whitespace-nowrap px-6 py-4 text-right font-medium"
                  >
                    Subtotal
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-medium">
                    {formatCurrency(invoice.subtotal || 0)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td
                    colSpan={3}
                    className="whitespace-nowrap px-6 py-4 text-right font-medium"
                  >
                    Tax
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-medium">
                    {formatCurrency(invoice.tax || 0)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td
                    colSpan={3}
                    className="whitespace-nowrap px-6 py-4 text-right font-medium"
                  >
                    Total
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-medium">
                    {formatCurrency(invoice.total || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 