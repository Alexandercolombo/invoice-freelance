"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Task, Client } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Receipt, ArrowRight, ArrowLeft, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { EditInvoiceModal } from "./edit-invoice-modal";

type CreateInvoiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedTasks: Set<Id<"tasks_v2">>;
  tasks: Task[];
  clients: Client[];
};

const steps = ["summary", "details", "preview"] as const;
type Step = typeof steps[number];

export function CreateInvoiceModal({
  isOpen,
  onClose,
  selectedTasks,
  tasks,
  clients,
}: CreateInvoiceModalProps) {
  const [step, setStep] = useState<Step>("summary");
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [showTax, setShowTax] = useState(false);
  const [tax, setTax] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<{
    _id: Id<"invoices">;
    dueDate?: string;
    tax?: number;
    notes?: string;
    status: "draft" | "sent" | "paid";
  } | null>(null);
  const createInvoice = useMutation(api.invoices.createInvoice);

  const selectedTasksArray = tasks.filter((task) => selectedTasks.has(task._id));
  const groupedTasks = selectedTasksArray.reduce((acc, task) => {
    const client = clients.find((c) => c._id === task.clientId);
    if (!client) return acc;
    
    if (!acc[client._id.toString()]) {
      acc[client._id.toString()] = {
        client,
        tasks: [],
        total: 0,
      };
    }
    
    acc[client._id.toString()].tasks.push(task);
    acc[client._id.toString()].total += task.hours * client.hourlyRate;
    
    return acc;
  }, {} as Record<string, { client: Client; tasks: Task[]; total: number }>);

  const totalAmount = Object.values(groupedTasks).reduce(
    (sum, group) => sum + group.total,
    0
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const clientId = selectedTasksArray[0]?.clientId;
      if (!clientId) {
        throw new Error("No client found for selected tasks");
      }

      const result = await createInvoice({
        taskIds: Array.from(selectedTasks),
        clientId,
        date: new Date().toISOString(),
        dueDate: showDueDate ? dueDate.toISOString() : undefined,
        tax: showTax ? tax : 0,
        notes,
      });

      setCreatedInvoice({
        _id: result._id,
        dueDate: result.dueDate,
        tax: result.tax,
        notes: result.notes,
        status: result.status,
      });
      onClose();
    } catch (error) {
      console.error("Failed to create invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="relative">
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{
                  width: step === "summary" ? "33.33%" : step === "details" ? "66.66%" : "100%",
                }}
              />
            </div>

            <div className="mt-6">
              <AnimatePresence initial={false} custom={step === "summary" ? -1 : 1}>
                {step === "summary" && (
                  <motion.div
                    key="summary"
                    custom={-1}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <h2 className="text-lg font-semibold mb-4">Invoice Summary</h2>
                    <div className="space-y-4">
                      {Object.values(groupedTasks).map(({ client, tasks, total }) => (
                        <div key={client._id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">{client.name}</h3>
                            <p className="font-semibold">{formatCurrency(total)}</p>
                          </div>
                          <div className="space-y-2">
                            {tasks.map((task) => (
                              <div key={task._id} className="flex justify-between text-sm text-gray-600">
                                <span>{task.description}</span>
                                <span>{task.hours} hours</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-4 border-t">
                        <span className="font-medium">Total Amount</span>
                        <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === "details" && (
                  <motion.div
                    key="details"
                    custom={1}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
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
                        <Label>Notes (Optional)</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any additional notes..."
                          className="h-32"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === "preview" && (
                  <motion.div
                    key="preview"
                    custom={1}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <h2 className="text-lg font-semibold mb-4">Preview Invoice</h2>
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2">
                          {showDueDate && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Due Date</span>
                              <span>{format(dueDate, "PPP")}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Amount</span>
                            <span className="font-bold">{formatCurrency(totalAmount)}</span>
                          </div>
                          {showTax && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tax ({tax}%)</span>
                              <span>{formatCurrency(totalAmount * (tax / 100))}</span>
                            </div>
                          )}
                          {notes && (
                            <div className="pt-2 border-t mt-2">
                              <span className="text-gray-600 block mb-1">Notes</span>
                              <p className="text-sm">{notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-between mt-8">
              {step !== "summary" ? (
                <Button
                  variant="ghost"
                  onClick={() => setStep(step === "preview" ? "details" : "summary")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <Button variant="ghost" onClick={onClose}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              
              <Button
                onClick={() => {
                  if (step === "summary") setStep("details");
                  else if (step === "details") setStep("preview");
                  else handleSubmit();
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Creating..."
                ) : step === "preview" ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Invoice
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {createdInvoice && (
        <EditInvoiceModal
          isOpen={true}
          onClose={() => setCreatedInvoice(null)}
          invoice={createdInvoice}
        />
      )}
    </>
  );
} 