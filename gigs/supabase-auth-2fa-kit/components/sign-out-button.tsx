"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";
import { AUTH_PATHS } from "../lib/auth-config";
import { Button } from "./ui";

export function SignOutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  async function signOut() {
    setLoading(true);
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.assign(AUTH_PATHS.signIn);
    }
  }
  return (
    <Button type="button" variant="ghost" onClick={signOut} disabled={loading} className={className}>
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
