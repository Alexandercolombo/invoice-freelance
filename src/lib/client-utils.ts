/**
 * @fileoverview Client-side utility functions that are safe to use in client components.
 * This file should NOT import any server-only modules or utilities.
 */

'use client';

// Only import shared utilities that are safe for client use
import { cn } from './utils';

export { cn };

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Add any other client-side utility functions here 