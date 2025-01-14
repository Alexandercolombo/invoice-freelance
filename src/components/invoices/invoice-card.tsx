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
    dueDate: string;
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
    try {
      setIsDownloading(true);
      
      // Get the auth token
      const token = await session?.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/invoices/${invoice._id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      // Create a blob from the PDF stream
      const blob = await response.blob();
      
      // Create a link element and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download successful",
        description: `Invoice #${invoice.number} has been downloaded.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading your invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
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
              {invoice.client?.name}
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
              {new Date(invoice.date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Due Date</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Amount</span>
            <span className="text-gray-900 dark:text-white font-semibold group-hover:text-blue-500 transition-colors">
              {formatCurrency(invoice.total)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
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
                onClick={() => setIsEditOpen(true)}
                className="w-full rounded-xl h-11 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
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
        onOpenChange={setIsPreviewOpen}
      />

      <EditInvoiceModal
        invoice={invoice}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteInvoice({ id: invoice._id });
                  toast({
                    title: "Invoice deleted",
                    description: `Invoice #${invoice.number} has been deleted.`,
                  });
                  router.refresh();
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to delete invoice. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
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