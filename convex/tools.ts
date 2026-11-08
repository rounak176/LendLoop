import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireIdentity, localDateNow } from "./lib/auth";

const toolFields = {
  name: v.string(),
  category: v.string(),
  condition: v.union(v.literal("new"), v.literal("good"), v.literal("fair")),
  description: v.string(),
};

function validateTool(input: { name: string; category: string; description: string }) {
  if (input.name.trim().length < 2 || input.name.length > 80) throw new Error("Tool name must be 2-80 characters");
  if (input.category.trim().length < 2 || input.category.length > 40) throw new Error("Choose a valid category");
  if (input.description.trim().length > 500) throw new Error("Description must be at most 500 characters");
}

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_active_category", (q) => q.eq("isActive", true))
      .collect();
    const today = localDateNow();
    const available = await Promise.all(tools.map(async tool => {
      const loans = await ctx.db.query("loans").withIndex("by_tool_status", q => q.eq("toolId", tool._id).eq("status", "approved")).collect();
      return loans.some(loan => loan.startDate <= today) ? null : { _id: tool._id, name: tool.name, category: tool.category };
    }));
    return available.filter((tool): tool is NonNullable<typeof tool> => tool !== null);
  },
});

export const listForMembers = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    const tools = args.category
      ? await ctx.db
          .query("tools")
          .withIndex("by_active_category", (q) => q.eq("isActive", true).eq("category", args.category!))
          .collect()
      : await ctx.db
          .query("tools")
          .withIndex("by_active_category", (q) => q.eq("isActive", true))
          .collect();

    return Promise.all(
      tools.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);
        const approved = await ctx.db.query("loans").withIndex("by_tool_status", q => q.eq("toolId", tool._id).eq("status", "approved")).collect();
        const today = localDateNow();
        return {
          _id: tool._id,
          isOwner: owner?.clerkId === (await ctx.auth.getUserIdentity())?.subject,
          availability: approved.some(loan => loan.startDate <= today) ? "On loan" : "Available now",
          reservedDates: approved.filter(loan => loan.endDate >= today).map(loan => ({ startDate: loan.startDate, endDate: loan.endDate })),
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          ownerName: owner?.displayName ?? "Neighbor",
          trustedLender: owner?.trustedLender ?? false,
        };
      }),
    );
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return ctx.db.query("tools").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).collect();
  },
});

export const create = mutation({
  args: toolFields,
  handler: async (ctx, args) => {
    const owner = await getCurrentUser(ctx);
    validateTool(args);
    const now = Date.now();
    return ctx.db.insert("tools", { ...args, ownerId: owner._id, isActive: true, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: { id: v.id("tools"), ...toolFields },
  handler: async (ctx, { id, ...args }) => {
    const user = await getCurrentUser(ctx);
    const tool = await ctx.db.get(id);
    if (!tool || !tool.isActive) throw new Error("Listing not found");
    if (tool.ownerId !== user._id) throw new Error("Only the listing owner can edit it");
    validateTool(args);
    await ctx.db.patch(id, { ...args, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("tools") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    const tool = await ctx.db.get(id);
    if (!tool || !tool.isActive) return;
    if (tool.ownerId !== user._id && user.role !== "admin") throw new Error("Not authorized to remove this listing");
    await ctx.db.patch(id, { isActive: false, updatedAt: Date.now() });
  },
});