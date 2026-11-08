import Link from "next/link";
import { DashboardView } from "@/components/dashboard-view";
import { FeatureGate } from "@/components/feature-gate";
import { SiteHeader } from "@/components/site-header";

export default function MyListingsPage() {
  return <div className="app-shell">
    <SiteHeader />
    <main className="main-content">
      <div className="page-heading">
        <p className="eyebrow">Your tool shelf</p>
        <h1>My listings</h1>
        <p className="intro-copy">Manage the tools you share with your neighbors.</p>
        <Link className="text-action" href="/tools/new">List a tool</Link>
      </div>
      <FeatureGate><DashboardView listingsOnly /></FeatureGate>
    </main>
  </div>;
}
