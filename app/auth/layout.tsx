"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Check, ChevronDown, Languages, Lock, ShieldCheck, Sparkles } from "lucide-react";

function BrandMark({ light = false, className = "h-10 w-10" }: { light?: boolean; className?: string }) {
  const tile = light ? "#ffffff" : "#0b7a5a";
  const bubble = light ? "#0b7a5a" : "#ffffff";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="4" y="4" width="56" height="56" rx="14" fill={tile} />
      <path d="M20 22c0-2.209 1.791-4 4-4h16c2.209 0 4 1.791 4 4v11c0 2.209-1.791 4-4 4H28l-5.5 5.5c-.94.94-2.5.274-2.5-1.06V22z" fill={bubble} />
      <path d="M30 30.5l3.5 3.5 6-7" fill="none" stroke={tile} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const pill =
  "inline-flex items-center whitespace-nowrap rounded-full border border-primary/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur transition hover:border-primary/30 hover:bg-white sm:px-4 sm:py-2 sm:text-sm";

function HeaderAction({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/auth/sign-in")) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden text-muted-foreground sm:inline">New to TradeFlow?</span>
        <Link href="/auth/sign-up" className={pill}>
          <span className="min-[360px]:hidden">Sign up</span>
          <span className="hidden min-[360px]:inline">Create account</span>
        </Link>
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
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-primary/15 backdrop-blur">
      <ShieldCheck className="h-3.5 w-3.5" /> Secure sign-in
    </span>
  );
}

const trust = [
  { icon: Lock, text: "Your data stays private" },
  { icon: ShieldCheck, text: "2FA ready" },
  { icon: Languages, text: "Roman Urdu & English" },
];

function Hl({ children }: { children: ReactNode }) {
  return <span className="rounded bg-emerald-100 px-0.5 font-semibold text-emerald-800">{children}</span>;
}

/* Left half on desktop: brand headline and a small chat-to-order illustration */
function BrandPanel() {
  return (
    <aside className="tf-auth-brand relative hidden w-[42%] max-w-[760px] shrink-0 flex-col justify-between overflow-hidden px-8 py-8 text-white md:flex lg:w-[45%] lg:px-12 lg:py-10 xl:w-[44%] xl:px-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="tf-auth-brand-grid absolute inset-0" />
        <div className="tf-blob absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="tf-blob tf-blob-2 absolute -bottom-32 -right-24 h-[26rem] w-[26rem] rounded-full bg-teal-300/15 blur-3xl" />
      </div>

      <Link href="/" aria-label="TradeFlow AI home" className="relative flex w-fit items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
        <BrandMark light className="h-10 w-10 drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)] lg:h-11 lg:w-11" />
        <span className="whitespace-nowrap text-[1.375rem] font-extrabold tracking-tight lg:text-[1.625rem]">
          TradeFlow <span className="text-emerald-300">AI</span>
        </span>
      </Link>

      <div className="tf-brand-mid relative py-8 lg:py-10">
        <span className="tf-brand-badge mb-5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-white/15">
          <Sparkles className="h-3.5 w-3.5 text-emerald-300" /> AI order intake for WhatsApp &amp; Instagram sellers
        </span>
        <h2 className="tf-brand-title max-w-xl text-balance text-[1.875rem] font-extrabold leading-[1.12] tracking-tight lg:text-[2.25rem] xl:text-[2.75rem]">
          Streamline your online orders with{" "}
          <span className="whitespace-nowrap bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent">TradeFlow AI</span>
        </h2>
        <p className="tf-brand-copy mt-4 max-w-lg text-sm leading-6 text-emerald-50/75 lg:text-[0.9375rem] lg:leading-7">
          Paste a chat, upload a screenshot or send a voice note. AI fills in the order, and your khata, receipts and dispatch list update automatically.
        </p>

        <div aria-hidden className="tf-brand-mock relative mt-7 max-w-[25rem] lg:mt-9">
          <div className="tf-brand-bubble tf-float w-[88%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-[13.5px] leading-6 text-slate-700 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.45)]">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-800">B</span>
              Bilal · WhatsApp
            </div>
            Assalam o alaikum, <Hl>3 kurtay</Hl> chahiye <Hl>medium</Hl>, <Hl>1800 ka ek</Hl>. <Hl>Gulshan block 13</Hl>. <Hl>1000 advance</Hl> bhej diya
          </div>
          <div className="tf-brand-arrow my-3 ml-8 flex items-center gap-2 text-xs font-semibold text-emerald-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/20 ring-1 ring-emerald-300/40">
              <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
            </span>
            AI fills in the order
            <ChevronDown className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="tf-brand-order tf-float ml-auto w-[90%] rounded-2xl bg-white p-4 text-[13px] text-slate-700 shadow-[0_24px_48px_-18px_rgba(0,0,0,0.5)]" style={{ animationDelay: "-3s" }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Order ready</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                <Check className="h-3 w-3" /> Saved
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Customer</span><span className="font-medium">Bilal</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Items</span><span className="font-medium">3 × Kurta (medium)</span></div>
              <div className="tf-brand-area flex justify-between gap-3"><span className="text-slate-500">Area</span><span className="font-medium">Gulshan block 13</span></div>
              <div className="mt-2 flex items-end justify-between border-t border-slate-100 pt-2">
                <span className="font-semibold text-slate-900">Due</span>
                <span className="text-lg font-extrabold text-emerald-700">Rs 4,400</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ul className="relative flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-emerald-50/75">
        {trust.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-emerald-300" /> {text}</li>
        ))}
      </ul>
    </aside>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <div className="tf-auth-bg relative isolate flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden">
        {/* soft backdrop behind the card: faint dot grid plus two brand glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="tf-auth-grid absolute inset-0" />
          <div className="tf-blob absolute h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" style={{ left: "calc(50% - 20rem)", top: "14%" }} />
          <div className="tf-blob tf-blob-2 absolute h-80 w-80 rounded-full bg-teal-200/30 blur-3xl" style={{ left: "calc(50% + 2rem)", top: "48%" }} />
        </div>

        <header className="flex w-full items-center justify-between gap-3 px-5 py-5 sm:px-8 sm:py-6 md:justify-end md:px-8 lg:px-10 [@media(max-height:820px)]:md:py-4">
          <Link href="/" aria-label="TradeFlow AI home" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3 md:hidden">
            <BrandMark className="h-10 w-10 drop-shadow-[0_6px_12px_rgba(11,122,90,0.3)] sm:h-11 sm:w-11" />
            <span className="whitespace-nowrap text-xl font-extrabold tracking-tight text-slate-900 sm:text-[1.625rem]">
              TradeFlow <span className="text-primary">AI</span>
            </span>
          </Link>
          <HeaderAction pathname={pathname} />
        </header>

        <main className="flex flex-1 items-center justify-center px-4 pb-8 pt-2 sm:px-8 md:px-6 lg:px-8 lg:pb-12 [@media(max-height:820px)]:md:pb-6">
          <div className="tf-auth w-full max-w-lg">{children}</div>
        </main>

        <footer className="px-5 pb-6 md:hidden">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
            {trust.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-emerald-600" /> {text}</li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  );
}
