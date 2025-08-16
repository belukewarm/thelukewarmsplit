'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { currency, uid, clampMoney, computeFrom } from '../lib/compute';
import { Moon, SunMedium, Receipt, RefreshCw, Sparkles, ClipboardCopy, ArrowLeft, ArrowRight, Wallet, UserPlus, Trash2 } from 'lucide-react';

type Person = { id: string; name: string };
type Item = { id: string; name: string; qty: number; price: number; personId: string };
type Fees = { delivery: number; service: number; taxes: number; tip: number; otherLabel: string; other: number };
type State = { people: Person[]; items: Item[]; fees: Fees; includeEmpty: boolean; roundUp: boolean; step: 1|2|3|4 };

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <div className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><div className="knob" /></div>;
}

export default function Page() {
  // theme
  const [dark, setDark] = useState<boolean>(() => typeof window !== 'undefined' ? document.documentElement.classList.contains('dark') : false);
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    try { localStorage.setItem('lukewarm-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);
  useEffect(() => {
    try { const t = localStorage.getItem('lukewarm-theme'); if (t === 'dark') setDark(true); } catch {}
  }, []);

  const STORAGE_KEY = 'lukewarm-split-aurora-v1';
  const [state, setState] = useState<State>(() => {
    if (typeof window === 'undefined') return { people: [{ id: 'you', name: 'You' }], items: [], fees: { delivery:0, service:0, taxes:0, tip:0, otherLabel:'Bag fee', other:0 }, includeEmpty:false, roundUp:false, step:1 };
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
    return { people: [{ id: uid(), name: 'You' }], items: [], fees: { delivery:0, service:0, taxes:0, tip:0, otherLabel:'Bag fee', other:0 }, includeEmpty:false, roundUp:false, step:1 };
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }, [state]);
  const go = (step: State['step']) => setState(s => ({ ...s, step }));

  const c = useMemo(() => computeFrom(state as any), [state]);
  const participants = c.participants as Person[];

  // local fee text (decimals allowed)
  const [feeText, setFeeText] = useState({ delivery: String(state.fees.delivery || ''), service: String(state.fees.service || ''), taxes: String(state.fees.taxes || ''), tip: String(state.fees.tip || ''), other: String(state.fees.other || '') });
  useEffect(() => { setFeeText({ delivery: String(state.fees.delivery || ''), service: String(state.fees.service || ''), taxes: String(state.fees.taxes || ''), tip: String(state.fees.tip || ''), other: String(state.fees.other || '') }); }, [state.fees.delivery, state.fees.service, state.fees.taxes, state.fees.tip, state.fees.other]);
  const setFee = (key: keyof Fees, v: string) => {
    if (key === 'otherLabel') { setState(s => ({ ...s, fees: { ...s.fees, otherLabel: v } })); return; }
    setFeeText(t => ({ ...t, [key]: v })); const num = clampMoney(v); setState(s => ({ ...s, fees: { ...s.fees, [key]: num } as any }));
  };

  // ops
  const addPerson = () => setState(s => ({ ...s, people: [...s.people, { id: uid(), name: `Person ${s.people.length+1}` }] }));
  const removePerson = (id: string) => setState(s => ({ ...s, people: s.people.filter(p=>p.id!==id), items: s.items.filter(i=>i.personId!==id) }));
  const updatePerson = (id: string, name: string) => setState(s => ({ ...s, people: s.people.map(p=>p.id===id? {...p, name}: p) }));
  const addItem = (name='Item', price=0, qty=1, personId?: string) => setState(s => ({ ...s, items: [...s.items, { id: uid(), name, price, qty, personId: personId || s.people[0]?.id || uid() }] }));
  const updateItem = (id: string, patch: Partial<Item>) => setState(s => ({ ...s, items: s.items.map(it => it.id===id? {...it, ...patch} : it) }));
  const removeItem = (id: string) => setState(s => ({ ...s, items: s.items.filter(i=>i.id!==id) }));

  const qiNameRef = useRef<HTMLInputElement|null>(null);
  const qiQtyRef = useRef<HTMLInputElement|null>(null);
  const qiPriceRef = useRef<HTMLInputElement|null>(null);
  const qiPersonRef = useRef<HTMLSelectElement|null>(null);

  // Sidebar component
  const Sidebar = () => (
    <aside className="sidebar">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl font-semibold tracking-tight">Lukewarm Split</div>
        <button className="btn btn-outline btn-icon" onClick={() => setDark(d=>!d)}>{dark ? <SunMedium className="icon"/> : <Moon className="icon"/>}</button>
      </div>
      <div className="text-sm text-[rgb(var(--muted))] mb-4">A calm, elegant way to split Uber Eats/grocery orders.</div>
      <div className="progress rounded-full mb-4">
        <motion.div initial={{width:0}} animate={{width:`${(Number(state.step)-1)*33.33}%`}} transition={{type:'spring', stiffness:120, damping:20}} className="progress-bar"/>
      </div>
      <ul className="space-y-1">
        {['People','Items','Fees','Summary'].map((label, i) => (
          <li key={label} className={`step-li ${state.step === (i+1) ? 'active' : ''}`} onClick={()=>go((i+1) as any)}>
            <span className="step-dot">{i+1}</span>
            <span className="font-medium">{label}</span>
          </li>
        ))}
      </ul>
      <div className="sep"/>
      <div className="grid grid-cols-2 gap-2">
        <div className="stat">
          <div className="text-xs text-[rgb(var(--muted))]">Items</div>
          <div className="font-semibold">{currency(c.itemsTotal)}</div>
        </div>
        <div className="stat">
          <div className="text-xs text-[rgb(var(--muted))]">Fees</div>
          <div className="font-semibold">{currency(c.feeTotal)}</div>
        </div>
        <div className="stat">
          <div className="text-xs text-[rgb(var(--muted))]">Order</div>
          <div className="font-semibold">{currency(c.rawTotal)}</div>
        </div>
        <div className="stat">
          <div className="text-xs text-[rgb(var(--muted))]">People</div>
          <div className="font-semibold">{c.participants.length}</div>
        </div>
      </div>
      <div className="sep"/>
      <div className="flex gap-2">
        <button className="btn btn-outline flex-1" onClick={() => {
          if (!confirm('Clear everything?')) return;
          setState({ people: [{ id: uid(), name: 'You'}], items: [], fees: { delivery:0, service:0, taxes:0, tip:0, otherLabel:'Bag fee', other:0 }, includeEmpty:false, roundUp:false, step:1 });
        }}><RefreshCw className="icon"/> New</button>
        <button className="btn flex-1" onClick={()=>go(4)}><Receipt className="icon"/> Summary</button>
      </div>
    </aside>
  );

  // Person row (focus-safe)
  const PersonRow = ({ p, onCommit }: { p: Person; onCommit: (id: string, name: string) => void }) => {
    const [val, setVal] = useState(p.name);
    useEffect(() => { setVal(p.name); }, [p.name]);
    return (
      <div className="flex gap-2 items-center">
        <input className="input" value={val} onChange={e=>setVal(e.target.value)} onBlur={()=>onCommit(p.id, val.trim() || 'Unnamed')}
               onKeyDown={e=>{ if (e.key==='Enter') (e.currentTarget as HTMLInputElement).blur(); }} placeholder="Name"/>
        <button className="btn btn-outline btn-icon" onClick={()=>removePerson(p.id)}><Trash2 className="icon"/></button>
      </div>
    );
  };

  const ItemRow = ({it}:{it:Item}) => (
    <div className="grid grid-cols-12 gap-2 items-center">
      <input className="input col-span-5" value={it.name} onChange={e=>updateItem(it.id,{name:e.target.value})} placeholder="Item name"/>
      <input className="input col-span-2" type="number" min={1} value={it.qty} onChange={e=>updateItem(it.id,{qty: Math.max(1, parseInt(e.target.value||'1'))})} />
      <input className="input col-span-2" inputMode="decimal" value={it.price} onChange={e=>updateItem(it.id,{price: clampMoney(e.target.value)})} placeholder="0.00"/>
      <select className="select col-span-2" value={it.personId} onChange={e=>updateItem(it.id,{personId: e.target.value})}>
        {state.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button className="btn btn-outline btn-icon col-span-1" onClick={()=>removeItem(it.id)}><Trash2 className="icon"/></button>
    </div>
  );

  // Bottom bar navigation
  const BottomBar = () => (
    <div className="bottombar">
      <div className="bottom-inner">
        <div className="text-sm text-[rgb(var(--muted))]">Step {state.step} of 4</div>
        <div className="flex items-center gap-2">
          {state.step>1 && <button className="btn btn-outline" onClick={()=>go((state.step-1) as any)}><ArrowLeft className="icon"/> Back</button>}
          {state.step<4 && <button className="btn" onClick={()=>go((state.step+1) as any)}>Next <ArrowRight className="icon"/></button>}
          {state.step===4 && <button className="btn btn-outline" onClick={()=>{
            const lines = participants.map(p => `${p.name}: $${(c as any).perPerson[p.id].total.toFixed(2)}`);
            navigator.clipboard.writeText(lines.join('\n'));
          }}><ClipboardCopy className="icon"/> Copy all totals</button>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
      <div className="md:col-span-4 lg:col-span-3"><Sidebar/></div>
      <div className="md:col-span-8 lg:col-span-9">
        {state.step===1 && (
          <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} className="glass p-6">
            <div className="text-2xl font-semibold mb-1">Add your people</div>
            <div className="text-sm text-[rgb(var(--muted))] mb-4">Start with you, then your friends. Rename anytime.</div>
            <div className="space-y-3">
              {state.people.map(p => <PersonRow key={p.id} p={p} onCommit={updatePerson}/>)}
              <button className="btn btn-outline" onClick={addPerson}><UserPlus className="icon"/> Add person</button>
            </div>
          </motion.div>
        )}

        {state.step===2 && (
          <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} className="space-y-5">
            <div className="glass p-6">
              <div className="text-2xl font-semibold mb-1">Add items</div>
              <div className="text-sm text-[rgb(var(--muted))] mb-4">Assign each item to a person. Quantities are okay.</div>
              <div className="space-y-3">
                {state.items.length===0 && <div className="text-[rgb(var(--muted))]">No items yet — add a few below.</div>}
                {state.items.map(it => <ItemRow key={it.id} it={it}/>)}
                <button className="btn btn-outline" onClick={()=>addItem()}><Sparkles className="icon"/> Add item</button>
              </div>
            </div>
            <div className="glass p-6">
              <div className="text-lg font-semibold mb-3">Quick add</div>
              <div className="grid grid-cols-12 gap-2 items-end">
                <input ref={qiNameRef} className="input col-span-5" placeholder="Milk, chips, etc."/>
                <input ref={qiQtyRef} type="number" min={1} defaultValue={1} className="input col-span-2"/>
                <input ref={qiPriceRef} inputMode="decimal" placeholder="0.00" className="input col-span-2"/>
                <select ref={qiPersonRef} className="select col-span-2">
                  {state.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button className="btn col-span-1" onClick={()=>{
                  const name = qiNameRef.current?.value?.trim() || ""; if (!name) return;
                  const qty = Math.max(1, parseInt(qiQtyRef.current?.value || "1"));
                  const price = clampMoney(qiPriceRef.current?.value || 0);
                  const personId = qiPersonRef.current?.value || state.people[0]?.id || uid();
                  addItem(name, price, qty, personId);
                  if(qiNameRef.current) qiNameRef.current.value = "";
                  if(qiPriceRef.current) qiPriceRef.current.value = "";
                  if(qiQtyRef.current) qiQtyRef.current.value = "1";
                }}><Sparkles className="icon"/></button>
              </div>
            </div>
          </motion.div>
        )}

        {state.step===3 && (
          <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} className="glass p-6">
            <div className="text-2xl font-semibold mb-1">Fees & tip</div>
            <div className="text-sm text-[rgb(var(--muted))] mb-4">These are split evenly across participants.</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-[rgb(var(--muted))]">Delivery</label><input className="input" type="text" value={feeText.delivery} onChange={e=>setFee('delivery', e.target.value)} inputMode="decimal"/></div>
              <div><label className="text-xs text-[rgb(var(--muted))]">Service</label><input className="input" type="text" value={feeText.service} onChange={e=>setFee('service', e.target.value)} inputMode="decimal"/></div>
              <div><label className="text-xs text-[rgb(var(--muted))]">Taxes</label><input className="input" type="text" value={feeText.taxes} onChange={e=>setFee('taxes', e.target.value)} inputMode="decimal"/></div>
              <div><label className="text-xs text-[rgb(var(--muted))]">Tip</label><input className="input" type="text" value={feeText.tip} onChange={e=>setFee('tip', e.target.value)} inputMode="decimal"/></div>
              <div><label className="text-xs text-[rgb(var(--muted))]">{state.fees.otherLabel || 'Bag fee'}</label><input className="input" type="text" value={feeText.other} onChange={e=>setFee('other', e.target.value)} inputMode="decimal"/></div>
              <div><label className="text-xs text-[rgb(var(--muted))]">Rename other</label><input className="input" value={state.fees.otherLabel} onChange={e=>setFee('otherLabel', e.target.value)}/></div>
            </div>
            <div className="sep"/>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Switch checked={state.includeEmpty} onChange={()=>setState(s=>({...s, includeEmpty: !s.includeEmpty}))}/><div className="text-sm">Split fees across <strong>all people</strong></div></div>
              <div className="flex items-center gap-3"><Switch checked={state.roundUp} onChange={()=>setState(s=>({...s, roundUp: !s.roundUp}))}/><div className="text-sm">Round totals to whole dollars (balanced)</div></div>
            </div>
          </motion.div>
        )}

        {state.step===4 && (
          <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} className="glass p-6">
            <div className="text-2xl font-semibold mb-1">What everyone owes</div>
            <div className="text-sm text-[rgb(var(--muted))] mb-4">Copy a single total or copy all.</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr><th className="text-left py-2">Person</th><th className="text-left">Items</th><th className="text-left">Items $</th><th className="text-left">Fee share</th><th className="text-left">Total</th><th></th></tr></thead>
                <tbody>
                  {participants.map(p=>{
                    const d = (c as any).perPerson[p.id];
                    const itemsStr = d.items.length ? d.items.map((i:any)=> `${i.qty}× ${i.name}`).join(', ') : '—';
                    return (
                      <tr key={p.id} className="border-t border-[rgba(var(--border),0.6)]">
                        <td className="py-3 font-semibold">{p.name}</td>
                        <td className="text-[rgb(var(--muted))]">{itemsStr}</td>
                        <td>{currency(d.itemsTotal)}</td>
                        <td>{currency(d.feeShare)}</td>
                        <td className="font-bold">{currency(d.total)}</td>
                        <td className="text-right"><button className="btn btn-outline" onClick={()=>navigator.clipboard.writeText(d.total.toFixed(2))}><ClipboardCopy className="icon"/> Copy</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="sep"/>
            <div className="grid grid-cols-5 gap-3">
              <div className="stat"><div className="text-[rgb(var(--muted))]">Items</div><div className="font-semibold text-lg">{currency(c.itemsTotal)}</div></div>
              <div className="stat"><div className="text-[rgb(var(--muted))]">Fees</div><div className="font-semibold text-lg">{currency(c.feeTotal)}</div></div>
              <div className="stat"><div className="text-[rgb(var(--muted))]">Order total</div><div className="font-semibold text-lg">{currency(c.rawTotal)}</div></div>
              <div className="stat"><div className="text-[rgb(var(--muted))]">Sum of splits</div><div className="font-semibold text-lg">{currency(c.perPersonSum)}</div></div>
              <div className="stat"><div className="text-[rgb(var(--muted))]">Participants</div><div className="font-semibold text-lg">{participants.length}</div></div>
            </div>
          </motion.div>
        )}
      </div>

      <BottomBar/>
    </div>
  );
}
