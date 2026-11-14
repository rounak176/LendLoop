"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Button } from "baseui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function ActivityNotifications() {
  const notifications = useQuery(api.notifications.mine, {});
  const markRead = useMutation(api.notifications.markRead);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function read(id: Id<"automationEvents">) {
    setPending(true);
    setError("");
    try {
      await markRead({ ids: [id] });
    } catch {
      setError("Could not mark this notification as read. Please retry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="activity-notifications-heading">
      <h2 id="activity-notifications-heading" className="section-title">Notifications</h2>
      <p>Recent request decisions and updates. Read notifications stay visible here.</p>
      {error && <p role="alert">{error}</p>}
      {notifications === undefined ? (
        <p role="status">Loading notifications…</p>
      ) : notifications.items.length === 0 ? (
        <p className="muted-copy">New requests, approvals, rejections, and returns will appear here.</p>
      ) : (
        <ul className="notification-list" aria-live="polite" aria-relevant="additions text">
          {notifications.items.map(item => (
            <li key={item._id} className={item.readAt === null ? "notification-unread" : ""}>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              <time dateTime={new Date(item.occurredAt).toISOString()}>
                {new Date(item.occurredAt).toLocaleString()}
              </time>
              {item.readAt === null && (
                <div><Button size="mini" kind="tertiary" disabled={pending} onClick={() => void read(item._id)}>Mark as read</Button></div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
