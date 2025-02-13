import { mutation } from "./_generated/server";

export const fixUserIds = mutation({
  args: {},
  handler: async (ctx) => {
    const invoices = await ctx.db.query("invoices").collect();
    console.log("[Fix] Found", invoices.length, "invoices to check");
    
    let updated = 0;
    for (const invoice of invoices) {
      const userId = invoice.userId;
      // Handle both formats: URL|id and just URL format
      if (userId && (userId.includes("|") || userId.includes("clerk.accounts.dev"))) {
        // Extract the last part after | or the user_ part
        const shortId = userId.includes("|") 
          ? userId.split("|").pop() 
          : userId.match(/user_[a-zA-Z0-9]+/)?.[0];
          
        if (shortId) {
          await ctx.db.patch(invoice._id, {
            userId: shortId,
            updatedAt: new Date().toISOString()
          });
          updated++;
          console.log("[Fix] Updated invoice", invoice._id, "from", userId, "to", shortId);
        }
      }
    }
    
    console.log("[Fix] Updated", updated, "invoices");
    return { updated };
  }
});

export const checkUserIds = mutation({
  args: {},
  handler: async (ctx) => {
    const invoices = await ctx.db.query("invoices").collect();
    console.log("[Check] Found", invoices.length, "invoices");
    
    for (const invoice of invoices) {
      console.log("[Check] Invoice", invoice._id, "has userId:", invoice.userId);
    }
    
    return { count: invoices.length };
  }
}); 