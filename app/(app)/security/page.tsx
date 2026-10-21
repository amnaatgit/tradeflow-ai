"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Factor = { id: string; status: string; created_at?: string };

export default function SecurityPage() {
  const [email, setEmail] = useState("");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSecurity() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const [{ data: userData, error: userError }, { data: factorData, error: factorError }] =
      await Promise.all([supabase.auth.getUser(), supabase.auth.mfa.listFactors()]);
    if (userError) setError(userError.message);
    if (factorError) setError(factorError.message);
    setEmail(userData.user?.email ?? "");
    setFactors(
      ((factorData?.totp ?? []) as Factor[]).filter((factor) => factor.status === "verified")
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadSecurity();
  }, []);

  async function turnOff() {
    setWorking(true);
    setError(null);
    const supabase = createClient();
    for (const factor of factors) {
      const result = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (result.error) {
        setError(result.error.message);
        setWorking(false);
        return;
      }
    }
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) setError(refreshError.message);
    else setMessage("2FA is now off.");
    setConfirming(false);
    setWorking(false);
    await loadSecurity();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const enabled = factors.length > 0;
  const firstDate = factors[0]?.created_at
    ? new Date(factors[0].created_at).toLocaleDateString()
    : "";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <p className="text-sm text-muted-foreground">Signed in as {email}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 font-medium">
                Two-factor authentication
                <span className={`rounded-full px-2 py-0.5 text-xs ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {enabled ? "On" : "Off"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {enabled ? `On since ${firstDate}` : "Off. Anyone with your password can sign in."}
              </p>
            </div>
            {enabled ? (
              <Button variant="destructive" onClick={() => setConfirming(true)} disabled={working || confirming}>
                Turn off 2FA
              </Button>
            ) : (
              <Button onClick={() => window.location.assign("/auth/setup")} disabled={working}>
                Turn on 2FA
              </Button>
            )}
          </div>
          {confirming && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm">Turn off 2FA? Your account will only be protected by your password.</p>
              <div className="mt-3 flex gap-2">
                <Button variant="destructive" size="sm" onClick={() => void turnOff()} disabled={working}>
                  {working ? "Turning off…" : "Yes, turn off"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={working}>
                  Keep it on
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
