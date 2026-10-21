import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "AI order intake",
    text: "Paste text, upload a screenshot or send a voice note; unsure fields are highlighted for you to check.",
    icon: "✦",
  },
  {
    title: "Khata & reminders",
    text: "Track customer balances and payments, then write WhatsApp reminders in Roman Urdu or English.",
    icon: "▣",
  },
  {
    title: "Dispatch & receipts",
    text: "See pending orders grouped by area with cash to collect, plus clean printable receipts.",
    icon: "↗",
  },
];

const steps = [
  ["1", "Paste or upload the chat."],
  ["2", "Check what the AI filled in."],
  ["3", "Save: khata, dispatch and receipts update."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-lg font-bold text-primary">TradeFlow AI</Link>
        <div className="flex items-center gap-3">
          <Link href="/auth/sign-in" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">Sign in</Link>
          <Link href="/auth/sign-up"><Button size="sm" className="rounded-full">Get started</Button></Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              For WhatsApp &amp; Instagram sellers in Pakistan
            </span>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
              Turn order chats into saved orders in seconds
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Paste a chat, upload a screenshot or send a voice note in Roman Urdu or English. AI fills in the order, you check it, and your khata, receipts and dispatch list update automatically.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/sign-up"><Button size="lg" className="w-full rounded-xl sm:w-auto">Create free account</Button></Link>
              <Link href="/auth/sign-in"><Button size="lg" variant="outline" className="w-full rounded-xl sm:w-auto">I already have an account</Button></Link>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-background to-emerald-100/70 p-4 shadow-sm sm:p-7">
            <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-primary p-4 text-sm leading-6 text-primary-foreground shadow-lg">
              Assalam o alaikum, 3 kurtay chahiye medium, 1800 ka ek. Flat 7, Gulshan block 13. 0333-1112233. 1000 advance bhej diya
            </div>
            <div className="flex flex-col items-center py-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <span className="text-2xl leading-none">↓</span>
              <span>AI</span>
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between"><span className="font-semibold">Order ready to review</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">New</span></div>
              <div className="space-y-3 text-sm">
                <DemoRow label="Customer" value="Bilal" />
                <DemoRow label="Phone" value="0333-1112233" />
                <DemoRow label="Area" value="Gulshan block 13" />
                <DemoRow label="Items" value="3 × Kurta (medium)  Rs 1,800" />
                <DemoRow label="Advance" value="Rs 1,000" />
                <div className="flex justify-between border-t pt-3 font-bold"><span>Due</span><span className="text-primary">Rs 4,400</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">{feature.icon}</div>
              <h2 className="mt-5 text-xl font-semibold">{feature.title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="rounded-3xl bg-slate-950 px-6 py-10 text-white sm:px-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">How it works</p>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {steps.map(([number, text]) => <div key={number} className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-bold text-slate-950">{number}</span><p className="pt-1 text-lg text-slate-200">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6 text-center text-sm leading-7 text-muted-foreground">
          <span className="font-semibold text-foreground">Your data stays yours:</span> each account only sees its own data (Postgres row-level security), with optional 2FA using an authenticator app.
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-center text-sm text-muted-foreground sm:px-8">
        TradeFlow AI · Built at the NED Devmarketplace hackathon
      </footer>
    </main>
  );
}

function DemoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-wrap justify-between gap-2"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}
