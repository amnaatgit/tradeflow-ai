"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  BookOpen, Check, CheckCheck, ChevronDown, ChevronRight, FileText, Image as ImageIcon, MapPin, Mic, Package, Phone, Play, Receipt,
  RotateCcw, ShieldCheck, Sparkles, Truck, User, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ demo data (real arithmetic) */
type Seg = { t: string; mark?: boolean };
type Sample = {
  key: string;
  tab: string;
  customer: string;
  initial: string;
  messages: Seg[][];
  rows: { icon: ReactNode; label: string; value: string }[];
  due: number;
  dueNote: string;
  khata: string;
  dispatch: string;
};

const SAMPLES: Sample[] = [
  {
    key: "roman", tab: "Roman Urdu", customer: "Bilal", initial: "B",
    messages: [
      [{ t: "Assalam o alaikum, " }, { t: "3 kurtay", mark: true }, { t: " chahiye " }, { t: "medium", mark: true }],
      [{ t: "1800 ka ek", mark: true }, { t: ". " }, { t: "Flat 7, Gulshan block 13", mark: true }, { t: " Karachi" }],
      [{ t: "0333-1112233", mark: true }, { t: ". " }, { t: "1000 advance", mark: true }, { t: " bhej diya" }],
    ],
    rows: [
      { icon: <User className="h-4 w-4" />, label: "Customer", value: "Bilal" },
      { icon: <Phone className="h-4 w-4" />, label: "Phone", value: "0333-1112233" },
      { icon: <MapPin className="h-4 w-4" />, label: "Area", value: "Gulshan block 13" },
      { icon: <Package className="h-4 w-4" />, label: "Items", value: "3 × Kurta (medium) · Rs 1,800" },
      { icon: <Wallet className="h-4 w-4" />, label: "Advance", value: "Rs 1,000" },
    ],
    due: 4400, dueNote: "Rs 5,400 total − Rs 1,000 advance",
    khata: "Bilal now owes Rs 4,400", dispatch: "Added to the Gulshan route",
  },
  {
    key: "english", tab: "English", customer: "Hira", initial: "H",
    messages: [
      [{ t: "Hi! I'd like " }, { t: "1 bridal clutch (gold)", mark: true }, { t: " for " }, { t: "Rs 4500", mark: true }],
      [{ t: "and " }, { t: "2 pairs of jhumkay at 1200", mark: true }, { t: " each. Deliver to " }, { t: "45-B Johar Town, Lahore", mark: true }],
      [{ t: "Call " }, { t: "0312-9988776", mark: true }, { t: ". I've sent " }, { t: "2000 via JazzCash", mark: true }],
    ],
    rows: [
      { icon: <User className="h-4 w-4" />, label: "Customer", value: "Hira" },
      { icon: <Phone className="h-4 w-4" />, label: "Phone", value: "0312-9988776" },
      { icon: <MapPin className="h-4 w-4" />, label: "Area", value: "Johar Town, Lahore" },
      { icon: <Package className="h-4 w-4" />, label: "Items", value: "1 × Bridal clutch · 2 × Jhumkay" },
      { icon: <Wallet className="h-4 w-4" />, label: "Advance", value: "Rs 2,000 (JazzCash)" },
    ],
    due: 4900, dueNote: "Rs 6,900 total − Rs 2,000 advance",
    khata: "Hira now owes Rs 4,900", dispatch: "Added to the Johar Town route",
  },
  {
    key: "mixed", tab: "Mixed", customer: "Usman", initial: "U",
    messages: [
      [{ t: "Salam, Usman here. " }, { t: "do darjan cupcakes", mark: true }, { t: " chahiye, " }, { t: "150 ka ek", mark: true }],
      [{ t: "aur " }, { t: "1 chocolate cake 2 pound wala 2200", mark: true }],
      [{ t: "Gulshan block 13, flat 22", mark: true }, { t: ". " }, { t: "0345-1239876", mark: true }, { t: ". " }, { t: "Delivery 200", mark: true }, { t: " add kar dein" }],
    ],
    rows: [
      { icon: <User className="h-4 w-4" />, label: "Customer", value: "Usman" },
      { icon: <Phone className="h-4 w-4" />, label: "Phone", value: "0345-1239876" },
      { icon: <MapPin className="h-4 w-4" />, label: "Area", value: "Gulshan block 13" },
      { icon: <Package className="h-4 w-4" />, label: "Items", value: "24 × Cupcake · 1 × Chocolate cake" },
      { icon: <Wallet className="h-4 w-4" />, label: "Advance", value: "None - cash on delivery" },
    ],
    due: 6000, dueNote: "Rs 3,600 + Rs 2,200 + Rs 200 delivery",
    khata: "Usman now owes Rs 6,000", dispatch: "Added to the Gulshan route (COD)",
  },
];

/* phase timeline (ms from start of a sample) */
const TIMELINE = [0, 800, 1750, 2700, 3600, 4700, 6000, 7500, 8700, 9300];
const LOOP_MS = 14000;
const FADE_MS = 450;
const FINAL = TIMELINE.length - 1;
const STEPS = ["Customer sends a chat", "AI reads it", "Order filled in", "Saved everywhere"];
const stepOf = (p: number) => (p <= 3 ? 0 : p <= 5 ? 1 : p <= 7 ? 2 : 3);

const fmt = (n: number) => "Rs " + n.toLocaleString("en-US");

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ the animated showcase */
function OrderShowcase() {
  const reduced = useReducedMotion();
  const [sampleIdx, setSampleIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const [run, setRun] = useState(0);              // bumps to restart the timeline
  const [auto, setAuto] = useState(true);        // auto-advance to the next sample
  const [due, setDue] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const sample = SAMPLES[sampleIdx];
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setLeaving(false);
    if (reduced) { setPhase(FINAL); return; }
    setPhase(0);
    TIMELINE.forEach((ms, p) => { timers.current.push(window.setTimeout(() => setPhase(p), ms)); });
    if (auto) {
      timers.current.push(window.setTimeout(() => setLeaving(true), LOOP_MS - FADE_MS));
      timers.current.push(window.setTimeout(() => {
        setSampleIdx((i) => (i + 1) % SAMPLES.length);
        setRun((r) => r + 1);
      }, LOOP_MS));
    }
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); };
  }, [run, reduced, auto]);

  // count the amount due up once the order is filled in
  const counting = phase >= 7;
  useEffect(() => {
    if (!counting) { setDue(0); return; }
    if (reduced) { setDue(sample.due); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1000);
      setDue(Math.round(sample.due * (1 - Math.pow(1 - k, 3)) / 10) * 10);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [counting, sample.due, reduced]);

  const pick = (i: number) => { setAuto(false); setSampleIdx(i); setRun((r) => r + 1); };
  const replay = () => { setRun((r) => r + 1); };

  const shown = phase >= 3 ? 3 : phase;              // messages visible
  const typing = !reduced && phase < 3;
  const marking = phase >= 4;
  const beam = phase >= 5;
  const filled = phase >= 6;
  const saved = phase >= 8;
  const updates = phase >= 9;
  const step = stepOf(phase);

  return (
    <div className="tf-stage relative overflow-hidden rounded-[28px] border border-emerald-900/10 bg-white/80 shadow-[0_30px_80px_-30px_rgba(6,78,59,0.35)] backdrop-blur">
      {/* top bar: samples, progress, replay */}
      <div className="flex flex-col gap-3 border-b border-emerald-900/10 bg-emerald-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Example chat language">
          {SAMPLES.map((s, i) => (
            <button key={s.key} type="button" role="tab" aria-selected={i === sampleIdx} onClick={() => pick(i)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${i === sampleIdx ? "bg-emerald-700 text-white shadow" : "text-emerald-900/70 hover:bg-emerald-100"}`}>
              {s.tab}
            </button>
          ))}
        </div>
        <ol className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className={`flex items-center gap-1.5 transition-colors ${i <= step ? "text-emerald-800" : "text-slate-400"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${i < step || (i === step && saved) ? "bg-emerald-600 text-white" : i === step ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500" : "bg-slate-100 text-slate-400"}`}>
                {i < step || (i === step && saved) ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
        <button type="button" onClick={replay} className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-800/20 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 sm:self-auto">
          <RotateCcw className="h-3.5 w-3.5" /> Replay
        </button>
      </div>

      <div key={`stage-${run}`} className={`tf-fade grid items-center gap-6 p-4 transition-opacity duration-500 ease-out sm:p-6 lg:grid-cols-[minmax(0,270px)_104px_minmax(0,1fr)] lg:gap-4 xl:grid-cols-[290px_minmax(120px,1fr)_minmax(0,340px)_210px] xl:p-8 ${leaving ? "opacity-0" : "opacity-100"}`}>
        {/* 1. the phone with the WhatsApp chat */}
        <div className="mx-auto w-full max-w-[290px]">
          <div className="rounded-[2.4rem] bg-slate-900 p-2.5 shadow-2xl ring-1 ring-black/10">
            <div className="overflow-hidden rounded-[1.9rem]">
              <div className="flex items-center gap-2.5 bg-[#075E54] px-3.5 pb-2.5 pt-4 text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200 text-sm font-bold text-emerald-900">{sample.initial}</div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">{sample.customer} (customer)</div>
                  <div className="text-[11px] text-emerald-100">{typing ? "typing…" : "online"}</div>
                </div>
              </div>
              <div className="tf-chatbg relative flex h-[340px] flex-col justify-end gap-2 overflow-hidden px-3 py-3">
                {marking && !filled && <div className="tf-scan pointer-events-none absolute inset-x-0 top-0 h-16" aria-hidden />}
                {sample.messages.slice(0, shown).map((msg, i) => (
                  <div key={`${sample.key}-${i}-${run}`} className="tf-pop max-w-[88%] self-start rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 text-[13px] leading-5 text-slate-800 shadow-sm">
                    {msg.map((seg, j) => seg.mark
                      ? <span key={j} className={`tf-mark ${marking ? "tf-mark-on" : ""}`} style={{ transitionDelay: `${(i * 3 + j) * 90}ms` }}>{seg.t}</span>
                      : <span key={j}>{seg.t}</span>)}
                    <span className="ml-2 inline-flex translate-y-0.5 items-center gap-0.5 text-[10px] text-slate-400">
                      {`8:0${2 + i} pm`}{i === shown - 1 && marking ? <CheckCheck className="h-3 w-3 text-sky-500" /> : null}
                    </span>
                  </div>
                ))}
                {typing && (
                  <div className="tf-pop flex w-14 items-center justify-center gap-1 self-start rounded-lg rounded-tl-none bg-white px-3 py-2.5 shadow-sm" aria-label="typing">
                    <span className="tf-dot" /><span className="tf-dot" style={{ animationDelay: "0.15s" }} /><span className="tf-dot" style={{ animationDelay: "0.3s" }} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 bg-[#F0F0F0] px-3 py-2">
                <div className="h-7 flex-1 rounded-full bg-white px-3 text-[12px] leading-7 text-slate-400">Message</div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00A884] text-white"><Mic className="h-3.5 w-3.5" /></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. the AI beam: an arrow from the chat to the order */}
        <div className="relative flex h-32 items-center justify-center lg:h-full lg:min-h-[300px]" aria-hidden>
          <div className="absolute bottom-3 left-1/2 top-1 w-[3px] -translate-x-1/2 rounded-full bg-emerald-100 lg:bottom-auto lg:left-1 lg:right-3 lg:top-1/2 lg:h-[3px] lg:w-auto lg:-translate-y-1/2 lg:translate-x-0">
            <div key={`beam-${run}`} className={`tf-beam-fill absolute inset-0 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-700 lg:bg-gradient-to-r ${beam ? "tf-beam-on" : ""}`} />
            {beam && !filled && (
              <span className="tf-beam-run absolute inset-0">
                <span className="tf-beam-dot absolute h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.25),0_0_18px_rgba(16,185,129,0.8)]" />
              </span>
            )}
          </div>
          <ChevronDown className={`absolute bottom-0 left-1/2 h-6 w-6 -translate-x-1/2 transition-colors duration-500 lg:hidden ${filled ? "text-emerald-700" : "text-emerald-200"}`} strokeWidth={3} />
          <ChevronRight className={`absolute right-0 top-1/2 hidden h-7 w-7 -translate-y-1/2 transition-colors duration-500 lg:block ${filled ? "text-emerald-700" : "text-emerald-200"}`} strokeWidth={3} />
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-md transition-all duration-500 ${beam ? "scale-105 border-emerald-600 bg-emerald-700 text-white" : "border-emerald-200 bg-white text-emerald-600"}`}>
              <Sparkles className={`h-5 w-5 ${beam && !filled ? "tf-spin" : ""}`} />
            </span>
            <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-900/10">
              {filled ? "Order extracted" : beam ? "AI reading…" : "TradeFlow AI"}
            </span>
          </div>
        </div>

        {/* 3. the order it becomes */}
        <div className="mx-auto w-full max-w-[360px] lg:max-w-[400px] xl:max-w-[340px]">
          <div className={`rounded-2xl border bg-white p-5 shadow-xl transition-all duration-500 ${filled ? "border-emerald-200 opacity-100" : "border-dashed border-slate-200 opacity-60"}`}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Order ready to review</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${saved ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"}`}>{saved ? "Saved" : "New"}</span>
            </div>
            <div className="space-y-2.5 text-sm">
              {sample.rows.map((r, i) => (
                <div key={`${sample.key}-${r.label}-${run}`} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">{r.icon}</span>
                  <span className="w-[4.5rem] flex-none text-slate-500">{r.label}</span>
                  {filled
                    ? <span className={`tf-pop min-w-0 flex-1 text-right font-medium leading-5 text-slate-900 ${r.label === "Items" ? "break-words" : "whitespace-nowrap"}`} style={{ animationDelay: `${i * 140}ms` }}>{r.value}</span>
                    : <span className="h-3 flex-1 rounded bg-slate-100" />}
                </div>
              ))}
              <div className="mt-1 flex items-end justify-between border-t border-slate-100 pt-3">
                <div>
                  <div className="font-bold text-slate-900">Due</div>
                  <div className={`text-[11px] text-slate-500 transition-opacity duration-500 ${phase >= 7 ? "opacity-100" : "opacity-0"}`}>{sample.dueNote}</div>
                </div>
                <span className="whitespace-nowrap text-2xl font-extrabold tabular-nums text-emerald-700">{phase >= 7 ? fmt(due) : "Rs —"}</span>
              </div>
            </div>
            <div className={`mt-4 flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300 ${saved ? "bg-emerald-600 text-white" : filled ? "tf-ring bg-emerald-700 text-white" : "bg-slate-100 text-slate-400"}`}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save order"}
            </div>
          </div>
        </div>

        {/* 4. what updates automatically */}
        <div className="mx-auto grid w-full max-w-[360px] gap-2.5 sm:max-w-none sm:grid-cols-3 lg:col-span-3 xl:col-span-1 xl:grid-cols-1">
          {[
            { icon: <BookOpen className="h-4 w-4" />, title: "Khata", text: sample.khata },
            { icon: <Truck className="h-4 w-4" />, title: "Dispatch list", text: sample.dispatch },
            { icon: <Receipt className="h-4 w-4" />, title: "Receipt", text: "Ready to print or share" },
          ].map((u, i) => (
            <div key={`${u.title}-${run}`}
              className={`rounded-xl border p-3 transition-all duration-500 ${updates ? "tf-slide border-emerald-200 bg-white shadow-md" : "border-dashed border-slate-200 bg-white/50"}`}
              style={updates ? { animationDelay: `${i * 260}ms` } : undefined}>
              <div className={`flex items-center gap-2 text-sm font-semibold ${updates ? "text-emerald-800" : "text-slate-400"}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-md ${updates ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>{u.icon}</span>
                {u.title}
                {updates && <Check className="ml-auto h-4 w-4 text-emerald-600" />}
              </div>
              <div className={`mt-1 text-xs ${updates ? "text-slate-600" : "text-slate-400"}`}>{updates ? u.text : "Updates when you save"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */
const features = [
  { icon: <Sparkles className="h-5 w-5" />, title: "AI order intake", text: "Paste text, upload a screenshot or send a voice note; unsure fields are highlighted for you to check." },
  { icon: <BookOpen className="h-5 w-5" />, title: "Khata & reminders", text: "Track customer balances and payments, then write WhatsApp reminders in Roman Urdu or English." },
  { icon: <Truck className="h-5 w-5" />, title: "Dispatch & receipts", text: "See pending orders grouped by area with cash to collect, plus clean printable receipts." },
];

const steps = [
  ["1", "Paste or upload the chat."],
  ["2", "Check what the AI filled in."],
  ["3", "Save: khata, dispatch and receipts update."],
];

const CSS = `
@keyframes tfPop { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes tfDot { 0%, 80%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
@keyframes tfRunX { 0% { transform: translateX(0); opacity: 0; } 15%, 85% { opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } }
@keyframes tfRunY { 0% { transform: translateY(0); opacity: 0; } 15%, 85% { opacity: 1; } 100% { transform: translateY(100%); opacity: 0; } }
@keyframes tfFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes tfSlide { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
@keyframes tfRing { 0% { box-shadow: 0 0 0 0 rgba(4,120,87,.45); } 100% { box-shadow: 0 0 0 14px rgba(4,120,87,0); } }
@keyframes tfSpin { to { transform: rotate(360deg); } }
@keyframes tfScan { 0% { transform: translateY(-64px); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(340px); opacity: .2; } }
@keyframes tfGlow { 0%, 100% { opacity: .55; transform: scale(1); } 50% { opacity: .85; transform: scale(1.06); } }
.tf-chatbg { background-color: #EFE7DD; background-image: radial-gradient(rgba(7,94,84,.07) 1px, transparent 1px); background-size: 14px 14px; }
.tf-dot { width: 6px; height: 6px; border-radius: 9999px; background: #94a3b8; display: inline-block; }
.tf-mark { background-image: linear-gradient(rgba(16,185,129,.24), rgba(16,185,129,.24)); background-repeat: no-repeat; background-size: 0% 100%;
  transition: background-size .45s ease, color .3s ease; border-radius: 3px; padding: 0 1px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.tf-mark-on { background-size: 100% 100%; color: #065f46; font-weight: 600; }
.tf-scan { background: linear-gradient(180deg, rgba(16,185,129,0) 0%, rgba(16,185,129,.18) 55%, rgba(16,185,129,.45) 100%); border-bottom: 2px solid rgba(5,150,105,.7); }
.tf-beam-fill { transform-origin: top; transform: scaleY(0); transition: transform 1s cubic-bezier(.65,0,.25,1); will-change: transform; }
.tf-beam-on { transform: scaleY(1); }
.tf-beam-dot { left: 50%; margin-left: -6px; top: -6px; }
@media (min-width: 1024px) {
  .tf-beam-fill { transform-origin: left; transform: scaleX(0); } .tf-beam-on { transform: scaleX(1); }
  .tf-beam-dot { top: 50%; margin-top: -6px; left: -6px; margin-left: 0; }
}
.tf-pop, .tf-slide, .tf-beam-run, .tf-scan { will-change: transform, opacity; }
@media (prefers-reduced-motion: no-preference) {
  .tf-pop { animation: tfPop .5s cubic-bezier(.16,1,.3,1) both; }
  .tf-dot { animation: tfDot 1.1s ease-in-out infinite; }
  .tf-slide { animation: tfSlide .55s cubic-bezier(.16,1,.3,1) both; }
  .tf-ring { animation: tfRing 1.2s ease-out infinite; }
  .tf-spin { animation: tfSpin 1.2s linear infinite; }
  .tf-beam-run { animation: tfRunY 1.25s cubic-bezier(.45,0,.25,1) infinite; }
  .tf-fade { animation: tfFade .5s ease-out backwards; }
  .tf-glow { animation: tfGlow 7s ease-in-out infinite; }
  .tf-scan { animation: tfScan 1.3s ease-in-out infinite; }
}
@media (prefers-reduced-motion: no-preference) and (min-width: 1024px) { .tf-beam-run { animation-name: tfRunX; } }
`;

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <style>{CSS}</style>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-lg font-bold text-primary">TradeFlow AI</Link>
        <div className="flex items-center gap-3">
          <Link href="/auth/sign-in" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">Sign in</Link>
          <Link href="/auth/sign-up"><Button size="sm" className="rounded-full">Get started</Button></Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl overflow-x-clip px-5 pb-14 pt-8 sm:px-8 sm:pt-12">
        <div aria-hidden className="tf-glow pointer-events-none absolute -top-10 left-1/2 -z-10 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> For WhatsApp &amp; Instagram sellers in Pakistan
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl [&::after]:mx-auto">
            From a WhatsApp chat to a saved order in seconds
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Paste a chat, upload a screenshot or send a voice note in Roman Urdu or English. AI fills in the order, you check it, and your khata, receipts and dispatch list update automatically.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/auth/sign-up"><Button size="lg" className="w-full rounded-xl sm:w-auto">Create free account</Button></Link>
            <Link href="/auth/sign-in"><Button size="lg" variant="outline" className="w-full rounded-xl sm:w-auto">I already have an account</Button></Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-emerald-900/70">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-emerald-900/10"><FileText className="h-3.5 w-3.5" /> Chat text</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-emerald-900/10"><ImageIcon className="h-3.5 w-3.5" /> Screenshot</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 ring-1 ring-emerald-900/10"><Mic className="h-3.5 w-3.5" /> Voice note</span>
          </div>
        </div>

        <div className="mt-12">
          <OrderShowcase />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Play className="h-3 w-3" /> Example chats - try your own after you sign up.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{feature.icon}</div>
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
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6 text-center text-sm leading-7 text-muted-foreground">
          <ShieldCheck className="hidden h-5 w-5 flex-none text-primary sm:block" />
          <span><span className="font-semibold text-foreground">Your data stays yours:</span> each account only sees its own data (Postgres row-level security), with optional 2FA using an authenticator app.</span>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-center text-sm text-muted-foreground sm:px-8">
        TradeFlow AI · Built at the NED Devmarketplace hackathon
      </footer>
    </main>
  );
}
