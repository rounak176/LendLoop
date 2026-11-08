import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { localDateNow, requireAdmin, getCurrentUser } from "./lib/auth";

export const consumeNonce = internalMutation({
  args: { nonce: v.string() },
  handler: async (ctx, { nonce }) => {
    const existing = await ctx.db.query("integrationNonces").withIndex("by_nonce", q => q.eq("nonce", nonce)).unique();
    if (existing) return false;
    await ctx.db.insert("integrationNonces", { nonce, expiresAt: Date.now() + 600_000 });
    return true;
  },
});
export const cleanupNonces = internalMutation({ args: {}, handler: async ctx => {
  const rows = await ctx.db.query("integrationNonces").withIndex("by_expiresAt", q => q.lt("expiresAt", Date.now())).take(500);
  for (const row of rows) await ctx.db.delete(row._id);
} });
export const prepareDispatch = internalMutation({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.status === "sent" || event.status === "failed") return null;
    await ctx.db.patch(eventId, { attemptCount: event.attemptCount + 1, nextAttemptAt: undefined });
    return { eventId, type: event.type };
  },
});
export const dispatchFailed = internalMutation({
  args: { eventId: v.id("automationEvents"), code: v.string(), retryable: v.boolean() },
  handler: async (ctx, { eventId, code, retryable }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.status === "sent") return;
    const retry = retryable && event.attemptCount < 5;
    const delay = Math.min(300_000, 10_000 * 2 ** Math.max(0, event.attemptCount - 1)) + Math.floor(Math.random() * 1000);
    await ctx.db.patch(eventId, { errorCode: code, status: retry ? "queued" : "failed", nextAttemptAt: retry ? Date.now() + delay : undefined });
    if (retry) await ctx.scheduler.runAfter(delay, internal.automationDispatch.deliver, { eventId });
  },
});
export const claimEvent = internalMutation({
  args: { eventId: v.id("automationEvents"), token: v.string() },
  handler: async (ctx, { eventId, token }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");
    if (event.status === "sent") return { state: "sent" as const };
    if (event.claimExpiresAt && event.claimExpiresAt > Date.now() && event.claimToken !== token) return { state: "busy" as const };
    await ctx.db.patch(eventId, { status: "processing", claimToken: token, claimExpiresAt: Date.now() + 60_000 });
    const loan = await ctx.db.get(event.loanId);
    const tool = loan ? await ctx.db.get(loan.toolId) : null;
    return { state: "claimed" as const, token, recipientId: event.recipientId, message: `${event.type}: ${tool?.name ?? "Removed tool"} (${loan?.startDate ?? ""} to ${loan?.endDate ?? ""})` };
  },
});
export const completeEvent = internalMutation({
  args: { eventId: v.id("automationEvents"), token: v.string() },
  handler: async (ctx, { eventId, token }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");
    if (event.status === "sent") return { state: "sent" };
    if (event.claimToken !== token || !event.claimExpiresAt || event.claimExpiresAt < Date.now()) throw new Error("Stale claim");
    const loan = await ctx.db.get(event.loanId);
    const tool = loan ? await ctx.db.get(loan.toolId) : null;
    const key = `event:${eventId}`;
    const existing = await ctx.db.query("mockDeliveries").withIndex("by_key", q => q.eq("key", key)).unique();
    if (!existing) await ctx.db.insert("mockDeliveries", { key, recipientId: event.recipientId, message: `${event.type}: ${tool?.name ?? "Removed tool"}`, sentAt: Date.now() });
    await ctx.db.patch(eventId, { status: "sent", sentAt: Date.now(), errorCode: undefined, nextAttemptAt: undefined, claimExpiresAt: undefined });
    return { state: "sent" };
  },
});
export const eventStatus = internalQuery({ args: { eventId: v.id("automationEvents") }, handler: (ctx, { eventId }) => ctx.db.get(eventId) });
export const overduePage = internalQuery({
  args: { today: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("loans").withIndex("by_status_and_endDate", q => q.eq("status", "approved").lt("endDate", args.today)).paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map(async loan => ({ loanId: loan._id, borrowerId: loan.borrowerId, toolName: (await ctx.db.get(loan.toolId))?.name ?? "Removed tool", endDate: loan.endDate }))) };
  },
});
export const claimReminder = internalMutation({
  args: { loanId: v.id("loans"), token: v.string() },
  handler: async (ctx, { loanId, token }) => {
    const today = localDateNow();
    const loan = await ctx.db.get(loanId);
    if (!loan || loan.status !== "approved" || loan.endDate >= today) return { state: "skipped" as const };
    const key = `overdue:${loanId}:${today}`;
    const existing = await ctx.db.query("reminders").withIndex("by_reminder_key", q => q.eq("reminderKey", key)).unique();
    if (existing?.status === "sent") return { state: "sent" as const };
    if (existing?.claimExpiresAt && existing.claimExpiresAt > Date.now() && existing.claimToken !== token) return { state: "busy" as const };
    if (existing?.claimToken === token && existing.claimExpiresAt && existing.claimExpiresAt > Date.now()) {
      return { state: "claimed" as const, reminderId: existing._id, token, key, recipientId: loan.borrowerId, endDate: loan.endDate };
    }
    if (existing && existing.attemptCount >= 5) {
      await ctx.db.patch(existing._id, { status: "failed", errorCode: "RETRIES_EXHAUSTED", claimExpiresAt: undefined, updatedAt: Date.now() });
      return { state: "failed" as const };
    }
    const fields = { status: "processing" as const, claimToken: token, claimExpiresAt: Date.now() + 60_000, attemptCount: (existing?.attemptCount ?? 0) + 1, updatedAt: Date.now() };
    const id = existing?._id ?? await ctx.db.insert("reminders", { reminderKey: key, loanId, localDate: today, ...fields });
    if (existing) await ctx.db.patch(existing._id, fields);
    return { state: "claimed" as const, reminderId: id, token, key, recipientId: loan.borrowerId, endDate: loan.endDate };
  },
});
export const completeReminder = internalMutation({
  args: { reminderId: v.id("reminders"), token: v.string() },
  handler: async (ctx, { reminderId, token }) => {
    const reminder = await ctx.db.get(reminderId);
    if (!reminder) throw new Error("Reminder not found");
    if (reminder.status === "sent") return { state: "sent" };
    if (reminder.claimToken !== token || !reminder.claimExpiresAt || reminder.claimExpiresAt < Date.now()) throw new Error("Stale claim");
    const loan = await ctx.db.get(reminder.loanId);
    if (!loan || loan.status !== "approved" || loan.endDate >= localDateNow() || reminder.localDate !== localDateNow()) {
      await ctx.db.patch(reminderId, { status: "failed", errorCode: "NO_LONGER_OVERDUE", claimExpiresAt: undefined, updatedAt: Date.now() });
      return { state: "skipped" };
    }
    const tool = await ctx.db.get(loan.toolId);
    const existing = await ctx.db.query("mockDeliveries").withIndex("by_key", q => q.eq("key", reminder.reminderKey)).unique();
    if (!existing) await ctx.db.insert("mockDeliveries", { key: reminder.reminderKey, recipientId: loan.borrowerId, message: `Please return ${tool?.name ?? "your tool"}; due ${loan.endDate}.`, sentAt: Date.now() });
    await ctx.db.patch(reminderId, { status: "sent", sentAt: Date.now(), updatedAt: Date.now(), errorCode: undefined, claimExpiresAt: undefined });
    return { state: "sent" };
  },
});
export const recordFailure = internalMutation({
  args: { key: v.string(), code: v.string() }, handler: async (ctx, { key, code }) => {
    const previous = await ctx.db.query("automationFailures").withIndex("by_key", q => q.eq("key", key)).unique();
    if (!previous) await ctx.db.insert("automationFailures", { key: key.slice(0, 150), code: code.slice(0, 80), occurredAt: Date.now() });
  },
});
export const retryEvent = mutation({ args: { eventId: v.id("automationEvents") }, handler: async (ctx, { eventId }) => {
  await requireAdmin(ctx);
  const event = await ctx.db.get(eventId);
  if (!event || event.status === "sent") return;
  if (event.status !== "failed") throw new Error("Only terminal failures can be retried");
  await ctx.db.patch(eventId, { status: "queued", attemptCount: 0, errorCode: undefined, claimExpiresAt: undefined });
  await ctx.scheduler.runAfter(0, internal.automationDispatch.deliver, { eventId });
} });
export const activity = query({ args: { loanId: v.id("loans") }, handler: async (ctx, { loanId }) => {
  const user = await getCurrentUser(ctx);
  const loan = await ctx.db.get(loanId);
  if (!loan || (loan.ownerId !== user._id && loan.borrowerId !== user._id && user.role !== "admin")) throw new Error("Not authorized");
  const reminders = await ctx.db.query("reminders").withIndex("by_loan_date", q => q.eq("loanId", loanId)).order("desc").take(5);
  return reminders.map(r => ({ status: r.status, date: r.localDate, sentAt: r.sentAt ?? null, errorCode: r.errorCode ?? null }));
} });
export const failures = query({ args: {}, handler: async ctx => {
  await requireAdmin(ctx);
  return ctx.db.query("automationFailures").order("desc").take(50);
} });
export const recentEvents = query({ args: {}, handler: async ctx => {
  await requireAdmin(ctx);
  const events = await ctx.db.query("automationEvents").order("desc").take(50);
  return events.map(e => ({ _id: e._id, type: e.type, status: e.status, attemptCount: e.attemptCount, errorCode: e.errorCode ?? null }));
} });
