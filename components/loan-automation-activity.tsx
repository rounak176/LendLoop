"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Button } from "baseui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
export function LoanAutomationActivity({ loanId }: { loanId: Id<"loans"> }) {
  const [open, setOpen] = useState(false);
  const activity = useQuery(api.automation.activity, open ? { loanId } : "skip");
  return <div><Button size="mini" kind="tertiary" onClick={() => setOpen(value => !value)} aria-expanded={open}>Automation activity</Button>
    {open && <div role="status">{activity === undefined ? "Loading…" : activity.length === 0 ? "No overdue reminders yet." : activity.map(item => <p key={item.date}>{item.status === "sent" ? "Reminder logged" : item.status === "failed" ? "Reminder failed" : "Reminder processing"} · {item.date}{item.errorCode ? ` · ${item.errorCode}` : ""}</p>)}</div>}
  </div>;
}
