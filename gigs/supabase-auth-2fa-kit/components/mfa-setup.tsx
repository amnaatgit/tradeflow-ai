"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";
import { APP_NAME, AUTH_PATHS } from "../lib/auth-config";
import { Alert, Button, Card, Input, Label } from "./ui";
import { SignOutButton } from "./sign-out-button";

type Enrolled = { id: string; totp: { qr_code: string; secret: string; uri: string } };

// Turn on 2FA: show a QR code for an authenticator app, then confirm with a 6-digit code.
// optional=true shows "Skip for now" (2FA optional); false makes it mandatory.
export function MfaSetup({ optional = true, onDone }: { optional?: boolean; onDone?: () => void }) {
  const [factor, setFactor] = useState<Enrolled | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    // Remove half-finished factors from an abandoned earlier attempt (otherwise enroll fails).
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `${APP_NAME} ${Date.now()}` });
    setLoading(false);
    if (error) return setError(error.message);
    setFactor(data as unknown as Enrolled);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factor) return;
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: code.replace(/\s/g, ""),
    });
    setLoading(false);
    if (error) return setError(error.message === "Invalid TOTP code entered" ? "That code is wrong or expired. Try the newest code." : error.message);
    if (onDone) onDone();
    else window.location.assign(AUTH_PATHS.afterLogin);
  }

  const skip = () => window.location.assign(AUTH_PATHS.afterLogin);

  if (!factor) {
    return (
      <Card title="Protect your account with 2FA" description="Use an authenticator app (Google Authenticator, Authy, 1Password) to add a 6-digit code at sign-in.">
        {error && <Alert>{error}</Alert>}
        <Button onClick={start} disabled={loading} className="w-full">
          {loading ? "Preparing QR code…" : "Show QR code"}
        </Button>
        <div className="mt-4 flex justify-center gap-2">
          {optional && (
            <Button type="button" variant="ghost" onClick={skip} disabled={loading}>
              Skip for now
            </Button>
          )}
          <SignOutButton />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Scan the QR code" description="Open your authenticator app, scan the code, then enter the 6-digit code it shows.">
      {error && <Alert>{error}</Alert>}
      <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded-md border bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={factor.totp.qr_code} alt="2FA QR code" className="h-full w-full" />
      </div>
      <p className="mb-5 break-all text-center text-xs text-gray-500">
        Can&apos;t scan? Enter this key manually: <span className="font-mono">{factor.totp.secret}</span>
      </p>
      <form onSubmit={verify} className="space-y-3">
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Verifying…" : "Verify and turn on 2FA"}
        </Button>
      </form>
    </Card>
  );
}
