"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { AUTH_PATHS } from "../lib/auth-config";
import { Alert, Button, Card } from "./ui";

type Factor = { id: string; friendly_name?: string; created_at: string; status: string };

// "Security" page block: shows whether 2FA is on, lets the user turn it on, or off (needs aal2).
export function SecuritySettings() {
  const [email, setEmail] = useState<string | null>(null);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: u }, { data: f }] = await Promise.all([supabase.auth.getUser(), supabase.auth.mfa.listFactors()]);
    setEmail(u.user?.email ?? null);
    setFactors(((f?.totp ?? []) as unknown as Factor[]).filter((x) => x.status === "verified"));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function turnOff() {
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    for (const f of factors) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
      if (error) {
        setBusy(false);
        setConfirmOff(false);
        return setMessage({ kind: "error", text: error.message });
      }
    }
    await supabase.auth.refreshSession();
    setBusy(false);
    setConfirmOff(false);
    setMessage({ kind: "success", text: "2FA is now off." });
    load();
  }

  if (loading) return <p className="p-4 text-sm text-gray-500">Loading…</p>;
  const on = factors.length > 0;

  return (
    <Card title="Security" description={email ? `Signed in as ${email}` : undefined}>
      {message && <Alert kind={message.kind}>{message.text}</Alert>}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <div className="font-medium">Two-factor authentication</div>
          <div className="text-sm text-gray-500">
            {on ? `On since ${new Date(factors[0].created_at).toLocaleDateString()}` : "Off. Anyone with your password can sign in."}
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${on ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
          {on ? "On" : "Off"}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!on && <Button onClick={() => window.location.assign(AUTH_PATHS.setup2fa)}>Turn on 2FA</Button>}
        {on && !confirmOff && (
          <Button variant="danger" onClick={() => setConfirmOff(true)}>
            Turn off 2FA
          </Button>
        )}
        {on && confirmOff && (
          <div className="w-full rounded-md bg-gray-100 p-3 text-sm">
            <p>Turn off 2FA? Your account will only be protected by your password.</p>
            <div className="mt-2 flex gap-2">
              <Button variant="danger" onClick={turnOff} disabled={busy}>
                {busy ? "Turning off…" : "Yes, turn off"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmOff(false)} disabled={busy}>
                Keep it on
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
