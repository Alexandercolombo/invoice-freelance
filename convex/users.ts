import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getUser } from "./auth";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getUser(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => 
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    return user;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    businessName: v.string(),
    paymentInstructions: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    invoiceNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => 
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (existingUser) {
      throw new ConvexError("User already exists");
    }

    return await ctx.db.insert("users", {
      ...args,
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const update = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    businessName: v.optional(v.string()),
    paymentInstructions: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    invoiceNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => 
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    await ctx.db.patch(user._id, args);
    return await ctx.db.get(user._id);
  },
}); 