import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const loanStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("returned"),
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    displayName: v.string(),
    role: v.union(v.literal("member"), v.literal("admin")),
    trustedLender: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
  integrationNonces: defineTable({ nonce: v.string(), expiresAt: v.number() }).index("by_nonce", ["nonce"]).index("by_expiresAt", ["expiresAt"]),
  automationFailures: defineTable({ key: v.string(), code: v.string(), occurredAt: v.number() }).index("by_key", ["key"]),
  mockDeliveries: defineTable({ key: v.string(), recipientId: v.id("users"), message: v.string(), sentAt: v.number() }).index("by_key", ["key"]),
  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.string(),
    condition: v.union(v.literal("new"), v.literal("good"), v.literal("fair")),
    description: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_active_category", ["isActive", "category"]),
  loans: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    ownerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
    returnedAt: v.optional(v.number()),
  })
    .index("by_borrower", ["borrowerId"])
    .index("by_owner_status", ["ownerId", "status"])
    .index("by_tool_status", ["toolId", "status"])
    .index("by_status_and_endDate", ["status", "endDate"]),
  automationEvents: defineTable({
    eventId: v.string(),
    type: v.union(v.literal("loan.requested"), v.literal("loan.approved"), v.literal("loan.declined"), v.literal("loan.returned")),
    loanId: v.id("loans"),
    recipientId: v.id("users"),
    status: v.union(v.literal("queued"), v.literal("processing"), v.literal("sent"), v.literal("failed")),
    attemptCount: v.number(),
    occurredAt: v.number(),
    errorCode: v.optional(v.string()),
    readAt: v.optional(v.number()),
    claimToken: v.optional(v.string()),
    claimExpiresAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    nextAttemptAt: v.optional(v.number()),
  }).index("by_event_id", ["eventId"])
    .index("by_recipientId", ["recipientId"])
    .index("by_recipientId_and_readAt", ["recipientId", "readAt"]),
  reminders: defineTable({
    reminderKey: v.string(),
    loanId: v.id("loans"),
    localDate: v.string(),
    status: v.union(v.literal("processing"), v.literal("sent"), v.literal("failed")),
    claimToken: v.optional(v.string()),
    claimExpiresAt: v.optional(v.number()),
    attemptCount: v.number(),
    updatedAt: v.number(),
    sentAt: v.optional(v.number()),
    errorCode: v.optional(v.string()),
  })
    .index("by_reminder_key", ["reminderKey"])
    .index("by_loan_date", ["loanId", "localDate"]),
});