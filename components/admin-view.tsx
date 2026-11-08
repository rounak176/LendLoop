"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Button } from "baseui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { AutomationAdmin } from "@/components/automation-admin";
import { useSuccess } from "@/components/success-feedback";
import { api } from "@/convex/_generated/api";

export function AdminView() {
  const profile = useQuery(api.users.current, {});
  if (profile === undefined) return <p role="status">Checking administrator access…</p>;
  if (profile?.role !== "admin") return <p role="alert">Administrator access required. Your account has no admin permissions.</p>;
  return <AdminContent />;
}
function AdminContent() {
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
  const loans = useQuery(api.admin.allLoans, {});
  const users = useQuery(api.admin.allUsers, {});
  const tools = useQuery(api.admin.allTools, {});
  const setTrusted = useMutation(api.admin.setTrustedLenderForUser);
  const removeListing = useMutation(api.admin.removeAnyListing);

  if (loans === undefined || users === undefined || tools === undefined) return <div className="loading-state" role="status">Loading administration…</div>;

  return (
    <div className="dashboard-sections">
      {message && <p role="status">{message}</p>}
      <AutomationAdmin />
      <section>
        <h2 className="section-title">Listings</h2>
        {tools.length === 0 ? <p className="muted-copy">No listings yet.</p> : (
          <div className="data-table-wrap"><table className="data-table">
            <thead><tr><th>Tool</th><th>Owner</th><th>Category</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{tools.map((tool: { _id: Id<"tools">; name: string; ownerName: string; category: string; isActive: boolean }) => (
              <tr key={tool._id}>
                <td>{tool.name}</td><td>{tool.ownerName}</td><td>{tool.category}</td><td>{tool.isActive ? "Active" : "Removed"}</td>
                <td>{tool.isActive && <Button size="mini" kind="secondary" disabled={pending} onClick={() => void run(() => removeListing({ toolId: tool._id }), "Listing removed")}>Remove</Button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      <section>
        <h2 className="section-title">All loans</h2>
        {loans.length === 0 ? <p className="muted-copy">No loan history yet.</p> : (
          <div className="data-table-wrap"><table className="data-table">
            <thead><tr><th>Tool</th><th>Borrower</th><th>Lender</th><th>Dates</th><th>Status</th><th>Listing</th></tr></thead>
            <tbody>{loans.map((loan: { _id: Id<"loans">; toolId: Id<"tools">; toolName: string; borrowerName: string; ownerName: string; startDate: string; endDate: string; status: string }) => (
              <tr key={loan._id}>
                <td>{loan.toolName}</td><td>{loan.borrowerName}</td><td>{loan.ownerName}</td>
                <td>{loan.startDate} – {loan.endDate}</td><td>{loan.status}</td>
                <td><Button size="mini" kind="secondary" disabled={pending} onClick={() => void run(() => removeListing({ toolId: loan.toolId }), "Listing removed")}>Remove</Button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      <section>
        <h2 className="section-title">Trusted lenders</h2>
        <div className="data-table-wrap"><table className="data-table">
          <thead><tr><th>Neighbor</th><th>Role</th><th>Trusted lender</th><th>Action</th></tr></thead>
          <tbody>{users.map((user: { _id: Id<"users">; displayName: string; role: string; trustedLender: boolean }) => (
            <tr key={user._id}>
              <td>{user.displayName}</td><td>{user.role}</td><td>{user.trustedLender ? "Yes" : "No"}</td>
              <td><Button size="mini" kind="secondary" disabled={pending} onClick={() => void run(() => setTrusted({ userId: user._id, trustedLender: !user.trustedLender }), user.trustedLender ? "Badge removed" : "Trusted lender badge assigned")}>{user.trustedLender ? "Remove badge" : "Assign badge"}</Button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  );
}