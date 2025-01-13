"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type EditInvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    _id: Id<"invoices">;
    number: string;
    date: string;
    dueDate?: string;
    tax?: number;
    notes?: string;
    status: "draft" | "sent" | "paid";
    total: number;
    client?: {
      name: string;
      email: string;
    } | null;
  };
};

export function EditInvoiceModal({
  invoice,
  isOpen,
  onClose,
}: EditInvoiceModalProps) {
  const updateInvoice = useMutation(api.invoices.updateInvoice);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    invoice.dueDate ? new Date(invoice.dueDate) : undefined
  );
  const [tax, setTax] = useState(invoice.tax ?? 0);
  const [notes, setNotes] = useState(invoice.notes || "");
  const [status, setStatus] = useState<"draft" | "sent" | "paid">(invoice.status);
  const [number, setNumber] = useState(invoice.number);

  useEffect(() => {
    if (isOpen) {
      setDueDate(invoice.dueDate ? new Date(invoice.dueDate) : undefined);
      setTax(invoice.tax ?? 0);
      setNotes(invoice.notes || "");
      setStatus(invoice.status);
      setNumber(invoice.number);
    }
  }, [isOpen, invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateInvoice({
        id: invoice._id,
        dueDate: dueDate?.toISOString(),
        tax,
        notes,
        status,
        number,
      });

      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
          <DialogDescription>
            Make changes to the invoice here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="number" className="text-right">
                Number
              </Label>
              <Input
                id="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {dueDate ? format(dueDate, "PPP") : "No due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tax" className="text-right">
                Tax (%)
              </Label>
              <Input
                id="tax"
                type="number"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                placeholder="Add any additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 