"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fmtCurrency } from "@/lib/currency";
import { useTripStore } from "@/stores/tripStore";
import type { FlightStrategyRecommendation } from "@/types/trip";

const STRATEGY_META = {
  rt_hub_plus_regionals: {
    emoji: "🔄",
    label: "Ida/vuelta intercontinental + vuelos regionales",
    color: "#1565C0",
    bg: "#E3F2FD",
    border: "#90CAF9",
  },
  rt_direct: {
    emoji: "↔️",
    label: "Ticket ida/vuelta",
    color: "#2E7D32",
    bg: "#E8F5E9",
    border: "#A5D6A7",
  },
  all_one_way: {
    emoji: "✈️",
    label: "Tickets independientes por tramo",
    color: "#E65100",
    bg: "#FFF3E0",
    border: "#FFCC80",
  },
};

interface FlightStrategyBannerProps {
  strategy: FlightStrategyRecommendation;
}

export function FlightStrategyBanner({ strategy }: FlightStrategyBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const { displayCurrency } = useTripStore();
  const meta = STRATEGY_META[strategy.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 overflow-hidden"
      style={{ borderColor: meta.border, background: meta.bg }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px] shrink-0 mt-0.5"
              style={{ background: meta.color + "18" }}
            >
              {meta.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: meta.color + "20", color: meta.color }}
                >
                  Estrategia óptima detectada
                </span>
                {strategy.savingsClp && strategy.savingsClp > 0 && (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#2E7D32]/15 text-[#2E7D32]">
                    Ahorra {fmtCurrency(strategy.savingsClp, displayCurrency)}
                  </span>
                )}
              </div>
              <p className="text-[14px] font-bold text-[#1A2332] leading-snug">
                {meta.label}
              </p>
              <p className="text-[12px] text-[#37474F] mt-1 leading-relaxed">
                {strategy.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 border-t text-left transition-colors hover:bg-black/4"
        style={{ borderColor: meta.border }}
      >
        <span className="text-[12px] font-semibold" style={{ color: meta.color }}>
          {expanded ? "Ocultar análisis" : "Ver análisis completo y cómo comprar"}
        </span>
        {expanded
          ? <ChevronUp size={14} style={{ color: meta.color }} />
          : <ChevronDown size={14} style={{ color: meta.color }} />
        }
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pt-4 pb-5 border-t space-y-5"
              style={{ borderColor: meta.border }}
            >
              {/* Por qué */}
              {strategy.reasoning.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
                    style={{ color: meta.color }}>
                    Por qué esta estrategia
                  </p>
                  <ul className="space-y-1.5">
                    {strategy.reasoning.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-[#37474F]">
                        <span className="shrink-0 mt-0.5 font-bold" style={{ color: meta.color }}>✓</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cómo comprar */}
              {strategy.howToBuy.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
                    style={{ color: meta.color }}>
                    Cómo comprar paso a paso
                  </p>
                  <ol className="space-y-2">
                    {strategy.howToBuy.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span
                          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                          style={{ background: meta.color }}
                        >
                          {i + 1}
                        </span>
                        <p className="text-[12px] text-[#1A2332] leading-snug">
                          {step.replace(/^\d+\.\s*/, "")}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Connector leg note */}
              {strategy.connectorLeg && (
                <div
                  className="rounded-xl p-3.5 border"
                  style={{ background: "#FFF8E1", borderColor: "#FFE082" }}
                >
                  <p className="text-[11px] font-semibold text-[#F57F17] mb-1">
                    ⚠️ Vuelo conector necesario
                  </p>
                  <p className="text-[11px] text-[#37474F]">
                    Para tomar el vuelo de regreso desde {strategy.hubCity}, necesitas llegar ahí desde {strategy.connectorLeg.fromCity}.
                    Busca un vuelo {strategy.connectorLeg.fromIata} → {strategy.connectorLeg.toIata} para el {strategy.connectorLeg.approxDate} —
                    suelen costar poco dentro de {strategy.connectorLeg.toCity === strategy.hubCity ? "Europa" : "la región"}.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
