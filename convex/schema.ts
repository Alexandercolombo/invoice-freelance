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

  tasks_v2: defineTable({
    amount: v.optional(v.float64()),
    client: v.optional(v.string()),
    clientId: v.id("clients"),
    createdAt: v.optional(v.string()),
    date: v.optional(v.string()),
    description: v.optional(v.string()),
    hours: v.float64(),
    hourlyRate: v.optional(v.float64()),
    invoiceId: v.optional(v.id("invoices")),
    invoiced: v.boolean(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    updatedAt: v.string(),
    userId: v.string(),
  }).index("by_user", ["userId"])
    .index("by_client", ["clientId"])
    .index("by_user_and_date", ["userId", "createdAt"])
    .index("by_user_and_invoiced", ["userId", "invoiced"]),

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
    name: v.string(),
    email: v.string(),
    businessName: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    gmailRefreshToken: v.optional(v.string()),
    gmailConnected: v.optional(v.boolean()),
    createdAt: v.string(),
    invoiceNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
    paymentInstructions: v.string(),
    tokenIdentifier: v.string(),
    updatedAt: v.string(),
    website: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),
  invoices: defineTable({
    number: v.string(),
    date: v.string(),
    dueDate: v.optional(v.string()),
    clientId: v.id("clients"),
    tasks: v.array(v.union(v.id("tasks"), v.id("tasks_v2"))),
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