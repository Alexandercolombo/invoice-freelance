/**
 * @fileoverview Shared utility functions that are safe to use in both client and server contexts.
 * IMPORTANT: This file should NOT import any server-only modules or utilities.
 * It should only contain code that is safe to run in both environments.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}