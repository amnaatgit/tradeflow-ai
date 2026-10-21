"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { AUTH_PATHS } from "../../../lib/auth-config";
import { Alert, Button, Card, Input, Label } from "../../../components/ui";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExists(false);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);

    // Existing email: an error when confirmation is off, or an empty identities list when it is on.
    if (signUpError?.message.toLowerCase().includes("already") || data?.user?.identities?.length === 0) {
      setExists(true);
      return setError("An account with this email already exists.");
    }
    if (signUpError) return setError(signUpError.message);

    if (data.session) {
      // Email confirmation is off: Supabase signed the user in. Sign out so they sign in once
      // themselves (and see the optional 2FA step) — a clear, predictable flow.
      await supabase.auth.signOut();
      window.location.assign(`${AUTH_PATHS.signIn}?created=1`);
      return;
    }
    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <Card title="Check your email" description="We sent you a link to confirm your account. Then sign in.">
        <Button className="w-full" onClick={() => window.location.assign(AUTH_PATHS.signIn)}>
          Go to sign in
        </Button>
      </Card>
    );
  }

  return (
    <Card title="Create your account" description="You can turn on 2FA after you sign in.">
      {error && (
        <Alert>
          {error}{" "}
          {exists && (
            <a href={AUTH_PATHS.signIn} className="underline">
              Sign in instead
            </a>
          )}
        </Alert>
      )}
      <form onSubmit={onSubmit} className="space-y-3">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Sign up"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Have an account?{" "}
        <a href={AUTH_PATHS.signIn} className="text-blue-600 underline">
          Sign in
        </a>
      </p>
    </Card>
  );
}
