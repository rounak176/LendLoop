"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Button } from "baseui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
export function AutomationAdmin() {
  const failures = useQuery(api.automation.failures, {});
  const events = useQuery(api.automation.recentEvents, {});
  const retry = useMutation(api.automation.retryEvent);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function retryOne(eventId: Id<"automationEvents">) {
    setError(""); setPending(true);
    try { await retry({ eventId }); } catch { setError("Could not retry the event."); } finally { setPending(false); }
  }
  return <section><h2>Automation health</h2>
    {error && <p role="alert">{error}</p>}
    <p>Request deliveries use logged mock notifications. Failed events can be retried after configuration is fixed.</p>
    {events === undefined ? <p>Loading events…</p> : <ul>{events.map(event => <li key={event._id}>{event.type} · {event.status} · {event.attemptCount} attempts {event.errorCode ? `· ${event.errorCode}` : ""} {event.status === "failed" && <Button size="mini" disabled={pending} onClick={() => void retryOne(event._id)}>Retry delivery</Button>}</li>)}</ul>}
    <h3>Workflow failures</h3>
    {failures === undefined ? <p>Loading failures…</p> : failures.length === 0 ? <p>No workflow failures recorded.</p> : <ul>{failures.map(failure => <li key={failure._id}>{failure.code} · {new Date(failure.occurredAt).toLocaleString()}</li>)}</ul>}
  </section>;
}
