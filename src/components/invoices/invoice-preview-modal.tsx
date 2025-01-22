"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Send, Edit, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState, useMemo, lazy } from "react";
import { useAuth } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useClerk } from "@clerk/nextjs";
import { Task } from "@/types";
import { SendInvoiceModal } from "./send-invoice-modal";
import { motion, AnimatePresence } from "framer-motion";
import { EditInvoiceModal } from "./edit-invoice-modal";

interface InvoicePreviewModalProps {
  invoiceId: Id<"invoices">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoicePreviewModal({ invoiceId, open, onOpenChange }: InvoicePreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const { toast } = useToast();
  const { session } = useClerk();
  const user = useQuery(api.users.get);
  const invoice = useQuery(api.invoices.getInvoice, { id: invoiceId });
  const [showSendModal, setShowSendModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Handle authentication loading state
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
            <p className="text-sm text-gray-500">Loading authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle not authenticated state
  if (!isSignedIn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
          <p className="text-sm text-gray-500">Please sign in to view invoice details.</p>
        </div>
      </div>
    );
  }

  // Handle data loading state
  if (!invoice || !user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {!user && !invoice && "Loading user and invoice data..."}
              {user && !invoice && "Loading invoice data..."}
              {!user && invoice && "Loading user data..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Validate required data
  if (!invoice.client) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
            <p className="text-sm text-red-500">Error: Invoice is missing client data</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  // Memoize expensive calculations
  const validTasks = useMemo(() => 
    (invoice.tasks || []).filter((task): task is NonNullable<typeof task> => task !== null),
    [invoice.tasks]
  );

  const { dueDate, isPastDue } = useMemo(() => {
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : undefined;
    return {
      dueDate,
      isPastDue: dueDate ? dueDate < new Date() : false
    };
  }, [invoice.dueDate]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // Dynamically import the PDF generation function
      const { generateInvoicePDF } = await import('@/lib/generatePDF');
      const pdfBlob = await generateInvoicePDF(invoice, user, invoice.client, validTasks);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download invoice",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <DialogHeader className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onOpenChange(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEditModal(true)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSendModal(true)}
                        className="gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </Button>
                      <Button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      >
                        <Download className="w-4 h-4" />
                        {isDownloading ? "Downloading..." : "Download"}
                      </Button>
                    </div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <DialogTitle className="text-2xl font-bold">Invoice #{invoice.number}</DialogTitle>
                      <DialogDescription className="mt-1">
                        {invoice.dueDate && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`font-medium ${isPastDue ? 'text-red-500' : 'text-green-500'}`}
                          >
                            {(dueDate as Date).toLocaleDateString()}
                          </motion.span>
                        )}
                      </DialogDescription>
                    </div>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-2xl font-bold text-blue-600"
                    >
                      {formatCurrency(invoice.total)}
                    </motion.div>
                  </motion.div>
                </DialogHeader>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-6"
              >
                <div className="space-y-8">
                  {/* Header Section */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-2 gap-8"
                  >
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
                        {invoice.dueDate && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                            <span className={`font-medium ${isPastDue ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                              {dueDate?.toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Tasks Table with animation */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
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
                  </motion.div>

                  {/* Notes & Payment Instructions with animation */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6"
                  >
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
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditInvoiceModal
          invoice={invoice}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            // Optionally refresh the invoice data here if needed
          }}
        />
      )}

      {/* Send Modal */}
      {showSendModal && (
        <SendInvoiceModal
          invoice={invoice}
          onSuccess={() => {
            setShowSendModal(false);
            toast({
              title: "Ready to send",
              description: "Email content copied and PDF downloaded.",
            });
          }}
        />
      )}
    </AnimatePresence>
  );
} 