
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronRight, ChevronLeft, Moon, Sun, Copy, Share2, Users, Receipt, Wallet, CheckCircle2, ToggleLeft, ToggleRight } from "lucide-react";

type Person = { id: string; name: string; includeInFees: boolean };
type Item = { id: string; name: string; priceCents: number; assignees: string[] };
type Fees = {
  deliveryCents: number;
  serviceCents: number;
  taxCents: number;
  promoCents: number;
  tipMode: "percent" | "fixed";
  tipValue: number;
  promoBeforeTip: boolean;
};
type SplitMode = "even" | "proportional";

const uid = () => Math.random().toString(36).slice(2, 9);
const toCents = (val: string) => {
  const n = Number(val.replace(/[^0-9.\-]/g, ""));
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
};
const centsToUsd = (c: number) => (c / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });

function fairSplit(totalCents: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return Array(weights.length).fill(0);
  const rawShares = weights.map((w) => (totalCents * w) / sum);
  const floors = rawShares.map(Math.floor);
  let remainder = totalCents - floors.reduce((a, b) => a + b, 0);
  const remainders = rawShares.map((x, i) => ({ i, frac: x - Math.floor(x) }));
  remainders.sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < remainder; k++) result[remainders[k % remainders.length].i] += 1;
  return result;
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (cents: number) => void }) {
  const [raw, setRaw] = useState((value / 100).toString());
  useEffect(() => { setRaw((value / 100).toString()); }, [value]);
  return (
    <label className="block">
      <div className="text-sm opacity-80 mb-1">{label}</div>
      <input
        value={raw}
        onChange={(e) => { setRaw(e.target.value); onChange(toCents(e.target.value)); }}
        inputMode="decimal"
        className="w-full rounded-xl px-3 py-2 bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
        placeholder="0.00"
      />
    </label>
  );
}

export default function Page() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark"); else root.classList.remove("dark");
  }, [dark]);

  const steps = ["People", "Items", "Fees", "Summary"] as const;
  type Step = typeof steps[number];
  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = steps[stepIndex];

  const [splitMode, setSplitMode] = useState<SplitMode>("even");
  const [people, setPeople] = useState<Person[]>([{ id: uid(), name: "You", includeInFees: true }]);
  const [items, setItems] = useState<Item[]>([]);
  const [fees, setFees] = useState<Fees>({
    deliveryCents: 0, serviceCents: 0, taxCents: 0, promoCents: 0,
    tipMode: "percent", tipValue: 15, promoBeforeTip: true
  });

  useEffect(() => {
    const saved = localStorage.getItem("lukewarm-splitting-v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.people) setPeople(parsed.people);
        if (parsed.items) setItems(parsed.items);
        if (parsed.fees) setFees(parsed.fees);
        if (parsed.splitMode) setSplitMode(parsed.splitMode);
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("lukewarm-splitting-v1", JSON.stringify({ people, items, fees, splitMode }));
  }, [people, items, fees, splitMode]);

  const participants = useMemo(() => {
    const withSpend = new Set<string>();
    items.forEach((it) => it.assignees.forEach((id) => withSpend.add(id)));
    return people.filter((p) => withSpend.has(p.id) || p.includeInFees);
  }, [people, items]);

  const perPersonItemCents = useMemo(() => {
    const map: Record<string, number> = Object.fromEntries(people.map((p) => [p.id, 0]));
    for (const it of items) {
      const shareCount = Math.max(1, it.assignees.length);
      const base = Math.floor(it.priceCents / shareCount);
      const remainder = it.priceCents - base * shareCount;
      it.assignees.forEach((pid, idx) => { map[pid] += base + (idx < remainder ? 1 : 0); });
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
    const active = participants;
    const ids = active.map((p) => p.id);
    const weightsEven = ids.map(() => 1);
    const weightsProp = ids.map((id) => Math.max(0.0001, perPersonItemCents[id]));

    const feeShares = (splitMode === "even")
      ? fairSplit(Math.max(0, F_cents), weightsEven)
      : fairSplit(Math.max(0, F_cents), weightsProp);

    const tipShares = (splitMode === "even")
      ? fairSplit(tipBaseCents, fees.tipMode === "percent" ? weightsEven : weightsEven)
      : fairSplit(tipBaseCents, fees.tipMode === "percent" ? weightsProp : weightsProp);

    const per = ids.map((id, i) => {
      const p = active[i];
      const itemsCents = perPersonItemCents[id] || 0;
      const fee = feeShares[i] || 0;
      const tip = tipShares[i] || 0;
      const total = itemsCents + fee + tip;
      return { id, name: p.name, itemsCents, feeCents: fee, tipCents: tip, totalCents: total };
    });

    const grand = itemsTotalCents + Math.max(0, F_cents) + tipBaseCents;
    const sumPer = per.reduce((a, r) => a + r.totalCents, 0);
    if (sumPer !== grand && per.length > 0) {
      const diff = grand - sumPer;
      per[0].totalCents += diff;
    }

    return { rows: per, grandTotalCents: grand };
  }, [participants, perPersonItemCents, splitMode, F_cents, fees.tipMode, tipBaseCents, itemsTotalCents]);

  const Card = ({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={`rounded-2xl border border-white/15 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${className}`}>{children}</div>
  );
  const SectionTitle = ({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) => (
    <div className="mb-4 flex items-center gap-2">
      {icon}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-black/60 dark:text-white/60">{subtitle}</p>}
      </div>
    </div>
  );
  const Stepper = () => (
    <div className="flex items-center gap-2 text-sm">
      {["People","Items","Fees","Summary"].map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-full border backdrop-blur text-xs ${i === stepIndex ? "bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/10" : "bg-white/30 dark:bg-white/5 border-white/20"}`}>{i + 1}. {s}</div>
          {i < 3 && <ChevronRight className="h-4 w-4 opacity-50" />}
        </div>
      ))}
    </div>
  );

  const PeopleStep = () => (
    <Card className="p-6">
      <SectionTitle icon={<Users className="h-5 w-5" />} title="Add your people" subtitle="Name friends and decide who shares delivery/fees" />
      <div className="space-y-3">
        {people.map((p, idx) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <input
              className="flex-1 rounded-xl px-3 py-2 bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              value={p.name}
              onChange={(e) => { const next = [...people]; next[idx] = { ...p, name: e.target.value }; setPeople(next);}}
              placeholder="Name"
            />
            <button
              className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-2 ${p.includeInFees ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200" : "bg-white/40 dark:bg-white/5 border-white/20"}`}
              onClick={() => { const next = [...people]; next[idx] = { ...p, includeInFees: !p.includeInFees }; setPeople(next);}}
              title="Include in shared fees"
            >
              {p.includeInFees ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />} Include fees
            </button>
            {people.length > 1 && (
              <button onClick={() => setPeople((arr) => arr.filter((x) => x.id !== p.id))} className="p-2 rounded-xl border bg-white/40 dark:bg-white/5 border-white/20" title="Remove person">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button onClick={() => setPeople((arr) => [...arr, { id: uid(), name: "Friend", includeInFees: true }])} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/60 dark:bg-white/10 border-white/30 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/15 transition">
          <Plus className="h-4 w-4" /> Add person
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setStepIndex(1)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow hover:opacity-90">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );

  const ItemsStep = () => (
    <Card className="p-6">
      <SectionTitle icon={<Receipt className="h-5 w-5" />} title="Add items" subtitle="Assign each item to one or more people" />
      <div className="space-y-4">
        {items.map((it, idx) => (
          <motion.div key={it.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            <input
              className="md:col-span-4 rounded-xl px-3 py:2 md:py-2 bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              value={it.name}
              onChange={(e) => { const next = [...items]; next[idx] = { ...it, name: e.target.value }; setItems(next);}}
              placeholder="Item name"
            />
            <input
              className="md:col-span-2 rounded-xl px-3 py-2 bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              value={(it.priceCents / 100).toString()}
              onChange={(e) => { const next = [...items]; next[idx] = { ...it, priceCents: toCents(e.target.value) }; setItems(next);}}
              placeholder="Price"
              inputMode="decimal"
            />
            <div className="md:col-span-5">
              <div className="flex flex-wrap gap-2">
                {people.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const next = [...items];
                      const has = it.assignees.includes(p.id);
                      next[idx] = { ...it, assignees: has ? it.assignees.filter((x) => x !== p.id) : [...it.assignees, p.id] };
                      setItems(next);
                    }}
                    className={`px-3 py-1.5 rounded-full border text-sm ${it.assignees.includes(p.id) ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-800 dark:text-indigo-200" : "bg-white/40 dark:bg-white/5 border-white/20"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-black/60 dark:text-white/60">Tap names to toggle who shares this item equally.</p>
            </div>
            <button onClick={() => setItems((arr) => arr.filter((x) => x.id !== it.id))} className="md:col-span-1 p-2 rounded-xl border bg-white/40 dark:bg-white/5 border-white/20 justify-self-end" title="Remove item">
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
        <div className="flex justify-between">
          <button onClick={() => setItems((arr) => [...arr, { id: uid(), name: "Item", priceCents: 0, assignees: people.length ? [people[0].id] : [] }])} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/60 dark:bg-white/10 border-white/30 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/15 transition">
            <Plus className="h-4 w-4" /> Add item
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setStepIndex(0)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/50 dark:bg-white/10 border-white/30 dark:border-white/10">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={() => setStepIndex(2)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow hover:opacity-90">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );

  const FeesStep = () => (
    <Card className="p-6">
      <SectionTitle icon={<Wallet className="h-5 w-5" />} title="Fees & tip" subtitle="Decide how to split and how tip is calculated" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <MoneyInput label="Delivery" value={fees.deliveryCents} onChange={(v) => setFees({ ...fees, deliveryCents: v })} />
          <MoneyInput label="Service" value={fees.serviceCents} onChange={(v) => setFees({ ...fees, serviceCents: v })} />
          <MoneyInput label="Tax (order-level)" value={fees.taxCents} onChange={(v) => setFees({ ...fees, taxCents: v })} />
          <MoneyInput label="Promo/Credit (−)" value={fees.promoCents} onChange={(v) => setFees({ ...fees, promoCents: v })} />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSplitMode("even")} className={`px-3 py-2 rounded-xl border text-sm ${splitMode === "even" ? "bg-black/5 dark:bg-white/10 border-black/20 dark:border-white/10" : "bg-white/40 dark:bg-white/5 border-white/20"}`}>Even split</button>
            <button onClick={() => setSplitMode("proportional")} className={`px-3 py-2 rounded-xl border text-sm ${splitMode === "proportional" ? "bg-black/5 dark:bg-white/10 border-black/20 dark:border-white/10" : "bg-white/40 dark:bg-white/5 border-white/20"}`}>Proportional to items</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setFees({ ...fees, tipMode: "percent" })} className={`px-3 py-2 rounded-xl border text-sm ${fees.tipMode === "percent" ? "bg-black/5 dark:bg-white/10 border-black/20 dark:border-white/10" : "bg-white/40 dark:bg-white/5 border-white/20"}`}>% Tip</button>
            <button onClick={() => setFees({ ...fees, tipMode: "fixed" })} className={`px-3 py-2 rounded-xl border text-sm ${fees.tipMode === "fixed" ? "bg-black/5 dark:bg-white/10 border-black/20 dark:border-white/10" : "bg-white/40 dark:bg-white/5 border-white/20"}`}>Fixed Tip</button>
          </div>
          {fees.tipMode === "percent" ? (
            <div className="flex items-center gap-3">
              <label className="text-sm opacity-80">Tip %</label>
              <input type="number" value={fees.tipValue} onChange={(e) => setFees({ ...fees, tipValue: Math.max(0, Number(e.target.value)) })} className="w-28 rounded-xl px-3 py-2 bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 outline-none" />
              <label className="text-sm opacity-80 ml-2">Apply promo before tip</label>
              <input type="checkbox" checked={fees.promoBeforeTip} onChange={(e) => setFees({ ...fees, promoBeforeTip: e.target.checked })} />
            </div>
          ) : (
            <MoneyInput label="Tip (fixed)" value={fees.tipValue} onChange={(v) => setFees({ ...fees, tipValue: v })} />
          )}
        </div>
      </div>
      <div className="mt-6 flex justify-between">
        <button onClick={() => setStepIndex(1)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/50 dark:bg-white/10 border-white/30 dark:border-white/10">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={() => setStepIndex(3)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow hover:opacity-90">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );

  const SummaryStep = () => (
    <Card className="p-6">
      <SectionTitle icon={<CheckCircle2 className="h-5 w-5" />} title="Summary" subtitle="Copy totals for each friend" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summary.rows.map((r) => (
          <div key={r.id} className="rounded-xl p-4 border bg-white/50 dark:bg-white/10 border-white/20 backdrop-blur">
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
              <button onClick={() => copyBreakdown(r)} className="px-3 py-2 rounded-xl border bg-white/60 dark:bg-white/10 border-white/30 dark:border-white/10 inline-flex items-center gap-2">
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button onClick={() => shareBreakdown(r)} className="px-3 py-2 rounded-xl border bg-white/60 dark:bg-white/10 border-white/30 dark:border-white/10 inline-flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm opacity-75">Grand total: <span className="font-semibold">{centsToUsd(summary.grandTotalCents)}</span></div>
        <button onClick={() => setStepIndex(2)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/50 dark:bg-white/10 border-white/30 dark:border-white/10">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
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

  return (
    <div className="relative min-h-screen overflow-x-hidden selection:bg-indigo-200/60 dark:selection:bg-indigo-500/30">
      {/* Gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 h-72 w-72 bg-gradient-to-br from-purple-400 via-indigo-400 to-pink-400 rounded-full blur-3xl opacity-40 dark:opacity-25" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-400 rounded-full blur-3xl opacity-40 dark:opacity-25" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 bg-gradient-to-br from-rose-300 via-fuchsia-400 to-violet-400 rounded-full blur-3xl opacity-40 dark:opacity-25" />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">lukewarm splitting</h1>
            <p className="text-sm text-black/60 dark:text-white/60">Split Uber/Eats/Target orders fairly without the headache.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark((d) => !d)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white/60 dark:bg-white/10 border-white/30 dark:border-white/10" title="Toggle theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {dark ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        <div className="mb-6"><Stepper /></div>

        <AnimatePresence mode="wait">
          <motion.div key={stepIndex} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-4">
            {step === "People" && <PeopleStep />}
            {step === "Items" && <ItemsStep />}
            {step === "Fees" && <FeesStep />}
            {step === "Summary" && <SummaryStep />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 text-xs text-black/60 dark:text-white/60">
          <p>Tip: Add a shared item (e.g., paper towels) and select multiple people to split it equally. Toggle a person’s “Include fees” if they’re chipping in for delivery but didn’t order anything.</p>
        </div>
      </div>
    </div>
  );
}
