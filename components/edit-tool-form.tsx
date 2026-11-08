"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { FormInput, FormTextarea } from "@/components/form-controls";
import { Button } from "baseui/button";
import { useSuccess } from "@/components/success-feedback";
import { api } from "@/convex/_generated/api";

export function EditToolForm({ toolId }: { toolId: string }) {
  const showSuccess = useSuccess();
  const listings = useQuery(api.tools.mine, {});
  const update = useMutation(api.tools.update);
  const remove = useMutation(api.tools.remove);
  const tool = listings?.find((listing: { _id: string }) => listing._id === toolId);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (listings === undefined) return <div className="loading-state" role="status">Loading listing…</div>;
  if (!tool || !tool.isActive) return <section className="empty-state"><h2>Listing unavailable</h2><p>You can only edit your own active listings.</p><Link className="text-action" href="/dashboard">Back to activity</Link></section>;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage("");
    try {
      await update({
        id: toolId as never,
        name: String(form.get("name")),
        category: String(form.get("category")),
        condition: String(form.get("condition")) as "new" | "good" | "fair",
        description: String(form.get("description")),
      });
      showSuccess("Listing updated", "Listing updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update this listing.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await remove({ id: toolId as never });
      showSuccess("Listing removed", "Existing loan history is preserved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove this listing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="form-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field form-field-wide"><label htmlFor="name">Tool name</label><FormInput id="name" name="name" required minLength={2} maxLength={80} defaultValue={tool.name} /></div>
          <div className="form-field"><label htmlFor="category">Category</label><FormInput id="category" name="category" required maxLength={40} defaultValue={tool.category} /></div>
          <div className="form-field"><label htmlFor="condition">Condition</label><select id="condition" name="condition" defaultValue={tool.condition}><option value="new">New</option><option value="good">Good</option><option value="fair">Fair</option></select></div>
          <div className="form-field form-field-wide"><label htmlFor="description">Description</label><FormTextarea id="description" name="description" maxLength={500} defaultValue={tool.description} /></div>
        </div>
        <div className="form-actions">
          <Button type="submit" kind="primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          <Button type="button" kind="secondary" disabled={saving} onClick={() => void handleRemove()}>Remove listing</Button>
        </div>
        {message && <p className="status-message" role="status">{message}</p>}
      </form>
    </>
  );
}