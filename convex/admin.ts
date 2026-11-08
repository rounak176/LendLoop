import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const allLoans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const loans = await ctx.db.query("loans").collect();
    return Promise.all(
      loans.map(async (loan) => {
        const [tool, borrower, owner] = await Promise.all([
          ctx.db.get(loan.toolId),
          ctx.db.get(loan.borrowerId),
          ctx.db.get(loan.ownerId),
        ]);
        return {
          ...loan,
          toolName: tool?.name ?? "Removed listing",
          borrowerName: borrower?.displayName ?? "Neighbor",
          ownerName: owner?.displayName ?? "Neighbor",
        };
      }),
    );
  },
});

export const allUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.map(({ _id, displayName, role, trustedLender }) => ({
      _id,
      displayName,
      role,
      trustedLender,
    }));
  },
});

export const allTools = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const tools = await ctx.db.query("tools").collect();
    return Promise.all(tools.map(async (tool) => ({
      ...tool,
      ownerName: (await ctx.db.get(tool.ownerId))?.displayName ?? "Neighbor",
    })));
  },
});

export const setTrustedLenderForUser = mutation({
  args: { userId: v.id("users"), trustedLender: v.boolean() },
  handler: async (ctx, { userId, trustedLender }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(userId, { trustedLender, updatedAt: Date.now() });
  },
});

export const removeAnyListing = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    await requireAdmin(ctx);
    const tool = await ctx.db.get(toolId);
    if (tool?.isActive) await ctx.db.patch(toolId, { isActive: false, updatedAt: Date.now() });
  },
});

export const removeListing = internalMutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const tool = await ctx.db.get(toolId);
    if (tool?.isActive) await ctx.db.patch(toolId, { isActive: false, updatedAt: Date.now() });
  },
});

export const setTrustedLender = internalMutation({
  args: { userId: v.id("users"), trustedLender: v.boolean() },
  handler: async (ctx, { userId, trustedLender }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(userId, { trustedLender, updatedAt: Date.now() });
  },
});

export const bootstrapAdmin = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new Error("User must sign in once before admin bootstrap");
    await ctx.db.patch(user._id, { role: "admin", updatedAt: Date.now() });
  },
});