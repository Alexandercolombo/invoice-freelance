"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { formatCurrency } from "@/lib/client-utils";
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
import { useState, useMemo, lazy, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { useClerk } from "@clerk/nextjs";
import { Task } from "@/types";
import { SendInvoiceModal } from "./send-invoice-modal";
import { motion, AnimatePresence } from "framer-motion";
import { EditInvoiceModal } from "./edit-invoice-modal";
import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingState } from '@/components/loading-state';
import type { LoadingStateProps } from '@/components/loading-state';

interface InvoicePreviewModalProps {
  invoiceId: Id<"invoices">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoicePreviewModal({ invoiceId, open, onOpenChange }: InvoicePreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user: clerkUser } = useUser();
  const { toast } = useToast();
  const { session } = useClerk();
  
  // Get the session token for Convex
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const getToken = async () => {
      if (session) {
        try {
          const token = await session.getToken({ template: "convex" });
          setToken(token);
          console.log('[Debug] Got Convex token:', { hasToken: !!token });
        } catch (error) {
          console.error('[Error] Failed to get session token:', error);
        }
      }
    };
    getToken();
  }, [session]);

  // Query user data and invoice data with proper token
  const user = useQuery(api.users.get, {});
  const invoice = useQuery(api.invoices.getInvoice, { id: invoiceId });
  const [showSendModal, setShowSendModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Add debug logging for token and user data loading
  useEffect(() => {
    console.log('[Debug] Auth and User State:', {
      isSignedIn,
      userId,
      clerkUserId: clerkUser?.id,
      hasToken: !!token,
      hasUser: !!user,
      userDetails: user ? {
        tokenIdentifier: user.tokenIdentifier,
        businessName: user.businessName,
        email: user.email
      } : null,
      session: !!session
    });
  }, [isSignedIn, userId, user, clerkUser, token, session]);

  // Handle authentication loading state
  if (!isLoaded || !clerkUser) {
    console.log('[Debug] Auth loading:', { isLoaded, hasUser: !!clerkUser });
    return <LoadingState message="Loading authentication..." fullScreen={true} />;
  }

  // Handle not authenticated state
  if (!isSignedIn || !userId) {
    console.log('[Debug] Not signed in or no userId:', { isSignedIn, userId });
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
    console.log('[Debug] Data loading:', { 
      hasInvoice: !!invoice, 
      hasUser: !!user,
      userId,
      clerkUserId: clerkUser?.id,
      isSignedIn,
      invoiceId,
      token: !!token
    });
    return (
      <LoadingState 
        message={`Loading invoice data... ${!invoice ? '(Invoice pending)' : ''} ${!user ? '(User data pending)' : ''}`}
        fullScreen={true}
      />
    );
  }

  // Verify invoice ownership
  if (invoice.userId !== userId) {
    console.log('[Debug] Invoice ownership mismatch:', {
      invoiceUserId: invoice.userId,
      currentUserId: userId,
      clerkUserId: clerkUser?.id
    });
    toast({
      title: "Access Denied",
      description: "You don't have permission to view this invoice.",
      variant: "destructive",
    });
    onOpenChange(false);
    return null;
  }

  // Validate required data
  if (!invoice.client) {
    console.log('[Debug] Missing client data');
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

  // Safely handle tasks without useMemo
  const validTasks = invoice?.tasks?.filter((task): task is NonNullable<typeof task> => task !== null) ?? [];

  // Safely handle due date without useMemo
  const dueDate = invoice?.dueDate ? new Date(invoice.dueDate) : undefined;
  const isPastDue = dueDate ? dueDate < new Date() : false;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // Get the auth token for the request
      const token = await session?.getToken({ template: "convex" });
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('[Debug] Starting download:', {
        invoiceId,
        hasToken: !!token
      });

      // Use the API route for PDF generation
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('[Error] Failed to download invoice:', {
          status: response.status,
          error: errorData
        });
        throw new Error(errorData?.message || 'Failed to download invoice');
      }

      // Create a blob from the PDF data
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.number || 'download'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download invoice",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEditClick = () => {
    setShowEditModal(true);
    toast({
      title: "Editing invoice",
      description: `Opening editor for Invoice #${invoice.number}`,
    });
  };

  const handleSendClick = () => {
    setShowSendModal(true);
    toast({
      title: "Preparing to send",
      description: `Getting email ready for Invoice #${invoice.number}`,
    });
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    toast({
      title: "Edit mode closed",
      description: "Any saved changes have been applied.",
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={(newOpen) => {
          if (!newOpen && isDownloading) {
            toast({
              title: "Please wait",
              description: "Please wait for the download to complete before closing.",
              variant: "destructive",
            });
            return;
          }
          onOpenChange(newOpen);
        }}>
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
                        onClick={handleEditClick}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendClick}
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

      {showEditModal && (
        <EditInvoiceModal
          invoice={invoice}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showSendModal && (
        <SendInvoiceModal
          invoice={{
            _id: invoice._id,
            number: invoice.number,
            client: {
              name: invoice.client.name,
              email: invoice.client.email
            }
          }}
          onSuccess={() => setShowSendModal(false)}
        />
      )}
    </AnimatePresence>
  );
} 