"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SendInvoiceModal } from "@/components/invoices/send-invoice-modal";
import { InvoiceFilters } from "@/components/invoices/invoice-filters";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { InvoiceCard } from '@/components/invoices/invoice-card';

interface Invoice {
  _id: Id<"invoices">;
  number: string;
  date: string;
  dueDate: string;
  status: "draft" | "sent" | "paid";
  total: number;
  client: {
    name: string;
    email: string;
  } | null;
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

export default function InvoicesPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const invoices = useQuery(api.invoices.getInvoices, isSignedIn ? {} : "skip") as Invoice[] | undefined;

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    sortBy: "date-desc",
    dateRange: "all",
  });

  // Apply filters and sorting to invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];

    return invoices
      .filter((invoice) => {
        // Filter by search
        if (filters.search && !invoice.client?.name.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }

        // Filter by status
        if (filters.status !== "all" && invoice.status !== filters.status) {
          return false;
        }

        // Filter by date range
        if (filters.dateRange !== "all") {
          const invoiceDate = new Date(invoice.date);
          const now = new Date();
          
          switch (filters.dateRange) {
            case "today":
              return invoiceDate.toDateString() === now.toDateString();
            case "week":
              const weekAgo = new Date(now.setDate(now.getDate() - 7));
              return invoiceDate >= weekAgo;
            case "month":
              return invoiceDate.getMonth() === now.getMonth() && 
                     invoiceDate.getFullYear() === now.getFullYear();
            case "year":
              return invoiceDate.getFullYear() === now.getFullYear();
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by selected option
        switch (filters.sortBy) {
          case "date-desc":
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          case "date-asc":
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case "amount-desc":
            return b.total - a.total;
          case "amount-asc":
            return a.total - b.total;
          case "status":
            return a.status.localeCompare(b.status);
          default:
            return 0;
        }
      });
  }, [invoices, filters]);

  // Show loading state while auth is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  // Redirect if not signed in
  if (!isSignedIn) {
    router.push("/sign-in");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Redirecting to sign in...</div>
      </div>
    );
  }

  // Show loading state while data is loading
  if (!invoices) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Invoices
              </h1>
              <p className="text-base text-gray-600 dark:text-gray-400">
                A list of all your invoices including their status and total amount.
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => router.push("/dashboard/invoices/new")}
                className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-sm hover:shadow-md"
              >
                Create Invoice
              </Button>
            </motion.div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <InvoiceFilters onFilterChange={setFilters} />
          </div>

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
  );
} 