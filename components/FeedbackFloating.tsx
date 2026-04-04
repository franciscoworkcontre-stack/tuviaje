"use client";

import { useState } from "react";
import { FeedbackWidget } from "./FeedbackWidget";

export function FeedbackFloating() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating tab */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-ocean text-white text-[11px] font-bold uppercase tracking-widest px-2.5 py-3 rounded-l-xl shadow-lg hover:bg-ocean-dark transition-colors"
        style={{ writingMode: "vertical-rl", transform: "translateY(-50%) rotate(180deg)" }}
        aria-label="Dar feedback"
      >
        Feedback
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          style={{ animation: "fadeIn 0.15s ease-out both" }}
        />
      )}

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[320px] z-50 bg-white shadow-2xl flex flex-col"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.32,0.72,0,1)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0D5C5]">
          <div>
            <p className="text-[15px] font-semibold text-[#1A2332]">¿Qué te pareció?</p>
            <p className="text-[11px] text-[#78909C]">Tu opinión va directo al equipo</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#78909C] hover:bg-[#F5F0E8] hover:text-[#1A2332] transition-colors text-[18px]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Widget */}
        <div className="flex-1 px-5 py-6 overflow-y-auto">
          <FeedbackWidget source="landing" className="w-full" />
        </div>
      </div>
    </>
  );
}
