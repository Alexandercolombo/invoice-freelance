"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SendInvoiceModal } from "@/components/invoices/send-invoice-modal";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { InvoiceCard } from '@/components/invoices/invoice-card';
import { Invoice } from '@/types';
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEventListener } from '@/hooks/use-event-listener';

interface InvoiceCardData {
  _id: Id<"invoices">;
  number: string;
  date: string;
  dueDate?: string;
  status: "draft" | "sent" | "paid";
  total: number;
  client?: {
    name: string;
    email: string;
  } | null;
}

interface InvoicesContentProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

function InvoiceCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-11 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
      <div className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600">
        <PlusCircle className="w-full h-full" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No invoices yet
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
        Get started by creating your first invoice. Track your earnings and maintain a professional record of your work.
      </p>
      <Button
        onClick={() => router.push("/dashboard/invoices/new")}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        Create Your First Invoice
      </Button>
    </div>
  );
}

export function InvoicesContent({ searchParams }: InvoicesContentProps) {
  const router = useRouter();
  const invoices = useQuery(api.invoices.getAllInvoices, {
    paginationOpts: {
      numToSkip: 0,
      numToTake: 100
    }
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    sortBy: "date-desc",
    dateRange: "all",
  });

  // Add keyboard shortcuts
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEventListener('keydown', (e: KeyboardEvent) => {
    // Ignore if target is an input or textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'n':
        router.push("/dashboard/invoices/new");
        break;
      case '/':
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
        break;
      case 'escape':
        setFilters({
          search: "",
          status: "all",
          sortBy: "date-desc",
          dateRange: "all",
        });
        break;
      case '?':
        if (e.shiftKey) {
          setShowShortcuts(true);
        }
        break;
    }
  });

  // Memoize the filter values to prevent unnecessary recalculations
  const { search, status, sortBy, dateRange } = filters;

  // Apply filters and sorting to invoices
  const filteredInvoices = useMemo(() => {
    // Return empty array if invoices is undefined or empty
    if (!invoices || !Array.isArray(invoices)) return [];

    // Create stable date objects outside of the filter/sort operations
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // First filter the invoices and map to UI format in one pass
    const uiInvoices: InvoiceCardData[] = invoices
      .filter(invoice => {
        if (!invoice || typeof invoice !== 'object') return false;
        if (!invoice.date || !invoice.number || !invoice.status || !invoice.total) return false;
        
        // Safely check invoice properties
        const invoiceDate = new Date(invoice.date);
        const clientName = invoice.client?.name?.toLowerCase() || '';
        const invoiceStatus = invoice.status;

        // Filter by search
        if (search && !clientName.includes(search.toLowerCase())) {
          return false;
        }

        // Filter by status
        if (status !== "all" && invoiceStatus !== status) {
          return false;
        }

        // Filter by date range
        if (dateRange !== "all") {
          switch (dateRange) {
            case "today":
              return invoiceDate.toDateString() === now.toDateString();
            case "week":
              return invoiceDate >= weekAgo;
            case "month":
              return invoiceDate.getMonth() === currentMonth && 
                     invoiceDate.getFullYear() === currentYear;
            case "year":
              return invoiceDate.getFullYear() === currentYear;
            default:
              return true;
          }
        }

        return true;
      })
      .map(invoice => ({
        _id: invoice._id,
        number: invoice.number,
        date: invoice.date,
        dueDate: invoice.dueDate,
        status: invoice.status,
        total: invoice.total,
        client: invoice.client ? {
          name: invoice.client.name,
          email: invoice.client.email
        } : null
      }));

    // Then sort the filtered results
    return uiInvoices.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-desc":
          return (b.total || 0) - (a.total || 0);
        case "amount-asc":
          return (a.total || 0) - (b.total || 0);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [invoices, search, status, sortBy, dateRange]);

  // Show loading state while data is loading
  if (!invoices) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>

            <Card className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </div>
              </div>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <InvoiceCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if there are no invoices
  if (invoices && invoices.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Invoices
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-400">
                  Create and manage your invoices here.
                </p>
              </div>
            </div>
            <EmptyState />
          </div>
        </div>
      </div>
    );
  }

  // Show empty search results state
  if (filteredInvoices.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Invoices
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-400">
                  A list of all your invoices including their status and total amount.
                </p>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => router.push("/dashboard/invoices/new")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  Create Invoice
                </Button>
              </motion.div>
            </div>

            <Card className="p-6">
              <InvoiceFilters onFilterChange={setFilters} />
            </Card>

            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                No invoices found matching your filters.
              </p>
              <Button
                variant="outline"
                onClick={() => setFilters({
                  search: "",
                  status: "all",
                  sortBy: "date-desc",
                  dateRange: "all",
                })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Invoices
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-400">
                  A list of all your invoices including their status and total amount.
                </p>
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => router.push("/dashboard/invoices/new")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  Create Invoice
                </Button>
              </motion.div>
            </div>

            <Card className="p-6">
              <InvoiceFilters onFilterChange={setFilters} />
            </Card>

            <motion.div 
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {filteredInvoices.map((invoice) => (
                <motion.div
                  key={invoice._id}
                  variants={item}
                >
                  <InvoiceCard invoice={invoice} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Create new invoice</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">N</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Focus search</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">/</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Clear filters</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">ESC</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Show this dialog</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">?</kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 