import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  tasks: defineTable({
    amount: v.optional(v.float64()),
    client: v.optional(v.string()),
    clientId: v.id("clients"),
    createdAt: v.optional(v.string()),
    date: v.optional(v.string()),
    description: v.optional(v.string()),
    hours: v.float64(),
    hourlyRate: v.optional(v.float64()),
    invoiceId: v.optional(v.id("invoices")),
    invoiced: v.optional(v.boolean()),
    status: v.union(v.literal("pending"), v.literal("completed")),
    updatedAt: v.string(),
    userId: v.string(),
  }).index("by_user", ["userId"])
    .index("by_client", ["clientId"])
    .index("by_user_and_date", ["userId", "createdAt"]),
  clients: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    hourlyRate: v.float64(),
    userId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  }).index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_user_and_status", ["userId", "status"]),
  users: defineTable({
    address: v.optional(v.string()),
    businessName: v.string(),
    createdAt: v.string(),
    email: v.string(),
    invoiceNotes: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    name: v.string(),
    notes: v.optional(v.string()),
    paymentInstructions: v.string(),
    phone: v.optional(v.string()),
    tokenIdentifier: v.string(),
    updatedAt: v.string(),
    website: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),
  invoices: defineTable({
    number: v.string(),
    date: v.string(),
    dueDate: v.string(),
    clientId: v.id("clients"),
    tasks: v.array(v.id("tasks")),
    subtotal: v.float64(),
    tax: v.optional(v.float64()),
    total: v.float64(),
    notes: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid")),
    userId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_user", ["userId"])
    .index("by_client", ["clientId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_date", ["userId", "date"]),
}) 