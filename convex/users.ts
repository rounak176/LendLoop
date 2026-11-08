import { mutation, query } from "./_generated/server";
import { requireIdentity, getCurrentUser } from "./lib/auth";

export const syncProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    const now = Date.now();
    const displayName = identity.name?.trim() || "Neighbor";

    if (existing) {
      await ctx.db.patch(existing._id, { displayName, updatedAt: now });
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkId: identity.subject,
      displayName,
      role: "member",
      trustedLender: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const myProfile = query({
  args: {},
  handler: async (ctx) => getCurrentUser(ctx),
});