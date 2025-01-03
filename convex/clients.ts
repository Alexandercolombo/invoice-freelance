import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "./lib/validators";

const DEFAULT_PAGE_SIZE = 10;

// Get a single client by ID
export const get = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const client = await ctx.db.get(args.id);
    if (!client || client.userId !== identity.subject) {
      throw new ConvexError("Client not found or access denied");
    }

    return client;
  },
});

// Get all clients with pagination and search
export const getAll = query({
  args: {
    paginationOpts: v.optional(v.object({
      numToSkip: v.number(),
      numToTake: v.number(),
    })),
    search: v.optional(v.string()),
    sortBy: v.optional(v.union(v.literal("name"), v.literal("email"), v.literal("hourlyRate"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    let query = ctx.db
      .query("clients")
      .withIndex("by_user")
      .filter(q => q.eq(q.field("userId"), identity.subject));

    const allClients = await query.collect();

    // Filter in memory for more flexible search
    let filteredClients = allClients;
    if (args.search) {
      const search = args.search.toLowerCase();
      filteredClients = allClients.filter(client => 
        client.name.toLowerCase().includes(search) ||
        client.email.toLowerCase().includes(search)
      );
    }

    // Sort in memory
    let sortedClients = [...filteredClients];
    if (args.sortBy) {
      sortedClients.sort((a, b) => {
        const aVal = a[args.sortBy!];
        const bVal = b[args.sortBy!];
        const multiplier = args.sortOrder === "asc" ? 1 : -1;

        if (args.sortBy === "hourlyRate") {
          return multiplier * (Number(aVal) - Number(bVal));
        }

        return multiplier * String(aVal).localeCompare(String(bVal));
      });
    }

    // Apply pagination
    const { numToSkip = 0, numToTake = DEFAULT_PAGE_SIZE } = args.paginationOpts ?? {};
    const paginatedClients = sortedClients.slice(numToSkip, numToSkip + numToTake);

    return {
      clients: paginatedClients,
      total: filteredClients.length,
      hasMore: (numToSkip + numToTake) < filteredClients.length,
    };
  },
});

// Create a new client with validation
export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    address: v.string(),
    hourlyRate: v.number(),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new ConvexError("Invalid email format");
    }

    // Validate hourly rate
    if (args.hourlyRate < 0) {
      throw new ConvexError("Hourly rate cannot be negative");
    }

    // Check if email is already in use by another client
    const existingClient = await ctx.db
      .query("clients")
      .withIndex("by_email")
      .filter(q => 
        q.and(
          q.eq(q.field("userId"), identity.subject),
          q.eq(q.field("email"), args.email)
        )
      )
      .first();

    if (existingClient) {
      throw new ConvexError("A client with this email already exists");
    }

    const client = await ctx.db.insert("clients", {
      name: args.name,
      email: args.email,
      address: args.address,
      hourlyRate: args.hourlyRate,
      status: args.status ?? "active",
      userId: identity.subject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return client;
  },
});

// Update a client with validation
export const update = mutation({
  args: {
    id: v.id("clients"),
    name: v.string(),
    email: v.string(),
    address: v.string(),
    hourlyRate: v.number(),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const { id, ...updates } = args;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updates.email)) {
      throw new ConvexError("Invalid email format");
    }

    // Validate hourly rate
    if (updates.hourlyRate < 0) {
      throw new ConvexError("Hourly rate cannot be negative");
    }

    const existingClient = await ctx.db.get(id);
    if (!existingClient || existingClient.userId !== identity.subject) {
      throw new ConvexError("Client not found or access denied");
    }

    // Check if email is already in use by another client
    if (updates.email !== existingClient.email) {
      const emailInUse = await ctx.db
        .query("clients")
        .withIndex("by_email")
        .filter(q => 
          q.and(
            q.eq(q.field("userId"), identity.subject),
            q.eq(q.field("email"), updates.email),
            q.neq(q.field("_id"), id)
          )
        )
        .first();

      if (emailInUse) {
        throw new ConvexError("A client with this email already exists");
      }
    }

    await ctx.db.patch(id, {
      name: updates.name,
      email: updates.email,
      address: updates.address,
      hourlyRate: updates.hourlyRate,
      status: updates.status,
      updatedAt: new Date().toISOString(),
    });

    return await ctx.db.get(id);
  },
});

// Archive a client instead of deleting
export const archive = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const existingClient = await ctx.db.get(args.id);
    if (!existingClient || existingClient.userId !== identity.subject) {
      throw new ConvexError("Client not found or access denied");
    }

    await ctx.db.patch(args.id, {
      status: "inactive",
      updatedAt: new Date().toISOString(),
    });
  },
});

// Delete a client with cascade check
export const remove = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const existingClient = await ctx.db.get(args.id);
    if (!existingClient || existingClient.userId !== identity.subject) {
      throw new ConvexError("Client not found or access denied");
    }

    // Check for related records
    const tasks = await ctx.db
      .query("tasks")
      .filter(q => q.eq(q.field("clientId"), args.id))
      .collect();

    const invoices = await ctx.db
      .query("invoices")
      .filter(q => q.eq(q.field("clientId"), args.id))
      .collect();

    if (tasks.length > 0 || invoices.length > 0) {
      throw new ConvexError(
        "Cannot delete client with existing tasks or invoices. Please archive the client instead."
      );
    }

    await ctx.db.delete(args.id);
  },
});

// Migration: Update existing clients with status
export const migrateExistingClientsStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const clients = await ctx.db
      .query("clients")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    for (const client of clients) {
      if (!client.status) {
        await ctx.db.patch(client._id, {
          status: "active",
          updatedAt: new Date().toISOString(),
        });
      }
    }
  },
});

export const getById = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const client = await ctx.db.get(args.id);
    if (!client || client.userId !== identity.subject) {
      throw new ConvexError("Client not found");
    }

    return client;
  },
}); 