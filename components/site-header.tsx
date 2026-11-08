import Link from "next/link";
import { NotificationBell } from "@/components/notification-bell";
import { AuthActions } from "@/components/auth-actions";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="LendLoop home">
        <span className="wordmark-icon" aria-hidden="true">L</span>
        LendLoop
      </Link>
      <nav className="primary-nav" aria-label="Main navigation">
        <Link href="/">Find tools</Link>
        <Link href="/tools/new">List a tool</Link>
        <Link href="/my-listings">My listings</Link>
        <Link href="/dashboard">My activity</Link>
      </nav>
      <div className="header-actions"><NotificationBell /><AuthActions /></div>
    </header>
  );
}