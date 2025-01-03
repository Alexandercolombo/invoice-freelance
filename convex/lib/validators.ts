import { v } from "convex/values";

export const paginationOptsValidator = v.object({
  numToSkip: v.number(),
  numToTake: v.number(),
}); 