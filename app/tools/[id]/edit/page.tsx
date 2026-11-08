import Link from "next/link";
import { FeatureGate } from "@/components/feature-gate";
import { EditToolForm } from "@/components/edit-tool-form";
import { SiteHeader } from "@/components/site-header";

export default async function EditToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="main-content">
        <div className="page-heading"><p className="eyebrow">Your listings</p><h1>Edit listing</h1></div>
        <FeatureGate><EditToolForm toolId={id} /></FeatureGate>
        <p className="footer-note"><Link className="text-action" href="/dashboard">Back to activity</Link></p>
      </main>
    </div>
  );
}