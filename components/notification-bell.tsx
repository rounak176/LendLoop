"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { Button } from "baseui/button";
import { Modal, ModalHeader, ModalBody } from "baseui/modal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function NotificationBell() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  return <AuthenticatedBell />;
}
function AuthenticatedBell() {
  const { isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  if (!profile) return null;
  return <Inbox key={profile._id} />;
}
function Inbox() {
  const notifications = useQuery(api.notifications.mine, {});
  const markRead = useMutation(api.notifications.markRead);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const count = notifications?.hasMoreUnread ? "100+" : String(notifications?.unreadCount ?? 0);
  async function read(ids: Id<"automationEvents">[], navigate = false) {
    setPending(true); setError("");
    try {
      await markRead({ ids });
      if (navigate) { setOpen(false); router.push("/dashboard"); }
    } catch { setError("Could not update notifications. Please retry."); }
    finally { setPending(false); }
  }
  return <>
    <Button kind="tertiary" size="compact" onClick={() => setOpen(true)} aria-label={`Notifications, ${count} unread`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>
      {notifications && notifications.unreadCount > 0 && <span className="notification-count" aria-hidden="true">{count}</span>}
    </Button>
    <span className="visually-hidden" role="status" aria-live="polite">{count} unread notifications</span>
    <Modal isOpen={open} onClose={() => setOpen(false)} aria-label="Notifications">
      <ModalHeader>Notifications</ModalHeader>
      <ModalBody>
        {error && <p role="alert">{error}</p>}
        {!notifications ? <p role="status">Loading notifications…</p> : notifications.items.length === 0 ? <p>You’re all caught up. New requests and decisions will appear here.</p> : <>
          <Button kind="secondary" size="compact" disabled={pending || !notifications.items.some(item => item.readAt === null)} onClick={() => void read(notifications.items.filter(item => item.readAt === null).map(item => item._id))}>Mark shown as read</Button>
          <ul className="notification-list">
            {notifications.items.map(item => <li key={item._id} className={item.readAt === null ? "notification-unread" : ""}>
              <strong>{item.readAt === null && <span aria-label="Unread">● </span>}{item.title}</strong>
              <p>{item.message}</p>
              <small>{new Date(item.occurredAt).toLocaleString()}</small>
              <div><Button size="mini" kind="tertiary" disabled={pending} onClick={() => void read([item._id], true)}>View in My activity</Button></div>
            </li>)}
          </ul>
          <p>Showing the latest 50 notifications. Opening the inbox does not mark them as read.</p>
        </>}
      </ModalBody>
    </Modal>
  </>;
}
