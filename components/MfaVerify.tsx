"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { SignOutButton } from "./sign-out-button";
import { createClient } from "../lib/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function MfaVerify() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: factors, error: factorsError } =
      await supabase.auth.mfa.listFactors();

    if (factorsError) {
      setError(factorsError.message);
      setLoading(false);
      return;
    }

    const factor = factors.totp[0];
    if (!factor) {
      setError("No verified authenticator found. Please set up 2FA first.");
      setLoading(false);
      return;
    }

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: factor.id });

    if (challengeError) {
      setError(challengeError.message);
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: code.replace(/\s/g, ""),
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <Card>
      <CardHeader className="grid grid-cols-[auto_1fr] items-center gap-x-4 space-y-0">
          <ShieldCheck aria-hidden className="row-span-2 h-12 w-12 text-emerald-700 drop-shadow-[0_4px_10px_rgba(4,120,87,0.25)]" fill="#d1fae5" strokeWidth={1.75} />
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
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
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Verifying" : "Verify"}
          </Button>
        </form>
        <div className="mt-4 flex justify-center">
          <SignOutButton />
        </div>
      </CardContent>
    </Card>
  );
}

export default MfaVerify;