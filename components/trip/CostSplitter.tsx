"use client";

import { useState } from "react";
import { Plus, X, Edit2, Check } from "lucide-react";
import { useTripStore } from "@/stores/tripStore";
import type { TravelerBalance } from "@/types/trip";

function fmt(n: number) {
  return "$" + Math.abs(n).toLocaleString("es-CL");
}

function computeBalances(
  travelers: { id: string; name: string; emoji: string; color: string }[],
  assignments: { itemId: string; label: string; amountClp: number; paidBy: string; splitBetween: string[] }[]
): TravelerBalance[] {
  const paid: Record<string, number> = {};
  const owes: Record<string, number> = {};
  for (const t of travelers) { paid[t.id] = 0; owes[t.id] = 0; }

  for (const a of assignments) {
    paid[a.paidBy] = (paid[a.paidBy] ?? 0) + a.amountClp;
    const perPerson = a.splitBetween.length ? a.amountClp / a.splitBetween.length : 0;
    for (const id of a.splitBetween) {
      owes[id] = (owes[id] ?? 0) + perPerson;
    }
  }

  return travelers.map((t) => {
    const net = paid[t.id] - owes[t.id];
    return {
      travelerId: t.id,
      name: t.name,
      emoji: t.emoji,
      color: t.color,
      totalPays: paid[t.id],
      totalOwes: owes[t.id],
      netBalance: net,
      owesTo: [],
    };
  });
}

const CATEGORIES = [
  { id: "transport",      label: "✈️ Transporte" },
  { id: "accommodation",  label: "🏨 Alojamiento" },
  { id: "food",           label: "🍽️ Comida" },
  { id: "activities",     label: "🎭 Actividades" },
  { id: "localTransport", label: "🚇 Transporte local" },
  { id: "extras",         label: "🛍️ Extras" },
] as const;

export function CostSplitter() {
  const { trip, addTraveler, removeTraveler, renameTraveler, setSplitAssignment, setSplitEqualBetweenAll } =
    useTripStore();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (!trip) return null;

  const { travelers_list, splitAssignments, costs } = trip;

  // Init assignments if empty
  if (travelers_list.length >= 1 && splitAssignments.length === 0) {
    setTimeout(() => setSplitEqualBetweenAll(), 0);
  }

  const balances = computeBalances(travelers_list, splitAssignments);

  function handleAddTraveler() {
    const name = newName.trim();
    if (!name) return;
    addTraveler(name);
    setNewName("");
    setTimeout(() => setSplitEqualBetweenAll(), 50);
  }

  function getAssignment(catId: string) {
    return splitAssignments.find((a) => a.itemId === catId);
  }

  function setPayer(catId: string, travelerId: string) {
    const a = getAssignment(catId);
    if (!a) return;
    setSplitAssignment({ ...a, paidBy: travelerId });
  }

  function toggleSplitMember(catId: string, travelerId: string) {
    const a = getAssignment(catId);
    if (!a) return;
    const already = a.splitBetween.includes(travelerId);
    setSplitAssignment({
      ...a,
      splitBetween: already
        ? a.splitBetween.filter((id) => id !== travelerId)
        : [...a.splitBetween, travelerId],
    });
  }

  return (
    <div className="space-y-6">
      {/* Who's traveling */}
      <div className="card p-5 border border-[#E3F2FD]">
        <p className="section-label mb-4">¿Quiénes viajan?</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {travelers_list.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 border text-[13px] font-medium"
              style={{ backgroundColor: t.color + "18", borderColor: t.color + "40", color: t.color }}
            >
              <span>{t.emoji}</span>
              {editingId === t.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { renameTraveler(t.id, editName); setEditingId(null); }
                    }}
                    autoFocus
                    className="bg-transparent border-b border-current w-20 focus:outline-none text-[13px]"
                  />
                  <button onClick={() => { renameTraveler(t.id, editName); setEditingId(null); }}>
                    <Check size={12} />
                  </button>
                </>
              ) : (
                <>
                  <span>{t.name}</span>
                  <button onClick={() => { setEditingId(t.id); setEditName(t.name); }} className="opacity-50 hover:opacity-100">
                    <Edit2 size={11} />
                  </button>
                </>
              )}
              <button onClick={() => removeTraveler(t.id)} className="opacity-40 hover:opacity-80">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTraveler()}
            placeholder="Nombre (ej: María, Tu esposa...)"
            className="flex-1 border border-[#E0D5C5] rounded-xl px-3 py-2 text-[13px] text-[#1A2332] placeholder-[#B0BEC5] focus:outline-none focus:border-ocean/50"
          />
          <button
            onClick={handleAddTraveler}
            className="btn btn-primary px-4 min-h-[40px] text-[13px]"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
      </div>

      {/* Per-category split */}
      {travelers_list.length >= 2 && (
        <div className="card p-5 border border-[#E3F2FD]">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">¿Quién paga qué?</p>
            <button
              onClick={setSplitEqualBetweenAll}
              className="text-[11px] font-semibold text-ocean hover:underline"
            >
              Dividir todo en partes iguales
            </button>
          </div>

          <div className="space-y-4">
            {CATEGORIES.map(({ id, label }) => {
              const a = getAssignment(id);
              if (!a || a.amountClp === 0) return null;
              return (
                <div key={id} className="border border-[#F5F0E8] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[14px] font-semibold text-[#1A2332]">{label}</p>
                    <p className="text-[14px] font-bold text-sunset tabular-nums">{fmt(a.amountClp)}</p>
                  </div>
                  {/* Who pays upfront */}
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#78909C] mb-2">
                      ¿Quién paga por adelantado?
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {travelers_list.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setPayer(id, t.id)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                            a.paidBy === t.id
                              ? "text-white border-transparent"
                              : "border-[#E0D5C5] text-[#78909C] hover:border-[#B0BEC5]"
                          }`}
                          style={a.paidBy === t.id ? { backgroundColor: t.color, borderColor: t.color } : {}}
                        >
                          {t.emoji} {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Split between */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#78909C] mb-2">
                      Dividir entre
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {travelers_list.map((t) => {
                        const included = a.splitBetween.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() => toggleSplitMember(id, t.id)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                              included
                                ? "font-semibold text-white border-transparent"
                                : "border-[#E0D5C5] text-[#B0BEC5]"
                            }`}
                            style={included ? { backgroundColor: t.color + "CC", borderColor: t.color } : {}}
                          >
                            {t.emoji} {t.name} {included && a.splitBetween.length > 0 && `(${fmt(a.amountClp / a.splitBetween.length)})`}
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

      {/* Balances */}
      {travelers_list.length >= 2 && (
        <div className="card p-5 border border-[#E3F2FD]">
          <p className="section-label mb-4">Resumen final — ¿quién le debe a quién?</p>
          <div className="space-y-3">
            {balances.map((b) => (
              <div
                key={b.travelerId}
                className="flex items-center gap-4 p-4 rounded-xl border"
                style={{ backgroundColor: b.color + "0A", borderColor: b.color + "25" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[20px] shrink-0"
                  style={{ backgroundColor: b.color + "20" }}
                >
                  {b.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1A2332]">{b.name}</p>
                  <p className="text-[12px] text-[#78909C]">
                    Paga {fmt(b.totalPays)} · Le corresponde {fmt(b.totalOwes)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {b.netBalance >= 0 ? (
                    <div>
                      <p className="text-[12px] font-bold text-[#2E7D32]">Le deben</p>
                      <p className="text-[18px] font-bold tabular-nums text-[#2E7D32]">{fmt(b.netBalance)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[12px] font-bold text-[#E64A19]">Debe</p>
                      <p className="text-[18px] font-bold tabular-nums text-[#E64A19]">{fmt(b.netBalance)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
