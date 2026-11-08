import Link from "next/link";
import { FeatureGate } from "@/components/feature-gate";
import { SiteHeader } from "@/components/site-header";
import { CreateToolForm } from "@/components/create-tool-form";

export default function NewToolPage() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="main-content">
        <div className="page-heading">
          <p className="eyebrow">Share with your block</p>
          <h1>List a tool</h1>
          <p className="intro-copy">Give a useful thing a few more good days of work.</p>
        </div>
        <FeatureGate><CreateToolForm /></FeatureGate>
        <p className="footer-note"><Link className="text-action" href="/">Back to tools</Link></p>
      </main>
    </div>
  );
}