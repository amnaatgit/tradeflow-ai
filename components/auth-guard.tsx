"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// need="aal2": app pages. Must be signed in; accounts that turned 2FA on must
// also have entered their code. need="session": the 2FA setup / verify pages.
export function AuthGuard({ need, children }: { need: "aal2" | "session"; children: ReactNode }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      setErrorMsg("This is taking longer than usual.");
    }, 10000);

    async function check() {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          window.location.replace("/auth/sign-in");
          return;
        }
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const verified = aal?.currentLevel === "aal2";
        const mfaPage = aal?.nextLevel === "aal2" ? "/auth/verify" : "/auth/setup";

        // 2FA is optional: only accounts that turned it on must enter a code.
        if (need === "aal2" && !verified && aal?.nextLevel === "aal2") {
          window.location.replace("/auth/verify");
          return;
        }
        if (need === "session") {
          if (verified) {
            window.location.replace("/dashboard");
            return;
          }
          if (pathname !== mfaPage) {
            window.location.replace(mfaPage);
            return;
          }
        }
        if (!cancelled) setAllowed(true);
      } catch (err) {
        setErrorMsg("This is taking longer than usual.");
      } finally {
        clearTimeout(timer);
      }
    }
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [need, pathname]);

  if (!allowed) {
    if (errorMsg) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          <div className="space-y-3 p-4 text-center">
            <div>{errorMsg}</div>
            <div className="flex items-center justify-center gap-2">
              <button className="rounded border px-3 py-1" onClick={() => window.location.reload()}>Retry</button>
              <button className="rounded border px-3 py-1" onClick={() => window.location.assign('/auth/sign-in')}>Go to sign in</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
