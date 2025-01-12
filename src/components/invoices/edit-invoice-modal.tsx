"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";

type EditInvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    _id: Id<"invoices">;
    dueDate?: string;
    tax?: number;
    notes?: string;
    status: "draft" | "sent" | "paid";
  };
};

export function EditInvoiceModal({
  isOpen,
  onClose,
  invoice,
}: EditInvoiceModalProps) {
  const [showDueDate, setShowDueDate] = useState(!!invoice.dueDate);
  const [dueDate, setDueDate] = useState<Date>(invoice.dueDate ? new Date(invoice.dueDate) : new Date());
  const [showTax, setShowTax] = useState(!!invoice.tax);
  const [tax, setTax] = useState(invoice.tax ?? 0);
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [status, setStatus] = useState(invoice.status);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateInvoice = useMutation(api.invoices.updateInvoice);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updateInvoice({
        id: invoice._id,
        dueDate: showDueDate ? dueDate.toISOString() : undefined,
        tax: showTax ? tax : 0,
        notes,
        status,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Edit Invoice</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="showDueDate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Include Due Date
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDueDate(!showDueDate)}
                  className={showDueDate ? "text-primary" : "text-gray-500"}
                >
                  {showDueDate ? "Hide Due Date" : "Show Due Date"}
                </Button>
              </div>
              {showDueDate && (
                <div className="space-y-2 mt-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(dueDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dueDate}
                        onSelect={(date) => date && setDueDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="showTax" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Include Tax
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTax(!showTax)}
                  className={showTax ? "text-primary" : "text-gray-500"}
                >
                  {showTax ? "Hide Tax" : "Show Tax"}
                </Button>
              </div>
              {showTax && (
                <div className="space-y-2 mt-2">
                  <Label>Tax (%)</Label>
                  <Input
                    type="number"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    placeholder="Enter tax percentage..."
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                className="h-32"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 