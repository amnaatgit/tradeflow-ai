import type { ReactNode } from "react";
import { AuthGuard } from "../../components/auth-guard";
import { SignOutButton } from "../../components/sign-out-button";

// Every page in this folder requires a signed-in user (and the 2FA code when 2FA is on).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard need="aal2">
      <nav className="flex items-center gap-4 border-b px-4 py-3 text-sm">
        <a href="/dashboard">Dashboard</a>
        <a href="/security">Security</a>
        <div className="ml-auto">
          <SignOutButton />
        </div>
      </nav>
      <main className="mx-auto max-w-2xl p-4">{children}</main>
    </AuthGuard>
  );
}
