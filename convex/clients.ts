import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "./lib/validators";
import { getUser } from "./auth";

const DEFAULT_PAGE_SIZE = 10;

// Get a single client by ID
export const get = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);
    const client = await ctx.db.get(args.id);
    if (!client || (client.userId !== identity.tokenIdentifier && client.userId !== identity.subject)) {
      throw new ConvexError("Client not found or access denied");
    }
    return client;
  },
});

// Get all clients with pagination and search
export const getAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  async handler(ctx, args) {
    const identity = await getUser(ctx);
    const clients = await ctx.db
      .query("clients")
      .filter((q) => 
        q.or(
          q.eq(q.field("userId"), identity.tokenIdentifier),
          q.eq(q.field("userId"), identity.subject)
        )
      )
      .collect();

    const { numToSkip = 0, numToTake = DEFAULT_PAGE_SIZE } = args.paginationOpts;
    const paginatedClients = clients.slice(numToSkip, numToSkip + numToTake);

    return {
      clients: paginatedClients,
      totalCount: clients.length,
    };
  },
});

// Create a new client with validation
export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    hourlyRate: v.number(),
  },
  async handler(ctx, args) {
    const identity = await getUser(ctx);

    // Check if client with same email already exists
    const existingClient = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => 
        q.or(
          q.eq(q.field("userId"), identity.tokenIdentifier),
          q.eq(q.field("userId"), identity.subject)
        )
      )
      .first();

    if (existingClient) {
      throw new Error("A client with this email already exists");
    }

    return await ctx.db.insert("clients", {
      ...args,
      userId: identity.tokenIdentifier,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
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
    const identity = await getUser(ctx);
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
        .withIndex("by_email", (q) => q.eq("email", updates.email))
        .filter(q => 
          q.and(
            q.eq(q.field("userId"), identity.subject),
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
    const identity = await getUser(ctx);
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
    const identity = await getUser(ctx);
    const existingClient = await ctx.db.get(args.id);
    if (!existingClient || existingClient.userId !== identity.subject) {
      throw new ConvexError("Client not found or access denied");
    }

    // Check for related records
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
      .collect();

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
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
    const identity = await getUser(ctx);
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
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
  async handler(ctx, args) {
    const identity = await getUser(ctx);
    const client = await ctx.db.get(args.id);
    if (!client || client.userId !== identity.subject) {
      return null;
    }
    return client;
  },
}); 