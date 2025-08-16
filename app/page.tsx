"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronRight, ChevronLeft } from "lucide-react";

export default function Page() {
  const [step, setStep] = useState(0);
  const [people, setPeople] = useState<string[]>([]);
  const [items, setItems] = useState<{ person: string; name: string; price: number }[]>([]);
  const [fees, setFees] = useState({ service: 0, tip: 0 });

  const addPerson = () => setPeople([...people, ""]);
  const updatePerson = (i: number, v: string) => {
    const copy = [...people];
    copy[i] = v;
    setPeople(copy);
  };
  const removePerson = (i: number) => setPeople(people.filter((_, idx) => idx !== i));

  const addItem = () => setItems([...items, { person: people[0] || "", name: "", price: 0 }]);
  const updateItem = (i: number, key: "person" | "name" | "price", v: string | number) => {
    const copy = [...items];
    // @ts-ignore
    copy[i][key] = v;
    setItems(copy);
  };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const totalFees = fees.service + fees.tip;
  const feeSplit = people.length ? totalFees / people.length : 0;
  const summary = people.map((p) => {
    const subtotal = items.filter((it) => it.person === p).reduce((a, b) => a + b.price, 0);
    return { person: p, total: subtotal + feeSplit };
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white px-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex justify-between mb-8 text-sm text-gray-400">
          {["People", "Items", "Fees", "Summary"].map((label, i) => (
            <div key={i} className={`flex-1 text-center ${step === i ? "text-white" : ""}`}>
              {label}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-800/70 rounded-2xl p-6 shadow-xl backdrop-blur"
        >
          {step === 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Add People</h2>
              {people.map((p, i) => (
                <div key={i} className="flex items-center mb-2">
                  <input
                    className="flex-1 bg-gray-900 rounded px-3 py-2 mr-2"
                    value={p}
                    onChange={(e) => updatePerson(i, e.target.value)}
                    placeholder="Name"
                  />
                  <button onClick={() => removePerson(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button
                onClick={addPerson}
                className="flex items-center text-teal-400 hover:text-teal-200 mt-2"
              >
                <Plus size={18} className="mr-1" /> Add Person
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Add Items</h2>
              {items.map((it, i) => (
                <div key={i} className="flex items-center mb-2 space-x-2">
                  <input
                    className="flex-1 bg-gray-900 rounded px-3 py-2"
                    placeholder="Item"
                    value={it.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-24 bg-gray-900 rounded px-3 py-2"
                    placeholder="$"
                    value={it.price}
                    onChange={(e) => updateItem(i, "price", parseFloat(e.target.value) || 0)}
                  />
                  <select
                    className="bg-gray-900 rounded px-2 py-2"
                    value={it.person}
                    onChange={(e) => updateItem(i, "person", e.target.value)}
                  >
                    {people.map((p, idx) => (
                      <option key={idx}>{p}</option>
                    ))}
                  </select>
                  <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button onClick={addItem} className="flex items-center text-teal-400 hover:text-teal-200 mt-2">
                <Plus size={18} className="mr-1" /> Add Item
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Add Fees</h2>
              <input
                type="number"
                className="w-full bg-gray-900 rounded px-3 py-2 mb-2"
                placeholder="Service Fee"
                value={fees.service}
                onChange={(e) => setFees({ ...fees, service: parseFloat(e.target.value) || 0 })}
              />
              <input
                type="number"
                className="w-full bg-gray-900 rounded px-3 py-2"
                placeholder="Tip"
                value={fees.tip}
                onChange={(e) => setFees({ ...fees, tip: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Summary</h2>
              <ul>
                {summary.map((s, i) => (
                  <li key={i} className="flex justify-between mb-2">
                    <span>{s.person}</span>
                    <span>${s.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        <div className="flex justify-between mt-6">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
            >
              <ChevronLeft size={18} className="mr-1" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center px-4 py-2 rounded bg-teal-500 hover:bg-teal-400 text-black font-medium"
            >
              Next <ChevronRight size={18} className="ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
