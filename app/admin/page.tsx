import { AdminView } from "@/components/admin-view";
import { FeatureGate } from "@/components/feature-gate";
import { SiteHeader } from "@/components/site-header";

export default function AdminPage() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="main-content">
        <div className="page-heading">
          <p className="eyebrow">LendLoop operations</p>
          <h1>Administration</h1>
          <p className="intro-copy">Manage listing safety, loan history, and trusted-lender badges.</p>
        </div>
        <FeatureGate><AdminView /></FeatureGate>
      </main>
    </div>
  );
}