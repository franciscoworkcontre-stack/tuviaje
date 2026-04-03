"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTripStore } from "@/stores/tripStore";
import { fmtCurrency } from "@/lib/currency";
import { useState } from "react";
import type { Trip, ActivityCategory } from "@/types/trip";

export type CostCategory = "transport" | "accommodation" | "food" | "activities" | "localTransport" | "extras";

interface BreakdownItem {
  label: string;
  sublabel?: string;
  costClp: number;
  emoji?: string;
  badge?: string;
  activityCategory?: ActivityCategory;
}

const ACTIVITY_CATEGORY_META: Record<ActivityCategory, { label: string; emoji: string; color: string }> = {
  culture:       { label: "Cultura",        emoji: "🏛️", color: "#1565C0" },
  nature:        { label: "Naturaleza",     emoji: "🌿", color: "#2E7D32" },
  adventure:     { label: "Aventura",       emoji: "🧗", color: "#E65100" },
  food:          { label: "Gastronomía",    emoji: "🍜", color: "#F9A825" },
  nightlife:     { label: "Vida nocturna",  emoji: "🎭", color: "#6A1B9A" },
  shopping:      { label: "Compras",        emoji: "🛍️", color: "#AD1457" },
  wellness:      { label: "Bienestar",      emoji: "🧘", color: "#00838F" },
  entertainment: { label: "Entretenimiento",emoji: "🎪", color: "#558B2F" },
  transport:     { label: "Traslados",      emoji: "🚕", color: "#546E7A" },
};

function buildItems(trip: Trip, category: CostCategory, selectedHotels: Record<string, number>): BreakdownItem[] {
  switch (category) {
    case "activities": {
      const items: BreakdownItem[] = [];
      for (const day of trip.days) {
        for (const act of [...(day.morning ?? []), ...(day.afternoon ?? [])]) {
          if (act.costClp > 0) {
            items.push({
              label: act.name,
              sublabel: `Día ${day.dayNumber} · ${day.city} · ${act.time}`,
              costClp: act.costClp,
              emoji: act.emoji ?? "📍",
              badge: act.category,
              activityCategory: act.category as ActivityCategory,
            });
          }
        }
      }
      return items.sort((a, b) => b.costClp - a.costClp);
    }

    case "food": {
      const items: BreakdownItem[] = [];
      for (const day of trip.days) {
        const lunch = day.lunch?.options?.[0];
        if (lunch && lunch.costClp > 0) {
          items.push({
            label: `Almuerzo: ${day.lunch.recommended}`,
            sublabel: `Día ${day.dayNumber} · ${day.city} · ${lunch.cuisine}`,
            costClp: lunch.costClp,
            emoji: "🍽️",
            badge: lunch.priceTier,
          });
        }
        const dinner = day.dinner?.options?.[0];
        if (dinner && dinner.costClp > 0) {
          items.push({
            label: `Cena: ${day.dinner.recommended}`,
            sublabel: `Día ${day.dayNumber} · ${day.city} · ${dinner.cuisine}`,
            costClp: dinner.costClp,
            emoji: "🌙",
            badge: dinner.priceTier,
          });
        }
      }
      return items.sort((a, b) => b.costClp - a.costClp);
    }

    case "accommodation": {
      const items: BreakdownItem[] = [];
      for (const city of trip.cities) {
        const selectedIdx = selectedHotels[city.name];
        const recs = trip.hotelRecommendations?.[city.name] ?? [];
        const hotel = selectedIdx != null ? recs[selectedIdx] : recs[0];
        if (hotel) {
          items.push({
            label: hotel.name,
            sublabel: `${city.name} · ${hotel.neighborhood} · ${city.days} noche${city.days !== 1 ? "s" : ""}`,
            costClp: hotel.pricePerNightClp * city.days,
            emoji: "🏨",
            badge: `${hotel.stars}★`,
          });
        } else {
          const acc = trip.accommodations?.find(a => a.city === city.name);
          if (acc) {
            items.push({
              label: acc.name,
              sublabel: `${city.name} · ${acc.nights} noche${acc.nights !== 1 ? "s" : ""}`,
              costClp: acc.totalCost,
              emoji: "🏨",
            });
          }
        }
      }
      return items.sort((a, b) => b.costClp - a.costClp);
    }

    case "transport": {
      const items: BreakdownItem[] = [];
      for (const leg of trip.transportLegs) {
        const price = leg.selectedFlightPriceClp ?? leg.selected?.priceTotal ?? 0;
        if (price > 0) {
          items.push({
            label: `${leg.fromCity} → ${leg.toCity}`,
            sublabel: leg.fromIata && leg.toIata
              ? `${leg.fromIata} → ${leg.toIata}${leg.date ? ` · ${leg.date}` : ""}`
              : leg.date ?? "",
            costClp: price,
            emoji: "✈️",
            badge: leg.selected?.type ?? "vuelo",
          });
        }
      }
      return items.sort((a, b) => b.costClp - a.costClp);
    }

    case "localTransport":
      return trip.days
        .filter(d => d.localTransportCostClp > 0)
        .map(d => ({
          label: `Día ${d.dayNumber} — ${d.city}`,
          sublabel: d.isTravelDay ? "Día de viaje" : d.theme,
          costClp: d.localTransportCostClp,
          emoji: "🚇",
        }))
        .sort((a, b) => b.costClp - a.costClp);

    case "extras": {
      const perDay = trip.costs.extras > 0 ? Math.round(trip.costs.extras / trip.totalDays) : 0;
      if (perDay === 0) return [];
      return trip.days.map(d => ({
        label: `Día ${d.dayNumber} — ${d.city}`,
        sublabel: d.isTravelDay ? "Día de viaje" : d.theme,
        costClp: perDay,
        emoji: "🛍️",
      }));
    }

    default:
      return [];
  }
}

const CATEGORY_META: Record<CostCategory, { label: string; emoji: string; color: string }> = {
  transport:      { label: "Transporte entre ciudades", emoji: "✈️", color: "#1565C0" },
  accommodation:  { label: "Alojamiento",               emoji: "🏨", color: "#6A1B9A" },
  food:           { label: "Comida",                    emoji: "🍽️", color: "#E65100" },
  activities:     { label: "Actividades",               emoji: "🎭", color: "#2E7D32" },
  localTransport: { label: "Transporte local",          emoji: "🚇", color: "#00838F" },
  extras:         { label: "Extras",                    emoji: "🛍️", color: "#AD1457" },
};

interface CategoryBreakdownPanelProps {
  category: CostCategory | null;
  selectedHotels: Record<string, number>;
  onClose: () => void;
}

export function CategoryBreakdownPanel({ category, selectedHotels, onClose }: CategoryBreakdownPanelProps) {
  const { trip, displayCurrency } = useTripStore();
  const fmt = (n: number) => fmtCurrency(n, displayCurrency);
  const [actFilter, setActFilter] = useState<ActivityCategory | "all">("all");

  const allItems = trip && category ? buildItems(trip, category, selectedHotels) : [];
  const meta = category ? CATEGORY_META[category] : null;
  const categoryTotal = allItems.reduce((s, i) => s + i.costClp, 0);
  const tripTotal = trip?.costs.total ?? 1;
  const pct = Math.round((categoryTotal / tripTotal) * 100);

  // Sub-category breakdown for activities — sorted by total cost desc
  const activitySubTotals: { cat: ActivityCategory; total: number; count: number }[] = [];
  if (category === "activities") {
    const map = new Map<ActivityCategory, { total: number; count: number }>();
    for (const item of allItems) {
      if (!item.activityCategory) continue;
      const cur = map.get(item.activityCategory) ?? { total: 0, count: 0 };
      map.set(item.activityCategory, { total: cur.total + item.costClp, count: cur.count + 1 });
    }
    activitySubTotals.push(
      ...[...map.entries()]
        .map(([cat, { total, count }]) => ({ cat, total, count }))
        .sort((a, b) => b.total - a.total)
    );
  }

  const items = category === "activities" && actFilter !== "all"
    ? allItems.filter(i => i.activityCategory === actFilter)
    : allItems;

  return (
    <AnimatePresence>
      {category && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]"
            onClick={onClose}
          />

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
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-[28px] leading-none">{meta?.emoji}</span>
                  <div>
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Desglose</p>
                    <p className="text-[17px] font-bold text-white leading-tight">{meta?.label}</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[11px] text-white/40">Total categoría</p>
                  <p className="text-[20px] font-bold text-white tabular-nums leading-tight">{fmt(categoryTotal)}</p>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div>
                  <p className="text-[11px] text-white/40">Del total del viaje</p>
                  <p className="text-[20px] font-bold text-white tabular-nums leading-tight">{pct}%</p>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div>
                  <p className="text-[11px] text-white/40">Ítems</p>
                  <p className="text-[20px] font-bold text-white tabular-nums leading-tight">{items.length}</p>
                </div>
              </div>

              <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: meta?.color ?? "#1565C0" }}
                />
              </div>
              <p className="text-[10px] text-white/30 mt-1">
                {pct}% del presupuesto total · ordenado de mayor a menor costo
              </p>
            </div>

            {/* Activity sub-category summary + filter — only for activities */}
            {category === "activities" && activitySubTotals.length > 0 && (
              <div className="bg-[#F0EDE6] border-b border-[#E0D5C5] px-4 py-3 shrink-0">
                <p className="text-[10px] font-bold text-[#78909C] uppercase tracking-widest mb-2">
                  Por tipo de actividad
                </p>

                {/* Sub-category summary bars */}
                <div className="space-y-1.5 mb-3">
                  {activitySubTotals.map(({ cat, total, count }) => {
                    const subMeta = ACTIVITY_CATEGORY_META[cat];
                    const subPct = categoryTotal > 0 ? (total / categoryTotal) * 100 : 0;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActFilter(actFilter === cat ? "all" : cat)}
                        className={`w-full text-left rounded-lg px-2.5 py-1.5 transition-all ${
                          actFilter === cat
                            ? "bg-white shadow-sm"
                            : "hover:bg-white/60"
                        }`}
                        style={actFilter === cat ? { outline: `2px solid ${subMeta.color}` } : undefined}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] leading-none">{subMeta.emoji}</span>
                            <span className="text-[11px] font-semibold text-[#1A2332]">{subMeta.label}</span>
                            <span className="text-[10px] text-[#90A4AE]">({count})</span>
                          </div>
                          <span className="text-[11px] font-bold tabular-nums" style={{ color: subMeta.color }}>
                            {fmt(total)}
                          </span>
                        </div>
                        <div className="h-1 bg-[#E0D5C5] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${subPct}%` }}
                            transition={{ duration: 0.4 }}
                            className="h-full rounded-full"
                            style={{ background: subMeta.color }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active filter chip */}
                {actFilter !== "all" && (
                  <button
                    onClick={() => setActFilter("all")}
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: (ACTIVITY_CATEGORY_META[actFilter]?.color ?? "#1565C0") + "20",
                      color: ACTIVITY_CATEGORY_META[actFilter]?.color ?? "#1565C0",
                    }}
                  >
                    {ACTIVITY_CATEGORY_META[actFilter]?.emoji} {ACTIVITY_CATEGORY_META[actFilter]?.label}
                    <span className="ml-0.5 opacity-60">✕</span>
                  </button>
                )}
              </div>
            )}

            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items.length === 0 && (
                <div className="text-center py-10 text-[#78909C]">
                  <p className="text-[32px] mb-2">🔍</p>
                  <p className="text-[13px]">Sin datos detallados para esta categoría</p>
                </div>
              )}

              {items.map((item, i) => {
                const barPct = categoryTotal > 0 ? (item.costClp / categoryTotal) * 100 : 0;
                const subMeta = item.activityCategory ? ACTIVITY_CATEGORY_META[item.activityCategory] : null;
                const itemColor = subMeta?.color ?? meta?.color ?? "#1565C0";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white rounded-xl border border-[#E0D5C5] p-3.5 overflow-hidden"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <span className="text-[10px] font-bold text-[#B0BEC5]">#{i + 1}</span>
                        <span className="text-[20px] leading-none">{item.emoji ?? "📌"}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-semibold text-[#1A2332] leading-snug">{item.label}</p>
                          <p className="text-[13px] font-bold text-[#FF7043] tabular-nums shrink-0">{fmt(item.costClp)}</p>
                        </div>
                        {item.sublabel && (
                          <p className="text-[11px] text-[#78909C] mt-0.5">{item.sublabel}</p>
                        )}

                        {/* Activity sub-category badge */}
                        {subMeta && (
                          <span
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: itemColor + "15", color: itemColor }}
                          >
                            {subMeta.emoji} {subMeta.label}
                          </span>
                        )}
                        {!subMeta && item.badge && (
                          <span
                            className="mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: (meta?.color ?? "#1565C0") + "15", color: meta?.color ?? "#1565C0" }}
                          >
                            {item.badge}
                          </span>
                        )}

                        <div className="mt-2 h-1 bg-[#F5F0E8] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.4, delay: i * 0.03 + 0.1 }}
                            className="h-full rounded-full opacity-60"
                            style={{ background: itemColor }}
                          />
                        </div>
                        <p className="text-[9px] text-[#B0BEC5] mt-0.5">{Math.round(barPct)}% de esta categoría</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
