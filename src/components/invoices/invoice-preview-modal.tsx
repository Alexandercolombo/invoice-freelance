"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useClerk } from "@clerk/nextjs";

interface Task {
  _id: Id<"tasks">;
  _creationTime: number;
  description: string;
  hours: number;
  date: string;
  client?: string;
  clientId?: Id<"clients">;
  status: "pending" | "in-progress" | "completed";
  hourlyRate?: number;
  amount?: number;
  invoiced?: boolean;
  invoiceId?: Id<"invoices">;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoicePreviewModalProps {
  invoiceId: Id<"invoices">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoicePreviewModal({ invoiceId, open, onOpenChange }: InvoicePreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  const { session } = useClerk();
  const user = useQuery(api.users.getUser);
  const invoice = useQuery(api.invoices.getInvoice, { id: invoiceId });

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // Get the auth token
      const token = await session?.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice?.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isSignedIn || !open) {
    return null;
  }

  if (!invoice || !user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading Invoice</DialogTitle>
            <DialogDescription>
              {!user ? "Loading user data..." : "Loading invoice details..."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
            <p className="text-sm text-gray-500">
              {!user && !invoice && "Loading user and invoice data..."}
              {user && !invoice && "Loading invoice data..."}
              {!user && invoice && "Loading user data..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const validTasks = (invoice.tasks || []).filter((task): task is NonNullable<typeof task> => task !== null);
  const dueDate = new Date(invoice.dueDate);
  const isPastDue = dueDate < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onOpenChange(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
          </div>
          <div>
            <DialogTitle className="text-2xl">Invoice #{invoice.number}</DialogTitle>
            <DialogDescription>
              Status: <span className={`font-medium ${isPastDue ? 'text-red-500' : 'text-green-500'}`}>
                {isPastDue ? 'Past Due' : 'Due'} {dueDate.toLocaleDateString()}
              </span>
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-8 space-y-8">
          {/* Header Section */}
          <div className="grid grid-cols-2 gap-8">
            {/* From Section */}
            <div className="space-y-4">
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {user.businessName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
              </div>
              {user.address && (
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {user.address}
                </p>
              )}
              {user.phone && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user.phone}
                </p>
              )}
            </div>

            {/* Bill To Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bill To:</h3>
                <div className="mt-2">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    {invoice.client?.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {invoice.client?.email}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Invoice Date:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(invoice.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                  <span className={`font-medium ${isPastDue ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {dueDate.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Hours
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rate
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {validTasks.map((task) => {
                  const hourlyRate = invoice.client?.hourlyRate || 0;
                  const amount = task.hours * hourlyRate;
                  return (
                    <tr key={task._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {task.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                        {task.hours}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                        {formatCurrency(hourlyRate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                        {formatCurrency(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800">
                <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                  <td colSpan={2} />
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white text-right">
                    Total
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white text-right">
                    {formatCurrency(invoice.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes & Payment Instructions */}
          <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            {invoice.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {invoice.notes}
                </p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Payment Instructions</h4>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line">
                  {user.paymentInstructions}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 