import { internal } from "../_generated/api";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

type AuthContext = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  return identity;
}

export async function getCurrentUser(ctx: AuthContext): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User profile not found; sync your profile first");
  return user;
}

export async function requireAdmin(ctx: AuthContext): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (user.role !== "admin") throw new Error("Administrator access required");
  return user;
}

export function assertCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Dates must use YYYY-MM-DD format");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Invalid calendar date");
  }
}

export function localDateNow() {
  const timezone = process.env.APP_TIMEZONE ?? "America/Los_Angeles";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function recordLoanEvent(
  ctx: MutationCtx,
  type: "loan.requested" | "loan.approved" | "loan.declined" | "loan.returned",
  loanId: Doc<"loans">["_id"],
  recipientId: Doc<"users">["_id"],
) {
  const eventId = await ctx.db.insert("automationEvents", {
    eventId: "pending",
    type,
    loanId,
    recipientId,
    status: "queued",
    attemptCount: 0,
    occurredAt: Date.now(),
  });
  await ctx.db.patch(eventId, { eventId: String(eventId) });
  await ctx.scheduler.runAfter(0, internal.automationDispatch.deliver, { eventId });
}