"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SendInvoiceModal } from "@/components/invoices/send-invoice-modal";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { InvoiceCard } from '@/components/invoices/invoice-card';
import { Invoice } from '@/types';
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

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

function SearchEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
      <div className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600">
        <Search className="w-full h-full" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No matching invoices
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
        Try adjusting your search filters or create a new invoice.
      </p>
    </div>
  );
}

// Loading component
function LoadingState() {
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
                Loading your invoices...
              </p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 dark:bg-gray-700 h-48 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main content component
function InvoicesList() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    sortBy: "date-desc",
    dateRange: "all",
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  const rawInvoices = useQuery(api.invoices.getAllInvoices, {
    paginationOpts: {
      numToSkip: 0,
      numToTake: 100
    }
  });

  // Debug logging
  useEffect(() => {
    console.log("Invoice Query Debug:", {
      rawInvoices: {
        value: rawInvoices,
        type: typeof rawInvoices,
        isArray: Array.isArray(rawInvoices),
        isNull: rawInvoices === null,
        isUndefined: rawInvoices === undefined,
        length: Array.isArray(rawInvoices) ? rawInvoices.length : "N/A"
      },
      timestamp: new Date().toISOString()
    });
  }, [rawInvoices]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
  }, [router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle error state
  if (rawInvoices === null) {
    throw new Error("Failed to load invoices");
  }

  // Ensure we have an array of invoices
  const invoices = Array.isArray(rawInvoices) ? rawInvoices : [];

  // Empty state
  if (invoices.length === 0) {
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
                  No invoices found. Create your first invoice to get started.
                </p>
              </div>
              <Button
                onClick={() => router.push("/dashboard/invoices/new")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Invoice
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Memoize the filter values to prevent unnecessary recalculations
  const { search, status, sortBy, dateRange } = filters;

  // Simplified filtered invoices logic - no need for length check since we handle empty state separately
  const filteredInvoices: InvoiceCardData[] = invoices;

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
    </div>
  );
}

// Error boundary component
function ErrorState() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Invoices
              </h1>
              <p className="text-base text-red-600 dark:text-red-400">
                Error loading invoices. Please try again.
              </p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export function InvoicesContent({ searchParams }: InvoicesContentProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ErrorBoundary fallback={<ErrorState />}>
        <InvoicesList />
      </ErrorBoundary>
    </Suspense>
  );
} 