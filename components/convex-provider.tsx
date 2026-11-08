"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const hasClerkConfiguration = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const convex = convexUrl && hasClerkConfiguration ? new ConvexReactClient(convexUrl) : null;

export function ConvexAuthProvider({ children }: { children: ReactNode }) {
  if (!convex) return children;

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}