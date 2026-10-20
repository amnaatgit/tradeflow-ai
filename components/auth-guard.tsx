"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// need="aal2": app pages. Must be signed in; accounts that turned 2FA on must
// also have entered their code. need="session": the 2FA setup / verify pages.
export function AuthGuard({ need, children }: { need: "aal2" | "session"; children: ReactNode }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
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
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [need, pathname]);

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
