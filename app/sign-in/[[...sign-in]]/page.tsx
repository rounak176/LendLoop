import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="main-content">
        <section className="setup-state">
          <h2>Sign-in is not connected yet</h2>
          <p>Add your Clerk keys to <code>.env.local</code>, then restart the app.</p>
          <Link className="text-action" href="/">Back to LendLoop</Link>
        </section>
      </main>
    );
  }
  return <main className="sign-in-page"><SignIn /></main>;
}