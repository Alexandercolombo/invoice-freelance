import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { Resend } from "resend";
import { ConvexError } from "convex/values";

export const getInvoices = query({
  args: {
    clientId: v.optional(v.id("clients")),
    status: v.optional(v.union(v.literal("draft"), v.literal("sent"), v.literal("paid"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    let query = ctx.db
      .query("invoices")
      .filter((q) => q.eq(q.field("userId"), identity.subject));

    if (args.clientId) {
      query = query.filter((q) => q.eq(q.field("clientId"), args.clientId));
    }

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const invoices = await query.order("desc").collect();

    // Get client details and tasks for each invoice
    const invoicesWithDetails = await Promise.all(
      invoices.map(async (invoice) => {
        const client = await ctx.db.get(invoice.clientId);
        const tasks = await ctx.db
          .query("tasks")
          .filter((q) => q.eq(q.field("invoiceId"), invoice._id))
          .collect();

        return {
          ...invoice,
          client,
          tasks,
        };
      })
    );

    return invoicesWithDetails;
  },
});

export const getUnbilledTasksByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    
    return await ctx.db
      .query("tasks")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), identity.subject),
          q.eq(q.field("clientId"), args.clientId),
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
    notes: v.optional(v.string()),
    tax: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const userId = identity.subject;

    // Verify client belongs to user
    const client = await ctx.db.get(args.clientId);
    if (!client || client.userId !== userId) {
      throw new ConvexError("Invalid client");
    }

    // Get all tasks and calculate totals
    const tasks = await Promise.all(
      args.taskIds.map(async (id) => {
        const task = await ctx.db.get(id);
        if (!task || task.userId !== userId || task.invoiced) {
          throw new ConvexError("Invalid or already invoiced task");
        }
        return task;
      })
    );

    const subtotal = tasks.reduce((sum, task) => sum + (task.hours * client.hourlyRate), 0);
    const total = subtotal + args.tax;

    // Generate invoice number (format: INV-YYYYMMDD-XXX)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const existingInvoices = await ctx.db
      .query("invoices")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    const invoiceNumber = `INV-${dateStr}-${(existingInvoices.length + 1).toString().padStart(3, '0')}`;

    // Create invoice
    const invoice = await ctx.db.insert("invoices", {
      number: invoiceNumber,
      clientId: args.clientId,
      userId,
      date: args.date,
      dueDate: args.dueDate,
      status: "draft",
      subtotal,
      tax: args.tax,
      total,
      notes: args.notes,
      tasks: args.taskIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update tasks with invoice ID
    await Promise.all(
      tasks.map(async (task) => {
        await ctx.db.patch(task._id, {
          invoiced: true,
          invoiceId: invoice,
          updatedAt: new Date().toISOString(),
        });
      })
    );

    return invoice;
  },
});

export const updateInvoiceStatus = mutation({
  args: {
    id: v.id("invoices"),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const invoice = await ctx.db.get(args.id);
    if (!invoice || invoice.userId !== identity.subject) {
      throw new ConvexError("Invoice not found or access denied");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const deleteInvoice = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    
    const invoice = await ctx.db.get(args.id);
    if (!invoice || invoice.userId !== identity.subject) {
      throw new ConvexError("Invoice not found or access denied");
    }

    if (invoice.status !== "draft") {
      throw new ConvexError("Can only delete draft invoices");
    }

    // Un-invoice all associated tasks
    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("invoiceId"), args.id))
      .collect();

    await Promise.all(
      tasks.map(async (task) => {
        await ctx.db.patch(task._id, {
          invoiced: false,
          invoiceId: undefined,
          updatedAt: new Date().toISOString(),
        });
      })
    );

    await ctx.db.delete(args.id);
  },
});

export const getInvoice = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

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

    return {
      ...invoice,
      client,
      tasks: tasks.filter(Boolean),
    };
  },
});

export const sendInvoiceEmail = action({
  args: {
    invoiceId: v.id("invoices"),
    recipientEmail: v.string(),
    recipientName: v.string(),
  },
  handler: async (ctx, args) => {
    const { RESEND_API_KEY, NEXT_PUBLIC_BASE_URL } = process.env;
    if (!RESEND_API_KEY) {
      throw new ConvexError("Missing RESEND_API_KEY in environment variables");
    }
    if (!NEXT_PUBLIC_BASE_URL) {
      throw new ConvexError("Missing NEXT_PUBLIC_BASE_URL in environment variables");
    }

    const resend = new Resend(RESEND_API_KEY);

    try {
      await resend.emails.send({
        from: "invoices@example.com", // Update with your verified domain
        to: args.recipientEmail,
        subject: "New Invoice",
        html: `<p>Dear ${args.recipientName},</p>
              <p>A new invoice has been generated for you.</p>
              <p>Please click the link below to view your invoice:</p>
              <p><a href="${NEXT_PUBLIC_BASE_URL}/invoices/${args.invoiceId}/preview">View Invoice</a></p>`,
      });

      // Update invoice status
      await ctx.runMutation(async ({ db }) => {
        const invoice = await db.get(args.invoiceId);
        if (!invoice) {
          throw new ConvexError("Invoice not found");
        }

        await db.patch(args.invoiceId, {
          status: "sent" as const,
          updatedAt: new Date().toISOString(),
        });
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send invoice email:", error);
      throw new ConvexError("Failed to send invoice email");
    }
  },
}); 