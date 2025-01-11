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
      .query("tasks")
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
    taskIds: v.array(v.id("tasks")),
    date: v.string(),
    dueDate: v.string(),
    tax: v.number(),
    notes: v.optional(v.string()),
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

    // Create invoice
    const invoiceId = await ctx.db.insert("invoices", {
      number: new Date().getTime().toString(), // Simple number generation
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

    return invoiceId;
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
      .query("tasks")
      .withIndex("by_client", (q) => q.eq("clientId", invoice.clientId))
      .collect();

    // Filter tasks that belong to this invoice
    const invoiceTasks = tasks.filter(task => 
      task && invoice.tasks.includes(task._id)
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