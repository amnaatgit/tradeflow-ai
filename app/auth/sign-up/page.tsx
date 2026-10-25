"use client";

import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card, CardContent, CardHero } from "../../../components/ui/card";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hideForm, setHideForm] = useState(false);
  const [showSignInLink, setShowSignInLink] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) {
        // Supabase may return conflict-like errors when the account exists
        // or other messages; surface a friendly alternative when appropriate.
        const m = signUpError.message || "";
        if (m.toLowerCase().includes("already")) {
          setError("An account with this email already exists. Sign in instead.");
          setShowSignInLink(true);
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      // Supabase sometimes returns data.user.identities = [] for existing emails when confirmation is required.
      if (data && Array.isArray((data as any).user?.identities) && (data as any).user.identities.length === 0) {
        setError("An account with this email already exists. Sign in instead.");
        setShowSignInLink(true);
        setLoading(false);
        return;
      }

      // If a session exists (email confirmation disabled) sign the user out and
      // send them to sign in with a created=1 flash.
      if (data?.session) {
        await supabase.auth.signOut();
        window.location.assign("/auth/sign-in?created=1");
        return;
      }

      // No session: email confirmation likely required. Show a clear message and
      // hide the form so the user doesn't get confused.
      setNotice("Account created. Check your email to confirm it, then sign in.");
      setHideForm(true);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHero
        icon={<UserPlus strokeWidth={2.25} />}
        title="Create your account"
        description="Start turning order chats into saved orders. You can turn on 2FA after you sign in."
      />
      <CardContent>
        {error && <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error} {showSignInLink && (<a href="/auth/sign-in" className="text-primary underline ml-2">Sign in instead</a>)}</p>}
        {notice && <p className="mb-4 rounded-md bg-muted p-3 text-sm">{notice}</p>}
        {!hideForm && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading || !ready} className="w-full">
              {loading ? "Creating..." : "Sign up"}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Have an account? <a href="/auth/sign-in" className="text-primary underline">Sign in</a>
        </p>
        {notice && hideForm && (
          <div className="mt-4">
            <a href="/auth/sign-in" className="w-full inline-block text-center bg-primary text-white py-2 rounded">Go to sign in</a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
