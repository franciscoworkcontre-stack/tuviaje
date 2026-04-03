"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTripStore } from "@/stores/tripStore";
import { fmtCurrency } from "@/lib/currency";

const CATEGORIES = [
  { key: "transport",      label: "✈️ Transporte entre ciudades" },
  { key: "accommodation",  label: "🏨 Alojamiento" },
  { key: "food",           label: "🍽️ Comida" },
  { key: "activities",     label: "🎭 Actividades" },
  { key: "localTransport", label: "🚇 Transporte local" },
  { key: "extras",         label: "🛍️ Extras" },
] as const;

interface CostSummaryProps {
  insuranceCost?: number; // CLP — 0 or undefined means not included
}

export function CostSummary({ insuranceCost = 0 }: CostSummaryProps) {
  const { trip, displayCurrency } = useTripStore();
  if (!trip) return null;
  const { costs } = trip;
  const fmt = (n: number) => fmtCurrency(n, displayCurrency);

  const effectiveTotal = costs.total + insuranceCost;
  const adults = trip.travelers.adults;

  return (
    <div className="card p-5 border border-[#E3F2FD]">
      <p className="section-label mb-4">Resumen de costos</p>
      <div className="space-y-2.5 mb-4">
        {CATEGORIES.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <p className="text-[13px] text-[#37474F]">{label}</p>
            <p className="text-[13px] font-semibold tabular-nums text-[#1A2332]">
              {fmt((costs as unknown as Record<string, number>)[key])}
            </p>
          </div>
        ))}

        {/* Insurance line — animated in/out */}
        <AnimatePresence>
          {insuranceCost > 0 && (
            <motion.div
              key="insurance"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between py-0.5">
                <p className="text-[13px] text-[#1565C0] font-semibold">🛡️ Seguro de viaje</p>
                <p className="text-[13px] font-semibold tabular-nums text-[#1565C0]">
                  {fmt(insuranceCost)}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-t border-[#E0D5C5] pt-3 flex items-center justify-between">
          <p className="font-semibold text-[14px] text-[#1A2332]">TOTAL</p>
          <motion.p
            key={effectiveTotal}
            initial={{ scale: 1.06, color: "#FF7043" }}
            animate={{ scale: 1, color: "#FF7043" }}
            transition={{ duration: 0.25 }}
            className="text-sunset text-[22px] font-bold tabular-nums"
          >
            {fmt(effectiveTotal)}
          </motion.p>
        </div>
      </div>
      <div className="bg-[#F5F0E8] rounded-xl p-3 text-[12px] text-[#78909C] space-y-0.5">
        <p>
          <span className="font-semibold text-[#1A2332]">Por persona:</span>{" "}
          {fmt(Math.round(effectiveTotal / adults))}
        </p>
        <p>
          <span className="font-semibold text-[#1A2332]">Por día/persona:</span>{" "}
          {fmt(Math.round(effectiveTotal / adults / trip.totalDays))}
        </p>
      </div>
    </div>
  );
}
