"use client";

import { LogIn as IcLogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card, CardContent, CardHero } from "../../../components/ui/card";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdFlash, setCreatedFlash] = useState<string | null>(null);

  useEffect(() => {
    setReady(true);
    // show flash when redirected after account creation
    const created = new URLSearchParams(window.location.search).get("created");
    if (created === "1") setCreatedFlash("Account created. Sign in to continue.");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      // With 2FA on: enter the code. Without it: offer setup (with "Skip for now").
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      window.location.assign(aal?.nextLevel === "aal2" ? "/auth/verify" : "/auth/setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHero
        icon={<IcLogIn strokeWidth={2.25} />}
        title="Sign in"
        description="Welcome back. Enter your email and password to continue."
      />
      <CardContent>
        {createdFlash && (
          <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{createdFlash}</p>
        )}
      {error && (
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <Button type="submit" disabled={loading || !ready} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a href="/auth/sign-up" className="text-primary underline">
            Sign up
          </a>
        </p>
      </CardContent>
    </Card>
  );
}