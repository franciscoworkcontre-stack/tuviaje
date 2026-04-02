"use client";

import { useState, useEffect } from "react";
import { useTripStore } from "@/stores/tripStore";
import { fmtCurrency } from "@/lib/currency";
import type { OptimizationTip } from "@/app/api/optimize/route";

const CATEGORY_CONFIG: Record<OptimizationTip["category"], { label: string; bg: string; text: string; border: string }> = {
  ahorro:      { label: "Ahorro",      bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" },
  experiencia: { label: "Tip secreto", bg: "#FFF3E0", text: "#E65100", border: "#FFCC80" },
  logistica:   { label: "Logística",   bg: "#E3F2FD", text: "#1565C0", border: "#90CAF9" },
  comida:      { label: "Comida",      bg: "#FFF8E1", text: "#F57F17", border: "#FFE082" },
  transporte:  { label: "Transporte",  bg: "#F3E5F5", text: "#6A1B9A", border: "#CE93D8" },
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
    setError(false);
    fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(d => {
        setTips(d.tips ?? []);
        setLoaded(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [trip, loaded]);

  if (!trip) return null;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="card p-5 border border-[#E3F2FD] bg-gradient-to-br from-[#E3F2FD] to-[#F5F0E8]">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-label mb-1">Agente optimizador IA</p>
            <p className="font-serif text-[18px] font-bold text-[#1A2332]">
              Tips personalizados para este viaje
            </p>
            <p className="text-[13px] text-[#78909C] mt-1">
              Análisis de {trip.cities.length} ciudad{trip.cities.length !== 1 ? "es" : ""} · {trip.totalDays} días · estilo {trip.travelStyle}
            </p>
          </div>
          <span className="text-[40px]">✨</span>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card p-8 flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-[3px] border-[#E3F2FD] border-t-ocean"
            style={{ animation: "spinner-orbit 0.9s linear infinite" }}
          />
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#1A2332]">Analizando tu viaje...</p>
            <p className="text-[12px] text-[#78909C] mt-1">Claude está revisando {trip.totalDays} días de itinerario</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="card p-5 border border-[#FFCDD2] bg-[#FFF5F5]">
          <p className="text-[13px] font-semibold text-[#C62828] mb-1">No se pudo cargar el análisis</p>
          <p className="text-[12px] text-[#78909C] mb-3">Error al conectar con el agente optimizador.</p>
          <button
            onClick={() => { setError(false); setLoaded(false); }}
            className="text-[12px] font-semibold text-ocean hover:text-ocean-dark transition-colors"
          >
            Reintentar →
          </button>
        </div>
      )}

      {/* Tips */}
      {!loading && tips.length > 0 && (
        <>
          <div className="space-y-3">
            {tips.map((tip, i) => {
              const cfg = CATEGORY_CONFIG[tip.category] ?? CATEGORY_CONFIG.logistica;
              return (
                <div
                  key={tip.id}
                  className="card p-4 border"
                  style={{ background: cfg.bg, borderColor: cfg.border }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-[24px] leading-none mt-0.5 shrink-0">{tip.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: cfg.text + "18", color: cfg.text }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-[#B0BEC5]">#{i + 1}</span>
                      </div>
                      <p className="text-[13px] font-bold text-[#1A2332] mb-1">{tip.title}</p>
                      <p className="text-[12px] text-[#37474F] leading-relaxed">{tip.detail}</p>
                      {tip.savingsClp != null && tip.savingsClp > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1.5 bg-[#E8F5E9] border border-[#A5D6A7] rounded-full px-2.5 py-1">
                          <span className="text-[10px]">💰</span>
                          <span className="text-[11px] font-bold text-[#2E7D32]">
                            Ahorro estimado: {fmtCurrency(tip.savingsClp, displayCurrency)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Regenerate */}
          <button
            onClick={() => { setLoaded(false); setTips([]); }}
            className="w-full py-3 rounded-xl border border-[#E0D5C5] hover:border-ocean text-[13px] font-semibold text-[#78909C] hover:text-ocean transition-all"
          >
            Regenerar análisis
          </button>
        </>
      )}

      {!loading && !error && loaded && tips.length === 0 && (
        <div className="card p-5 text-center">
          <p className="text-[13px] text-[#78909C]">No se encontraron tips específicos para este viaje.</p>
          <button
            onClick={() => setLoaded(false)}
            className="mt-2 text-[12px] font-semibold text-ocean hover:text-ocean-dark"
          >
            Intentar de nuevo →
          </button>
        </div>
      )}
    </div>
  );
}
