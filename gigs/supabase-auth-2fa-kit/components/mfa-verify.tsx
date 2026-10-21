"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";
import { AUTH_PATHS } from "../lib/auth-config";
import { Alert, Button, Card, Input, Label } from "./ui";
import { SignOutButton } from "./sign-out-button";

// Second step of sign-in for accounts with 2FA on: upgrades the session to aal2.
export function MfaVerify() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.[0];
    if (listError || !factor) {
      setLoading(false);
      return setError(listError?.message ?? "No authenticator found. Set up 2FA first.");
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.replace(/\s/g, "") });
    setLoading(false);
    if (error) return setError("That code is wrong or expired. Try the newest code from your app.");
    window.location.assign(AUTH_PATHS.afterLogin);
  }

  return (
    <Card title="Two-factor authentication" description="Enter the 6-digit code from your authenticator app.">
      {error && <Alert>{error}</Alert>}
      <form onSubmit={submit} className="space-y-3">
        <Label htmlFor="code">6-digit code</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={loading}
          required
          autoFocus
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Verifying…" : "Verify"}
        </Button>
      </form>
      <div className="mt-4 flex justify-center">
        <SignOutButton />
      </div>
    </Card>
  );
}
