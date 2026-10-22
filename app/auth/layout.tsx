import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="tf-auth w-full max-w-lg">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-primary">TradeFlow AI</Link>
          <p className="mt-1 text-sm text-muted-foreground">Chat → order, khata and dispatch for online sellers</p>
        </div>
        {children}
      </div>
    </div>
  );
}
