"use client";
import Link from "next/link";
import { Button } from "baseui/button";
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="main-content"><section className="setup-state" role="alert">
    <h1>We could not load this page</h1>
    <p>Check your connection. For local setup, confirm Convex is running and Clerk authentication is configured.</p>
    <Button onClick={() => reset()}>Try again</Button>
    <p><Link href="/">Back to tools</Link></p>
  </section></main>;
}
