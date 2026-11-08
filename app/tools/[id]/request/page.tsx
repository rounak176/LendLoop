import Link from "next/link";
import { FeatureGate } from "@/components/feature-gate";
import { RequestToolForm } from "@/components/request-tool-form";
import { SiteHeader } from "@/components/site-header";

export default async function RequestToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="main-content">
        <div className="page-heading">
          <p className="eyebrow">Borrow from a neighbor</p>
          <h1>Request a tool</h1>
        </div>
        <FeatureGate><RequestToolForm toolId={id} /></FeatureGate>
        <p className="footer-note"><Link className="text-action" href="/">Back to tools</Link></p>
      </main>
    </div>
  );
}