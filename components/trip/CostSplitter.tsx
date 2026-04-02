"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Edit2, Check, ArrowRight } from "lucide-react";
import { useTripStore } from "@/stores/tripStore";
import { fmtCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

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
  { id: "transport",      label: "Transporte",      emoji: "✈️", color: "#1565C0" },
  { id: "accommodation",  label: "Alojamiento",      emoji: "🏨", color: "#6A1B9A" },
  { id: "food",           label: "Comida",           emoji: "🍽️", color: "#E65100" },
  { id: "activities",     label: "Actividades",      emoji: "🎭", color: "#2E7D32" },
  { id: "localTransport", label: "Transporte local", emoji: "🚇", color: "#00838F" },
  { id: "extras",         label: "Extras",           emoji: "🛍️", color: "#AD1457" },
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-[#E0D5C5] shadow-sm overflow-hidden"
      >
        <div className="px-5 pt-5 pb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold text-[#78909C] uppercase tracking-widest">Quiénes viajan</p>
            <span className="text-[11px] text-[#78909C] bg-[#F5F0E8] px-2.5 py-1 rounded-full font-semibold">
              {travelers_list.length} persona{travelers_list.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Traveler chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <AnimatePresence>
              {travelers_list.map(t => (
                <motion.div
                  key={t.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5 rounded-full border-2 pl-2 pr-1.5 py-1 text-[13px] font-semibold"
                  style={{ borderColor: t.color, color: t.color, background: t.color + "12" }}
                >
                  <span className="text-[16px] leading-none">{t.emoji}</span>
                  {editingId === t.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { renameTraveler(t.id, editName); setEditingId(null); } }}
                        autoFocus
                        className="bg-transparent border-b border-current w-20 focus:outline-none text-[13px]"
                      />
                      <button
                        onClick={() => { renameTraveler(t.id, editName); setEditingId(null); }}
                        className="opacity-70 hover:opacity-100 p-0.5 rounded-full"
                      >
                        <Check size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{t.name}</span>
                      <button
                        onClick={() => { setEditingId(t.id); setEditName(t.name); }}
                        className="opacity-40 hover:opacity-80 p-0.5 ml-0.5 rounded-full hover:bg-current/10"
                      >
                        <Edit2 size={11} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => removeTraveler(t.id)}
                    className="opacity-30 hover:opacity-70 p-0.5 rounded-full hover:bg-current/10"
                  >
                    <X size={11} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add traveler input */}
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Nombre del viajero..."
              className="flex-1 bg-[#F5F0E8] border border-[#E0D5C5] rounded-xl px-3.5 py-2.5 text-[13px] text-[#1A2332] placeholder-[#B0BEC5] focus:outline-none focus:border-[#1565C0] focus:bg-white transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="bg-[#1565C0] hover:bg-[#1976D2] disabled:opacity-30 rounded-xl px-4 py-2.5 text-white transition-colors flex items-center gap-1.5 font-semibold text-[13px]"
            >
              <Plus size={15} />
              Agregar
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Quién paga qué ── */}
      {travelers_list.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-[#E0D5C5] shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <p className="text-[11px] font-bold text-[#78909C] uppercase tracking-widest mb-0.5">Quién paga qué</p>
              <p className="text-[13px] font-semibold text-[#1A2332]">Asigna pagos por categoría</p>
            </div>
            <button
              onClick={setSplitEqualBetweenAll}
              className="text-[12px] font-semibold text-[#1565C0] hover:text-[#0D47A1] bg-[#E3F2FD] hover:bg-[#BBDEFB] px-3 py-1.5 rounded-full transition-colors"
            >
              Igualar todo
            </button>
          </div>

          <div className="divide-y divide-[#F5F0E8]">
            {CATEGORIES.map(({ id, label, emoji, color }) => {
              const a = getA(id);
              if (!a || a.amountClp === 0) return null;
              return (
                <div key={id} className="px-5 py-4">
                  {/* Category header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px]"
                        style={{ background: color + "18" }}
                      >
                        {emoji}
                      </div>
                      <p className="text-[14px] font-semibold text-[#1A2332]">{label}</p>
                    </div>
                    <p className="text-[15px] font-bold tabular-nums" style={{ color }}>{fmt(a.amountClp)}</p>
                  </div>

                  {/* Payer selector */}
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-[#B0BEC5] uppercase tracking-widest mb-1.5">Paga por adelantado</p>
                    <div className="flex flex-wrap gap-1.5">
                      {travelers_list.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setPayer(id, t.id)}
                          className={cn(
                            "flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border-2 transition-all",
                            a.paidBy === t.id
                              ? "text-white border-transparent"
                              : "bg-transparent text-[#78909C] border-[#E0D5C5] hover:border-current"
                          )}
                          style={a.paidBy === t.id
                            ? { background: t.color, borderColor: t.color }
                            : { color: t.color + "aa" }}
                        >
                          <span className="text-[14px] leading-none">{t.emoji}</span>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Split between */}
                  <div>
                    <p className="text-[10px] font-bold text-[#B0BEC5] uppercase tracking-widest mb-1.5">Dividir entre</p>
                    <div className="flex flex-wrap gap-1.5">
                      {travelers_list.map(t => {
                        const inc = a.splitBetween.includes(t.id);
                        const perPerson = inc && a.splitBetween.length > 0 ? fmt(a.amountClp / a.splitBetween.length) : null;
                        return (
                          <button
                            key={t.id}
                            onClick={() => toggleMember(id, t.id)}
                            className={cn(
                              "flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border-2 transition-all",
                              inc
                                ? "font-semibold"
                                : "bg-transparent text-[#B0BEC5] border-[#E0D5C5]"
                            )}
                            style={inc
                              ? { background: t.color + "15", borderColor: t.color, color: t.color }
                              : {}}
                          >
                            <span className="text-[14px] leading-none">{t.emoji}</span>
                            {t.name}
                            {perPerson && (
                              <span className="text-[10px] opacity-70 font-normal ml-0.5">{perPerson}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── 3. Resumen final ── */}
      {travelers_list.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-[#E0D5C5] shadow-sm overflow-hidden"
        >
          <div className="px-5 pt-5 pb-4">
            <p className="text-[11px] font-bold text-[#78909C] uppercase tracking-widest mb-1">Resumen final</p>
            <p className="text-[13px] font-semibold text-[#1A2332] mb-4">Balance por persona</p>

            <div className="space-y-3">
              {balances.map(b => {
                const isEven = Math.abs(b.net) < 100;
                const isCreditor = b.net > 0;
                return (
                  <motion.div
                    key={b.id}
                    layout
                    className="flex items-center gap-4 p-4 rounded-2xl border-2"
                    style={{
                      background: b.color + "08",
                      borderColor: b.color + "25",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-[22px] shrink-0 border-2"
                      style={{ background: b.color + "20", borderColor: b.color + "40" }}
                    >
                      {b.emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#1A2332]">{b.name}</p>
                      <p className="text-[11px] text-[#78909C] mt-0.5">
                        Pagó {fmt(b.totalPays)} · Le corresponde {fmt(b.totalOwes)}
                      </p>
                    </div>

                    {/* Net balance */}
                    <div className="text-right shrink-0">
                      {isEven ? (
                        <div className="flex items-center gap-1.5 bg-[#F5F5F5] border border-[#E0E0E0] rounded-full px-3 py-1.5">
                          <Check size={12} className="text-[#78909C]" />
                          <span className="text-[12px] font-semibold text-[#78909C]">A mano</span>
                        </div>
                      ) : isCreditor ? (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wide text-[#2E7D32] mb-0.5">Le deben</p>
                          <p className="text-[22px] font-bold tabular-nums text-[#2E7D32] leading-none">{fmt(b.net)}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wide text-[#E64A19] mb-0.5">Debe</p>
                          <p className="text-[22px] font-bold tabular-nums text-[#E64A19] leading-none">{fmt(b.net)}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Minimum transactions */}
          {transactions.length > 0 && (
            <div className="px-5 pb-5 pt-4 border-t border-[#F5F0E8]">
              <p className="text-[11px] font-bold text-[#78909C] uppercase tracking-widest mb-3">Para quedar a mano</p>
              <div className="space-y-2">
                <AnimatePresence>
                  {transactions.map((tx, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2.5 bg-[#FFF8E1] border border-[#FFE082] rounded-xl px-4 py-3"
                    >
                      <span className="text-[18px] leading-none">{tx.fromEmoji}</span>
                      <p className="text-[13px] font-semibold text-[#1A2332]">{tx.from}</p>
                      <div className="flex items-center gap-1 text-[#FF7043]">
                        <ArrowRight size={14} />
                      </div>
                      <span className="text-[18px] leading-none">{tx.toEmoji}</span>
                      <p className="text-[13px] font-semibold text-[#1A2332]">{tx.to}</p>
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="text-[14px] font-bold text-[#E65100] tabular-nums">{fmt(tx.amount)}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Total */}
      {costs && (
        <div className="flex items-center justify-between px-2 py-3 bg-white rounded-2xl border border-[#E0D5C5] shadow-sm px-5">
          <div>
            <p className="text-[11px] text-[#78909C] font-medium">Total del viaje</p>
            <p className="text-[11px] text-[#78909C]">{travelers_list.length} personas</p>
          </div>
          <div className="text-right">
            <p className="text-[22px] font-bold text-[#FF7043] tabular-nums">{fmt(costs.total)}</p>
            {travelers_list.length > 1 && (
              <p className="text-[11px] text-[#78909C] tabular-nums">{fmt(costs.total / travelers_list.length)}/persona</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
