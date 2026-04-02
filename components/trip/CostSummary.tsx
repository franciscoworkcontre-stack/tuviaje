"use client";

import { useTripStore } from "@/stores/tripStore";

const CATEGORIES = [
  { key: "transport",      label: "✈️ Transporte entre ciudades" },
  { key: "accommodation",  label: "🏨 Alojamiento" },
  { key: "food",           label: "🍽️ Comida" },
  { key: "activities",     label: "🎭 Actividades" },
  { key: "localTransport", label: "🚇 Transporte local" },
  { key: "extras",         label: "🛍️ Extras y seguros" },
] as const;

function fmt(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

export function CostSummary() {
  const { trip } = useTripStore();
  if (!trip) return null;
  const { costs } = trip;

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
        <div className="border-t border-[#E0D5C5] pt-3 flex items-center justify-between">
          <p className="font-semibold text-[14px] text-[#1A2332]">TOTAL</p>
          <p className="text-sunset text-[22px] font-bold tabular-nums">{fmt(costs.total)}</p>
        </div>
      </div>
      <div className="bg-[#F5F0E8] rounded-xl p-3 text-[12px] text-[#78909C] space-y-0.5">
        <p><span className="font-semibold text-[#1A2332]">Por persona:</span> {fmt(costs.perPerson)}</p>
        <p><span className="font-semibold text-[#1A2332]">Por día/persona:</span> {fmt(costs.perDayPerPerson)}</p>
      </div>
    </div>
  );
}
