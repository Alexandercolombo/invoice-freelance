import { mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

interface Invoice extends Doc<"invoices"> {
  userId: string;
}

/**
 * Migration script to update invoice user IDs from subject to tokenIdentifier
 */
export const migrateUserIds = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("[Debug] Starting user ID migration");
    
    // Get all invoices
    const allInvoices = await ctx.db.query("invoices").collect();
    console.log("[Debug] Found", allInvoices.length, "invoices to check");

    let updatedCount = 0;
    const errors: any[] = [];
    const skipped: any[] = [];

    // Get the user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("No user identity found");
    }

    console.log("[Debug] User identity for migration:", {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
      issuer: identity.issuer
    });

    // Group invoices by userId for analysis
    const invoicesByUserId = new Map<string, Invoice[]>();
    allInvoices.forEach(invoice => {
      const userId = invoice.userId;
      if (!invoicesByUserId.has(userId)) {
        invoicesByUserId.set(userId, []);
      }
      invoicesByUserId.get(userId)!.push(invoice);
    });

    console.log("[Debug] Invoice distribution:", {
      uniqueUserIds: Array.from(invoicesByUserId.keys()),
      countsByUserId: Array.from(invoicesByUserId.entries()).map(([userId, invoices]) => ({
        userId,
        count: invoices.length,
        matchesSubject: userId === identity.subject,
        matchesToken: userId === identity.tokenIdentifier
      }))
    });

    for (const invoice of allInvoices) {
      try {
        // Check if the invoice uses the old subject format
        if (invoice.userId === identity.subject) {
          console.log("[Debug] Updating invoice", invoice._id, {
            from: invoice.userId,
            to: identity.tokenIdentifier,
            number: invoice.number,
            date: invoice.date
          });
          
          // Update to use tokenIdentifier
          await ctx.db.patch(invoice._id, {
            userId: identity.tokenIdentifier,
            updatedAt: new Date().toISOString()
          });
          
          updatedCount++;
        } else {
          console.log("[Debug] Skipping invoice", invoice._id, {
            userId: invoice.userId,
            matchesSubject: invoice.userId === identity.subject,
            matchesToken: invoice.userId === identity.tokenIdentifier,
            number: invoice.number
          });
          skipped.push({
            invoiceId: invoice._id,
            userId: invoice.userId,
            reason: "userId does not match subject"
          });
        }
      } catch (error) {
        console.error("[Error] Failed to update invoice", invoice._id, error);
        errors.push({ 
          invoiceId: invoice._id, 
          userId: invoice.userId,
          error: (error as Error).message 
        });
      }
    }

    return {
      message: "Migration complete",
      stats: {
        total: allInvoices.length,
        updated: updatedCount,
        skipped: skipped.length,
        errors: errors.length,
        uniqueUserIds: invoicesByUserId.size
      },
      userIdentity: {
        subject: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
        email: identity.email,
        issuer: identity.issuer
      },
      errors,
      skipped
    };
  }
}); 