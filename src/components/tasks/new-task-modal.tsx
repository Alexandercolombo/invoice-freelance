"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/client-utils";
import { Loader2, PencilIcon } from "lucide-react";
import { Id } from "@convex/_generated/dataModel";

type NewTaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TabType = "existing" | "new";
type TaskStatus = "pending" | "completed";

export function NewTaskModal({ isOpen, onClose }: NewTaskModalProps) {
  const clientsResponse = useQuery(api.clients.getAll, {
    paginationOpts: { numToSkip: 0, numToTake: 1000 }, // Get all clients for now
  });
  const clients = clientsResponse?.clients ?? [];
  const createTask = useMutation(api.tasks.create);
  const updateClient = useMutation(api.clients.update);
  const createClient = useMutation(api.clients.create);

  const [activeTab, setActiveTab] = useState<TabType>("existing");
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null);
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [editedRate, setEditedRate] = useState<string>("");

  // New client form state
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientRate, setNewClientRate] = useState("");

  const selectedClient = clients.find(client => client._id === selectedClientId);
  const amount = activeTab === "existing" 
    ? (selectedClient ? parseFloat(hours || "0") * selectedClient.hourlyRate : 0)
    : (parseFloat(hours || "0") * parseFloat(newClientRate || "0"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !hours) return;
    if (activeTab === "existing" && !selectedClientId) return;
    if (activeTab === "new" && (!newClientName || !newClientRate)) return;

    setIsLoading(true);
    try {
      if (activeTab === "new") {
        // Create new client first
        const newClient = await createClient({
          name: newClientName,
          email: newClientEmail,
          address: "",
          hourlyRate: parseFloat(newClientRate),
        });

        // Create task with new client
        await createTask({
          description,
          hours: parseFloat(hours),
          date,
          status,
          clientId: newClient as unknown as Id<"clients">,
          hourlyRate: parseFloat(newClientRate),
          invoiced: false
        });
      } else {
        // Create task with existing client
        if (!selectedClient || !selectedClientId) return;
        await createTask({
          description,
          hours: parseFloat(hours),
          date,
          status,
          clientId: selectedClientId,
          hourlyRate: selectedClient.hourlyRate,
          invoiced: false
        });
      }
      onClose();
      resetForm();
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateEdit = async () => {
    if (!selectedClientId || !editedRate) return;
    
    try {
      await updateClient({
        id: selectedClientId,
        name: selectedClient?.name || "",
        email: selectedClient?.email || "",
        address: selectedClient?.address || "",
        hourlyRate: parseFloat(editedRate),
      });
      setIsEditingRate(false);
      setEditedRate("");
    } catch (error) {
      console.error("Failed to update client rate:", error);
    }
  };

  const resetForm = () => {
    setDescription("");
    setHours("");
    setDate(new Date().toISOString().split('T')[0]);
    setStatus("pending");
    setSelectedClientId(null);
    setNewClientName("");
    setNewClientEmail("");
    setNewClientRate("");
    setActiveTab("existing");
    setIsEditingRate(false);
    setEditedRate("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">Create New Task</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="existing">Existing Client</TabsTrigger>
            <TabsTrigger value="new">New Client</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <TabsContent value="existing">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={selectedClientId?.toString() || ""}
                    onValueChange={(value) => setSelectedClientId(value as Id<"clients">)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client._id} value={client._id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedClient && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span>{formatCurrency(selectedClient.hourlyRate)}/hr</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingRate(true);
                          setEditedRate(selectedClient.hourlyRate.toString());
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <PencilIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {isEditingRate && (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          value={editedRate}
                          onChange={(e) => setEditedRate(e.target.value)}
                          className="pl-7"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleRateEdit}
                        disabled={!editedRate || parseFloat(editedRate) === selectedClient?.hourlyRate}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingRate(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="new">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Enter client name"
                    required={activeTab === "new"}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    required={activeTab === "new"}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hourly Rate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      value={newClientRate}
                      onChange={(e) => setNewClientRate(e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required={activeTab === "new"}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task description"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Hours</Label>
                <Input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0.0"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {amount > 0 && (
                <div className="pt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Estimated Amount: {formatCurrency(amount)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Task'
                )}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 