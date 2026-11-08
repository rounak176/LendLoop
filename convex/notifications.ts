import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

export const mine = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUser(ctx);
    const recent = await ctx.db.query("automationEvents").withIndex("by_recipientId", q => q.eq("recipientId", user._id)).order("desc").take(50);
    const unread = await ctx.db.query("automationEvents").withIndex("by_recipientId_and_readAt", q => q.eq("recipientId", user._id).eq("readAt", undefined)).take(101);
    const items = await Promise.all(recent.map(async event => {
      const loan = await ctx.db.get(event.loanId);
      const tool = loan ? await ctx.db.get(loan.toolId) : null;
      const name = tool?.name ?? "a tool";
      const title = { "loan.requested": "New borrow request", "loan.approved": "Request accepted", "loan.declined": "Request rejected", "loan.returned": "Return confirmed" }[event.type];
      const message = event.type === "loan.requested" ? `Someone requested ${name}. Review it in My activity.`
        : event.type === "loan.returned" ? `The lender confirmed the return of ${name}.`
        : `Your request for ${name} was ${event.type === "loan.approved" ? "accepted" : "rejected"}.`;
      return { _id: event._id, title, message, readAt: event.readAt ?? null, occurredAt: event.occurredAt };
    }));
    return { items, unreadCount: Math.min(unread.length, 100), hasMoreUnread: unread.length > 100 };
  },
});
export const markRead = mutation({
  args: { ids: v.array(v.id("automationEvents")) },
  handler: async (ctx, { ids }) => {
    const user = await getCurrentUser(ctx);
    if (ids.length > 50) throw new Error("Select at most 50 notifications");
    for (const id of ids) {
      const event = await ctx.db.get(id);
      if (!event || event.recipientId !== user._id) throw new Error("Notification not found");
      if (event.readAt === undefined) await ctx.db.patch(id, { readAt: Date.now() });
    }
  },
});
