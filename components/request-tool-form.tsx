"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { FormInput } from "@/components/form-controls";
import { Button } from "baseui/button";
import { useSuccess } from "@/components/success-feedback";
import { api } from "@/convex/_generated/api";

export function RequestToolForm({ toolId }: { toolId: string }) {
  const showSuccess = useSuccess();
  const tools = useQuery(api.tools.listForMembers, {});
  const request = useMutation(api.loans.request);
  const tool = tools?.find((item: { _id: string }) => item._id === toolId);
  const [message, setMessage] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setMessage("");
    try {
      await request({
        toolId: toolId as never,
        startDate: String(form.get("startDate")),
        endDate: String(form.get("endDate")),
      });
      showSuccess("Request submitted", "Request sent to the lender.");
      formElement.reset();
      setFormKey(key => key + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send this request.");
    } finally {
      setSaving(false);
    }
  }

  if (tools === undefined) return <div className="loading-state" role="status">Loading listing…</div>;
  if (!tool) return <section className="empty-state"><h2>Listing unavailable</h2><p>This tool may have been removed.</p><Link className="text-action" href="/">Back to tools</Link></section>;

  if (tool.isOwner) return <p>You own this tool. Manage it from your dashboard.</p>;
  return (
    <>
      <section className="request-summary">
        <p className="eyebrow">{tool.category}</p>
        <h2>{tool.name}</h2>
        <p className="muted-copy">Shared by {tool.ownerName}{tool.trustedLender ? " · Trusted lender" : ""}</p>
        <p className="muted-copy">{tool.description}</p>
        <p>{tool.availability}</p>
        {tool.reservedDates.map((range: { startDate: string; endDate: string }) => <p key={range.startDate + range.endDate}>Reserved: {range.startDate} – {range.endDate}</p>)}
      </section>
      <form key={formKey} className="form-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="startDate">Borrow from</label>
            <FormInput id="startDate" name="startDate" type="date" required />
          </div>
          <div className="form-field">
            <label htmlFor="endDate">Return by</label>
            <FormInput id="endDate" name="endDate" type="date" required />
          </div>
        </div>
        <div className="form-actions">
          <Button type="submit" kind="primary" disabled={saving}>{saving ? "Sending…" : "Send request"}</Button>
          <span className="muted-copy">Dates are inclusive. The lender confirms the request.</span>
        </div>
        {message && <p className="status-message" role="status">{message}</p>}
      </form>
    </>
  );
}