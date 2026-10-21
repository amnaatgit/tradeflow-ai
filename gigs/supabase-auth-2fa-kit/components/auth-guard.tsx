"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { AUTH_PATHS } from "../lib/auth-config";

// need="aal2": protected app pages. The user must be signed in, and accounts that turned 2FA on
//              must have entered their code in this session.
// need="session": the 2FA setup / verify pages themselves.
export function AuthGuard({ need, children }: { need: "aal2" | "session"; children: ReactNode }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => setSlow(true), 10000);

    async function check() {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          window.location.replace(AUTH_PATHS.signIn);
          return;
        }
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const verified = aal?.currentLevel === "aal2";
        const mustVerify = aal?.nextLevel === "aal2" && !verified;

        if (need === "aal2" && mustVerify) {
          window.location.replace(AUTH_PATHS.verify2fa);
          return;
        }
        if (need === "session") {
          if (verified) {
            window.location.replace(AUTH_PATHS.afterLogin);
            return;
          }
          const mfaPage = mustVerify ? AUTH_PATHS.verify2fa : AUTH_PATHS.setup2fa;
          if (pathname !== mfaPage) {
            window.location.replace(mfaPage);
            return;
          }
        }
        if (!cancelled) setAllowed(true);
      } catch {
        if (!cancelled) setSlow(true);
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

  if (allowed) return <>{children}</>;
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">
      {slow ? (
        <div className="space-y-3 text-center">
          <p>This is taking longer than usual.</p>
          <div className="flex justify-center gap-2">
            <button className="rounded border px-3 py-1" onClick={() => window.location.reload()}>
              Retry
            </button>
            <button className="rounded border px-3 py-1" onClick={() => window.location.assign(AUTH_PATHS.signIn)}>
              Go to sign in
            </button>
          </div>
        </div>
      ) : (
        "Loading…"
      )}
    </div>
  );
}
