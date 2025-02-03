"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoiceCard } from "@/components/invoices/invoice-card";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface Invoice {
  _id: Id<"invoices">;
  number: string;
  date: string;
  dueDate?: string;
  status: "draft" | "sent" | "paid";
  total: number;
  tax?: number;
  notes?: string;
  client: {
    name: string;
    email: string;
  };
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
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface InvoicesContentProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export function InvoicesContent({ searchParams }: InvoicesContentProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    sortBy: "date-desc",
    dateRange: "all",
  });
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Add explicit loading state tracking
  const isAuthLoading = isConvexLoading || !isClerkLoaded;
  const shouldFetchData = isAuthenticated && isSignedIn && !isAuthLoading;

  const invoices = useQuery(
    api.invoices.getAllInvoices,
    shouldFetchData ? {} : "skip"
  ) as Invoice[] | undefined;

  // Debug logging
  useEffect(() => {
    console.log("Invoice Query Debug:", {
      auth: {
        isAuthenticated,
        isSignedIn,
        isAuthLoading,
        shouldFetchData
      },
      invoices: {
        value: invoices,
        type: typeof invoices,
        isArray: Array.isArray(invoices),
        length: Array.isArray(invoices) ? invoices.length : "N/A"
      },
      timestamp: new Date().toISOString()
    });
  }, [invoices, isAuthenticated, isSignedIn, isAuthLoading, shouldFetchData]);

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

  // Show auth loading state
  if (isAuthLoading) {
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
                  Checking authentication...
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

  // Show auth error if not authenticated
  if (!isAuthenticated || !isSignedIn) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Authentication Required
                </h1>
                <p className="text-base text-red-600 dark:text-red-400">
                  Please sign in to view invoices.
                </p>
              </div>
              <Button
                onClick={() => router.push("/sign-in")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (invoices === undefined) {
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

  // Error state
  if (invoices === null) {
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
            {invoices.map((invoice) => (
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