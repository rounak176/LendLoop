import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertCalendarDate, getCurrentUser, localDateNow, recordLoanEvent } from "./lib/auth";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const [borrowed, incoming] = await Promise.all([
      ctx.db.query("loans").withIndex("by_borrower", (q) => q.eq("borrowerId", user._id)).collect(),
      ctx.db.query("loans").withIndex("by_owner_status", (q) => q.eq("ownerId", user._id)).collect(),
    ]);
    const today = localDateNow();
    const enrich = async (loan: (typeof borrowed)[number]) => ({
      ...loan,
      toolName: (await ctx.db.get(loan.toolId))?.name ?? "Removed listing",
      isOverdue: loan.status === "approved" && loan.endDate < today,
    });
    return { borrowed: await Promise.all(borrowed.map(enrich)), incoming: await Promise.all(incoming.map(enrich)) };
  },
});

export const request = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const borrower = await getCurrentUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || !tool.isActive) throw new Error("This listing is no longer available");
    if (tool.ownerId === borrower._id) throw new Error("You cannot request your own tool");
    assertCalendarDate(args.startDate);
    assertCalendarDate(args.endDate);
    if (args.startDate < localDateNow()) throw new Error("Start date cannot be in the past");
    if (args.startDate > args.endDate) throw new Error("End date must be on or after the start date");

    const loanId = await ctx.db.insert("loans", {
      toolId: tool._id,
      borrowerId: borrower._id,
      ownerId: tool.ownerId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await recordLoanEvent(ctx, "loan.requested", loanId, tool.ownerId);
    return loanId;
  },
});

export const decide = mutation({
  args: { loanId: v.id("loans"), decision: v.union(v.literal("approved"), v.literal("declined")) },
  handler: async (ctx, { loanId, decision }) => {
    const user = await getCurrentUser(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new Error("Request not found");
    if (loan.ownerId !== user._id) throw new Error("Only the owner can decide this request");
    if (loan.status !== "pending") throw new Error("Only pending requests can be decided");

    if (decision === "approved") {
      if (loan.startDate < localDateNow()) throw new Error("This request has expired. Ask the borrower to request new dates.");
      const tool = await ctx.db.get(loan.toolId);
      if (!tool || !tool.isActive) throw new Error("This listing is no longer available for new loans");
      const approved = await ctx.db
        .query("loans")
        .withIndex("by_tool_status", (q) => q.eq("toolId", loan.toolId).eq("status", "approved"))
        .collect();
      const overlap = approved.some((item) => item.startDate <= loan.endDate && loan.startDate <= item.endDate);
      if (overlap) throw new Error("Those dates overlap an approved loan");
    }

    await ctx.db.patch(loanId, { status: decision, updatedAt: Date.now() });
    await recordLoanEvent(ctx, `loan.${decision}`, loanId, loan.borrowerId);
  },
});

export const confirmReturn = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await getCurrentUser(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.ownerId !== user._id) throw new Error("Only the owner can confirm a return");
    if (loan.status !== "approved") throw new Error("Only active loans can be returned");
    await ctx.db.patch(loanId, { status: "returned", returnedAt: Date.now(), updatedAt: Date.now() });
    await recordLoanEvent(ctx, "loan.returned", loanId, loan.borrowerId);
  },
});