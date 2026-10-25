"use client";

import { QrCode, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { SignOutButton } from "./sign-out-button";
import { createClient } from "../lib/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHero } from "./ui/card";

interface MfaEnrollResponse {
  id: string;
  type: "totp";
  totp: {
    uri: string;
    secret: string;
    qr_code: string;
  };
}

export function MfaSetup() {
  const [factor, setFactor] = useState<MfaEnrollResponse | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startEnroll() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    // Remove leftover unverified factors from an earlier, abandoned setup.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "TradeFlow AI",
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setFactor(data as MfaEnrollResponse);
    setLoading(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factor) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

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

  // 2FA is optional: continue to the app without turning it on.
  function skip() {
    window.location.assign("/dashboard");
  }

  if (!factor) {
    return (
      <Card>
        <CardHero
          icon={<ShieldCheck strokeWidth={2.25} />}
          title="Set up 2FA (optional)"
          description="Add an extra layer of security to your account with an authenticator app."
        />
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button onClick={startEnroll} disabled={loading} className="w-full">
            {loading ? "Preparing QR code" : "Show QR code"}
          </Button>
          <div className="mt-4 flex justify-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={skip} disabled={loading}>
              Skip for now
            </Button>
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHero
        icon={<QrCode strokeWidth={2.25} />}
        title="Scan the QR code"
        description="Open your authenticator app, scan the code, then enter the 6-digit code below."
      />
      <CardContent>
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded-md border bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={factor.totp.qr_code}
            alt="Scan this QR code with your authenticator app"
            className="h-full w-full"
          />
        </div>
        <p className="mb-6 break-all text-center text-xs text-muted-foreground">
          Can&apos;t scan? Enter this key manually: <span className="font-mono">{factor.totp.secret}</span>
        </p>
        <form onSubmit={verify} className="space-y-4">
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
            {loading ? "Verifying" : "Verify and continue"}
          </Button>
        </form>
        <div className="mt-4 flex justify-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={skip} disabled={loading}>
            Skip for now
          </Button>
          <SignOutButton />
        </div>
      </CardContent>
    </Card>
  );
}

export default MfaSetup;
