import Link from "next/link";
import { DashboardView } from "@/components/dashboard-view";
import { FeatureGate } from "@/components/feature-gate";
import { SiteHeader } from "@/components/site-header";

export default function DashboardPage() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="main-content">
        <div className="page-heading">
          <p className="eyebrow">Your neighborhood activity</p>
          <h1>My activity</h1>
          <p className="intro-copy">Keep track of requests, borrowing dates, and the tools you share.</p>
        </div>
        <nav className="dashboard-tabs" aria-label="Dashboard navigation">
          <Link href="/dashboard" aria-current="page">Overview</Link>
          <Link href="/tools/new">List a tool</Link>
        </nav>
        <FeatureGate><DashboardView /></FeatureGate>
      </main>
    </div>
  );
}