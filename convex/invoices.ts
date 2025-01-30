import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { getUser } from "./auth";

export const getInvoices = query({
  args: { clientId: v.id("clients") },
  async handler(ctx, args) {
    const identity = await getUser(ctx);
    return await ctx.db
      .query("invoices")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();
  },
});

export const getUnbilledTasksByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);
    
    return await ctx.db
      .query("tasks_v2")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), identity.subject),
          q.eq(q.field("invoiced"), false)
        )
      )
      .collect();
  },
});

export const createInvoice = mutation({
  args: {
    clientId: v.id("clients"),
    taskIds: v.array(v.id("tasks_v2")),
    date: v.string(),
    dueDate: v.optional(v.string()),
    tax: v.number(),
    notes: v.optional(v.string()),
    number: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);

    // Get tasks and calculate totals
    const tasks = await Promise.all(
      args.taskIds.map(id => ctx.db.get(id))
    );

    // Verify all tasks exist and belong to this user
    if (tasks.some(task => !task || task.userId !== identity.subject)) {
      throw new ConvexError("One or more tasks not found or access denied");
    }

    // Filter out any null tasks and calculate totals
    const validTasks = tasks.filter((task): task is NonNullable<typeof task> => task !== null);
    const subtotal = validTasks.reduce((sum, task) => sum + (task.amount ?? 0), 0);
    const total = subtotal + (subtotal * args.tax / 100);

    // Get the latest invoice number for this user
    const latestInvoice = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .first();

    // Generate next invoice number
    let nextNumber;
    if (args.number) {
      nextNumber = args.number;
    } else {
      const lastNumber = latestInvoice ? parseInt(latestInvoice.number) : 0;
      nextNumber = String(lastNumber + 1).padStart(3, '0');
    }

    // Create invoice
    const invoiceId = await ctx.db.insert("invoices", {
      number: nextNumber,
      date: args.date,
      dueDate: args.dueDate,
      clientId: args.clientId,
      tasks: args.taskIds,
      subtotal,
      tax: args.tax,
      total,
      notes: args.notes,
      status: "draft",
      userId: identity.subject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Mark tasks as invoiced
    await Promise.all(
      args.taskIds.map(taskId =>
        ctx.db.patch(taskId, { invoiced: true })
      )
    );

    // Get the created invoice with client details
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice) {
      throw new ConvexError("Failed to create invoice");
    }

    const client = await ctx.db.get(invoice.clientId);
    if (!client) {
      throw new ConvexError("Client not found");
    }

    return {
      ...invoice,
      client,
      tasks: validTasks,
    };
  },
});

export const updateInvoiceStatus = mutation({
  args: {
    id: v.id("invoices"),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid")),
  },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);

    const invoice = await ctx.db.get(args.id);
    if (!invoice || invoice.userId !== identity.subject) {
      throw new ConvexError("Invoice not found or access denied");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });

    return await ctx.db.get(args.id);
  },
});

export const deleteInvoice = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);

    const invoice = await ctx.db.get(args.id);
    if (!invoice || invoice.userId !== identity.subject) {
      throw new ConvexError("Invoice not found");
    }

    // Mark tasks as not invoiced
    const tasks = await ctx.db
      .query("tasks_v2")
      .withIndex("by_client", (q) => q.eq("clientId", invoice.clientId))
      .collect();

    // Filter tasks that belong to this invoice
    const invoiceTasks = tasks.filter(task => 
      task && invoice.tasks.includes(task._id as Id<"tasks_v2">)
    );

    // Update tasks
    await Promise.all(
      invoiceTasks.map(task =>
        ctx.db.patch(task._id, {
          invoiced: false,
          updatedAt: new Date().toISOString(),
        })
      )
    );

    // Delete the invoice
    await ctx.db.delete(args.id);
    return true;
  },
});

export const getInvoice = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);

    const invoice = await ctx.db.get(args.id);
    if (!invoice || invoice.userId !== identity.subject) {
      return null;
    }

    // Get client details
    const client = await ctx.db.get(invoice.clientId);
    if (!client) {
      return null;
    }

    // Get tasks
    const tasks = await Promise.all(
      invoice.tasks.map(async (taskId) => {
        const task = await ctx.db.get(taskId);
        return task;
      })
    );

    // Filter out any null tasks
    const validTasks = tasks.filter((task): task is NonNullable<typeof task> => task !== null);

    return {
      ...invoice,
      client,
      tasks: validTasks,
    };
  },
});

export const getAllInvoices = query({
  args: {
    paginationOpts: v.object({
      numToSkip: v.number(),
      numToTake: v.number(),
    }),
  },
  async handler(ctx, args) {
    const identity = await getUser(ctx);

    // Get paginated invoices with basic data
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    // Get client details for each invoice efficiently
    const clientIds = new Set(invoices.map(invoice => invoice.clientId));
    const clientsPromises = Array.from(clientIds).map(async (clientId) => {
      const client = await ctx.db.get(clientId);
      return { clientId, client };
    });
    
    const clientsResults = await Promise.all(clientsPromises);
    const clientsMap = new Map(
      clientsResults
        .filter(result => result.client !== null)
        .map(result => [result.clientId, result.client])
    );

    // Map the invoices with their client data
    const invoicesWithDetails = invoices.map(invoice => {
      const client = clientsMap.get(invoice.clientId);
      return {
        _id: invoice._id,
        number: invoice.number,
        date: invoice.date,
        dueDate: invoice.dueDate,
        status: invoice.status,
        total: invoice.total,
        client: client ? {
          name: client.name || '',
          email: client.email || '',
          hourlyRate: client.hourlyRate || 0
        } : null
      };
    });

    return invoicesWithDetails;
  },
});

export const updateInvoice = mutation({
  args: {
    id: v.id("invoices"),
    dueDate: v.optional(v.string()),
    tax: v.number(),
    notes: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid")),
    number: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);

    const invoice = await ctx.db.get(args.id);
    if (!invoice || invoice.userId !== identity.subject) {
      throw new ConvexError("Invoice not found or access denied");
    }

    // Recalculate total if tax has changed
    const total = invoice.subtotal + (invoice.subtotal * args.tax / 100);

    await ctx.db.patch(args.id, {
      dueDate: args.dueDate,
      tax: args.tax,
      total,
      notes: args.notes,
      status: args.status,
      number: args.number ?? invoice.number,
      updatedAt: new Date().toISOString(),
    });

    return await ctx.db.get(args.id);
  },
}); 