"use client";

import { useState, useEffect } from "react";
import {
  PlusIcon as Plus,
  XIcon as X,
  Edit2Icon as Edit2,
  CheckIcon as Check,
  ArrowRightIcon as ArrowRight,
} from "@/components/ui/AnimatedIcons";
import { useTripStore } from "@/stores/tripStore";
import { fmtCurrency } from "@/lib/currency";

function computeBalances(
  travelers: { id: string; name: string; emoji: string; color: string }[],
  assignments: { itemId: string; label: string; amountClp: number; paidBy: string; splitBetween: string[] }[]
) {
  const paid: Record<string, number> = {};
  const owes: Record<string, number> = {};
  for (const t of travelers) { paid[t.id] = 0; owes[t.id] = 0; }
  for (const a of assignments) {
    paid[a.paidBy] = (paid[a.paidBy] ?? 0) + a.amountClp;
    const per = a.splitBetween.length ? a.amountClp / a.splitBetween.length : 0;
    for (const id of a.splitBetween) owes[id] = (owes[id] ?? 0) + per;
  }
  return travelers.map(t => ({
    ...t,
    totalPays: paid[t.id] ?? 0,
    totalOwes: owes[t.id] ?? 0,
    net: (paid[t.id] ?? 0) - (owes[t.id] ?? 0),
  }));
}

// Compute minimum transactions to settle all debts
function computeTransactions(balances: ReturnType<typeof computeBalances>) {
  const creditors = balances.filter(b => b.net > 100).map(b => ({ ...b, rem: b.net }));
  const debtors   = balances.filter(b => b.net < -100).map(b => ({ ...b, rem: -b.net }));
  const txns: { from: string; fromEmoji: string; to: string; toEmoji: string; amount: number }[] = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].rem, creditors[j].rem);
    txns.push({ from: debtors[i].name, fromEmoji: debtors[i].emoji, to: creditors[j].name, toEmoji: creditors[j].emoji, amount });
    debtors[i].rem -= amount;
    creditors[j].rem -= amount;
    if (debtors[i].rem < 1) i++;
    if (creditors[j].rem < 1) j++;
  }
  return txns;
}

const CATEGORIES = [
  { id: "transport",      label: "Transporte",      emoji: "✈️" },
  { id: "accommodation",  label: "Alojamiento",      emoji: "🏨" },
  { id: "food",           label: "Comida",           emoji: "🍽️" },
  { id: "activities",     label: "Actividades",      emoji: "🎭" },
  { id: "localTransport", label: "Transporte local", emoji: "🚇" },
  { id: "extras",         label: "Extras",           emoji: "🛍️" },
] as const;

export function CostSplitter() {
  const { trip, addTraveler, removeTraveler, renameTraveler, setSplitAssignment, setSplitEqualBetweenAll, displayCurrency } = useTripStore();
  const fmt = (n: number) => fmtCurrency(Math.abs(n), displayCurrency);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const travelers_list = trip?.travelers_list ?? [];
  const splitAssignments = trip?.splitAssignments ?? [];
  const costs = trip?.costs;

  useEffect(() => {
    if (travelers_list.length >= 1 && splitAssignments.length === 0) {
      setSplitEqualBetweenAll();
    }
  }, [travelers_list.length, splitAssignments.length, setSplitEqualBetweenAll]);

  if (!trip) return null;

  const balances = computeBalances(travelers_list, splitAssignments);
  const transactions = computeTransactions(balances);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    addTraveler(name);
    setNewName("");
    setTimeout(() => setSplitEqualBetweenAll(), 50);
  }

  function getA(catId: string) { return splitAssignments.find(a => a.itemId === catId); }
  function setPayer(catId: string, tid: string) { const a = getA(catId); if (a) setSplitAssignment({ ...a, paidBy: tid }); }
  function toggleMember(catId: string, tid: string) {
    const a = getA(catId); if (!a) return;
    const already = a.splitBetween.includes(tid);
    setSplitAssignment({ ...a, splitBetween: already ? a.splitBetween.filter(id => id !== tid) : [...a.splitBetween, tid] });
  }

  return (
    <div className="space-y-5">

      {/* ── 1. Quiénes viajan ── */}
      <div className="rounded-2xl border border-white/10 bg-white/4 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Quiénes viajan</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {travelers_list.map(t => (
              <div
                key={t.id}
                className="flex items-center gap-1.5 rounded-full pl-2.5 pr-1.5 py-1.5 text-[12px] font-semibold border transition-all"
                style={{ background: t.color + "22", borderColor: t.color + "55", color: t.color }}
              >
                <span className="text-[15px]">{t.emoji}</span>
                {editingId === t.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { renameTraveler(t.id, editName); setEditingId(null); } }}
                      autoFocus
                      className="bg-transparent border-b border-current w-20 focus:outline-none text-[12px]"
                    />
                    <button onClick={() => { renameTraveler(t.id, editName); setEditingId(null); }} className="opacity-70 hover:opacity-100 p-0.5">
                      <Check size={11} />
                    </button>
                  </>
                ) : (
                  <>
                    <span>{t.name}</span>
                    <button onClick={() => { setEditingId(t.id); setEditName(t.name); }} className="opacity-40 hover:opacity-80 p-0.5">
                      <Edit2 size={10} />
                    </button>
                  </>
                )}
                <button onClick={() => removeTraveler(t.id)} className="opacity-30 hover:opacity-70 p-0.5">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Agregar viajero..."
              className="flex-1 bg-white/6 border border-white/12 rounded-xl px-3 py-2 text-[12px] text-white placeholder-white/25 focus:outline-none focus:border-white/25"
            />
            <button onClick={handleAdd} disabled={!newName.trim()} className="bg-ocean hover:bg-ocean-dark disabled:opacity-30 rounded-xl px-4 py-2 text-white text-[12px] font-semibold transition-colors flex items-center gap-1.5">
              <Plus size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Quién paga qué ── */}
      {travelers_list.length >= 2 && (
        <div className="rounded-2xl border border-white/10 bg-white/4 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Quién paga qué</p>
            <button onClick={setSplitEqualBetweenAll} className="text-[11px] font-semibold text-ocean-light hover:text-white transition-colors">
              Igualar todo
            </button>
          </div>
          <div className="space-y-px">
            {CATEGORIES.map(({ id, label, emoji }) => {
              const a = getA(id);
              if (!a || a.amountClp === 0) return null;
              return (
                <div key={id} className="px-5 py-3.5 border-t border-white/6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px]">{emoji}</span>
                      <p className="text-[13px] font-semibold text-white">{label}</p>
                    </div>
                    <p className="text-[13px] font-bold text-[#FF7043] tabular-nums">{fmt(a.amountClp)}</p>
                  </div>

                  {/* Payer */}
                  <div className="mb-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Paga por adelantado</p>
                    <div className="flex flex-wrap gap-1.5">
                      {travelers_list.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setPayer(id, t.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all"
                          style={a.paidBy === t.id
                            ? { background: t.color, borderColor: t.color, color: "#fff" }
                            : { background: "transparent", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}
                        >
                          <span>{t.emoji}</span> {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Split between */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Dividir entre</p>
                    <div className="flex flex-wrap gap-1.5">
                      {travelers_list.map(t => {
                        const inc = a.splitBetween.includes(t.id);
                        const perPerson = inc && a.splitBetween.length > 0 ? fmt(a.amountClp / a.splitBetween.length) : null;
                        return (
                          <button
                            key={t.id}
                            onClick={() => toggleMember(id, t.id)}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all"
                            style={inc
                              ? { background: t.color + "33", borderColor: t.color + "80", color: t.color }
                              : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" }}
                          >
                            <span>{t.emoji}</span>
                            <span className={inc ? "font-semibold" : ""}>{t.name}</span>
                            {perPerson && <span className="opacity-70 text-[10px] ml-0.5">{perPerson}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Resumen final ── */}
      {travelers_list.length >= 2 && (
        <div className="rounded-2xl border border-white/10 bg-white/4 overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Resumen final</p>
            <div className="space-y-2.5">
              {balances.map(b => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl border transition-all"
                  style={{ background: b.color + "12", borderColor: b.color + "30" }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] shrink-0" style={{ background: b.color + "25" }}>
                    {b.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white">{b.name}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      Paga {fmt(b.totalPays)} · Le toca {fmt(b.totalOwes)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {Math.abs(b.net) < 100 ? (
                      <p className="text-[12px] font-bold text-white/40">✅ A mano</p>
                    ) : b.net > 0 ? (
                      <>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#4CAF50] mb-0.5">Le deben</p>
                        <p className="text-[20px] font-bold tabular-nums text-[#4CAF50] leading-none">{fmt(b.net)}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#FF7043] mb-0.5">Debe</p>
                        <p className="text-[20px] font-bold tabular-nums text-[#FF7043] leading-none">{fmt(b.net)}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Minimum transactions */}
          {transactions.length > 0 && (
            <div className="px-5 pb-5 pt-4 border-t border-white/8 mt-4">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Para quedar a mano</p>
              <div className="space-y-2">
                {transactions.map((tx, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/4 rounded-xl px-3.5 py-2.5">
                    <span className="text-[15px]">{tx.fromEmoji}</span>
                    <span className="text-[12px] font-semibold text-white/70">{tx.from}</span>
                    <ArrowRight size={12} className="text-white/30 shrink-0" />
                    <span className="text-[15px]">{tx.toEmoji}</span>
                    <span className="text-[12px] font-semibold text-white/70">{tx.to}</span>
                    <span className="ml-auto text-[13px] font-bold text-[#FF7043] tabular-nums">{fmt(tx.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[12px] text-white/30">Total del viaje</p>
        <p className="text-[15px] font-bold text-[#FF7043] tabular-nums">{fmt(trip.costs.total)}</p>
      </div>
    </div>
  );
}
