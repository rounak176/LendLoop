"use client";
import { useEffect, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
export function ProfileSync() {
  const { isAuthenticated } = useConvexAuth();
  const syncProfile = useMutation(api.users.syncProfile);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (isAuthenticated) syncProfile({}).catch(() => {
      if (active) setError("Could not prepare your profile. Check the Convex connection and retry.");
    });
    return () => { active = false; };
  }, [isAuthenticated, syncProfile, attempt]);
  return isAuthenticated && error ? <div role="alert">{error} <button onClick={() => { setError(""); setAttempt(v => v + 1); }}>Retry profile setup</button></div> : null;
}
