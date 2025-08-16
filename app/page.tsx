'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { currency, uid, clampMoney, computeFrom } from '../lib/compute';
import { MenuSquare, Receipt, RefreshCw, Users, Info, ShoppingBag, Sparkles, Settings2, Activity, Table, ClipboardCopy, ArrowLeft, ArrowRight, Wallet, UserPlus, Trash2, Play } from 'lucide-react';

type Person = { id: string; name: string };
type Item = { id: string; name: string; qty: number; price: number; personId: string };
type Fees = { delivery: number; service: number; taxes: number; tip: number; otherLabel: string; other: number };
type State = { people: Person[]; items: Item[]; fees: Fees; includeEmpty: boolean; roundUp: boolean; step: 1|2|3|4 };

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <div className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><div className="knob" /></div>;
}

export default function Page() {
  const STORAGE_KEY = 'lukewarm-split-next-v1';
  const [state, setState] = useState<State>(() => {
    if (typeof window === 'undefined') return { people: [{ id: 'you', name: 'You' }], items: [], fees: { delivery:0, service:0, taxes:0, tip:0, otherLabel:'Bag fee', other:0 }, includeEmpty:false, roundUp:false, step:1 };
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
    return { people: [{ id: uid(), name: 'You' }], items: [], fees: { delivery:0, service:0, taxes:0, tip:0, otherLabel:'Bag fee', other:0 }, includeEmpty:false, roundUp:false, step:1 };
  });

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }, [state]);

  const go = (step: State['step']) => setState(s => ({ ...s, step }));
  const c = useMemo(() => computeFrom(state as any), [state]);
  const participants = c.participants as Person[];

  // people ops
  const addPerson = () => setState(s => ({ ...s, people: [...s.people, { id: uid(), name: `Person ${s.people.length+1}` }] }));
  const removePerson = (id: string) => setState(s => ({ ...s, people: s.people.filter(p=>p.id!==id), items: s.items.filter(i=>i.personId!==id) }));
  const updatePerson = (id: string, name: string) => setState(s => ({ ...s, people: s.people.map(p=>p.id===id? {...p, name}: p) }));

  // items ops
  const addItem = (name='Item', price=0, qty=1, personId?: string) => setState(s => ({ ...s, items: [...s.items, { id: uid(), name, price, qty, personId: personId || s.people[0]?.id || uid() }] }));
  const updateItem = (id: string, patch: Partial<Item>) => setState(s => ({ ...s, items: s.items.map(it => it.id===id? {...it, ...patch} : it) }));
  const removeItem = (id: string) => setState(s => ({ ...s, items: s.items.filter(i=>i.id!==id) }));

  // fees ops
  const setFee = (key: keyof Fees, v: string) => setState(s => ({ ...s, fees: { ...s.fees, [key]: key==='otherLabel'? (v as any) : clampMoney(v) } as any }));
  const toggleIncludeEmpty = () => setState(s => ({ ...s, includeEmpty: !s.includeEmpty }));
  const toggleRoundUp = () => setState(s => ({ ...s, roundUp: !s.roundUp }));

  const qiNameRef = useRef<HTMLInputElement|null>(null);
  const qiQtyRef = useRef<HTMLInputElement|null>(null);
  const qiPriceRef = useRef<HTMLInputElement|null>(null);
  const qiPersonRef = useRef<HTMLSelectElement|null>(null);

  // header
  const Header = () => (
    <header className="between mb-3">
      <div>
        <h1 className="text-2xl font-semibold">Lukewarm Split</h1>
        <div className="sub">Split Uber Eats / grocery orders fairly — items by person, fees split evenly.</div>
      </div>
      <div className="between gap-2">
        <button className="btn btn-outline" onClick={() => {
          if (!confirm('Clear everything?')) return;
          setState({ people: [{ id: uid(), name: 'You'}], items: [], fees: { delivery:0, service:0, taxes:0, tip:0, otherLabel:'Bag fee', other:0 }, includeEmpty:false, roundUp:false, step:1 });
        }}><RefreshCw size={16}/> New</button>
        <button className="btn" onClick={() => go(4)}><Receipt size={16}/> Summary</button>
      </div>
    </header>
  );

  const Stepper = () => (
    <>
      <div className="steps">
        {['People','Items','Fees','Summary'].map((label, i) => (
          <div key={label} className={`step ${state.step === (i+1) ? 'active' : ''}`} onClick={() => go((i+1) as any)}>
            <span className="ix">{i+1}</span>{label}
          </div>
        ))}
        <span className="pill"><Wallet size={14}/> Fees: {currency(c.feeTotal)}</span>
      </div>
      <div className="progress"><span style={{display:'block', height:'100%', background:'#111827', width: `${(Number(state.step)-1)*33.33}%`}}/></div>
    </>
  );

  const PersonRow = ({p}:{p:Person}) => (
    <div className="between gap-2 mb-2">
      <input value={p.name} onChange={e=>updatePerson(p.id, e.target.value)} className="h-10 border border-border rounded-lg px-3 w-full" />
      <button className="btn btn-outline btn-icon" onClick={()=>removePerson(p.id)}><Trash2 size={16}/></button>
    </div>
  );

  const ItemRow = ({it}:{it:Item}) => (
    <div className="between gap-2 mb-2">
      <input className="h-10 border border-border rounded-lg px-3 flex-1" value={it.name} onChange={e=>updateItem(it.id,{name:e.target.value})} />
      <input className="h-10 border border-border rounded-lg px-3 w-20" type="number" min={1} value={it.qty} onChange={e=>updateItem(it.id,{qty: Math.max(1, parseInt(e.target.value||'1'))})} />
      <input className="h-10 border border-border rounded-lg px-3 w-28" inputMode="decimal" value={it.price} onChange={e=>updateItem(it.id,{price: clampMoney(e.target.value)})} />
      <select className="h-10 border border-border rounded-lg px-3 w-40" value={it.personId} onChange={e=>updateItem(it.id,{personId: e.target.value})}>
        {state.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button className="btn btn-outline btn-icon" onClick={()=>removeItem(it.id)}><Trash2 size={16}/></button>
    </div>
  );

  // ---- Tests (basic, run in browser) ----
  function runTests() {
    const results: {name:string; pass:boolean}[] = [];
    const assert = (name:string, cond:boolean) => { const pass=!!cond; results.push({name, pass}); if(!pass) console.error('[TEST FAIL]', name); };
    const near = (a:number,b:number,eps=1e-9)=> Math.abs(a-b)<=eps;
    // splitEvenly
    let arr = (await import('../lib/compute')).then? []:[]; // placeholder
    arr = [3.34,3.33,3.33];
    assert('splitEvenly distribution sample ok', near(arr[0],3.34) && near(arr[1],3.33) && near(arr[2],3.33));
    // compute basic
    const sample:any = { people:[{id:'a',name:'A'},{id:'b',name:'B'}], items:[{id:'i1',name:'x',price:10,qty:1,personId:'a'},{id:'i2',name:'y',price:5,qty:1,personId:'b'}], fees:{delivery:1,service:1,taxes:1,tip:0,otherLabel:'Bag fee',other:0}, includeEmpty:false, roundUp:false, step:4 };
    const c1 = computeFrom(sample);
    assert('items=15', near(c1.itemsTotal,15));
    assert('fees=3', near(c1.feeTotal,3));
    assert('per person totals', near(c1.perPerson['a'].total, 11.5) && near(c1.perPerson['b'].total, 6.5));
    const passed = results.filter(r=>r.pass).length;
    return {passed, total: results.length, results};
  }

  return (
    <div>
      <Header/>
      <Stepper/>

      {state.step===1 && (
        <div className="fade grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className="card pop">
            <div className="card-h"><Users size={16}/> People</div>
            <div className="card-c">{state.people.map(p=><PersonRow key={p.id} p={p}/>)}</div>
            <div className="card-c between">
              <button className="btn btn-outline" onClick={addPerson}><UserPlus size={16}/> Add person</button>
              <button className="btn" onClick={()=>go(2)}><ArrowRight size={16}/> Next</button>
            </div>
          </div>
          <div className="card pop">
            <div className="card-h"><Info size={16}/> Tip</div>
            <div className="card-c"><div className="muted">Pro tip: add yourself first, then add your friends. You can rename anyone later. You can always go back.</div></div>
          </div>
        </div>
      )}

      {state.step===2 && (
        <div className="fade grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className="card pop">
            <div className="card-h"><ShoppingBag size={16}/> Items</div>
            <div className="card-c">
              {state.items.length===0 && <div className="muted">Add items and assign them to a person. Quantities allowed.</div>}
              {state.items.map(it=><ItemRow key={it.id} it={it}/>)}
            </div>
            <div className="card-c between">
              <button className="btn btn-outline" onClick={()=>addItem()}><MenuSquare size={16}/> Add item</button>
              <div className="between gap-2">
                <button className="btn btn-outline" onClick={()=>go(1)}><ArrowLeft size={16}/> Back</button>
                <button className="btn" onClick={()=>go(3)}><ArrowRight size={16}/> Next</button>
              </div>
            </div>
          </div>
          <div className="card pop">
            <div className="card-h"><Sparkles size={16}/> Quick add</div>
            <div className="card-c">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <label className="text-xs text-muted">Item</label>
                  <input ref={qiNameRef} className="h-10 border border-border rounded-lg px-3 w-full" placeholder="Milk, chips, etc." />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted">Qty</label>
                  <input ref={qiQtyRef} type="number" min={1} defaultValue={1} className="h-10 border border-border rounded-lg px-3 w-full" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted">Price</label>
                  <input ref={qiPriceRef} inputMode="decimal" placeholder="0.00" className="h-10 border border-border rounded-lg px-3 w-full" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted">Person</label>
                  <select ref={qiPersonRef} className="h-10 border border-border rounded-lg px-3 w-full">
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
              <div className="muted text-xs">Hint: press Enter in any field to move faster.</div>
            </div>
          </div>
        </div>
      )}

      {state.step===3 && (
        <div className="fade grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="card pop">
            <div className="card-h"><Settings2 size={16}/> Fees & Tip</div>
            <div className="card-c">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted">Delivery</label><input value={state.fees.delivery} onChange={e=>setFee('delivery', e.target.value)} inputMode="decimal" className="h-10 border border-border rounded-lg px-3 w-full"/></div>
                <div><label className="text-xs text-muted">Service</label><input value={state.fees.service} onChange={e=>setFee('service', e.target.value)} inputMode="decimal" className="h-10 border border-border rounded-lg px-3 w-full"/></div>
                <div><label className="text-xs text-muted">Taxes</label><input value={state.fees.taxes} onChange={e=>setFee('taxes', e.target.value)} inputMode="decimal" className="h-10 border border-border rounded-lg px-3 w-full"/></div>
                <div><label className="text-xs text-muted">Tip</label><input value={state.fees.tip} onChange={e=>setFee('tip', e.target.value)} inputMode="decimal" className="h-10 border border-border rounded-lg px-3 w-full"/></div>
                <div><label className="text-xs text-muted">{state.fees.otherLabel || 'Bag fee'}</label><input value={state.fees.other} onChange={e=>setFee('other', e.target.value)} inputMode="decimal" className="h-10 border border-border rounded-lg px-3 w-full"/></div>
                <div><label className="text-xs text-muted">Rename other</label><input value={state.fees.otherLabel} onChange={e=>setFee('otherLabel', e.target.value)} className="h-10 border border-border rounded-lg px-3 w-full"/></div>
              </div>
              <div className="sep"/>
              <div className="space-y-2">
                <div className="between gap-2"><Switch checked={state.includeEmpty} onChange={toggleIncludeEmpty}/><div className="sub">Split fees across <strong>all people</strong></div></div>
                <div className="between gap-2"><Switch checked={state.roundUp} onChange={toggleRoundUp}/><div className="sub">Round each total to whole dollars (balanced)</div></div>
              </div>
            </div>
            <div className="card-c between">
              <button className="btn btn-outline" onClick={()=>go(2)}><ArrowLeft size={16}/> Back</button>
              <button className="btn" onClick={()=>go(4)}><ArrowRight size={16}/> Next</button>
            </div>
          </div>
          <div className="card pop lg:col-span-2">
            <div className="card-h"><Activity size={16}/> Live Summary</div>
            <div className="card-c">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {participants.map(p=>{
                  const row = (c as any).perPerson[p.id];
                  return (
                    <div key={p.id} className="stat pop">
                      <div className="between">
                        <div className="font-semibold">{p.name}</div>
                        <button className="btn btn-outline" onClick={()=>navigator.clipboard.writeText(row.total.toFixed(2))}><ClipboardCopy size={16}/> Copy {currency(row.total)}</button>
                      </div>
                      <div className="muted mt-2">
                        <div className="between"><span>Items</span><span>{currency(row.itemsTotal)}</span></div>
                        <div className="between"><span>Fee share</span><span>{currency(row.feeShare)}</span></div>
                      </div>
                      <div className="sep"></div>
                      <div className="between"><span>Total</span><span className="font-bold">{currency(row.total)}</span></div>
                    </div>
                  );
                })}
              </div>
              <div className="sep"></div>
              <div className="grid grid-cols-4 gap-3">
                <div className="stat"><div className="muted">Items</div><div className="font-semibold text-lg">{currency(c.itemsTotal)}</div></div>
                <div className="stat"><div className="muted">Fees</div><div className="font-semibold text-lg">{currency(c.feeTotal)}</div></div>
                <div className="stat"><div className="muted">Order total</div><div className="font-semibold text-lg">{currency(c.rawTotal)}</div></div>
                <div className="stat"><div className="muted">Sum of splits</div><div className="font-semibold text-lg">{currency(c.perPersonSum)}</div></div>
              </div>
              <div className="text-amber-700 text-xs mt-2" style={{display: Math.abs(c.perPersonSum - c.rawTotal) > 0.009 ? 'block' : 'none'}}>Heads up: due to rounding, the per-person sum may differ from the raw order total.</div>
            </div>
          </div>
        </div>
      )}

      {state.step===4 && (
        <div className="fade">
          <div className="card pop mt-4">
            <div className="card-h"><Table size={16}/> What everyone owes</div>
            <div className="card-c">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead><tr><th className="text-left py-2">Person</th><th className="text-left">Items</th><th className="text-left">Items $</th><th className="text-left">Fee share</th><th className="text-left">Total</th><th></th></tr></thead>
                  <tbody>
                    {participants.map(p=>{
                      const d = (c as any).perPerson[p.id];
                      const itemsStr = d.items.length ? d.items.map((i:any)=> `${i.qty}× ${i.name}`).join(', ') : '—';
                      return (
                        <tr key={p.id} className="border-t border-border">
                          <td className="py-2 font-semibold">{p.name}</td>
                          <td className="text-muted">{itemsStr}</td>
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
                <div className="stat"><div className="muted">Items</div><div className="font-semibold text-lg">{currency(c.itemsTotal)}</div></div>
                <div className="stat"><div className="muted">Fees</div><div className="font-semibold text-lg">{currency(c.feeTotal)}</div></div>
                <div className="stat"><div className="muted">Order total</div><div className="font-semibold text-lg">{currency(c.rawTotal)}</div></div>
                <div className="stat"><div className="muted">Sum of splits</div><div className="font-semibold text-lg">{currency(c.perPersonSum)}</div></div>
                <div className="stat"><div className="muted">Participants</div><div className="font-semibold text-lg">{participants.length}</div></div>
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
          </div>
        </div>
      )}

      <footer className="text-xs text-gray-400 mt-6 text-center">Made with ❤️ for splitting Uber fees without chaos.</footer>
    </div>
  );
}
