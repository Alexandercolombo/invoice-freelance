import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  tasks: defineTable({
    description: v.string(),
    hours: v.number(),
    date: v.string(),
    clientId: v.id("clients"),
    hourlyRate: v.optional(v.number()),
    amount: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("completed")),
    userId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    invoiced: v.optional(v.boolean()),
  }).index("by_user", ["userId"])
    .index("by_client", ["clientId"]),
  clients: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    hourlyRate: v.number(),
    userId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_user", ["userId"])
    .index("by_email", ["email"]),
  users: defineTable({
    name: v.string(),
    email: v.string(),
    businessName: v.string(),
    paymentInstructions: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    invoiceNotes: v.optional(v.string()),
  }),
  invoices: defineTable({
    number: v.string(),
    date: v.string(),
    dueDate: v.string(),
    clientId: v.id("clients"),
    tasks: v.array(v.id("tasks")),
    subtotal: v.number(),
    tax: v.optional(v.number()),
    total: v.number(),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid")),
    userId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_user", ["userId"])
    .index("by_client", ["clientId"]),
}) 