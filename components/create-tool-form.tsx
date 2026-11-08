"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { FormInput, FormTextarea } from "@/components/form-controls";
import { Button } from "baseui/button";
import { useSuccess } from "@/components/success-feedback";
import { api } from "@/convex/_generated/api";

export function CreateToolForm() {
  const showSuccess = useSuccess();
  const create = useMutation(api.tools.create);
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
      await create({
        name: String(form.get("name")),
        category: String(form.get("category")),
        condition: String(form.get("condition")) as "new" | "good" | "fair",
        description: String(form.get("description")),
      });
      formElement.reset();
      setFormKey(key => key + 1);
      showSuccess("Listing successful", "Your listing is live.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this listing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form key={formKey} className="form-panel" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-field form-field-wide">
          <label htmlFor="name">Tool name</label>
          <FormInput id="name" name="name" required minLength={2} maxLength={80} placeholder="Cordless drill" />
        </div>
        <div className="form-field">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" required defaultValue="">
            <option value="" disabled>Select category</option>
            <option>Garden</option><option>Workshop</option><option>Home</option><option>Outdoor</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="condition">Condition</label>
          <select id="condition" name="condition" defaultValue="good">
            <option value="new">New</option><option value="good">Good</option><option value="fair">Fair</option>
          </select>
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="description">Description <span className="muted-copy">(optional)</span></label>
          <FormTextarea id="description" name="description" maxLength={500} placeholder="A few details that will help a neighbor use it safely." />
        </div>
      </div>
      <div className="form-actions">
        <Button type="submit" kind="primary" disabled={saving}>{saving ? "Publishing…" : "Publish listing"}</Button>
        <span className="muted-copy">Your name and contact details are not public.</span>
      </div>
      {message && <p className="status-message" role="status">{message}</p>}
    </form>
  );
}