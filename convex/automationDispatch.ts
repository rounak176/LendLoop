import { v } from "convex/values";
import { internalAction, env } from "./_generated/server";
import { internal } from "./_generated/api";
import { signEnvelope } from "./lib/signatures";
import type { Id, Doc } from "./_generated/dataModel";

type Payload = { eventId: Id<"automationEvents">; type: string };
export const deliver = internalAction({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, { eventId }) => {
    const payload: Payload | null = await ctx.runMutation(internal.automation.prepareDispatch, { eventId });
    if (!payload) return;
    const url = env.N8N_REQUEST_WEBHOOK_URL;
    const secret = env.CONVEX_TO_N8N_SECRET;
    let code = "DELIVERY_FAILED";
    let retryable = true;
    try {
      if (!url || !secret) { code = "INTEGRATION_NOT_CONFIGURED"; retryable = false; throw new Error(code); }
      if (!url.startsWith("https://")) { code = "HTTPS_REQUIRED"; retryable = false; throw new Error(code); }
      const envelope = await signEnvelope(payload, secret);
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(envelope), signal: AbortSignal.timeout(45_000), redirect: "error" });
      if (!response.ok) { code = `N8N_HTTP_${response.status}`; retryable = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500; throw new Error(code); }
      // Only a signed completion callback counts as delivery, never a bare HTTP 200.
      const event: Doc<"automationEvents"> | null = await ctx.runQuery(internal.automation.eventStatus, { eventId });
      if (event?.status === "sent") return;
      code = "MISSING_COMPLETION_CALLBACK";
    } catch { /* Persist only a sanitized error code; never a secret, URL, or raw response. */ }
    await ctx.runMutation(internal.automation.dispatchFailed, { eventId, code, retryable });
  },
});
