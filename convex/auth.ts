import { ConvexError, v } from "convex/values";
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function getUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("You must be logged in to perform this action");
  }
  return identity;
}

export const validateUser = v.object({
  name: v.string(),
  email: v.string(),
  businessName: v.string(),
  paymentInstructions: v.string(),
  logoUrl: v.optional(v.string()),
  tokenIdentifier: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
}); 