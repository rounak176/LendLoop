"use client";

import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "baseui/button";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";

const hasBackendConfiguration = Boolean(
  process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

export function FeatureGate({ children }: { children: ReactNode }) {
  if (!hasBackendConfiguration) {
    return (
      <section className="setup-state">
        <h2>Connect your local services</h2>
        <p>Set up Clerk and Convex using the steps in the project README to use this area.</p>
      </section>
    );
  }

  return (
    <>
      <AuthLoading><div className="loading-state" role="status">Checking your session…</div></AuthLoading>
      <Unauthenticated>
        <section className="setup-state">
          <h2>Sign in to continue</h2>
          <SignInButton mode="modal"><Button kind="primary">Sign in</Button></SignInButton>
        </section>
      </Unauthenticated>
      <Authenticated><ProfileReady>{children}</ProfileReady></Authenticated>
    </>
  );
}

function ProfileReady({ children }: { children: ReactNode }) {
  const profile = useQuery(api.users.current, {});
  if (!profile) return <div className="loading-state" role="status">Preparing your profile…</div>;
  return children;
}