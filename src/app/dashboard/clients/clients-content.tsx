"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { ClientDialog } from "@/components/clients/client-dialog";
import { ClientDetails } from "@/components/clients/client-details";
import { ClientCard } from "@/components/clients/client-card";
import { LoadingState } from "@/components/loading-state";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface ClientsContentProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export function ClientsContent({ searchParams }: ClientsContentProps) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const clientsResponse = useQuery(api.clients.getAll, {
    paginationOpts: {
      numToSkip: 0,
      numToTake: 100
    }
  });
  const clients = clientsResponse?.clients || [];

  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  // Handle URL parameter for client details
  useEffect(() => {
    const clientId = searchParams["id"];
    if (clientId && typeof clientId === "string") {
      setSelectedClientId(clientId as Id<"clients">);
      setShowDetails(true);
    }
  }, [searchParams]);

  if (!isLoaded) {
    return <LoadingState fullScreen={true} />;
  }

  if (!userId) {
    return null;
  }

  if (!clientsResponse) {
    return <LoadingState fullScreen={true} />;
  }
  
  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage your client information and view their tasks and invoices
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => {
                setSelectedClientId(null);
                setIsOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              Add Client
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard
              key={client._id}
              client={client}
              onEdit={() => {
                setSelectedClientId(client._id);
                setIsOpen(true);
              }}
              onDelete={() => {
                // Handle delete
              }}
            />
          ))}
        </div>

        <ClientDialog
          open={isOpen}
          clientId={selectedClientId}
          onOpenChange={setIsOpen}
        />

        {selectedClientId && (
          <ClientDetails
            clientId={selectedClientId}
            open={showDetails}
            onOpenChange={setShowDetails}
          />
        )}
      </div>
    </div>
  );
} 