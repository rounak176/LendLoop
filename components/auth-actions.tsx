"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "baseui/button";

const hasClerkConfiguration = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AuthActions() {
  if (!hasClerkConfiguration) {
    return (
      <Link className="nav-setup-link" href="/sign-in">
        Connect sign-in
      </Link>
    );
  }

  return (
    <div className="auth-actions">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button size="compact" kind="primary">
            Sign in
          </Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}