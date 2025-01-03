"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: Id<"clients"> | null;
}

export function ClientDialog({ open, onOpenChange, clientId }: ClientDialogProps) {
  const client = useQuery(api.clients.getById, clientId ? { id: clientId } : "skip");
  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    hourlyRate: 0,
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        address: client.address,
        hourlyRate: client.hourlyRate,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        address: "",
        hourlyRate: 0,
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (clientId) {
        await updateClient({
          id: clientId,
          ...formData,
        });
      } else {
        await createClient(formData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving client:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-sm border shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">{clientId ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 bg-white/70 backdrop-blur-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 bg-white/70 backdrop-blur-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 bg-white/70 backdrop-blur-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
                Hourly Rate ($)
              </label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) })}
                className="mt-1 bg-white/70 backdrop-blur-sm"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-white hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {clientId ? "Update Client" : "Add Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 