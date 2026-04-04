"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Shield } from "lucide-react";
import { useTripStore } from "@/stores/tripStore";
import { fmtCurrency } from "@/lib/currency";
import { useState } from "react";
import type { DayPlan, Activity } from "@/types/trip";

type FilterTab = "actividades" | "comidas" | "todo";

interface ActivityDetailPanelProps {
  day: DayPlan | null;
  skipped: Set<string>;
  onToggleSkip: (key: string) => void;
  includeInsurance: boolean;
  onToggleInsurance: () => void;
  onClose: () => void;
}

function activityKey(dayNumber: number, name: string) {
  return `${dayNumber}-${name}`;
}

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US");
}

const INSURANCE_PER_PERSON = 45_000; // ~$45 USD

export function ActivityDetailPanel({
  day,
  skipped,
  onToggleSkip,
  includeInsurance,
  onToggleInsurance,
  onClose,
}: ActivityDetailPanelProps) {
  const { displayCurrency, trip } = useTripStore();
  const adults = trip?.travelers.adults ?? 1;
  const [filter, setFilter] = useState<FilterTab>("actividades");

  const activities: Activity[] = day
    ? [...(day.morning ?? []), ...(day.afternoon ?? [])].sort((a, b) => b.costClp - a.costClp)
    : [];

  const meals = day
    ? [
        day.lunch?.options?.[0]
          ? { name: `Almuerzo: ${day.lunch.recommended}`, costClp: day.lunch.options[0].costClp, emoji: "🍽️", time: "13:00", durationMin: 60, category: "food", tip: day.lunch.options[0].cuisine } as Activity
          : null,
        day.dinner?.options?.[0]
          ? { name: `Cena: ${day.dinner.recommended}`, costClp: day.dinner.options[0].costClp, emoji: "🌙", time: "20:00", durationMin: 90, category: "food", tip: day.dinner.options[0].cuisine } as Activity
          : null,
      ].filter(Boolean).sort((a, b) => b!.costClp - a!.costClp) as Activity[]
    : [];

  const allActivities = filter === "actividades" ? activities
    : filter === "comidas" ? meals
    : [...activities, ...meals].sort((a, b) => b.costClp - a.costClp);

  const skippedSavings = activities
    .filter((a) => skipped.has(activityKey(day?.dayNumber ?? -1, a.name)))
    .reduce((s, a) => s + a.costClp, 0);

  const insuranceCost = INSURANCE_PER_PERSON * adults;

  return (
    <AnimatePresence>
      {day && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#FAF8F4] z-50 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#0D1F3C] px-5 py-4 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                    Día {day.dayNumber}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                    {day.city}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-[17px] font-bold text-white leading-tight">
                {day.theme || "Actividades del día"}
              </p>
              <p className="text-[12px] text-white/50 mt-0.5">
                Ordenadas de mayor a menor costo
              </p>

              {/* Filter tabs */}
              <div className="flex gap-1.5 mt-3">
                {(["actividades", "comidas", "todo"] as FilterTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all ${
                      filter === tab
                        ? "bg-white text-[#0D1F3C]"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    {tab === "actividades" ? `Actividades (${activities.length})` : tab === "comidas" ? `Comidas (${meals.length})` : "Todo"}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity list */}
            <div className="flex-1 overflow-y-auto">
              {allActivities.length === 0 && (
                <div className="p-6 text-center text-[#78909C]">
                  <span className="text-[32px]">✈️</span>
                  <p className="text-[13px] mt-2">Día de viaje — sin actividades programadas</p>
                </div>
              )}

              <div className="p-4 space-y-2">
                {allActivities.map((act) => {
                  const isMeal = act.category === "food";
                  const key = activityKey(day.dayNumber, act.name);
                  const isSkipped = !isMeal && skipped.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => !isMeal && onToggleSkip(key)}
                      className={`w-full text-left rounded-xl border-2 p-3.5 transition-all ${
                        isMeal
                          ? "border-[#FFE082] bg-[#FFFDE7] cursor-default"
                          : isSkipped
                            ? "border-[#B0BEC5] bg-[#ECEFF1] opacity-60"
                            : "border-[#E0D5C5] bg-white hover:border-[#1565C0]/40 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-[22px] leading-none mt-0.5 shrink-0">
                          {act.emoji ?? "📍"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`text-[13px] font-semibold leading-snug ${
                                isSkipped
                                  ? "line-through text-[#90A4AE]"
                                  : "text-[#1A2332]"
                              }`}
                            >
                              {act.name}
                            </p>
                            <div className="shrink-0 text-right">
                              {act.costClp > 0 ? (
                                <p
                                  className={`text-[13px] font-bold tabular-nums ${
                                    isSkipped ? "text-[#90A4AE] line-through" : "text-[#FF7043]"
                                  }`}
                                >
                                  {fmt(act.costClp)}
                                </p>
                              ) : (
                                <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                                  Gratis
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-[#78909C]">{act.time}</span>
                            <span className="text-[#B0BEC5] text-[10px]">·</span>
                            <span className="text-[10px] text-[#78909C]">{act.durationMin} min</span>
                          </div>
                          {act.tip && !isSkipped && (
                            <p className="text-[11px] text-[#546E7A] mt-1.5 leading-snug">
                              💡 {act.tip}
                            </p>
                          )}
                          {isSkipped && (
                            <p className="text-[10px] text-[#90A4AE] mt-1 font-semibold">
                              Marcada como opcional — toca para reactivar
                            </p>
                          )}
                          {isMeal && (
                            <p className="text-[10px] text-[#F9A825] mt-1 font-semibold">
                              Comida · costo estimado
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

              </div>

              {/* Insurance toggle */}
              <div className="mx-4 mb-4 rounded-xl border-2 p-4 transition-all"
                style={{
                  borderColor: includeInsurance ? "#1565C0" : "#E0D5C5",
                  background: includeInsurance ? "#E3F2FD" : "white",
                }}
              >
                <div className="flex items-start gap-3">
                  <Shield
                    size={20}
                    className={`mt-0.5 shrink-0 ${includeInsurance ? "text-[#1565C0]" : "text-[#B0BEC5]"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#1A2332]">
                        Seguro de viaje
                      </p>
                      {/* Toggle */}
                      <button
                        onClick={onToggleInsurance}
                        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
                          includeInsurance ? "bg-[#1565C0]" : "bg-[#B0BEC5]"
                        }`}
                        style={{ height: "22px", width: "40px" }}
                      >
                        <span
                          className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform"
                          style={{ transform: includeInsurance ? "translateX(20px)" : "translateX(2px)" }}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#546E7A] mt-1 leading-snug">
                      {includeInsurance
                        ? `Incluido · ${fmtCurrency(insuranceCost, displayCurrency)} para ${adults} adulto${adults > 1 ? "s" : ""}`
                        : "No incluido — recomendado para viajes internacionales"}
                    </p>
                    <p className="text-[10px] text-[#78909C] mt-0.5">
                      Cubre cancelaciones, médico, equipaje y demoras
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer: savings summary */}
            {skippedSavings > 0 && (
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-[#E8F5E9] border-t border-[#C8E6C9] px-5 py-4 shrink-0"
              >
                <p className="text-[11px] font-bold text-[#2E7D32] uppercase tracking-widest mb-0.5">
                  Ahorro si saltas estas actividades
                </p>
                <p className="text-[22px] font-bold text-[#2E7D32] tabular-nums">
                  {fmtCurrency(skippedSavings, displayCurrency)}
                </p>
                <p className="text-[11px] text-[#4CAF50] mt-0.5">
                  {skipped.size} actividad{skipped.size !== 1 ? "es" : ""} marcada{skipped.size !== 1 ? "s" : ""} como opcional
                </p>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { activityKey, INSURANCE_PER_PERSON };
