"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeftIcon as ArrowLeft,
  DownloadIcon as Download,
  FileSpreadsheetIcon as FileSpreadsheet,
  ChevronDownIcon as ChevronDown,
  ChevronUpIcon as ChevronUp,
  MapPinIcon as MapPin,
  ClockIcon as Clock,
  UsersIcon as Users,
  ExternalLinkIcon as ExternalLink,
  ThumbsUpIcon as ThumbsUp,
  ThumbsDownIcon as ThumbsDown,
  LoaderIcon as Loader2,
} from "@/components/ui/AnimatedIcons";
import { useTripStore } from "@/stores/tripStore";
import { CostSummary } from "@/components/trip/CostSummary";
import { CategoryBreakdownPanel } from "@/components/trip/CategoryBreakdownPanel";
import type { CostCategory } from "@/components/trip/CategoryBreakdownPanel";
import { CostSplitter } from "@/components/trip/CostSplitter";
import { OptimizerTips } from "@/components/trip/OptimizerTips";
import { FlightCard } from "@/components/trip/FlightCard";
import { FlightStrategyBanner } from "@/components/trip/FlightStrategyBanner";
import { CurrencySelector } from "@/components/ui/CurrencySelector";
import { fmtCurrency } from "@/lib/currency";
import { ActivityDetailPanel, activityKey, INSURANCE_PER_PERSON } from "@/components/trip/ActivityDetailPanel";
import type { DayPlan, HotelRecommendation, FlightOption } from "@/types/trip";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US");
}

function HotelCard({ hotel, onSelect }: { hotel: HotelRecommendation; onSelect: () => void }) {
  const [open, setOpen] = useState(false);
  const { displayCurrency } = useTripStore();

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-[#2E7D32]/40 shadow-sm">
      {/* Selected header */}
      <div className="bg-[#2E7D32] px-5 py-2.5 flex items-center gap-2">
        <span className="text-[11px] font-bold text-white tracking-widest uppercase">✓ Hotel elegido</span>
        {hotel.rating && (
          <span className="ml-auto text-[10px] font-bold text-white/80 bg-white/15 px-2 py-0.5 rounded-full">
            {hotel.rating}/10
          </span>
        )}
      </div>

      {/* Main body */}
      <div className="bg-white">
        {/* Selection reason */}
        {hotel.selectionReason && (
          <div className="px-5 pt-4 pb-3 border-b border-[#F0EBE3]">
            <p className="text-[11px] font-bold text-[#1565C0] uppercase tracking-widest mb-1.5">Por qué este hotel</p>
            <p className="text-[13px] text-[#37474F] leading-relaxed">{hotel.selectionReason}</p>
          </div>
        )}

        {/* Key stats row */}
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#1A2332] leading-snug">{hotel.name}</p>
            <p className="text-[12px] text-[#78909C] mt-0.5">
              {"★".repeat(Math.max(0, hotel.stars ?? 0))}
              {hotel.rating ? ` · ${hotel.rating}/10` : ""}
              {(hotel as HotelRecommendation & { reviews?: number }).reviews
                ? ` · ${((hotel as HotelRecommendation & { reviews?: number }).reviews!).toLocaleString("en-US")} reseñas`
                : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[18px] font-bold text-[#FF7043] tabular-nums leading-none">
              {fmtCurrency(hotel.pricePerNightClp, displayCurrency)}
            </p>
            <p className="text-[10px] text-[#78909C] mt-0.5">/noche</p>
          </div>
        </div>

        {/* Expand for pros/cons */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 border-t border-[#F0EBE3] hover:bg-[#FAF8F4] transition-colors"
        >
          <span className="text-[12px] font-semibold text-[#78909C]">
            {open ? "Ocultar detalles" : "Ver detalles"}
          </span>
          {open ? <ChevronUp size={13} className="text-[#B0BEC5]" /> : <ChevronDown size={13} className="text-[#B0BEC5]" />}
        </button>

        {open && (
          <div className="px-5 pb-4 pt-3 border-t border-[#F0EBE3] grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-[#2E7D32] uppercase tracking-wide mb-2">A favor</p>
              {hotel.pros.map((p, i) => (
                <p key={i} className="text-[11px] text-[#37474F] flex items-start gap-1.5 mb-1">
                  <span className="text-[#2E7D32] shrink-0">✓</span>{p}
                </p>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#E64A19] uppercase tracking-wide mb-2">A considerar</p>
              {hotel.cons.map((c, i) => (
                <p key={i} className="text-[11px] text-[#37474F] flex items-start gap-1.5 mb-1">
                  <span className="text-[#E64A19] shrink-0">·</span>{c}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-5 pb-5 pt-2">
          <a
            href={hotel.bookingSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onSelect}
            className="w-full py-3 rounded-xl bg-[#1565C0] hover:bg-[#1976D2] text-white text-[13px] font-bold transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink size={14} />
            Ver disponibilidad en Google Hotels
          </a>
        </div>
      </div>
    </div>
  );
}

// FlightCard is now in components/trip/FlightCard.tsx

function DayCard({ day, flightSearchUrl, onOpenDetail, skipped }: {
  day: DayPlan;
  flightSearchUrl?: string;
  onOpenDetail: () => void;
  skipped: Set<string>;
}) {
  const [open, setOpen] = useState(day.dayNumber <= 2);
  const activities = [...(day.morning ?? []), ...(day.afternoon ?? [])];

  return (
    <div
      className="card border border-[#E3F2FD] overflow-hidden"
      style={{ animation: `fadeInUp 0.4s ease-out ${day.dayNumber * 0.05}s both` }}
    >
      <div className="flex items-center justify-between p-4 bg-ocean">
        {/* Left: expand/collapse */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 flex-1 text-left hover:opacity-90 transition-opacity"
        >
          <div className="bg-white/20 rounded-lg px-2.5 py-1 text-[12px] font-bold text-white">
            DÍA {day.dayNumber}
          </div>
          <div>
            <p className="font-semibold text-[14px] text-white">{day.date}</p>
            <p className="text-white/65 text-[11px] flex items-center gap-1">
              <MapPin size={9} />
              {day.city}
              {!day.isTravelDay && ` · ${day.theme}`}
            </p>
          </div>
          <div className="text-white/30 ml-2">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Right: cost calculator — opens detail panel */}
        <button
          onClick={onOpenDetail}
          className="text-right ml-3 shrink-0 group rounded-xl px-3 py-1.5 hover:bg-white/15 transition-colors"
          title="Ver desglose de actividades por costo"
        >
          <p className="text-white/50 text-[9px] uppercase font-bold tracking-wide group-hover:text-white/80 transition-colors">
            Costo día 🧮
          </p>
          <p className="text-[16px] font-bold text-white tabular-nums">{fmt(day.dayTotalClp)}</p>
        </button>
      </div>

      {open && (
        <div>
          {/* Travel day header badge */}
          {day.isTravelDay && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#FFF8E1] border-b border-[#FFE082]">
              <span className="text-[14px]">✈️</span>
              <p className="text-[11px] font-semibold text-[#F57F17]">Día de viaje — horarios estimados, confirma con tu vuelo real</p>
            </div>
          )}
          {/* All days (including travel days) show the activities list */}
          {(activities.length > 0 || day.lunch?.options?.[0] || day.dinner?.options?.[0]) ? (
            <div className="divide-y divide-[#F5F0E8]">
              {/* Activities */}
              {activities.map((act, i) => {
                const key = activityKey(day.dayNumber, act.name);
                const isSkipped = skipped.has(key);
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[#F5F0E8] transition-colors ${isSkipped ? "opacity-50 bg-[#F5F5F5]" : "hover:bg-[#FAF8F4]"}`}
                  >
                    <div className="min-w-[40px] text-center">
                      <p className="text-[10px] font-bold text-[#78909C] tabular-nums">{act.time}</p>
                      <span className="text-[20px]">{act.emoji ?? "📍"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold ${isSkipped ? "line-through text-[#90A4AE]" : "text-[#1A2332]"}`}>{act.name}</p>
                      {act.tip && !isSkipped && <p className="text-[11px] text-[#78909C] mt-0.5">{act.tip}</p>}
                      <p className="text-[11px] text-[#B0BEC5] flex items-center gap-1 mt-0.5">
                        <Clock size={9} /> {act.durationMin} min
                        {isSkipped && <span className="ml-2 text-[#90A4AE] font-semibold">· opcional</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {act.costClp > 0 ? (
                        <p className={`text-[12px] font-bold tabular-nums ${isSkipped ? "text-[#90A4AE] line-through" : "text-sunset"}`}>
                          {fmt(act.costClp)}
                        </p>
                      ) : (
                        <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                          Gratis
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Lunch */}
              {day.lunch?.options?.[0] && (
                <div className="flex items-start gap-3 px-4 py-3 border-b border-[#F5F0E8] bg-[#FBE9E7]/30">
                  <div className="min-w-[40px] text-center">
                    <p className="text-[10px] font-bold text-[#78909C]">13:00</p>
                    <span className="text-[20px]">🍽️</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#1A2332]">Almuerzo: {day.lunch.recommended}</p>
                    <p className="text-[11px] text-[#78909C]">{day.lunch.options[0].cuisine} · {day.lunch.options[0].priceTier}</p>
                    {day.lunch.options[0].why && (
                      <p className="text-[11px] text-[#FF7043] mt-0.5">⭐ {day.lunch.options[0].why}</p>
                    )}
                  </div>
                  <p className="text-[12px] font-bold text-sunset tabular-nums">{fmt(day.lunch.options[0].costClp)}</p>
                </div>
              )}

              {/* Dinner */}
              {day.dinner?.options?.[0] && (
                <div className="flex items-start gap-3 px-4 py-3 bg-[#E3F2FD]/30">
                  <div className="min-w-[40px] text-center">
                    <p className="text-[10px] font-bold text-[#78909C]">20:00</p>
                    <span className="text-[20px]">🌙</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#1A2332]">Cena: {day.dinner.recommended}</p>
                    <p className="text-[11px] text-[#78909C]">{day.dinner.options[0].cuisine} · {day.dinner.options[0].priceTier}</p>
                    {day.dinner.options[0].why && (
                      <p className="text-[11px] text-[#FF7043] mt-0.5">⭐ {day.dinner.options[0].why}</p>
                    )}
                  </div>
                  <p className="text-[12px] font-bold text-sunset tabular-nums">{fmt(day.dinner.options[0].costClp)}</p>
                </div>
              )}
            </div>
          ) : (
            /* Old travel-day cards with no activities */
            <div className="p-5 text-center text-[#78909C]">
              <span className="text-[28px]">✈️</span>
              <p className="text-[13px] mt-2">Día de viaje hacia {day.city}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type ExportTab = "itinerary" | "hotels" | "split" | "optimize";

export default function TripPage() {
  const { trip, selectFlight, displayCurrency } = useTripStore();
  const [activeTab, setActiveTab] = useState<ExportTab>("itinerary");
  const [isScrolled, setIsScrolled] = useState(false);
  const [tabPositions, setTabPositions] = useState<Record<string, { left: number; width: number }>>({});
  const [detailDay, setDetailDay] = useState<DayPlan | null>(null);
  const [breakdownCategory, setBreakdownCategory] = useState<CostCategory | null>(null);
  const [skippedActivities, setSkippedActivities] = useState<Set<string>>(new Set());
  const [includeInsurance, setIncludeInsurance] = useState(false);

  function toggleSkip(key: string) {
    setSkippedActivities(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  const [downloading, setDownloading] = useState<"sheet" | "pdf" | null>(null);
  const [hotelRecs, setHotelRecs] = useState<Record<string, HotelRecommendation[]>>(
    () => trip?.hotelRecommendations ?? {}
  );
  const [flightOpts, setFlightOpts] = useState<Record<string, FlightOption[]>>(
    () => {
      const pre = trip?.flightOptions ?? {};
      return Object.keys(pre).length > 0 ? pre : {};
    }
  );
  // selectedFlights: key="fromCity-toCity" → index of selected flight option
  const [selectedFlights, setSelectedFlights] = useState<Record<string, number>>(
    () => Object.fromEntries(
      (trip?.transportLegs ?? [])
        .filter(l => l.selectedFlightIndex != null)
        .map(l => [`${l.fromCity}-${l.toCity}`, l.selectedFlightIndex!])
    )
  );
  const [selectedHotels, setSelectedHotels] = useState<Record<string, number>>({});
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [loadingFlights, setLoadingFlights] = useState(false);
  const hotelsFetched = useRef(false);
  const flightsFetched = useRef(false);

  // ── Flights: skip if already pre-fetched during generation ─────────────────
  useEffect(() => {
    if (!trip || flightsFetched.current || trip.transportLegs.length === 0) return;
    const hasFlights = trip.transportLegs.every(l => (flightOpts[`${l.fromCity}-${l.toCity}`] ?? []).length > 0);
    if (hasFlights) { flightsFetched.current = true; return; }
    flightsFetched.current = true;
    setLoadingFlights(true);
    fetch("/api/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legs: trip.transportLegs.map(l => ({
          fromCity: l.fromCity, toCity: l.toCity,
          fromIata: l.fromIata, toIata: l.toIata, date: l.date,
        })),
        travelStyle: trip.travelStyle,
        adults: trip.travelers.adults,
      }),
    })
      .then(r => r.json())
      .then(data => { if (data.flightOptions) setFlightOpts(data.flightOptions); })
      .catch(() => {})
      .finally(() => setLoadingFlights(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]); // run once per trip

  // ── Hotels: start immediately on page load (fallback for trips without pre-fetched hotels) ──
  useEffect(() => {
    if (!trip || hotelsFetched.current) return;
    const hasRecs = trip.cities.every(c => (hotelRecs[c.name] ?? []).length > 0);
    if (hasRecs) return;
    hotelsFetched.current = true;
    setLoadingHotels(true);
    fetch("/api/hotels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cities: trip.cities.map(c => c.name), travelStyle: trip.travelStyle }),
    })
      .then(r => r.json())
      .then(data => { if (data.hotelRecommendations) setHotelRecs(data.hotelRecommendations); })
      .catch(() => {})
      .finally(() => setLoadingHotels(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);

  // ── Auto-select best flight (index 0) when options arrive ────────────────────
  useEffect(() => {
    if (!trip || Object.keys(flightOpts).length === 0) return;
    setSelectedFlights(prev => {
      const next = { ...prev };
      for (const leg of trip.transportLegs) {
        const key = `${leg.fromCity}-${leg.toCity}`;
        if (next[key] == null && (flightOpts[key] ?? []).length > 0) next[key] = 0;
      }
      return next;
    });
    trip.transportLegs.forEach(leg => {
      const key = `${leg.fromCity}-${leg.toCity}`;
      const best = flightOpts[key]?.[0];
      if (best) selectFlight(leg.fromCity, leg.toCity, 0, best.priceClp);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightOpts]);

  // ── Auto-select best hotel (index 0) when recommendations arrive ─────────────
  useEffect(() => {
    if (!trip || Object.keys(hotelRecs).length === 0) return;
    setSelectedHotels(prev => {
      const next = { ...prev };
      for (const city of trip.cities) {
        if (next[city.name] == null && (hotelRecs[city.name] ?? []).length > 0) next[city.name] = 0;
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelRecs]);

  // ── Scroll shadow ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Tab indicator positions ──────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const positions: Record<string, { left: number; width: number }> = {};
      (["hotels", "itinerary", "optimize", "split"] as ExportTab[]).forEach((id) => {
        const el = document.getElementById(`tab-${id}`);
        if (el) positions[id] = { left: el.offsetLeft, width: el.offsetWidth };
      });
      setTabPositions(positions);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!trip) {
    return (
      <div className="min-h-screen bg-linen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[48px] mb-4">🗺️</p>
          <p className="font-serif text-[22px] text-[#1A2332] mb-4">No hay viaje activo</p>
          <Link href="/planificar" className="btn btn-primary">Planificar un viaje</Link>
        </div>
      </div>
    );
  }

  async function downloadSheet() {
    if (!trip) return;
    setDownloading("sheet");
    try {
      const res = await fetch("/api/export/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trip),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tuviaje-${trip.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.xlsx`;
      a.click();
    } finally {
      setDownloading(null);
    }
  }

  async function downloadPDF() {
    if (!trip) return;
    setDownloading("pdf");
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip, displayCurrency }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tuviaje-${trip.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.pdf`;
      a.click();
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="min-h-screen bg-linen">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <motion.header
        className="bg-[#FAF8F4] sticky top-0 z-40 border-b border-[#E0D5C5]"
        animate={{
          boxShadow: isScrolled
            ? "0 4px 20px -2px rgba(26,35,50,0.12)"
            : "0 1px 0px 0 rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/planificar" className="text-[#78909C] hover:text-ocean transition-colors shrink-0">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="font-serif text-[14px] sm:text-[16px] font-bold text-[#1A2332] truncate">{trip.title}</p>
              <p className="text-[10px] sm:text-[11px] text-[#78909C] hidden sm:flex items-center gap-2">
                <span>{trip.startDate} · {trip.totalDays}d</span>
                <span>{trip.travelers.adults} adultos</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Currency selector */}
            <CurrencySelector />
            {/* Total pill */}
            {(() => {
              const insuranceCost = includeInsurance ? INSURANCE_PER_PERSON * trip.travelers.adults : 0;
              const effectiveTotal = trip.costs.total + insuranceCost;
              return (
                <div className="hidden sm:block bg-[#1565C0] rounded-full px-3 py-1 shadow-sm">
                  <span className="text-[13px] font-bold text-white tabular-nums">
                    {fmtCurrency(effectiveTotal, displayCurrency)}
                    {includeInsurance && <span className="text-white/60 text-[10px] ml-1">+ 🛡️</span>}
                  </span>
                </div>
              );
            })()}
            {/* Export buttons */}
            <button
              onClick={downloadSheet}
              disabled={!!downloading}
              className="btn btn-outline text-[13px] min-h-[38px] px-3 gap-1.5"
              title="Descargar Google Sheet"
            >
              <FileSpreadsheet size={15} className="text-[#2E7D32]" />
              <span className="hidden sm:inline">{downloading === "sheet" ? "Generando..." : "Google Sheet"}</span>
            </button>
            <button
              onClick={downloadPDF}
              disabled={!!downloading}
              className="bg-[#1565C0] hover:bg-[#1976D2] text-white text-[13px] font-semibold min-h-[38px] px-4 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download size={15} />
              <span className="hidden sm:inline">{downloading === "pdf" ? "Generando..." : "PDF"}</span>
            </button>
          </div>
        </div>

        {/* Tabs with animated sliding indicator */}
        <div className="max-w-6xl mx-auto px-2 sm:px-6 border-t border-[#E0D5C5] overflow-x-auto scrollbar-none relative">
          {/* Mobile scroll hint — fades out the right edge to signal more tabs */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-[#FAF8F4] to-transparent sm:hidden z-10" />
          <div className="relative flex min-w-max sm:min-w-0">
            {/* Sliding indicator */}
            {tabPositions[activeTab] && (
              <motion.div
                className="absolute bottom-0 h-[2px] bg-[#1565C0] rounded-full"
                initial={false}
                animate={{
                  left: tabPositions[activeTab].left,
                  width: tabPositions[activeTab].width,
                }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {([
              { id: "hotels",    label: "✈️ Vuelos & Hotels" },
              { id: "itinerary", label: "📅 Itinerario" },
              { id: "optimize",  label: "✨ Optimizar" },
              { id: "split",     label: "👥 Dividir" },
            ] as { id: ExportTab; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                id={`tab-${id}`}
                onClick={() => {
                  setActiveTab(id);
                  // Update indicator immediately after click
                  setTimeout(() => {
                    const positions: Record<string, { left: number; width: number }> = {};
                    (["hotels", "itinerary", "optimize", "split"] as ExportTab[]).forEach((tid) => {
                      const el = document.getElementById(`tab-${tid}`);
                      if (el) positions[tid] = { left: el.offsetLeft, width: el.offsetWidth };
                    });
                    setTabPositions(positions);
                  }, 0);
                }}
                className={`relative whitespace-nowrap px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                  activeTab === id
                    ? "text-[#1565C0]"
                    : "text-[#78909C] hover:text-[#37474F]"
                }`}
              >
                {label}
                {activeTab === id && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-[#1565C0]/6 rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.header>

      {/* ─── Content ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === "itinerary" && (
          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
            {/* Days */}
            <div className="space-y-3">
              {trip.days.map((day) => {
                const leg = trip.transportLegs.find((l) => l.toCity === day.city && day.isTravelDay);
                return (
                  <DayCard
                    key={day.dayNumber}
                    day={day}
                    flightSearchUrl={leg?.flightSearchUrl}
                    onOpenDetail={() => setDetailDay(day)}
                    skipped={skippedActivities}
                  />
                );
              })}
            </div>
            {/* Sidebar */}
            <div className="space-y-4">
              <CostSummary
                insuranceCost={includeInsurance ? INSURANCE_PER_PERSON * trip.travelers.adults : 0}
                onCategoryClick={setBreakdownCategory}
              />
              {/* Insurance toggle shortcut */}
              <div
                className={`card p-4 border-2 cursor-pointer transition-all ${
                  includeInsurance ? "border-[#1565C0] bg-[#E3F2FD]" : "border-[#E0D5C5] hover:border-[#1565C0]/30"
                }`}
                onClick={() => setIncludeInsurance(v => !v)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[22px]">🛡️</span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#1A2332]">Seguro de viaje</p>
                      <p className="text-[11px] text-[#78909C]">
                        {includeInsurance
                          ? `${fmtCurrency(INSURANCE_PER_PERSON * trip.travelers.adults, displayCurrency)} incluido`
                          : "Opcional · cancelaciones, médico, equipaje"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`relative rounded-full transition-colors shrink-0`}
                    style={{
                      width: "40px",
                      height: "22px",
                      background: includeInsurance ? "#1565C0" : "#B0BEC5",
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform"
                      style={{ transform: includeInsurance ? "translateX(20px)" : "translateX(2px)" }}
                    />
                  </div>
                </div>
              </div>
              {/* Quick flights */}
              {trip.transportLegs.length > 0 && (
                <div className="card p-5 border border-[#E3F2FD]">
                  <p className="section-label mb-3">Vuelos</p>
                  <div className="space-y-2">
                    {trip.transportLegs.map((leg, i) => (
                      <a
                        key={i}
                        href={leg.flightSearchUrl ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-[#F5F0E8] hover:bg-[#E3F2FD] transition-colors group"
                      >
                        <div>
                          <p className="text-[12px] font-semibold text-[#1A2332]">{leg.fromCity} → {leg.toCity}</p>
                          {leg.fromIata && leg.toIata && (
                            <p className="text-[10px] text-[#78909C] font-mono">{leg.fromIata} → {leg.toIata}</p>
                          )}
                        </div>
                        <ExternalLink size={13} className="text-ocean opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "hotels" && (
          <div className="max-w-3xl mx-auto space-y-8">

            {/* ── Flight strategy recommendation ── */}
            {trip.flightStrategy && (
              <FlightStrategyBanner strategy={trip.flightStrategy} />
            )}

            {/* ── Loading banner ── */}
            {(loadingFlights || loadingHotels) && (
              <div className="flex items-center gap-3 bg-[#E3F2FD] border border-[#90CAF9] rounded-2xl px-5 py-4">
                <Loader2 size={18} className="animate-spin text-ocean shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-[#1565C0]">
                    {loadingFlights && loadingHotels
                      ? "Buscando vuelos y hoteles con precios reales..."
                      : loadingFlights
                      ? "Buscando vuelos en Google Flights..."
                      : "Buscando hoteles disponibles en Booking..."}
                  </p>
                  <p className="text-[11px] text-[#1565C0]/70 mt-0.5">Esto puede tomar hasta 60 segundos</p>
                </div>
              </div>
            )}


            {/* ── Flight options per leg ── */}
            {trip.transportLegs.map((leg, i) => {
              const key = `${leg.fromCity}-${leg.toCity}`;
              const opts = flightOpts[key] ?? [];
              const selectedIdx = selectedFlights[key];
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-serif text-[22px] font-bold text-[#1A2332]">
                      ✈️ {leg.fromCity} → {leg.toCity}
                    </p>
                    <div className="flex items-center gap-2">
                      {leg.date && <p className="text-[12px] text-[#78909C]">📅 {leg.date}</p>}
                      {selectedIdx != null && (
                        <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                          ✓ Elegido
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] text-[#78909C] mb-4">
                    {opts.length > 0
                      ? "Mejor opción según precio y duración · Google Flights"
                      : loadingFlights
                      ? "Buscando en Google Flights..."
                      : "Precio en tiempo real en Google Flights"}
                  </p>

                  {loadingFlights && opts.length === 0 && (
                    <div className="flex items-center gap-3 text-[#78909C] py-3">
                      <Loader2 size={15} className="animate-spin" />
                      <span className="text-[13px]">
                        Abriendo Google Flights y analizando resultados{i > 0 ? ` (tramo ${i + 1})` : ""}...
                      </span>
                    </div>
                  )}

                  {opts.length > 0 && (() => {
                    const best = opts[0];
                    return (
                      <div className="space-y-2">
                        {/* Selection reason */}
                        {best.selectionReason && (
                          <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-xl px-4 py-3">
                            <p className="text-[11px] font-bold text-[#1565C0] uppercase tracking-widest mb-1">Por qué este vuelo</p>
                            <p className="text-[13px] text-[#37474F] leading-relaxed">{best.selectionReason}</p>
                          </div>
                        )}
                        <FlightCard
                          flight={best}
                          rank={0}
                          selected={selectedIdx === 0}
                          fromIata={leg.fromIata}
                          toIata={leg.toIata}
                          departureDate={leg.date}
                          onSelect={() => {
                            setSelectedFlights(prev => ({ ...prev, [key]: 0 }));
                            selectFlight(leg.fromCity, leg.toCity, 0, best.priceClp);
                          }}
                        />
                      </div>
                    );
                  })()}

                  {!loadingFlights && opts.length === 0 && (
                    <div className="rounded-xl border border-[#FFF3E0] bg-[#FFFDE7] px-4 py-4 space-y-3">
                      <p className="text-[13px] text-[#5D4037] leading-relaxed">
                        No encontramos vuelos disponibles para el{" "}
                        <span className="font-semibold">{leg.date}</span>. Las aerolíneas
                        generalmente publican sus itinerarios con hasta 10 meses de anticipación.
                        Probá con otras fechas.
                      </p>
                      <div className="flex flex-col gap-2">
                        <a
                          href="/planificar"
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ocean text-white text-[13px] font-semibold hover:bg-ocean-dark transition-all"
                        >
                          Cambiar fechas
                        </a>
                        <a
                          href={leg.flightSearchUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E3F2FD] text-[13px] font-semibold text-ocean hover:border-ocean transition-all"
                        >
                          <ExternalLink size={13} /> Buscar en Google Flights
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Hotel recommendations per city */}
            {trip.cities.map((city) => {
              const recs = hotelRecs[city.name] ?? [];
              if (recs.length === 0 && !loadingHotels) return null;
              return (
                <div key={city.name}>
                  <p className="font-serif text-[22px] font-bold text-[#1A2332] mb-1">🏨 {city.name}</p>
                  {loadingHotels && recs.length === 0 && (
                    <div className="flex items-center gap-2 text-[#78909C] py-3">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-[13px]">Buscando el mejor hotel disponible...</span>
                    </div>
                  )}
                  {recs[0] && (
                    <HotelCard
                      hotel={recs[0]}
                      onSelect={() => setSelectedHotels(prev => ({ ...prev, [city.name]: 0 }))}
                    />
                  )}
                </div>
              );
            })}

            {/* ── CTA: proceed to itinerary ── */}
            <div className="sticky bottom-6 pt-4">
              <button
                onClick={() => setActiveTab("itinerary")}
                className="w-full py-4 rounded-2xl text-[15px] font-bold bg-ocean text-white hover:bg-ocean-dark transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                📅 Ver mi itinerario →
              </button>
            </div>
          </div>
        )}

        {activeTab === "optimize" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <p className="font-serif text-[24px] font-bold text-[#1A2332] mb-1">
                Optimiza tu viaje ✨
              </p>
              <p className="text-[14px] text-[#78909C]">
                Análisis personalizado con IA para ahorrar dinero y vivir mejor el viaje.
              </p>
            </div>
            <OptimizerTips />
          </div>
        )}

        {activeTab === "split" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <p className="font-serif text-[24px] font-bold text-[#1A2332] mb-1">
                Dividir costos del viaje
              </p>
              <p className="text-[14px] text-[#78909C]">
                Agrega a todos los que viajan, asigna quién paga qué y ve exactamente cuánto debe cada uno.
              </p>
            </div>
            <CostSplitter />
            {/* Export from split tab */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={downloadSheet}
                disabled={!!downloading}
                className="btn btn-outline flex-1 gap-2 text-[14px]"
              >
                <FileSpreadsheet size={16} className="text-[#2E7D32]" />
                {downloading === "sheet" ? "Generando..." : "Exportar Google Sheet"}
              </button>
              <button
                onClick={downloadPDF}
                disabled={!!downloading}
                className="btn btn-accent flex-1 gap-2 text-[14px]"
              >
                <Download size={16} />
                {downloading === "pdf" ? "Generando..." : "Descargar PDF"}
              </button>
            </div>
            <p className="text-center text-[11px] text-[#B0BEC5] mt-3">
              El PDF incluye portada, presupuesto, itinerario y la tabla de quién le debe a quién
            </p>
          </div>
        )}
      </div>

      {/* Category breakdown panel */}
      <CategoryBreakdownPanel
        category={breakdownCategory}
        selectedHotels={selectedHotels}
        onClose={() => setBreakdownCategory(null)}
      />

      {/* Activity detail panel */}
      <ActivityDetailPanel
        day={detailDay}
        skipped={skippedActivities}
        onToggleSkip={toggleSkip}
        includeInsurance={includeInsurance}
        onToggleInsurance={() => setIncludeInsurance(v => !v)}
        onClose={() => setDetailDay(null)}
      />
    </div>
  );
}
