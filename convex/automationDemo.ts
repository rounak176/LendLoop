import { internalMutation } from "./_generated/server";
import { recordLoanEvent } from "./lib/auth";
import { v } from "convex/values";
export const create = internalMutation({ args: {}, handler: async ctx => {
  const now = Date.now();
  const ownerId = await ctx.db.insert("users", { clerkId: `automation-demo-owner-${now}`, displayName: "Automation demo lender", role: "member", trustedLender: false, createdAt: now, updatedAt: now });
  const borrowerId = await ctx.db.insert("users", { clerkId: `automation-demo-borrower-${now}`, displayName: "Automation demo borrower", role: "member", trustedLender: false, createdAt: now, updatedAt: now });
  const toolId = await ctx.db.insert("tools", { ownerId, name: "Automation demo drill (hidden)", category: "Workshop", condition: "good", description: "Synthetic integration test; not a public listing.", isActive: false, createdAt: now, updatedAt: now });
  const loanId = await ctx.db.insert("loans", { toolId, ownerId, borrowerId, startDate: "2020-01-01", endDate: "2020-01-02", status: "approved", createdAt: now, updatedAt: now });
  await recordLoanEvent(ctx, "loan.approved", loanId, borrowerId);
  return { loanId };
} });
export const inspect = internalMutation({ args: { loanId: v.id("loans"), close: v.optional(v.boolean()) }, handler: async (ctx, { loanId, close }) => {
  const loan = await ctx.db.get(loanId);
  const owner = loan ? await ctx.db.get(loan.ownerId) : null;
  if (!loan || !owner?.clerkId.startsWith("automation-demo-owner-")) throw new Error("Not a synthetic demo loan");
  const events = await ctx.db.query("automationEvents").filter(q => q.eq(q.field("loanId"), loanId)).take(10);
  const reminders = await ctx.db.query("reminders").withIndex("by_loan_date", q => q.eq("loanId", loanId)).take(10);
  if (close) await ctx.db.patch(loanId, { status: "returned", returnedAt: Date.now(), updatedAt: Date.now() });
  return { events: events.map(e => ({ eventId: e._id, status: e.status, attempts: e.attemptCount, error: e.errorCode ?? null })), reminders: reminders.map(r => ({ status: r.status, key: r.reminderKey })) };
} });
