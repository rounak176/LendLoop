import { httpRouter } from "convex/server";
import { httpAction, env } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyEnvelope } from "./lib/signatures";
import { localDateNow } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();
function text(value: unknown, name: string, max = 150): string {
  if (typeof value !== "string" || !value.length || value.length > max) throw new Error(`Invalid ${name}`);
  return value;
}
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
http.route({ path: "/automation/rpc", method: "POST", handler: httpAction(async (ctx, req) => {
  const secret = env.N8N_TO_CONVEX_SECRET;
  if (!secret) return response({ error: "INTEGRATION_NOT_CONFIGURED" }, 503);
  let envelope;
  try {
    const raw = await req.text();
    if (raw.length > 40_000) return response({ error: "PAYLOAD_TOO_LARGE" }, 413);
    envelope = await verifyEnvelope(JSON.parse(raw) as unknown, secret);
  } catch { return response({ error: "UNAUTHORIZED" }, 401); }
  const fresh: boolean = await ctx.runMutation(internal.automation.consumeNonce, { nonce: `rpc:${envelope.nonce}` });
  if (!fresh) return response({ error: "REPLAY" }, 409);
  try {
    const data: unknown = JSON.parse(envelope.payload);
    if (!data || typeof data !== "object" || Array.isArray(data)) return response({ error: "INVALID_PAYLOAD" }, 400);
    const p = data as Record<string, unknown>;
    switch (p.operation) {
      case "webhook.consume": {
        const consumed: boolean = await ctx.runMutation(internal.automation.consumeNonce, { nonce: `webhook:${text(p.nonce, "nonce", 100)}` });
        return consumed ? response({ consumed: true }) : response({ error: "REPLAY" }, 409);
      }
      case "event.claim": return response(await ctx.runMutation(internal.automation.claimEvent, { eventId: text(p.eventId, "eventId") as Id<"automationEvents">, token: text(p.token, "token") }));
      case "event.complete": return response(await ctx.runMutation(internal.automation.completeEvent, { eventId: text(p.eventId, "eventId") as Id<"automationEvents">, token: text(p.token, "token") }));
      case "reminders.list": {
        if (p.cursor !== null && p.cursor !== undefined && typeof p.cursor !== "string") return response({ error: "INVALID_CURSOR" }, 400);
        return response(await ctx.runQuery(internal.automation.overduePage, { today: localDateNow(), paginationOpts: { numItems: 50, cursor: typeof p.cursor === "string" ? p.cursor : null } }));
      }
      case "reminder.claim": return response(await ctx.runMutation(internal.automation.claimReminder, { loanId: text(p.loanId, "loanId") as Id<"loans">, token: text(p.token, "token") }));
      case "reminder.complete": return response(await ctx.runMutation(internal.automation.completeReminder, { reminderId: text(p.reminderId, "reminderId") as Id<"reminders">, token: text(p.token, "token") }));
      case "failure.record": {
        await ctx.runMutation(internal.automation.recordFailure, { key: text(p.key, "key"), code: text(p.code, "code", 80) });
        return response({ recorded: true });
      }
      default: return response({ error: "UNKNOWN_OPERATION" }, 400);
    }
  } catch { return response({ error: "INVALID_REQUEST_OR_STALE_CLAIM" }, 400); }
}) });
export default http;
