import { Id } from "convex/_generated/dataModel";

export interface Task {
  _id: Id<"tasks_v2">;
  _creationTime: number;
  description?: string;
  date?: string;
  amount?: number;
  hours: number;
  hourlyRate?: number;
  clientId: Id<"clients">;
  client?: string;
  userId: string;
  invoiceId?: Id<"invoices">;
  status: 'pending' | 'completed';
  invoiced: boolean;
  createdAt?: string;
  updatedAt: string;
}

export interface Client {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  hourlyRate: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status?: 'active' | 'inactive';
}

export interface User {
  _id: string;
  address?: string;
  businessName: string;
  createdAt: string;
  email: string;
  invoiceNotes?: string;
  logoUrl?: string;
  name: string;
  notes?: string;
  paymentInstructions: string;
  phone?: string;
  tokenIdentifier: string;
  updatedAt: string;
  website?: string;
}

export interface Invoice {
  _id: string;
  number: string;
  date: string;
  dueDate?: string;
  clientId: string;
  client?: Client;
  tasks: Task[];
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
  status: 'draft' | 'sent' | 'paid';
  userId: string;
  createdAt: string;
  updatedAt: string;
} 