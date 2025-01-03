"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";

interface InvoiceFiltersProps {
  onFilterChange: (filters: {
    search: string;
    status: string;
    sortBy: string;
    dateRange: string;
  }) => void;
}

export function InvoiceFilters({ onFilterChange }: InvoiceFiltersProps) {
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    sortBy: "date-desc",
    dateRange: "all",
  });

  const [showFilters, setShowFilters] = useState(true);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const statusOptions = ["all", "draft", "sent", "paid"];
  const dateRangeOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "year", label: "This Year" },
  ];
  const sortOptions = [
    { value: "date-desc", label: "Newest First" },
    { value: "date-asc", label: "Oldest First" },
    { value: "amount-desc", label: "Amount: High to Low" },
    { value: "amount-asc", label: "Amount: Low to High" },
    { value: "status", label: "By Status" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search invoices..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-10 h-12 bg-gray-50 dark:bg-gray-900 border-0 ring-1 ring-gray-200 dark:ring-gray-800 focus:ring-2 focus:ring-blue-500 transition-all rounded-xl text-base"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-12 px-4 rounded-xl border-gray-200 dark:border-gray-700 transition-all ${
            showFilters ? "bg-gray-50 dark:bg-gray-800" : ""
          }`}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <motion.div
        initial={false}
        animate={{ height: showFilters ? "auto" : 0, opacity: showFilters ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Status</div>
              <div className="inline-flex p-1 gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                {statusOptions.map((status) => (
                  <motion.button
                    key={status}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleFilterChange("status", status)}
                    className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
                      filters.status === status
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {status === "all" ? "All Status" : status}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Time Range</div>
              <div className="inline-flex p-1 gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                {dateRangeOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleFilterChange("dateRange", option.value)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      filters.dateRange === option.value
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 dark:text-white">Sort By</div>
              <div className="flex gap-2">
                {sortOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleFilterChange("sortBy", option.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      filters.sortBy === option.value
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 