import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { getUser } from "./auth";

type Invoice = Doc<"invoices">;
type Client = Doc<"clients">;

export const getInvoices = query({
  args: { clientId: v.id("clients") },
  async handler(ctx, args) {
    const identity = await getUser(ctx);
    const shortUserId = identity.tokenIdentifier.split('|').pop() || identity.tokenIdentifier;
    
    return await ctx.db
      .query("invoices")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => 
        q.or(
          q.eq(q.field("userId"), identity.tokenIdentifier),
          q.eq(q.field("userId"), identity.subject),
          q.eq(q.field("userId"), shortUserId)
        )
      )
      .collect();
  },
});

export const getUnbilledTasksByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);
    const shortUserId = identity.tokenIdentifier.split('|').pop() || identity.tokenIdentifier;
    
    return await ctx.db
      .query("tasks_v2")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => 
        q.and(
          q.or(
            q.eq(q.field("userId"), identity.tokenIdentifier),
            q.eq(q.field("userId"), identity.subject),
            q.eq(q.field("userId"), shortUserId)
          ),
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
    const shortUserId = identity.tokenIdentifier.split('|').pop() || identity.tokenIdentifier;

    // Get tasks and calculate totals
    const tasks = await Promise.all(
      args.taskIds.map(id => ctx.db.get(id))
    );

    // Verify all tasks exist and belong to this user
    if (tasks.some(task => !task || (
      task.userId !== identity.tokenIdentifier &&
      task.userId !== identity.subject &&
      task.userId !== shortUserId
    ))) {
      throw new ConvexError("One or more tasks not found or access denied");
    }

    // Filter out any null tasks and calculate totals
    const validTasks = tasks.filter((task): task is NonNullable<typeof task> => task !== null);
    const subtotal = validTasks.reduce((sum, task) => sum + (task.amount ?? 0), 0);
    const total = subtotal + (subtotal * args.tax / 100);

    // Get the latest invoice number for this user
    const latestInvoice = await ctx.db
      .query("invoices")
      .filter(q => 
        q.or(
          q.eq(q.field("userId"), identity.tokenIdentifier),
          q.eq(q.field("userId"), identity.subject),
          q.eq(q.field("userId"), shortUserId)
        )
      )
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

    // Create invoice with short user ID only
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
      userId: shortUserId, // Store only the short user ID
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
    const shortUserId = identity.tokenIdentifier.split('|').pop() || identity.tokenIdentifier;

    const invoice = await ctx.db.get(args.id);
    if (!invoice || (
      invoice.userId !== identity.tokenIdentifier &&
      invoice.userId !== identity.subject &&
      invoice.userId !== shortUserId
    )) {
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
    const shortUserId = identity.tokenIdentifier.split('|').pop() || identity.tokenIdentifier;

    const invoice = await ctx.db.get(args.id);
    if (!invoice || (
      invoice.userId !== identity.tokenIdentifier &&
      invoice.userId !== identity.subject &&
      invoice.userId !== shortUserId
    )) {
      throw new ConvexError("Invoice not found or access denied");
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
    console.log("[Debug] getInvoice: Got user identity", {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
      issuer: identity.issuer,
      invoiceId: args.id
    });

    const invoice = await ctx.db.get(args.id);
    if (!invoice) {
      console.log("[Debug] getInvoice: Invoice not found", { invoiceId: args.id });
      return null;
    }

    // Extract the user ID portion from the tokenIdentifier
    const shortUserId = identity.tokenIdentifier.split('|').pop() || identity.tokenIdentifier;

    // Check all ID formats
    const isAuthorized = 
      invoice.userId === identity.tokenIdentifier || 
      invoice.userId === identity.subject ||
      invoice.userId === shortUserId;

    console.log("[Debug] getInvoice: Authorization check", {
      invoiceUserId: invoice.userId,
      tokenIdentifier: identity.tokenIdentifier,
      subject: identity.subject,
      shortUserId,
      isAuthorized,
      invoiceId: args.id,
      matches: {
        fullMatch: invoice.userId === identity.tokenIdentifier,
        subjectMatch: invoice.userId === identity.subject,
        shortMatch: invoice.userId === shortUserId
      }
    });

    if (!isAuthorized) {
      console.log("[Debug] getInvoice: Unauthorized access", {
        invoiceUserId: invoice.userId,
        userIdentity: {
          subject: identity.subject,
          tokenIdentifier: identity.tokenIdentifier,
          shortUserId
        },
        invoiceId: args.id
      });
      return null;
    }

    // Get client details
    const client = await ctx.db.get(invoice.clientId);
    if (!client) {
      console.log("[Debug] getInvoice: Client not found", { 
        clientId: invoice.clientId,
        invoiceId: args.id 
      });
      return null;
    }

    // Get tasks with proper hourly rate and amount calculations
    const tasks = await Promise.all(
      invoice.tasks.map(async (taskId) => {
        const task = await ctx.db.get(taskId);
        if (!task) {
          console.log("[Debug] getInvoice: Task not found", {
            taskId,
            invoiceId: args.id
          });
          return null;
        }
        
        // Use task's hourly rate if available, otherwise use client's rate
        const hourlyRate = task.hourlyRate ?? client.hourlyRate;
        const amount = task.hours * hourlyRate;
        
        return {
          ...task,
          hourlyRate,
          amount
        };
      })
    );

    // Filter out any null tasks
    const validTasks = tasks.filter((task): task is NonNullable<typeof task> => task !== null);

    console.log("[Debug] getInvoice: Successfully retrieved invoice", {
      invoiceId: args.id,
      hasClient: !!client,
      taskCount: validTasks.length,
      userId: invoice.userId
    });

    return {
      ...invoice,
      client,
      tasks: validTasks,
    };
  },
});

export const getAllInvoices = query({
  args: {
    paginationOpts: v.optional(
      v.object({
        numToSkip: v.float64(),
        numToTake: v.float64(),
      })
    ),
  },
  async handler(ctx, args) {
    try {
      console.log("[Debug] getAllInvoices: Starting query execution");
      
      // Get user identity using the getUser helper
      const identity = await getUser(ctx);
      console.log("[Debug] getAllInvoices: Got user identity", {
        subject: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
        email: identity.email,
        issuer: identity.issuer
      });

      // Extract the user ID portion from the tokenIdentifier
      const shortUserId = identity.tokenIdentifier.split('|').pop() || identity.tokenIdentifier;
      
      // Get invoices with proper index and filtering, checking both ID formats
      console.log("[Debug] getAllInvoices: Querying invoices with both ID formats");
      const invoices = await ctx.db
        .query("invoices")
        .filter(q => 
          q.or(
            q.eq(q.field("userId"), identity.tokenIdentifier),
            q.eq(q.field("userId"), identity.subject),
            q.eq(q.field("userId"), shortUserId)
          )
        )
        .order("desc")
        .collect();
      
      // Log detailed information about found invoices
      console.log("[Debug] getAllInvoices: Query results", {
        totalCount: invoices.length,
        hasResults: invoices.length > 0,
        userIdentity: {
          subject: identity.subject,
          tokenIdentifier: identity.tokenIdentifier,
          shortUserId
        },
        invoices: invoices.map(invoice => ({
          id: invoice._id,
          userId: invoice.userId,
          matchesSubject: invoice.userId === identity.subject,
          matchesToken: invoice.userId === identity.tokenIdentifier,
          matchesShort: invoice.userId === shortUserId,
          number: invoice.number,
          date: invoice.date
        }))
      });

      // Return empty array if no invoices found
      if (!invoices || invoices.length === 0) {
        console.log("[Debug] getAllInvoices: No invoices found for user");
        return [];
      }

      // Apply pagination if needed
      const paginatedInvoices = args.paginationOpts
        ? invoices.slice(
            args.paginationOpts.numToSkip,
            args.paginationOpts.numToSkip + args.paginationOpts.numToTake
          )
        : invoices;
      
      console.log("[Debug] getAllInvoices: Paginated to", paginatedInvoices.length, "invoices");

      try {
        // Get client details for each invoice efficiently
        const clientIds = new Set(paginatedInvoices.map(invoice => invoice.clientId));
        console.log("[Debug] getAllInvoices: Fetching", clientIds.size, "unique clients");
        
        const clientsPromises = Array.from(clientIds).map(async (clientId) => {
          try {
            const client = await ctx.db.get(clientId);
            return { clientId, client };
          } catch (err) {
            console.error("[Error] getAllInvoices: Failed to fetch client", clientId, err);
            return { clientId, client: null };
          }
        });
        
        const clientsResults = await Promise.all(clientsPromises);
        const clientsMap = new Map(
          clientsResults
            .filter((result): result is { clientId: Id<"clients">; client: NonNullable<Client> } => 
              result.client !== null
            )
            .map(result => [result.clientId, result.client])
        );

        console.log("[Debug] getAllInvoices: Successfully fetched", clientsMap.size, "clients");

        // Map the invoices with their client data
        const invoicesWithDetails = paginatedInvoices
          .map((invoice) => {
            try {
              const client = clientsMap.get(invoice.clientId);
              if (!client) {
                console.log("[Debug] getAllInvoices: No client found for invoice", invoice._id);
                return null;
              }
              
              return {
                _id: invoice._id,
                number: invoice.number,
                date: invoice.date,
                dueDate: invoice.dueDate,
                status: invoice.status,
                total: invoice.total,
                tax: invoice.tax,
                notes: invoice.notes,
                client: {
                  name: client.name,
                  email: client.email
                }
              };
            } catch (err) {
              console.error("[Error] getAllInvoices: Failed to process invoice", invoice._id, err);
              return null;
            }
          })
          .filter((invoice): invoice is NonNullable<typeof invoice> => invoice !== null);

        console.log("[Debug] getAllInvoices: Final result", {
          totalInvoices: invoices.length,
          paginatedCount: paginatedInvoices.length,
          processedCount: invoicesWithDetails.length
        });
        
        return invoicesWithDetails;
      } catch (clientError) {
        console.error("[Error] getAllInvoices: Failed to process clients", clientError);
        // Return basic invoice data without client details
        return paginatedInvoices.map(invoice => ({
          _id: invoice._id,
          number: invoice.number,
          date: invoice.date,
          dueDate: invoice.dueDate,
          status: invoice.status,
          total: invoice.total,
          tax: invoice.tax,
          notes: invoice.notes,
          client: null
        }));
      }
    } catch (error) {
      console.error("[Error] getAllInvoices: Top-level error", error);
      // Return an empty array to prevent UI breakage
      return [];
    }
  }
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
    const shortUserId = identity.tokenIdentifier.split('|').pop() || identity.tokenIdentifier;

    const invoice = await ctx.db.get(args.id);
    if (!invoice || (
      invoice.userId !== identity.tokenIdentifier &&
      invoice.userId !== identity.subject &&
      invoice.userId !== shortUserId
    )) {
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