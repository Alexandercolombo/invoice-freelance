"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatCurrency } from "@/lib/client-utils";
import { Id } from "../../../convex/_generated/dataModel";

type AddTaskFormProps = {
  onClose: () => void;
};

type TaskStatus = "pending" | "completed";

type FormData = {
  description: string;
  date: string;
  hours: string;
  clientId: Id<"clients"> | null;
  status: TaskStatus;
};

type NewClientData = {
  name: string;
  email: string;
  hourlyRate: string;
};

export function AddTaskForm({ onClose }: AddTaskFormProps) {
  const clientsResponse = useQuery(api.clients.getAll, { paginationOpts: { numToSkip: 0, numToTake: 100 } });
  const clients = clientsResponse?.clients ?? [];
  const createTask = useMutation(api.tasks.create);
  const createClient = useMutation(api.clients.create);

  const [isNewClient, setIsNewClient] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    description: "",
    date: new Date().toISOString().split('T')[0],
    hours: "",
    clientId: null,
    status: "pending",
  });
  const [newClientData, setNewClientData] = useState<NewClientData>({
    name: "",
    email: "",
    hourlyRate: "",
  });

  const selectedClient = clients.find((client) => client._id === formData.clientId);
  const amount = isNewClient 
    ? parseFloat(formData.hours || "0") * parseFloat(newClientData.hourlyRate || "0")
    : selectedClient ? parseFloat(formData.hours || "0") * selectedClient.hourlyRate : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isNewClient) {
        if (!newClientData.name || !newClientData.hourlyRate) {
          alert("Please fill in all required client fields");
          return;
        }

        const rate = parseFloat(newClientData.hourlyRate);
        if (isNaN(rate) || rate <= 0) {
          alert("Please enter a valid hourly rate");
          return;
        }

        // Create new client first
        const client = await createClient({
          name: newClientData.name,
          email: newClientData.email || "",
          hourlyRate: rate,
        });

        // Create task with new client
        await createTask({
          description: formData.description,
          hours: parseFloat(formData.hours || "0"),
          date: formData.date,
          clientId: client as unknown as Id<"clients">,
          hourlyRate: rate,
          status: formData.status
        });
      } else {
        if (!formData.clientId) {
          alert("Please select a client");
          return;
        }

        const selectedClient = clients.find((client) => client._id === formData.clientId);
        if (!selectedClient) {
          alert("Selected client not found");
          return;
        }

        // Create task with existing client
        await createTask({
          description: formData.description,
          hours: parseFloat(formData.hours || "0"),
          date: formData.date,
          clientId: formData.clientId,
          hourlyRate: selectedClient.hourlyRate,
          status: formData.status
        });
      }
      onClose();
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="space-y-4">
        {/* Client Selection/Creation Toggle */}
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Client
            </label>
            <button
              type="button"
              onClick={() => {
                setIsNewClient(!isNewClient);
                setFormData(prev => ({ ...prev, clientId: null }));
                setNewClientData({ name: "", email: "", hourlyRate: "" });
              }}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {isNewClient ? "Select Existing Client" : "Add New Client"}
            </button>
          </div>

          {isNewClient ? (
            <div className="mt-2 space-y-4">
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Client Name
                </label>
                <input
                  type="text"
                  id="clientName"
                  value={newClientData.name}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Client Email (Optional)
                </label>
                <input
                  type="email"
                  id="clientEmail"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="clientRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hourly Rate
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="clientRate"
                    value={newClientData.hourlyRate}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 pl-7 pr-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">/hr</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <select
              id="client"
              value={formData.clientId?.toString() ?? ""}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                clientId: e.target.value ? e.target.value as Id<"clients"> : null 
              }))}
              className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
              required={!isNewClient}
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.name} ({formatCurrency(client.hourlyRate)}/hr)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
            rows={3}
            required
          />
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
            required
          />
        </div>

        {/* Hours */}
        <div>
          <label htmlFor="hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Hours
          </label>
          <input
            type="number"
            id="hours"
            value={formData.hours}
            onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
            className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
            step="0.25"
            min="0"
            required
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
            className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Amount Preview */}
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount
            </h3>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(amount)}
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create Task
          </button>
        </div>
      </div>
    </form>
  );
} 