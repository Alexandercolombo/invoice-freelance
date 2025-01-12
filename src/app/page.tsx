"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center space-y-8">
          <div className="space-y-4 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              <span className="block">Freelance Invoice</span>
              <span className="block text-primary">Management System</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Track your tasks, generate invoices, and manage your freelance business efficiently.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 md:py-4 md:text-lg md:px-10 transition-all duration-200 hover:scale-105 w-full sm:w-auto"
            >
              Sign In
              <ArrowRight className="ml-2 -mr-1 w-5 h-5" />
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-primary text-base font-medium rounded-md text-primary hover:bg-primary/10 md:py-4 md:text-lg md:px-10 transition-all duration-200 hover:scale-105 w-full sm:w-auto dark:text-white"
            >
              Sign Up
              <ArrowRight className="ml-2 -mr-1 w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 