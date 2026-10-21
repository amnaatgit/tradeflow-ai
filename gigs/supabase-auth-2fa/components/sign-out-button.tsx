"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";
import { Button } from "../components/ui/button";

export function SignOutButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.assign("/auth/sign-in");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={signOut}
      disabled={loading}
      className={className}
    >
      {loading ? "Signing out..." : "Sign out"}
    </Button>
  );
}

export default SignOutButton;
