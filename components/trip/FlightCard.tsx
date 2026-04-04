"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, ChevronDown, ChevronUp, Check, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/stores/tripStore";
import { fmtCurrency } from "@/lib/currency";
import type { FlightOption } from "@/types/trip";

interface FlightCardProps {
  flight: FlightOption;
  rank: number;
  selected: boolean;
  onSelect: () => void;
  fromIata?: string;
  toIata?: string;
  departureDate?: string;
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ""}`;
}

function AirlineLogo({ airline }: { airline: string }) {
  const code = airline.toLowerCase();
  const emoji =
    code.includes("latam") ? "🔵" :
    code.includes("sky") ? "🟣" :
    code.includes("jetsmart") ? "🟠" :
    code.includes("aerolíneas") || code.includes("aerolineas") ? "🔷" :
    code.includes("copa") ? "🔹" :
    code.includes("avianca") ? "🔴" :
    code.includes("american") ? "🦅" :
    code.includes("united") ? "🌐" :
    code.includes("gol") ? "🟡" : "✈️";
  return <span className="text-[22px] leading-none">{emoji}</span>;
}

export function FlightCard({ flight, rank, selected, onSelect, fromIata, toIata, departureDate }: FlightCardProps) {
  const [open, setOpen] = React.useState(rank === 0);
  const { trip, displayCurrency } = useTripStore();
  const adults = trip?.travelers.adults ?? 1;
  const isTop = rank === 0;
  const perPerson = Math.round(flight.priceClp / adults);

  // Format date nicely
  const dateLabel = departureDate
    ? new Date(departureDate + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.06 }}
      className={cn(
        "w-full rounded-2xl border-2 overflow-hidden transition-all duration-300",
        selected
          ? "border-[#2E7D32] shadow-[0_0_0_3px_rgba(46,125,50,0.10)]"
          : isTop
          ? "border-[#1565C0]/50 shadow-md"
          : "border-[#E3F2FD]"
      )}
    >
      {/* Recommendation / Selected banner */}
      {(isTop && !selected) && (
        <div className="bg-[#1565C0] px-5 py-2 flex items-center gap-2">
          <span className="text-[11px] font-bold text-white tracking-widest uppercase">⭐ Recomendado</span>
          {flight.stops === 0 && (
            <span className="ml-auto text-[10px] text-blue-200 font-semibold bg-white/15 px-2 py-0.5 rounded-full">DIRECTO</span>
          )}
        </div>
      )}
      {selected && (
        <div className="bg-[#2E7D32] px-5 py-2 flex items-center gap-2">
          <Check size={13} className="text-white" />
          <span className="text-[11px] font-bold text-white tracking-widest uppercase">Vuelo elegido</span>
          <a
            href={flight.bookingSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-white bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full transition-colors"
          >
            <ExternalLink size={11} />
            Buscar en Google Flights
          </a>
        </div>
      )}

      {/* Main card body */}
      <div className={cn(
        "bg-[#0D1F3C]",
        selected ? "bg-[#0a1f10]" : ""
      )}>
        {/* Top section: click to expand */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full text-left px-5 py-4 hover:bg-white/4 transition-colors"
        >
          <div className="flex items-center gap-4">
            {/* Rank bubble */}
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0",
              selected ? "bg-[#2E7D32] text-white" : isTop ? "bg-[#1565C0] text-white" : "bg-white/10 text-white/50"
            )}>
              {selected ? <Check size={13} /> : rank + 1}
            </div>

            {/* Airline */}
            <div className="w-10 flex items-center justify-center shrink-0">
              <AirlineLogo airline={flight.airline} />
            </div>

            {/* Flight timeline */}
            <div className="flex-1 flex items-center gap-3 min-w-0">
              {/* Departure */}
              <div className="text-left shrink-0">
                <p className="text-[22px] font-bold text-white leading-none tabular-nums">{flight.departure}</p>
                {fromIata && <p className="text-[11px] text-white/40 font-mono mt-0.5">{fromIata}</p>}
              </div>

              {/* Timeline bar */}
              <div className="flex-1 min-w-0 px-1">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <p className="text-[11px] text-white/50">{formatDuration(flight.durationMin)}</p>
                </div>
                <div className="relative h-[2px] bg-white/15 rounded-full mx-2">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1565C0] to-[#42A5F5] rounded-full" />
                  {/* Plane icon traveling */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Plane size={12} className="text-white fill-white" />
                  </div>
                  {/* Stop dots */}
                  {flight.stops > 0 && Array.from({ length: flight.stops }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#FF7043] border-2 border-[#0D1F3C]"
                      style={{ left: `${((i + 1) / (flight.stops + 1)) * 100}%`, transform: "translate(-50%, -50%)" }}
                    />
                  ))}
                </div>
                <p className={cn(
                  "text-[10px] text-center mt-1 font-semibold",
                  flight.stops === 0 ? "text-[#42A5F5]" : "text-[#FF7043]"
                )}>
                  {flight.stops === 0 ? "Directo" : `${flight.stops} escala${flight.stops > 1 ? "s" : ""}`}
                </p>
              </div>

              {/* Arrival */}
              <div className="text-right shrink-0">
                <p className="text-[22px] font-bold text-white leading-none tabular-nums">{flight.arrival}</p>
                {toIata && <p className="text-[11px] text-white/40 font-mono mt-0.5">{toIata}</p>}
              </div>
            </div>

            {/* Price */}
            <div className="text-right shrink-0 ml-2">
              <p className="text-[20px] font-bold text-[#FF7043] tabular-nums leading-none">
                {fmtCurrency(flight.priceClp, displayCurrency)}
              </p>
              {adults > 1 && (
                <p className="text-[10px] text-white/35 mt-0.5 tabular-nums">
                  {fmtCurrency(perPerson, displayCurrency)}/persona
                </p>
              )}
              <p className="text-[9px] text-white/25 mt-0.5">total</p>
            </div>

            {/* Expand chevron */}
            <div className="text-white/30 shrink-0">
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {/* Metadata row: airline name + flight number + date */}
          <div className="flex items-center gap-3 mt-2 ml-11 flex-wrap">
            <span className="text-[11px] text-white/50 font-medium">{flight.airline}</span>
            {flight.flightNumber && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-[11px] font-mono text-white/40">{flight.flightNumber}</span>
              </>
            )}
            {dateLabel && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-[11px] text-white/40">{dateLabel}</span>
              </>
            )}
          </div>
        </button>

        {/* Expanded details */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 border-t border-white/8">
                {/* Pros / Cons */}
                {(flight.pros.length > 0 || flight.cons.length > 0) && (
                  <div className="grid grid-cols-2 gap-4 mb-4 pt-4">
                    {flight.pros.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#4CAF50] mb-2">A favor</p>
                        <ul className="space-y-1.5">
                          {flight.pros.map((p, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-white/60">
                              <span className="text-[#4CAF50] mt-0.5 shrink-0">✓</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {flight.cons.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#FF7043] mb-2">A considerar</p>
                        <ul className="space-y-1.5">
                          {flight.cons.map((c, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-white/60">
                              <span className="text-[#FF7043] mt-0.5 shrink-0">·</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  {!selected ? (
                    <button
                      onClick={onSelect}
                      className="flex-1 py-2.5 rounded-xl bg-[#1565C0] hover:bg-[#1976D2] text-white text-[13px] font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Plane size={14} className="fill-white" />
                      Elegir este vuelo
                    </button>
                  ) : (
                    <div className="flex-1 py-2.5 rounded-xl bg-[#2E7D32]/20 border border-[#2E7D32]/40 text-[#4CAF50] text-[13px] font-bold text-center flex items-center justify-center gap-2">
                      <Check size={14} />
                      Vuelo seleccionado
                    </div>
                  )}
                  <a
                    href={flight.bookingSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onSelect}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 text-white/70 hover:text-white text-[12px] font-semibold transition-colors"
                  >
                    <ExternalLink size={13} />
                    Buscar
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
