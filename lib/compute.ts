export type Person = { id: string; name: string };
export type Item = { id: string; name: string; qty: number; price: number; personId: string };
export type Fees = { delivery: number; service: number; taxes: number; tip: number; otherLabel: string; other: number };
export type State = { people: Person[]; items: Item[]; fees: Fees; includeEmpty: boolean; roundUp: boolean; step: 1|2|3|4 };

export const currency = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD" });
export const uid = () => Math.random().toString(36).slice(2, 9);
export const clampMoney = (v: string | number): number => {
  if (v === undefined || v === null || v === "") return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : Math.max(-999999, Math.min(99999999, n));
};
export const splitEvenly = (amount: number, n: number): number[] => {
  if (n <= 0) return [];
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / n);
  const rem = cents % n;
  return Array.from({ length: n }, (_, i) => (base + (i < rem ? 1 : 0)) / 100);
};

export function computeFrom(state: State) {
  const feeTotal = (state.fees.delivery || 0) + (state.fees.service || 0) + (state.fees.taxes || 0) + (state.fees.tip || 0) + (state.fees.other || 0);
  const itemsTotal = state.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  const rawTotal = itemsTotal + feeTotal;
  const withItemsIds = new Set(state.items.map(i => i.personId));
  const participants = state.includeEmpty ? state.people : (withItemsIds.size ? state.people.filter(p => withItemsIds.has(p.id)) : state.people);
  const shares = splitEvenly(feeTotal, Math.max(1, participants.length));
  const perPerson: Record<string, { name: string; items: Item[]; itemsTotal: number; feeShare: number; total: number }> = {};
  participants.forEach((p, idx) => perPerson[p.id] = { name: p.name, items: [], itemsTotal: 0, feeShare: shares[idx] || 0, total: 0 });
  state.items.forEach(i => { const p = perPerson[i.personId]; if (!p) return; const line = (i.price || 0) * (i.qty || 1); p.items.push(i); p.itemsTotal += line; });
  Object.values(perPerson).forEach(p => { p.total = p.itemsTotal + p.feeShare; });
  if (state.roundUp) {
    const entries = state.people.filter(pp => perPerson[pp.id] !== undefined).map(pp => ({ id: pp.id, total: perPerson[pp.id].total }));
    const floors = entries.map(e => Math.floor(e.total));
    const fracs = entries.map((e, i) => ({ i, frac: e.total - floors[i] }));
    const sumFloors = floors.reduce((a, b) => a + b, 0);
    const target = Math.round(rawTotal);
    let diff = target - sumFloors;
    entries.forEach((e, i) => perPerson[e.id].total = floors[i]);
    if (diff > 0) { fracs.sort((a, b) => b.frac - a.frac); for (let k = 0; k < diff && k < fracs.length; k++) { const idx = fracs[k].i; perPerson[entries[idx].id].total += 1; } }
    else if (diff < 0) { fracs.sort((a, b) => a.frac - b.frac); for (let k = 0; k < (-diff) && k < fracs.length; k++) { const idx = fracs[k].i; if (perPerson[entries[idx].id].total > 0) perPerson[entries[idx].id].total -= 1; } }
  }
  const perPersonSum = Object.values(perPerson).reduce((a, b) => a + b.total, 0);
  return { feeTotal, itemsTotal, rawTotal, perPersonSum, participants, perPerson };
}
