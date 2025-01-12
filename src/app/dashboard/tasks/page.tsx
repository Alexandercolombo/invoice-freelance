"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, DollarSign } from "lucide-react";

type TaskFormData = {
  description: string;
  date: string;
  hours: number;
  clientId: Id<"clients"> | null;
  status: "pending" | "completed";
};

const defaultFormData: TaskFormData = {
  description: "",
  date: new Date().toISOString().split('T')[0],
  hours: 0,
  clientId: null,
  status: "pending",
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  invoiced: "bg-purple-100 text-purple-800",
} as const;

export default function TasksPage() {
  const tasks = useQuery(api.tasks.list);
  const clientsResponse = useQuery(api.clients.getAll, {
    paginationOpts: {
      numToSkip: 0,
      numToTake: 100
    }
  });
  const clients = clientsResponse?.clients;
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<Id<"tasks"> | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(defaultFormData);
  const [selectedClient, setSelectedClient] = useState<Id<"clients"> | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      alert("Please select a client");
      return;
    }

    try {
      if (editingId) {
        await updateTask({
          id: editingId,
          description: formData.description,
          hours: formData.hours,
          date: formData.date,
          status: formData.status,
        });
      } else {
        const client = clients?.find(c => c._id === formData.clientId);
        await createTask({
          description: formData.description,
          hours: formData.hours,
          date: formData.date,
          clientId: formData.clientId,
          hourlyRate: client?.hourlyRate || 0,
          status: formData.status,
        });
      }
      setFormData(defaultFormData);
      setIsEditing(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleEdit = (task: any) => {
    setFormData({
      description: task.description,
      date: task.date,
      hours: task.hours,
      clientId: task.clientId,
      status: task.status,
    });
    setEditingId(task._id);
    setIsEditing(true);
  };

  const filteredTasks = tasks?.filter((task) => {
    const clientMatch = selectedClient === "all" || task.clientId === selectedClient;
    const statusMatch = selectedStatus === "all" || task.status === selectedStatus;
    return clientMatch && statusMatch;
  });

  const getClientName = (clientId: Id<"clients"> | undefined) => {
    if (!clientId || !clients) return "Unknown Client";
    const client = clients.find(c => c._id === clientId);
    return client?.name || "Unknown Client";
  };

  const getClientRate = (clientId: Id<"clients"> | undefined) => {
    if (!clientId || !clients) return 0;
    const client = clients.find(c => c._id === clientId);
    return client?.hourlyRate || 0;
  };

  const getStatusBadge = (status: string, invoiced: boolean) => {
    if (invoiced) return <Badge variant="secondary">Invoiced</Badge>;
    return (
      <Badge
        variant={
          status === "completed" ? "success" : "secondary"
        }
      >
        {status}
      </Badge>
    );
  };

  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
            <p className="mt-2 text-sm text-gray-700">
              Track your work tasks and billable hours
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value as Id<"clients"> | "all")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Clients</option>
                {clients?.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="invoiced">Invoiced</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setFormData(defaultFormData);
                  setIsEditing(true);
                  setEditingId(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Add Task
              </Button>
            </div>
          </div>

          {isEditing && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <form onSubmit={handleSubmit}>
                  <div className="shadow sm:overflow-hidden sm:rounded-md">
                    <div className="space-y-6 bg-white px-4 py-5 sm:p-6">
                      <div>
                        <label htmlFor="client" className="block text-sm font-medium text-gray-700">
                          Client
                        </label>
                        <select
                          id="client"
                          name="client"
                          required
                          value={formData.clientId || ""}
                          onChange={(e) => setFormData({ ...formData, clientId: e.target.value as Id<"clients"> })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Select a client</option>
                          {clients?.map((client) => (
                            <option key={client._id} value={client._id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          rows={3}
                          required
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                          Date
                        </label>
                        <input
                          type="date"
                          id="date"
                          name="date"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="hours" className="block text-sm font-medium text-gray-700">
                          Hours
                        </label>
                        <input
                          type="number"
                          id="hours"
                          name="hours"
                          required
                          min="0"
                          step="0.5"
                          value={formData.hours}
                          onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          id="status"
                          name="status"
                          required
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as "pending" | "completed" })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setEditingId(null);
                          setFormData(defaultFormData);
                        }}
                        className="mr-3"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {editingId ? "Update" : "Create"} Task
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Description
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Client
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Date
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Hours
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Amount
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredTasks?.map((task) => (
                        <tr key={task._id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {task.description}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {getClientName(task.clientId)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(task.date ?? new Date()).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {task.hours}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatCurrency(task.amount || (task.hours * getClientRate(task.clientId)))}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {getStatusBadge(task.status, task.invoiced || false)}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            {!task.invoiced && (
                              <Button
                                variant="ghost"
                                onClick={() => handleEdit(task)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredTasks?.length && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-lg font-medium">No tasks found</p>
                      <p className="mt-1">Create a new task to get started!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 