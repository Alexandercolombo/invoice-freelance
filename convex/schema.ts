import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    businessName: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    paymentInstructions: v.string(),
    invoiceNotes: v.optional(v.string()),
    tokenIdentifier: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  clients: defineTable({
    name: v.string(),
    email: v.string(),
    address: v.optional(v.string()),
    hourlyRate: v.number(),
    userId: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  }).index("by_user", ["userId"])
    .index("by_email", ["email"]),

  tasks: defineTable({
    description: v.string(),
    hours: v.number(),
    date: v.string(),
    amount: v.number(),
    hourlyRate: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    userId: v.string(),
    clientId: v.id("clients"),
    invoiceId: v.optional(v.id("invoices")),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_user", ["userId"])
    .index("by_client", ["clientId"])
    .index("by_invoice", ["invoiceId"]),

  invoices: defineTable({
    number: v.string(),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid")),
    userId: v.string(),
    clientId: v.id("clients"),
    tasks: v.array(v.id("tasks")),
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    paidAt: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    date: v.string(),
  }).index("by_user", ["userId"])
    .index("by_client", ["clientId"]),
}) 