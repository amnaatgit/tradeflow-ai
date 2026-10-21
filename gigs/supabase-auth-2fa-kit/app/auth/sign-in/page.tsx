"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { AUTH_PATHS } from "../../../lib/auth-config";
import { Alert, Button, Card, Input, Label } from "../../../components/ui";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  // Read ?created=1 without useSearchParams, so the page needs no Suspense boundary.
  useEffect(() => {
    setCreated(new URLSearchParams(window.location.search).get("created") === "1");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setLoading(false);
      return setError(signInError.message === "Invalid login credentials" ? "Wrong email or password." : signInError.message);
    }
    // 2FA on -> ask for the code. 2FA off -> offer to turn it on (with "Skip for now").
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    window.location.assign(aal?.nextLevel === "aal2" ? AUTH_PATHS.verify2fa : AUTH_PATHS.setup2fa);
  }

  return (
    <Card title="Sign in" description="Welcome back.">
      {created && <Alert kind="success">Account created. Sign in to continue.</Alert>}
      {error && <Alert>{error}</Alert>}
      <form onSubmit={onSubmit} className="space-y-3">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        No account yet?{" "}
        <a href={AUTH_PATHS.signUp} className="text-blue-600 underline">
          Sign up
        </a>
      </p>
    </Card>
  );
}
