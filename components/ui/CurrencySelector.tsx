"use client";

import { useState, useRef, useEffect } from "react";
import { useTripStore } from "@/stores/tripStore";
import { CURRENCY_OPTIONS } from "@/lib/currency";

export function CurrencySelector() {
  const { displayCurrency, setDisplayCurrency } = useTripStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = CURRENCY_OPTIONS.find(o => o.value === displayCurrency) ?? CURRENCY_OPTIONS[0];

  return (
    <div ref={ref} className="relative flex flex-col items-end gap-0.5">
      {/* Hint label */}
      <p className="text-[9px] text-white/40 font-medium pr-0.5 hidden sm:block">¿Cambiar moneda?</p>

      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 bg-white/6 hover:bg-white/10 border border-white/12 hover:border-white/25 rounded-xl px-3 py-2 text-[12px] font-semibold text-white/80 transition-all"
      >
        <span>{selected.flag}</span>
        <span>{selected.value}</span>
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
          className="text-white/40" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-[#0D1F3C] border border-white/12 rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
          {CURRENCY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setDisplayCurrency(opt.value); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/8 transition-colors text-left"
            >
              <span className="text-[15px]">{opt.flag}</span>
              <div>
                <p className={`text-[12px] font-semibold ${opt.value === displayCurrency ? "text-ocean-light" : "text-white/80"}`}>
                  {opt.value}
                </p>
                <p className="text-[10px] text-white/35">{opt.label}</p>
              </div>
              {opt.value === displayCurrency && (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
                  className="text-ocean-light ml-auto">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}

          {/* Exchange rate source */}
          <div className="border-t border-white/8 px-3.5 py-2.5">
            <p className="text-[10px] text-white/30 leading-relaxed">
              Tipos de cambio aproximados.<br />
              Fuente: Google Finance · referencia mensual.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
