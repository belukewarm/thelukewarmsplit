"use client";
import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, ChevronRight, ChevronLeft, Moon, Sun, Copy, Share2,
  Users, Receipt, Wallet, CheckCircle2, ToggleLeft, ToggleRight, Check, AlertTriangle
} from "lucide-react";

// ————————————————————————————————————————
// Lukewarm Splitting – V2 UI Overhaul
// Goals: premium glassmorphism, gradient accents, abstract blobs, smooth micro-interactions,
// compact inputs, sticky sidebar stepper + live totals, stronger hierarchy, mobile-first.
// ————————————————————————————————————————

type Person = { id: string; name: string; includeInFees: boolean };

type Item = { id: string; name: string; priceCents: number; assignees: string[] };

type Fees = {
  deliveryCents: number;
  serviceCents: number;
  taxCents: number;
  promoCents: number; // negative allowed
  tipMode: "percent" | "fixed";
  tipValue: number; // percent when tipMode=percent; cents when fixed
  promoBeforeTip: boolean;
};

type SplitMode = "even" | "proportional";

// ---------- Utils ----------
const uid = () => Math.random().toString(36).slice(2, 9);
const toCents = (val: string) => {
  const n = Number(val.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : Math.round(n * 100);
};
const centsToUsd = (c: number) => (c / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });

function fairSplit(totalCents: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return Array(weights.length).fill(0);
  const raw = weights.map(w => (totalCents * w) / sum);
  const floors = raw.map(Math.floor);
  let rem = totalCents - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  const res = [...floors];
  for (let k = 0; k < rem; k++) res[order[k % order.length].i] += 1;
  return res;
}

export default function LukewarmSplittingV2() {
  // Theme
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark"); else root.classList.remove("dark");
  }, [dark]);

  // Steps
  const steps = ["People", "Items", "Fees", "Summary"] as const;
  type Step = typeof steps[number];
  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = steps[stepIndex];

  // Core state
  const [splitMode, setSplitMode] = useState<SplitMode>("even");
  const [people, setPeople] = useState<Person[]>([{ id: uid(), name: "You", includeInFees: true }]);
  const [items, setItems] = useState<Item[]>([]);
  const [fees, setFees] = useState<Fees>({
    deliveryCents: 0, serviceCents: 0, taxCents: 0, promoCents: 0,
    tipMode: "percent", tipValue: 15, promoBeforeTip: true,
  });

  // Persist
  useEffect(() => {
    const saved = localStorage.getItem("lukewarm-splitting-v2");
    if (saved) try {
      const parsed = JSON.parse(saved);
      setPeople(parsed.people ?? people);
      setItems(parsed.items ?? items);
      setFees(parsed.fees ?? fees);
      setSplitMode(parsed.splitMode ?? splitMode);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    localStorage.setItem("lukewarm-splitting-v2", JSON.stringify({ people, items, fees, splitMode }));
  }, [people, items, fees, splitMode]);

  // Derived
  const participants = useMemo(() => {
    const withSpend = new Set<string>();
    items.forEach(it => it.assignees.forEach(id => withSpend.add(id)));
    return people.filter(p => withSpend.has(p.id) || p.includeInFees);
  }, [people, items]);

  const perPersonItemCents = useMemo(() => {
    const map: Record<string, number> = Object.fromEntries(people.map(p => [p.id, 0]));
    for (const it of items) {
      const n = Math.max(1, it.assignees.length);
      const base = Math.floor(it.priceCents / n);
      const rem = it.priceCents - base * n;
      it.assignees.forEach((pid, i) => { map[pid] += base + (i < rem ? 1 : 0); });
    }
    return map;
  }, [items, people]);

  const itemsTotalCents = useMemo(() => items.reduce((a, b) => a + b.priceCents, 0), [items]);
  const F_cents = useMemo(() => fees.deliveryCents + fees.serviceCents + fees.taxCents + fees.promoCents, [fees]);
  const tipBaseCents = useMemo(() => {
    if (fees.tipMode === "fixed") return fees.tipValue;
    const base = itemsTotalCents + (fees.promoBeforeTip ? Math.max(0, F_cents) : 0);
    return Math.round((base * fees.tipValue) / 100);
  }, [fees.tipMode, fees.tipValue, itemsTotalCents, F_cents, fees.promoBeforeTip]);

  const summary = useMemo(() => {
    const ids = participants.map(p => p.id);
    const wEven = ids.map(() => 1);
    const wProp = ids.map(id => Math.max(0.0001, perPersonItemCents[id]));

    const feeShares = splitMode === "even"
      ? fairSplit(Math.max(0, F_cents), wEven)
      : fairSplit(Math.max(0, F_cents), wProp);

    const tipShares = splitMode === "even"
      ? fairSplit(tipBaseCents, wEven)
      : fairSplit(tipBaseCents, wProp);

    const rows = ids.map((id, i) => {
      const p = participants[i];
      const itemsCents = perPersonItemCents[id] || 0;
      const feeCents = feeShares[i] || 0;
      const tipCents = tipShares[i] || 0;
      return { id, name: p.name, itemsCents, feeCents, tipCents, totalCents: itemsCents + feeCents + tipCents };
    });

    const grandTotalCents = itemsTotalCents + Math.max(0, F_cents) + tipBaseCents;
    const sum = rows.reduce((a, r) => a + r.totalCents, 0);
    if (sum !== grandTotalCents && rows.length) rows[0].totalCents += (grandTotalCents - sum);
    return { rows, grandTotalCents };
  }, [participants, perPersonItemCents, splitMode, F_cents, tipBaseCents, itemsTotalCents]);

  // ---------- Building blocks ----------
  const Pill = ({ children }: React.PropsWithChildren) => (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/40 dark:bg-white/10 backdrop-blur px-3 py-1 text-xs">
      {children}
    </span>
  );

  const Segmented = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <div className="relative inline-flex rounded-xl border border-white/20 bg-white/40 dark:bg-white/10 backdrop-blur p-1 text-xs">
      {options.map((opt) => (
        <button key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg transition relative ${value === opt.value ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow" : "text-black/70 dark:text-white/70"}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );

  const MoneyInput = ({ label, value, onChange }: { label: string; value: number; onChange: (cents: number) => void }) => {
    const [raw, setRaw] = useState((value / 100).toString());
    useEffect(() => setRaw((value / 100).toString()), [value]);
    return (
      <label className="block">
        <div className="mb-1 text-xs uppercase tracking-wide opacity-70">{label}</div>
        <input
          value={raw}
          onChange={(e) => { setRaw(e.target.value); onChange(toCents(e.target.value)); }}
          inputMode="decimal"
          className="w-full rounded-xl px-3 py-2 bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
          placeholder="0.00"
        />
      </label>
    );
  };

  const Card = ({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={`rounded-3xl border border-white/15 dark:border-white/10 bg-white/45 dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] ${className}`}>{children}</div>
  );

  // ---------- Validation & step controls ----------
  const canNext = () => {
    if (stepIndex === 0) return people.length > 0 && people.every(p => p.name.trim());
    if (stepIndex === 1) return items.length > 0 && items.every(it => it.name.trim() && it.priceCents >= 0 && it.assignees.length > 0);
    if (stepIndex === 2) return true;
    return true;
  };

  const NextBtn = ({ children = "Next" }) => (
    <button
      onClick={() => canNext() && setStepIndex((i) => Math.min(3, i + 1))}
      disabled={!canNext()}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white shadow transition ${canNext() ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95" : "bg-black/20 dark:bg-white/10 cursor-not-allowed"}`}
    >
      {children} <ChevronRight className="h-4 w-4" />
    </button>
  );
  const BackBtn = () => (
    <button onClick={() => setStepIndex((i) => Math.max(0, i - 1))} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border bg-white/50 dark:bg-white/10 border-white/30 dark:border-white/10">
      <ChevronLeft className="h-4 w-4" /> Back
    </button>
  );

  // ---------- Screens ----------
  const PeopleStep = () => (
    <Card className="p-6 md:p-8">
      <header className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">Add your people</h2>
        <p className="text-sm opacity-70">Name friends and choose who shares delivery/fees.</p>
      </header>
      <div className="space-y-3">
        {people.map((p, idx) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 rounded-2xl px-3 py-2 bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              value={p.name}
              onChange={(e) => { const next = [...people]; next[idx] = { ...p, name: e.target.value }; setPeople(next); }}
              placeholder="Name"
            />
            <button
              className={`px-3 py-2 rounded-2xl border text-xs flex items-center gap-2 ${p.includeInFees ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200" : "bg-white/40 dark:bg-white/5 border-white/20"}`}
              onClick={() => { const next = [...people]; next[idx] = { ...p, includeInFees: !p.includeInFees }; setPeople(next); }}
            >
              {p.includeInFees ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />} Include fees
            </button>
            {people.length > 1 && (
              <button onClick={() => setPeople(arr => arr.filter(x => x.id !== p.id))} className="p-2 rounded-2xl border bg-white/40 dark:bg-white/5 border-white/20">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => setPeople(arr => [...arr, { id: uid(), name: "Friend", includeInFees: true }])} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border bg-white/60 dark:bg-white/10 border-white/30 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/15">
          <Plus className="h-4 w-4" /> Add person
        </button>
        <NextBtn />
      </div>
    </Card>
  );

  const ItemsStep = () => (
    <Card className="p-6 md:p-8">
      <header className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">Add items</h2>
        <p className="text-sm opacity-70">Assign each item to one or more people. Shared items split equally.</p>
      </header>
      <div className="space-y-4">
        {items.map((it, idx) => (
          <motion.div key={it.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            <input className="md:col-span-4 rounded-2xl px-3 py-2 bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" value={it.name} onChange={(e) => { const next = [...items]; next[idx] = { ...it, name: e.target.value }; setItems(next); }} placeholder="Item name" />
            <input className="md:col-span-2 rounded-2xl px-3 py-2 bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" value={(it.priceCents / 100).toString()} onChange={(e) => { const next = [...items]; next[idx] = { ...it, priceCents: toCents(e.target.value) }; setItems(next); }} placeholder="Price" inputMode="decimal" />
            <div className="md:col-span-5">
              <div className="flex flex-wrap gap-2">
                {people.map(p => (
                  <button key={p.id} onClick={() => {
                    const next = [...items];
                    const has = it.assignees.includes(p.id);
                    next[idx] = { ...it, assignees: has ? it.assignees.filter(x => x !== p.id) : [...it.assignees, p.id] };
                    setItems(next);
                  }} className={`px-3 py-1.5 rounded-full border text-sm transition ${it.assignees.includes(p.id) ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-800 dark:text-indigo-200" : "bg-white/40 dark:bg-white/5 border-white/20 hover:bg-white/60 dark:hover:bg-white/10"}`}>
                    {p.name}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs opacity-70">Tap names to toggle who shares this item.</p>
            </div>
            <button onClick={() => setItems(arr => arr.filter(x => x.id !== it.id))} className="md:col-span-1 p-2 rounded-2xl border bg-white/40 dark:bg-white/5 border-white/20 justify-self-end" title="Remove item">
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
        <div className="flex items-center justify-between">
          <button onClick={() => setItems(arr => [...arr, { id: uid(), name: "Item", priceCents: 0, assignees: people.length ? [people[0].id] : [] }])} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border bg-white/60 dark:bg-white/10 border-white/30 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/15">
            <Plus className="h-4 w-4" /> Add item
          </button>
          <div className="flex items-center gap-2">
            <BackBtn />
            <NextBtn />
          </div>
        </div>
      </div>
    </Card>
  );

  const FeesStep = () => (
    <Card className="p-6 md:p-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Fees & tip</h2>
          <p className="text-sm opacity-70">Choose split mode and tip type. Promos can apply before tip.</p>
        </div>
        <Segmented
          value={splitMode}
          onChange={(v) => setSplitMode(v as SplitMode)}
          options={[{ value: "even", label: "Even" }, { value: "proportional", label: "Proportional" }]}
        />
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <MoneyInput label="Delivery" value={fees.deliveryCents} onChange={(v) => setFees({ ...fees, deliveryCents: v })} />
          <MoneyInput label="Service" value={fees.serviceCents} onChange={(v) => setFees({ ...fees, serviceCents: v })} />
          <MoneyInput label="Tax (order-level)" value={fees.taxCents} onChange={(v) => setFees({ ...fees, taxCents: v })} />
          <MoneyInput label="Promo/Credit (−)" value={fees.promoCents} onChange={(v) => setFees({ ...fees, promoCents: v })} />
        </div>
        <div className="space-y-4">
          <Segmented
            value={fees.tipMode}
            onChange={(v) => setFees({ ...fees, tipMode: v as Fees["tipMode"] })}
            options={[{ value: "percent", label: "% Tip" }, { value: "fixed", label: "Fixed" }]}
          />
          {fees.tipMode === "percent" ? (
            <div className="flex items-center gap-3">
              <label className="text-sm opacity-80">Tip %</label>
              <input type="number" value={fees.tipValue} onChange={(e) => setFees({ ...fees, tipValue: Math.max(0, Number(e.target.value)) })} className="w-28 rounded-2xl px-3 py-2 bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 outline-none" />
              <label className="text-sm opacity-80 ml-2">Promo before tip</label>
              <input type="checkbox" checked={fees.promoBeforeTip} onChange={(e) => setFees({ ...fees, promoBeforeTip: e.target.checked })} />
            </div>
          ) : (
            <MoneyInput label="Tip (fixed)" value={fees.tipValue} onChange={(v) => setFees({ ...fees, tipValue: v })} />
          )}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <BackBtn />
        <NextBtn />
      </div>
    </Card>
  );

  const SummaryStep = () => (
    <Card className="p-6 md:p-8">
      <header className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">Summary</h2>
        <p className="text-sm opacity-70">Copy totals for each friend or share the breakdown.</p>
      </header>
      {summary.rows.length === 0 ? (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400"><AlertTriangle className="h-4 w-4" /><span>No participants yet. Go back to add people/items.</span></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.rows.map(r => (
            <div key={r.id} className="rounded-2xl p-4 border bg-white/55 dark:bg-white/10 border-white/20 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{r.name}</div>
                <div className="text-lg font-bold">{centsToUsd(r.totalCents)}</div>
              </div>
              <div className="mt-2 text-sm opacity-80 space-y-1">
                <div className="flex justify-between"><span>Items</span><span>{centsToUsd(r.itemsCents)}</span></div>
                <div className="flex justify-between"><span>Fees share</span><span>{centsToUsd(r.feeCents)}</span></div>
                <div className="flex justify-between"><span>Tip share</span><span>{centsToUsd(r.tipCents)}</span></div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => copyBreakdown(r)} className="px-3 py-2 rounded-2xl border bg-white/60 dark:bg-white/10 border-white/30 dark:border-white/10 inline-flex items-center gap-2">
                  <Copy className="h-4 w-4" /> Copy
                </button>
                <button onClick={() => shareBreakdown(r)} className="px-3 py-2 rounded-2xl border bg-white/60 dark:bg-white/10 border-white/30 dark:border-white/10 inline-flex items-center gap-2">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm opacity-75">Grand total: <span className="font-semibold">{centsToUsd(summary.grandTotalCents)}</span></div>
        <BackBtn />
      </div>
    </Card>
  );

  function copyBreakdown(r: { name: string; itemsCents: number; feeCents: number; tipCents: number; totalCents: number }) {
    const text = `${r.name}, you owe ${centsToUsd(r.totalCents)} (Items ${centsToUsd(r.itemsCents)} + Fees ${centsToUsd(r.feeCents)} + Tip ${centsToUsd(r.tipCents)})`;
    navigator.clipboard.writeText(text);
  }
  async function shareBreakdown(r: { name: string; itemsCents: number; feeCents: number; tipCents: number; totalCents: number }) {
    const text = `${r.name}, you owe ${centsToUsd(r.totalCents)} (Items ${centsToUsd(r.itemsCents)} + Fees ${centsToUsd(r.feeCents)} + Tip ${centsToUsd(r.tipCents)})`;
    if (navigator.share) { try { await navigator.share({ title: "Lukewarm Splitting", text }); } catch {} }
    else { navigator.clipboard.writeText(text); alert("Copied to clipboard!"); }
  }

  // ---------- Layout ----------
  return (
    <div className="relative min-h-screen overflow-x-hidden selection:bg-indigo-200/60 dark:selection:bg-indigo-500/30">
      {/* Gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-24 h-96 w-96 bg-gradient-to-br from-purple-400 via-indigo-400 to-pink-400 rounded-full blur-3xl opacity-40 dark:opacity-25" />
        <div className="absolute top-1/4 -right-24 h-96 w-96 bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-400 rounded-full blur-3xl opacity-40 dark:opacity-25" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 bg-gradient-to-br from-rose-300 via-fuchsia-400 to-violet-400 rounded-full blur-3xl opacity-40 dark:opacity-25" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">lukewarm splitting</span>
            <Pill><Check className="h-3.5 w-3.5" /> v2</Pill>
          </div>
          <div className="flex items-center gap-3">
            <Segmented
              value={splitMode}
              onChange={(v) => setSplitMode(v as SplitMode)}
              options={[{ value: "even", label: "Even" }, { value: "proportional", label: "Proportional" }]}
            />
            <button onClick={() => setDark(d => !d)} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border bg-white/60 dark:bg-white/10 border-white/30 dark:border-white/10">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {dark ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-5 sticky top-6">
              <div className="mb-3 text-sm font-semibold tracking-wide opacity-70">Steps</div>
              <ol className="space-y-2">
                {steps.map((s, i) => (
                  <li key={s} className={`flex items-center justify-between rounded-2xl px-3 py-2 border ${i === stepIndex ? "border-indigo-300/50 bg-indigo-50/40 dark:bg-indigo-500/10" : "border-white/15 bg-white/30 dark:bg-white/5"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-6 w-6 inline-flex items-center justify-center rounded-full text-xs font-semibold ${i <= stepIndex ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white" : "bg-white/50 dark:bg-white/10"}`}>{i+1}</span>
                      <span className="text-sm">{s}</span>
                    </div>
                    {i < stepIndex && <Check className="h-4 w-4 text-emerald-500" />}
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="p-5 sticky top-[220px]">
              <div className="mb-3 text-sm font-semibold tracking-wide opacity-70">Live total</div>
              <div className="text-2xl font-bold">{centsToUsd(summary.grandTotalCents)}</div>
              <div className="mt-2 text-xs opacity-70">Items: {centsToUsd(itemsTotalCents)} • Fees: {centsToUsd(Math.max(0, F_cents))}</div>
            </Card>
          </div>

          {/* Main panel */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div key={stepIndex} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-4">
                {step === "People" && <PeopleStep />}
                {step === "Items" && <ItemsStep />}
                {step === "Fees" && <FeesStep />}
                {step === "Summary" && <SummaryStep />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <footer className="mt-8 text-xs opacity-70">
          Tip: Shared items divide evenly among selected people. Use the sidebar to keep an eye on totals as you go.
        </footer>
      </div>
    </div>
  );
}
