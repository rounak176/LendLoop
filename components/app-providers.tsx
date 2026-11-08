"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { ConvexAuthProvider } from "@/components/convex-provider";
import { ProfileSync } from "@/components/profile-sync";
import { StyletronRegistry } from "@/components/styletron-registry";

import { SuccessFeedback } from "@/components/success-feedback";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StyletronRegistry>
      <SuccessFeedback>
      {clerkKey ? (
        <ClerkProvider publishableKey={clerkKey}>
          <ConvexAuthProvider>
            {process.env.NEXT_PUBLIC_CONVEX_URL && <ProfileSync />}
            {children}
          </ConvexAuthProvider>
        </ClerkProvider>
      ) : (
        children
      )}
    </SuccessFeedback>
    </StyletronRegistry>
  );
}