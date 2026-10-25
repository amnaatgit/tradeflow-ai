"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8 drop-shadow-sm" aria-hidden>
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#0b7a5a" />
      <path d="M20 22c0-2.209 1.791-4 4-4h16c2.209 0 4 1.791 4 4v11c0 2.209-1.791 4-4 4H28l-5.5 5.5c-.94.94-2.5.274-2.5-1.06V22z" fill="#ffffff" />
      <path d="M30 30.5l3.5 3.5 6-7" fill="none" stroke="#0b7a5a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const pill =
  "inline-flex items-center whitespace-nowrap rounded-full border border-primary/15 bg-white/70 px-3 py-1.5 text-xs font-semibold sm:px-3.5 sm:text-sm text-primary shadow-sm backdrop-blur transition hover:border-primary/30 hover:bg-white";

function HeaderAction({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/auth/sign-in")) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden text-muted-foreground sm:inline">New to TradeFlow?</span>
        <Link href="/auth/sign-up" className={pill}>Create account</Link>
      </div>
    );
  }
  if (pathname.startsWith("/auth/sign-up")) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden text-muted-foreground sm:inline">Already have an account?</span>
        <Link href="/auth/sign-in" className={pill}>Sign in</Link>
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-primary/15 backdrop-blur">
      <ShieldCheck className="h-3.5 w-3.5" /> Secure sign-in
    </span>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="tf-auth-bg relative isolate flex min-h-screen flex-col overflow-hidden">
      {/* backdrop: faint dot grid plus two soft brand glows behind the card */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="tf-auth-grid absolute inset-0" />
        <div className="tf-blob absolute h-72 w-72 rounded-full bg-emerald-200/45 blur-3xl" style={{ left: "calc(50% - 22rem)", top: "16%" }} />
        <div className="tf-blob tf-blob-2 absolute h-80 w-80 rounded-full bg-teal-200/35 blur-3xl" style={{ left: "calc(50% + 2rem)", top: "46%" }} />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link href="/" aria-label="TradeFlow AI home" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandMark />
          <span className="whitespace-nowrap text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            TradeFlow <span className="text-primary">AI</span>
          </span>
        </Link>
        <HeaderAction pathname={pathname} />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:pt-4">
        <div className="tf-auth w-full max-w-lg">
          {children}
          <p className="mt-6 text-center text-xs text-muted-foreground">Chat → order, khata and dispatch for online sellers</p>
        </div>
      </main>
    </div>
  );
}
