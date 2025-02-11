/**
 * @fileoverview This is a server-only utility file.
 * This file should NOT be imported by any client-side code.
 */

// Explicitly mark as server-only runtime
export const runtime = 'nodejs';

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

// Add any other server-only utility functions here 