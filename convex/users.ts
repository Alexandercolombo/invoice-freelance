import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getUser } from "./auth";
import { MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

type UserIdentity = {
  subject: string;
  tokenIdentifier: string;
  email?: string;
  name?: string;
  issuer: string;
};

type User = Doc<"users">;

// Helper function to get or create a user
async function getOrCreateUser(ctx: MutationCtx, identity: UserIdentity): Promise<User | null> {
  console.log("[Debug] getOrCreateUser: Starting", {
    subject: identity.subject,
    tokenIdentifier: identity.tokenIdentifier,
    email: identity.email
  });

  // Try to find user by tokenIdentifier first
  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .first();

  // If not found, try subject as tokenIdentifier
  if (!user && identity.subject) {
    console.log("[Debug] getOrCreateUser: Not found by tokenIdentifier, trying subject");
    user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .first();

    // If found by subject, update to use tokenIdentifier
    if (user) {
      console.log("[Debug] getOrCreateUser: Found by subject, updating to tokenIdentifier");
      const userId = user._id;
      await ctx.db.patch(userId, {
        tokenIdentifier: identity.tokenIdentifier,
        updatedAt: new Date().toISOString()
      });
      user = await ctx.db.get(userId);
    }
  }

  // If still not found, create a new user
  if (!user) {
    console.log("[Debug] getOrCreateUser: User not found, creating new user");
    const userId = await ctx.db.insert("users", {
      name: identity.name || "",
      email: identity.email || "",
      businessName: "",
      paymentInstructions: "",
      tokenIdentifier: identity.tokenIdentifier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    user = await ctx.db.get(userId);
  }

  console.log("[Debug] getOrCreateUser: Result", {
    hasUser: !!user,
    userTokenIdentifier: user?.tokenIdentifier,
    userId: user?._id
  });

  return user;
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getUser(ctx);
    console.log("[Debug] users/get: Got user identity", {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email,
      issuer: identity.issuer
    });

    // For query, we can only read
    let user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    // If not found, try subject as tokenIdentifier
    if (!user && identity.subject) {
      console.log("[Debug] users/get: Not found by tokenIdentifier, trying subject");
      user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
        .first();
    }

    console.log("[Debug] users/get: Query result", {
      hasUser: !!user,
      userTokenIdentifier: user?.tokenIdentifier,
      matchesSubject: user?.tokenIdentifier === identity.subject,
      matchesToken: user?.tokenIdentifier === identity.tokenIdentifier
    });

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

export const updateGmailToken = mutation({
  args: {
    refreshToken: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      gmailRefreshToken: args.refreshToken,
      gmailConnected: true,
    });

    return { success: true };
  },
});

export const getGmailToken = query({
  handler: async (ctx) => {
    const identity = await getUser(ctx);
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
      .first();

    if (!user) return null;

    return {
      gmailRefreshToken: user.gmailRefreshToken,
      gmailConnected: user.gmailConnected,
    };
  },
});

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await getUser(ctx);
    const user = await getOrCreateUser(ctx, identity);
    return user;
  },
}); 