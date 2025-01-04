"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Task {
  _id: Id<"tasks">;
  description: string;
  hours: number;
  date: string;
  amount: number;
  hourlyRate: number;
}

interface Client {
  _id: Id<"clients">;
  name: string;
  email: string;
}

interface InvoiceFormProps {
  tasks: Task[];
  clients: Client[];
  isSubmitting: boolean;
  warnings: string[];
  onSubmit: (data: {
    clientId: Id<"clients">;
    taskIds: Id<"tasks">[];
    date: string;
    dueDate: string;
    notes: string;
    tax: number;
  }) => void;
}

export function InvoiceForm({
  tasks,
  clients,
  isSubmitting,
  warnings,
  onSubmit,
}: InvoiceFormProps) {
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | "">("");
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState("");

  const subtotal = tasks.reduce((sum, task) => sum + task.amount, 0);
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 30);

    onSubmit({
      clientId: selectedClientId,
      taskIds: tasks.map(task => task._id),
      date: today.toISOString(),
      dueDate: dueDate.toISOString(),
      notes,
      tax,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Client</label>
          <Select
            value={selectedClientId}
            onValueChange={(value) => setSelectedClientId(value as Id<"clients">)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client._id} value={client._id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Tax Amount</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={tax}
            onChange={(e) => setTax(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for the client..."
          />
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Please review the following:
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc space-y-1 pl-5">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !selectedClientId || tasks.length === 0}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Create Invoice"
        )}
      </Button>
    </form>
  );
} 