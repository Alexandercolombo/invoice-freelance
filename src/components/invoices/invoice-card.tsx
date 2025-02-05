import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Download, Eye, Pencil, Trash2 } from 'lucide-react';
import { Id } from '../../../convex/_generated/dataModel';
import { useToast } from '@/hooks/use-toast';
import { InvoicePreviewModal } from './invoice-preview-modal';
import { EditInvoiceModal } from './edit-invoice-modal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useClerk } from '@clerk/clerk-react';

interface InvoiceCardProps {
  invoice: {
    _id: Id<"invoices">;
    number: string;
    date: string;
    dueDate?: string;
    status: 'draft' | 'sent' | 'paid';
    total: number;
    client?: {
      name: string;
      email: string;
    } | null;
  };
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteInvoice = useMutation(api.invoices.deleteInvoice);
  const { session } = useClerk();

  const handleDownload = async () => {
    let retryCount = 0;
    const maxRetries = 3;

    const attemptDownload = async () => {
      try {
        setIsDownloading(true);
        toast({
          title: "Starting download",
          description: `Preparing Invoice #${invoice.number} for download...`,
        });
        
        const token = await session?.getToken({
          template: "convex"  // Match the template used in the API
        });
        
        if (!token) {
          throw new Error('Authentication required. Please sign in again.');
        }
        
        const response = await fetch(`/api/invoices/${invoice._id}/pdf`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        });
        
        // Try to parse error response first
        if (!response.ok) {
          let errorMessage;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || `Failed to generate PDF (${response.status})`;
          } catch {
            errorMessage = `Failed to generate PDF (${response.status})`;
          }
          throw new Error(errorMessage);
        }
        
        let blob;
        try {
          blob = await response.blob();
        } catch (error) {
          throw new Error('Failed to read PDF data from response');
        }
        
        if (!blob || blob.size === 0) {
          throw new Error('Generated PDF is empty');
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoice.number}.pdf`;
        
        try {
          document.body.appendChild(link);
          link.click();
          toast({
            title: "Download successful",
            description: `Invoice #${invoice.number} has been downloaded to your device.`,
            variant: "default",
          });
        } finally {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Error downloading invoice:', error);
        
        // Only retry on network or timeout errors
        if (retryCount < maxRetries && error instanceof Error && 
            (error.message.includes('network') || error.message.includes('timeout'))) {
          retryCount++;
          toast({
            title: "Download retry",
            description: `Retrying download (attempt ${retryCount}/${maxRetries})...`,
            variant: "default",
          });
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return attemptDownload();
        }
        
        // Show error toast with specific message
        toast({
          title: "Download failed",
          description: error instanceof Error 
            ? error.message
            : "There was an error downloading your invoice. Please try again.",
          variant: "destructive",
        });
      } finally {
        // Only reset loading state if we're not retrying
        if (retryCount >= maxRetries) {
          setIsDownloading(false);
        }
      }
    };

    await attemptDownload();
    // Ensure loading state is reset even if retries fail
    setIsDownloading(false);
  };

  const handlePreviewClick = () => {
    setIsPreviewOpen(true);
    toast({
      title: "Opening preview",
      description: `Loading preview for Invoice #${invoice.number}`,
    });
  };

  const handleEditClick = () => {
    setIsEditOpen(true);
    toast({
      title: "Opening editor",
      description: `Loading editor for Invoice #${invoice.number}`,
    });
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
    toast({
      title: "Confirm deletion",
      description: `Please confirm if you want to delete Invoice #${invoice.number}`,
      variant: "destructive",
    });
  };

  const handleDelete = async () => {
    try {
      setIsDeleteDialogOpen(false);
      
      const deletedInvoice = { ...invoice };
      
      router.refresh();
      
      toast({
        title: "Deleting invoice...",
        description: `Invoice #${invoice.number} is being deleted.`,
      });
      
      await deleteInvoice({ id: invoice._id });
      
      toast({
        title: "Invoice deleted",
        description: `Invoice #${invoice.number} has been permanently deleted.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: "Failed to delete invoice. The invoice has been restored.",
        variant: "destructive",
      });
      router.refresh();
    }
  };

  return (
    <>
      <motion.div
        className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200"
        whileHover={{ y: -4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">
              Invoice #{invoice.number}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {invoice.client?.name || 'No Client'}
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <div
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                invoice.status === 'paid'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : invoice.status === 'sent'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </div>
          </motion.div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Date</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Due Date</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Amount</span>
            <span className="text-gray-900 dark:text-white font-semibold group-hover:text-blue-500 transition-colors">
              {formatCurrency(invoice.total || 0)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={handlePreviewClick}
              className="w-full rounded-xl h-11 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full rounded-xl h-11 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </>
              )}
            </Button>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={handleEditClick}
                className="w-full rounded-xl h-11 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={handleDeleteClick}
                className="w-full rounded-xl h-11 border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <InvoicePreviewModal
        invoiceId={invoice._id}
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            toast({
              title: "Preview closed",
              description: `Closed preview for Invoice #${invoice.number}`,
            });
          }
        }}
      />

      <EditInvoiceModal
        invoice={invoice}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          toast({
            title: "Edit mode closed",
            description: "Any saved changes have been applied.",
          });
        }}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete Invoice #{invoice.number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              toast({
                title: "Deletion cancelled",
                description: "Invoice deletion was cancelled.",
              });
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 