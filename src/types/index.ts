import { Id } from "convex/_generated/dataModel";

export interface Task {
  _id: Id<"tasks_v2">;
  _creationTime: number;
  description?: string;
  hours: number;
  date?: string;
  amount?: number;
  hourlyRate?: number;
  client?: string;
  clientId: Id<"clients">;
  status: "pending" | "completed";
  userId: string;
  invoiced?: boolean;
  invoiceId?: Id<"invoices">;
  createdAt?: string;
  updatedAt: string;
}

export interface Client {
  _id: Id<"clients">;
  name: string;
  email: string;
  address?: string;
  hourlyRate: number;
  userId: string;
  status?: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
} 