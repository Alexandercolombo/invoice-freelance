import { Id } from "@convex/_generated/dataModel";

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
  _id: Id<"clients">;
  _creationTime: number;
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
  _creationTime: number;
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
  _id: Id<"invoices">;
  _creationTime: number;
  number: string;
  date: string;
  dueDate?: string;
  clientId: Id<"clients">;
  client?: Client;
  tasks: Id<"tasks_v2">[];
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
  status: 'draft' | 'sent' | 'paid';
  userId: string;
  createdAt: string;
  updatedAt: string;
} 