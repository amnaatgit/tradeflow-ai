import type { ReactNode } from "react";
import { NavShell } from "@/components/nav-shell";
import { AuthGuard } from "@/components/auth-guard";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard need="aal2">
      <NavShell>{children}</NavShell>
    </AuthGuard>
  );
}
