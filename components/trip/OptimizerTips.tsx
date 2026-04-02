"use client";

import { useState, useEffect } from "react";
import { useTripStore } from "@/stores/tripStore";
import { fmtCurrency } from "@/lib/currency";
import type { OptimizationTip } from "@/app/api/optimize/route";

const CATEGORY_COLORS: Record<OptimizationTip["category"], string> = {
  ahorro:      "#4CAF50",
  experiencia: "#FF7043",
  logistica:   "#42A5F5",
  comida:      "#FFA726",
  transporte:  "#AB47BC",
};

const CATEGORY_LABELS: Record<OptimizationTip["category"], string> = {
  ahorro:      "Ahorro",
  experiencia: "Tip secreto",
  logistica:   "Logística",
  comida:      "Comida",
  transporte:  "Transporte",
};

export function OptimizerTips() {
  const { trip, displayCurrency } = useTripStore();
  const [tips, setTips] = useState<OptimizationTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!trip || loaded) return;
    setLoading(true);
    fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip }),
    })
      .then(r => r.json())
      .then(d => {
        setTips(d.tips ?? []);
        setLoaded(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [trip, loaded]);

  if (!trip) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">Agente optimizador ✨</p>
          <p className="text-[13px] font-semibold text-white">Tips para mejorar tu viaje</p>
        </div>
        {loaded && !loading && (
          <button
            onClick={() => { setLoaded(false); setTips([]); }}
            className="text-[11px] text-ocean-light hover:text-white transition-colors font-semibold"
          >
            Regenerar
          </button>
        )}
      </div>

      {loading && (
        <div className="px-5 pb-6 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-ocean/40 border-t-ocean"
            style={{ animation: "spinner-orbit 0.8s linear infinite" }} />
          <p className="text-[13px] text-white/50">Analizando tu viaje...</p>
        </div>
      )}

      {error && (
        <div className="px-5 pb-5">
          <p className="text-[12px] text-white/40">No se pudo cargar el análisis. Intenta de nuevo.</p>
        </div>
      )}

      {!loading && tips.length > 0 && (
        <div className="px-5 pb-5 space-y-2.5">
          {tips.map((tip) => {
            const color = CATEGORY_COLORS[tip.category];
            return (
              <div
                key={tip.id}
                className="rounded-xl p-3.5 border"
                style={{ background: color + "12", borderColor: color + "30" }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-[20px] leading-none mt-0.5 shrink-0">{tip.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-[12px] font-bold text-white">{tip.title}</p>
                      <span
                        className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                        style={{ background: color + "25", color }}
                      >
                        {CATEGORY_LABELS[tip.category]}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60 leading-relaxed">{tip.detail}</p>
                    {tip.savingsClp && tip.savingsClp > 0 && (
                      <p className="text-[11px] font-bold mt-1.5" style={{ color: CATEGORY_COLORS.ahorro }}>
                        Ahorro estimado: {fmtCurrency(tip.savingsClp, displayCurrency)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && loaded && tips.length === 0 && (
        <div className="px-5 pb-5">
          <p className="text-[12px] text-white/40">No se encontraron tips para este viaje.</p>
        </div>
      )}
    </div>
  );
}
