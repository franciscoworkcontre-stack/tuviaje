"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InfoTooltipProps {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  width?: string;
}

export function InfoTooltip({ content, position = "top", width = "w-52" }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);

  const posClass =
    position === "top"    ? "bottom-full mb-2 left-1/2 -translate-x-1/2" :
    position === "bottom" ? "top-full mt-2 left-1/2 -translate-x-1/2" :
    position === "left"   ? "right-full mr-2 top-1/2 -translate-y-1/2" :
                            "left-full ml-2 top-1/2 -translate-y-1/2";

  return (
    <div className="relative inline-flex shrink-0">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(v => !v)}
        className="w-4 h-4 rounded-full bg-[#B0BEC5]/25 hover:bg-[#1565C0]/20 flex items-center justify-center text-[9px] font-bold text-[#78909C] hover:text-[#1565C0] transition-colors"
        aria-label="Más información"
      >
        ?
      </button>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-50 ${width} bg-[#1A2332] text-white text-[11px] leading-relaxed px-3 py-2.5 rounded-xl shadow-2xl pointer-events-none ${posClass}`}
          >
            {content}
            {/* Arrow */}
            <div className={`absolute w-2 h-2 bg-[#1A2332] rotate-45 ${
              position === "top"    ? "top-full -mt-1 left-1/2 -translate-x-1/2" :
              position === "bottom" ? "bottom-full -mb-1 left-1/2 -translate-x-1/2" :
              position === "left"   ? "left-full -ml-1 top-1/2 -translate-y-1/2" :
                                      "right-full -mr-1 top-1/2 -translate-y-1/2"
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
