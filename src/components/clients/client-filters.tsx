import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import { Doc } from "@convex/_generated/dataModel";

interface ClientFiltersProps {
  clients: Doc<"clients">[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ClientFilters({
  clients,
  searchQuery,
  onSearchChange,
}: ClientFiltersProps) {
  const activeClients = clients.length;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="inline-flex items-center gap-3 rounded-lg border bg-card text-card-foreground px-4 py-2">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-medium text-muted-foreground">Active Clients:</p>
          <p className="text-lg font-semibold">{activeClients}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients by name or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 w-full"
        />
      </div>
    </div>
  );
} 