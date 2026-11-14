"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Button } from "baseui/button";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { ActivityNotifications } from "@/components/activity-notifications";
import { LoanAutomationActivity } from "@/components/loan-automation-activity";
import { useSuccess } from "@/components/success-feedback";
import { api } from "@/convex/_generated/api";

export function DashboardView({ listingsOnly = false }: { listingsOnly?: boolean }) {
  const data = useQuery(api.loans.mine, listingsOnly ? "skip" : {});
  const listings = useQuery(api.tools.mine, {});
  const decide = useMutation(api.loans.decide);
  const confirmReturn = useMutation(api.loans.confirmReturn);
  const removeListing = useMutation(api.tools.remove);

  const showSuccess = useSuccess();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function run(operation: () => Promise<unknown>, title: string) {
    if (pending) return;
    setPending(true); setMessage("");
    try { await operation(); showSuccess(title); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save. Please retry."); }
    finally { setPending(false); }
  }
  if ((!listingsOnly && data === undefined) || listings === undefined) return <div className="loading-state" role="status">Loading your activity…</div>;

  const toolName = (toolId: string) => [...(data?.borrowed ?? []), ...(data?.incoming ?? [])].find((loan: { toolId: string }) => loan.toolId === toolId)?.toolName ?? "Removed listing";

  return (
    <div className="dashboard-sections">
      {message && <p role="status">{message}</p>}
      {!listingsOnly && data && <>
      <ActivityNotifications />
      <section>
        <h2 className="section-title">Incoming requests</h2>
        <LoanTable
          loans={data.incoming.filter((loan: { status: string }) => loan.status === "pending")}
          toolName={toolName}
          action={(loan) => (
            <div className="row-actions">
              <Button size="mini" kind="primary" disabled={pending} onClick={() => void run(() => decide({ loanId: loan._id, decision: "approved" }), "Request accepted")}>Approve</Button>
              <Button size="mini" kind="secondary" disabled={pending} onClick={() => void run(() => decide({ loanId: loan._id, decision: "declined" }), "Request rejected")}>Decline</Button>
            </div>
          )}
        />
      </section>
      <section>
        <h2 className="section-title">My requests</h2>
        <LoanTable loans={data.borrowed} toolName={toolName} />
      </section>
      <section>
        <h2 className="section-title">Your active loans</h2>
        <LoanTable
          loans={data.incoming.filter((loan: { status: string }) => loan.status === "approved")}
          toolName={toolName}
          action={(loan) => <Button size="mini" kind="secondary" disabled={pending} onClick={() => void run(() => confirmReturn({ loanId: loan._id }), "Return confirmed")}>Confirm return</Button>}
        />
      </section>
      <section>
        <h2 className="section-title">Reviewed requests</h2>
        <LoanTable
          loans={data.incoming.filter(loan => loan.status === "declined" || loan.status === "returned")}
          toolName={toolName}
        />
      </section>
      </>}
      <section>
        <h2 className="section-title">My listings</h2>
        {listings.length === 0 ? <p className="muted-copy">You have not listed a tool yet.</p> : (
          <ul className="listing-list">
            {listings.map((tool: { _id: Id<"tools">; name: string; category: string; isActive: boolean }) => (
              <li key={tool._id}>
                <span>{tool.name} <small>{tool.category}</small></span>
                <span className="listing-controls">
                  {tool.isActive ? <><Link className="text-action" href={`/tools/${tool._id}/edit`}>Edit</Link><Button size="mini" kind="secondary" disabled={pending} onClick={() => void run(() => removeListing({ id: tool._id }), "Listing removed")}>Remove</Button></> : "Removed"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LoanTable({
  loans,
  toolName,
  action,
}: {
  loans: Array<{ _id: Id<"loans">; toolId: Id<"tools">; status: string; startDate: string; endDate: string; isOverdue?: boolean }>;
  toolName: (id: string) => string;
  action?: (loan: { _id: Id<"loans">; toolId: Id<"tools">; status: string; startDate: string; endDate: string; isOverdue?: boolean }) => React.ReactNode;
}) {
  if (loans.length === 0) return <p className="muted-copy">Nothing to show here yet.</p>;
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead><tr><th>Tool</th><th>Dates</th><th>Status</th>{action && <th>Action</th>}</tr></thead>
        <tbody>{loans.map((loan) => (
          <tr key={loan._id}>
            <td>{toolName(loan.toolId)}<LoanAutomationActivity loanId={loan._id} /></td><td>{loan.startDate} – {loan.endDate}</td><td>{loan.isOverdue ? "Overdue" : loan.status === "approved" ? "Accepted" : loan.status === "declined" ? "Rejected" : loan.status}</td>
            {action && <td>{action(loan)}</td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}