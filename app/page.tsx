'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { currency, uid, clampMoney, computeFrom, splitEvenly } from '../lib/compute';
import { Moon, SunMedium, Receipt, RefreshCw, Sparkles, Settings2, Activity, Table, ClipboardCopy, ArrowLeft, ArrowRight, Wallet, UserPlus, Trash2 } from 'lucide-react';

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

  const STORAGE_KEY = 'lukewarm-split-next-v2';
  const [state, setState] = useState<State>(() => {
    if (typeof window === 'undefined') return { people: [{ id: 'you', name: 'You' }], items: [], fees: { delivery:0, service:0, taxes:0, tip:0, otherLabel:'Bag fee', other:0 }, includeEmpty:false, roundUp:false, step:1 };
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
    return { people: [{ id: uid(), name: 'You' }], items: [], fees: { delivery:0, service:0, taxes:0, tip:0, otherLabel:'Bag fee', other:0 }, includeEmpty:false, roundUp:false, step:1 };
  });

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }, [state]);

  const go = (step: State['step']) => setState(s => ({ ...s, step }));
  const c = useMemo(() => computeFrom(state as any), [state]);
  const participants = c.participants as Person[];

  // Local fee text state for decimal typing
  const [feeText, setFeeText] = useState({
    delivery: String(state.fees.delivery || ''),
    service: String(state.fees.service || ''),
    taxes:   String(state.fees.taxes || ''),
    tip:     String(state.fees.tip || ''),
    other:   String(state.fees.other || ''),
  });
  useEffect(() => {
    setFeeText({
      delivery: String(state.fees.delivery || ''),
      service: String(state.fees.service || ''),
      taxes:   String(state.fees.taxes || ''),
      tip:     String(state.fees.tip || ''),
      other:   String(state.fees.other || ''),
    });
  }, [state.fees.delivery, state.fees.service, state.fees.taxes, state.fees.tip, state.fees.other]);

  const setFee = (key: keyof Fees, v: string) => {
    if (key === 'otherLabel') {
      setState(s => ({ ...s, fees: { ...s.fees, otherLabel: v } }));
      return;
    }
    setFeeText(t => ({ ...t, [key]: v }));
    const num = clampMoney(v);
    setState(s => ({ ...s, fees: { ...s.fees, [key]: num } as any }));
  };

  // people ops
  const addPerson = () => setState(s => ({ ...s, people: [...s.people, { id: uid(), name: `Person ${s.people.length+1}` }] }));
  const removePerson = (id: string) => setState(s => ({ ...s, people: s.people.filter(p=>p.id!==id), items: s.items.filter(i=>i.personId!==id) }));
  const updatePerson = (id: string, name: string) => setState(s => ({ ...s, people: s.people.map(p=>p.id===id? {...p, name}: p) }));

  // items ops
  const addItem = (name='Item', price=0, qty=1, personId?: string) => setState(s => ({ ...s, items: [...s.items, { id: uid(), name, price, qty, personId: personId || s.people[0]?.id || uid() }] }));
  const updateItem = (id: string, patch: Partial<Item>) => setState(s => ({ ...s, items: s.items.map(it => it.id===id? {...it, ...patch} : it) }));
  const removeItem = (id: string) => setState(s => ({ ...s, items: s.items.filter(i=>i.id!==id) }));

  const qiNameRef = useRef<HTMLInputElement|null>(null);
  const qiQtyRef = useRef<HTMLInputElement|null>(null);
  const qiPriceRef = useRef<HTMLInputElement|null>(null);
  const qiPersonRef = useRef<HTMLSelectElement|null>(null);

  const Header = () => (
    <header className="between mb-5">
      <div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Lukewarm Split</h1>
        <div className="text-sm text-[rgb(var(--muted))]">Split Uber Eats / grocery orders fairly — items by person, fees split evenly.</div>
      </div>
      <div className="between gap-2">
        <button className="btn btn-outline" onClick={() => {
          if (!confirm('Clear everything?')) return;
          setState({ people: [{ id: uid(), name: 'You'}], items: [], fees: { delivery:0, service:0, taxes:0, tip:0, otherLabel:'Bag fee', other:0 }, includeEmpty:false, roundUp:false, step:1 });
        }}><RefreshCw size={16}/> New</button>
        <button className="btn btn-outline" onClick={() => setDark(d => !d)}>{dark ? <SunMedium size={16}/> : <Moon size={16}/>}</button>
        <button className="btn" onClick={() => go(4)}><Receipt size={16}/> Summary</button>
      </div>
    </header>
  );

  const Stepper = () => (
    <div className="mb-4">
      <div className="steps">
        {['People','Items','Fees','Summary'].map((label, i) => (
          <div key={label} className={`step ${state.step === (i+1) ? 'active' : ''}`} onClick={() => go((i+1) as any)}>
            <span className="ix">{i+1}</span>{label}
          </div>
        ))}
        <span className="pill"><Wallet size={14}/> Fees: {currency(c.feeTotal)}</span>
      </div>
      <div className="progress rounded-full overflow-hidden">
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: `${(Number(state.step)-1)*33.33}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="block h-1.5 bg-gradient-to-r from-[rgb(var(--accent-from))] to-[rgb(var(--accent-to))]"
        />
      </div>
    </div>
  );

  const PersonRow = ({ p, onCommit }: { p: Person; onCommit: (id: string, name: string) => void }) => {
    const [val, setVal] = useState(p.name);
    useEffect(() => { setVal(p.name); }, [p.name]);
    return (
      <div className="between gap-2 mb-2">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => onCommit(p.id, val.trim() || "Unnamed")}
          onKeyDown={e => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
          className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur placeholder:text-[rgb(var(--muted))]"
          placeholder="Add a name"
        />
        <button className="btn btn-outline btn-icon" onClick={()=>removePerson(p.id)}><Trash2 size={16}/></button>
      </div>
    );
  };

  const ItemRow = ({it}:{it:Item}) => (
    <div className="between gap-2 mb-2">
      <input className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 flex-1 bg-white/60 dark:bg-black/30 backdrop-blur" value={it.name} onChange={e=>updateItem(it.id,{name:e.target.value})} />
      <input className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-20 bg-white/60 dark:bg-black/30 backdrop-blur" type="number" min={1} value={it.qty} onChange={e=>updateItem(it.id,{qty: Math.max(1, parseInt(e.target.value||'1'))})} />
      <input className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-28 bg-white/60 dark:bg-black/30 backdrop-blur" inputMode="decimal" value={it.price} onChange={e=>updateItem(it.id,{price: clampMoney(e.target.value)})} />
      <select className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-40 bg-white/60 dark:bg-black/30 backdrop-blur" value={it.personId} onChange={e=>updateItem(it.id,{personId: e.target.value})}>
        {state.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button className="btn btn-outline btn-icon" onClick={()=>removeItem(it.id)}><Trash2 size={16}/></button>
    </div>
  );

  return (
    <div>
      <Header/>
      <Stepper/>

      {state.step===1 && (
        <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
          <div className="card pop">
            <div className="card-h">Add your people.</div>
            <div className="card-c">
              <div className="space-y-2">
                {state.people.map(p=><PersonRow key={p.id} p={p} onCommit={updatePerson}/>)}
              </div>
            </div>
            <div className="card-c between">
              <button className="btn btn-outline" onClick={addPerson}> <UserPlus size={16}/> Add person</button>
              <button className="btn" onClick={()=>go(2)}><ArrowRight size={16}/> Next</button>
            </div>
          </div>
          <div className="card pop">
            <div className="card-h">Tip</div>
            <div className="card-c"><div className="text-[rgb(var(--muted))]">Add yourself first, then your friends. You can rename anyone later — and you can always go back.</div></div>
          </div>
        </motion.div>
      )}

      {state.step===2 && (
        <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
          <div className="card pop">
            <div className="card-h">Add items.</div>
            <div className="card-c">
              {state.items.length===0 && <div className="text-[rgb(var(--muted))]">Add items and assign them to a person. Quantities allowed.</div>}
              {state.items.map(it=><ItemRow key={it.id} it={it}/>)}
            </div>
            <div className="card-c between">
              <button className="btn btn-outline" onClick={()=>addItem()}><Sparkles size={16}/> Add item</button>
              <div className="between gap-2">
                <button className="btn btn-outline" onClick={()=>go(1)}><ArrowLeft size={16}/> Back</button>
                <button className="btn" onClick={()=>go(3)}><ArrowRight size={16}/> Next</button>
              </div>
            </div>
          </div>
          <div className="card pop">
            <div className="card-h">Quick add</div>
            <div className="card-c">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <label className="text-xs text-[rgb(var(--muted))]">Item</label>
                  <input ref={qiNameRef} className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur" placeholder="Milk, chips, etc." />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[rgb(var(--muted))]">Qty</label>
                  <input ref={qiQtyRef} type="number" min={1} defaultValue={1} className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[rgb(var(--muted))]">Price</label>
                  <input ref={qiPriceRef} inputMode="decimal" placeholder="0.00" className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[rgb(var(--muted))]">Person</label>
                  <select ref={qiPersonRef} className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur">
                    {state.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <button className="btn w-full" onClick={()=>{
                    const name = qiNameRef.current?.value?.trim() || ""; if (!name) return;
                    const qty = Math.max(1, parseInt(qiQtyRef.current?.value || "1"));
                    const price = clampMoney(qiPriceRef.current?.value || 0);
                    const personId = qiPersonRef.current?.value || state.people[0]?.id || uid();
                    addItem(name, price, qty, personId);
                    if(qiNameRef.current) qiNameRef.current.value = "";
                    if(qiPriceRef.current) qiPriceRef.current.value = "";
                    if(qiQtyRef.current) qiQtyRef.current.value = "1";
                  }}><Sparkles size={16}/></button>
                </div>
              </div>
              <div className="sep"></div>
              <div className="text-[rgb(var(--muted))] text-xs">Hint: press Enter in any field to move faster.</div>
            </div>
          </div>
        </motion.div>
      )}

      {state.step===3 && (
        <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4">
          <div className="card pop">
            <div className="card-h">Fees & Tip</div>
            <div className="card-c">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-[rgb(var(--muted))]">Delivery</label><input type="text" value={feeText.delivery} onChange={e=>setFee('delivery', e.target.value)} inputMode="decimal" className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur"/></div>
                <div><label className="text-xs text-[rgb(var(--muted))]">Service</label><input type="text" value={feeText.service} onChange={e=>setFee('service', e.target.value)} inputMode="decimal" className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur"/></div>
                <div><label className="text-xs text-[rgb(var(--muted))]">Taxes</label><input type="text" value={feeText.taxes} onChange={e=>setFee('taxes', e.target.value)} inputMode="decimal" className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur"/></div>
                <div><label className="text-xs text-[rgb(var(--muted))]">Tip</label><input type="text" value={feeText.tip} onChange={e=>setFee('tip', e.target.value)} inputMode="decimal" className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur"/></div>
                <div><label className="text-xs text-[rgb(var(--muted))]">{state.fees.otherLabel || 'Bag fee'}</label><input type="text" value={feeText.other} onChange={e=>setFee('other', e.target.value)} inputMode="decimal" className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur"/></div>
                <div><label className="text-xs text-[rgb(var(--muted))]">Rename other</label><input value={state.fees.otherLabel} onChange={e=>setFee('otherLabel', e.target.value)} className="h-11 border border-[rgba(var(--border),0.7)] rounded-xl px-3 w-full bg-white/60 dark:bg-black/30 backdrop-blur"/></div>
              </div>
              <div className="sep"/>
              <div className="space-y-2">
                <div className="between gap-2"><Switch checked={state.includeEmpty} onChange={()=>setState(s=>({...s, includeEmpty: !s.includeEmpty}))}/><div className="text-sm">Split fees across <strong>all people</strong></div></div>
                <div className="between gap-2"><Switch checked={state.roundUp} onChange={()=>setState(s=>({...s, roundUp: !s.roundUp}))}/><div className="text-sm">Round each total to whole dollars (balanced)</div></div>
              </div>
            </div>
            <div className="card-c between">
              <button className="btn btn-outline" onClick={()=>go(2)}><ArrowLeft size={16}/> Back</button>
              <button className="btn" onClick={()=>go(4)}><ArrowRight size={16}/> Next</button>
            </div>
          </div>
          <div className="card pop lg:col-span-2">
            <div className="card-h">Live Summary</div>
            <div className="card-c">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {participants.map(p=>{
                  const row = (c as any).perPerson[p.id];
                  return (
                    <motion.div key={p.id} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="stat">
                      <div className="between">
                        <div className="font-semibold">{p.name}</div>
                        <button className="btn btn-outline" onClick={()=>navigator.clipboard.writeText(row.total.toFixed(2))}><ClipboardCopy size={16}/> Copy {currency(row.total)}</button>
                      </div>
                      <div className="text-[rgb(var(--muted))] mt-2">
                        <div className="between"><span>Items</span><span>{currency(row.itemsTotal)}</span></div>
                        <div className="between"><span>Fee share</span><span>{currency(row.feeShare)}</span></div>
                      </div>
                      <div className="sep"></div>
                      <div className="between"><span>Total</span><span className="font-bold">{currency(row.total)}</span></div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="sep"></div>
              <div className="grid grid-cols-4 gap-3">
                <div className="stat"><div className="text-[rgb(var(--muted))]">Items</div><div className="font-semibold text-lg">{currency(c.itemsTotal)}</div></div>
                <div className="stat"><div className="text-[rgb(var(--muted))]">Fees</div><div className="font-semibold text-lg">{currency(c.feeTotal)}</div></div>
                <div className="stat"><div className="text-[rgb(var(--muted))]">Order total</div><div className="font-semibold text-lg">{currency(c.rawTotal)}</div></div>
                <div className="stat"><div className="text-[rgb(var(--muted))]">Sum of splits</div><div className="font-semibold text-lg">{currency(c.perPersonSum)}</div></div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {state.step===4 && (
        <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} className="card pop mt-4">
          <div className="card-h">What everyone owes</div>
          <div className="card-c">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr><th className="text-left py-2">Person</th><th className="text-left">Items</th><th className="text-left">Items $</th><th className="text-left">Fee share</th><th className="text-left">Total</th><th></th></tr></thead>
                <tbody>
                  {participants.map(p=>{
                    const d = (c as any).perPerson[p.id];
                    const itemsStr = d.items.length ? d.items.map((i:any)=> `${i.qty}× ${i.name}`).join(', ') : '—';
                    return (
                      <tr key={p.id} className="border-t border-[rgba(var(--border),0.7)]">
                        <td className="py-3 font-semibold">{p.name}</td>
                        <td className="text-[rgb(var(--muted))]">{itemsStr}</td>
                        <td>{currency(d.itemsTotal)}</td>
                        <td>{currency(d.feeShare)}</td>
                        <td className="font-bold">{currency(d.total)}</td>
                        <td className="text-right"><button className="btn btn-outline" onClick={()=>navigator.clipboard.writeText(d.total.toFixed(2))}><ClipboardCopy size={16}/> Copy</button></td>
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
            <div className="between mt-3 gap-2">
              <button className="btn btn-outline" onClick={()=>go(3)}><ArrowLeft size={16}/> Back</button>
              <div className="flex-1"/>
              <button className="btn btn-outline" onClick={()=>{
                const lines = participants.map(p => `${p.name}: $${(c as any).perPerson[p.id].total.toFixed(2)}`);
                navigator.clipboard.writeText(lines.join('\n'));
              }}><ClipboardCopy size={16}/> Copy all totals</button>
            </div>
          </div>
        </motion.div>
      )}

      <footer className="text-xs text-[rgb(var(--muted))] mt-6 text-center">Made with ❤️ for splitting Uber fees without chaos.</footer>
    </div>
  );
}
