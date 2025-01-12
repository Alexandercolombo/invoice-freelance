"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

type CreateInvoiceModalProps = {
  open: boolean;
  onClose: () => void;
};

interface Client {
  _id: Id<"clients">;
  _creationTime: number;
  name: string;
  email: string;
  hourlyRate: number;
  address?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export function CreateInvoiceModal({ open, onClose }: CreateInvoiceModalProps) {
  const clients = useQuery(api.clients.getAll, { paginationOpts: { numToSkip: 0, numToTake: 100 } }) || { clients: [], total: 0, hasMore: false };
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const createInvoice = useMutation(api.invoices.createInvoice);

  const unbilledTasks = useQuery(
    api.invoices.getUnbilledTasksByClient,
    selectedClientId ? { clientId: selectedClientId } : "skip"
  );

  const [selectedTaskIds, setSelectedTaskIds] = useState<Id<"tasks_v2">[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const selectedClient = clients.clients.find((c: Client) => c._id === selectedClientId);
  const totalHours = unbilledTasks
    ?.filter((t) => selectedTaskIds.includes(t._id))
    .reduce((sum, task) => sum + task.hours, 0) || 0;
  const total = selectedClient ? totalHours * selectedClient.hourlyRate : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || selectedTaskIds.length === 0) return;

    setIsLoading(true);
    try {
      await createInvoice({
        clientId: selectedClientId,
        taskIds: selectedTaskIds,
        date: new Date().toISOString(),
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: notes || undefined,
        tax: 0,
      });
      onClose();
    } catch (error) {
      console.error("Failed to create invoice:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={selectedClientId || ""}
              onValueChange={(value) => setSelectedClientId(value as Id<"clients">)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.clients.map((client: Client) => (
                  <SelectItem key={client._id} value={client._id}>
                    {client.name} ({formatCurrency(client.hourlyRate)}/hr)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Selection */}
          {selectedClientId && unbilledTasks && (
            <div className="space-y-2">
              <Label>Tasks</Label>
              <div className="border rounded-lg divide-y">
                {unbilledTasks.map((task) => (
                  <div key={task._id} className="p-3 flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(task._id)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.checked) {
                          setSelectedTaskIds([...selectedTaskIds, task._id]);
                        } else {
                          setSelectedTaskIds(selectedTaskIds.filter((id) => id !== task._id));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{task.description}</p>
                      <p className="text-sm text-gray-500">
                        {task.hours} hours • {formatCurrency(task.hours * (selectedClient?.hourlyRate || 0))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              className="w-full h-24 px-3 py-2 border rounded-lg resize-none"
              placeholder="Enter any additional notes..."
            />
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedClientId || selectedTaskIds.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 