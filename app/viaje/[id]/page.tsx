"use client";

import { useState, useEffect, useRef } from "react";
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
import { CostSplitter } from "@/components/trip/CostSplitter";
import type { DayPlan, HotelRecommendation, FlightOption } from "@/types/trip";

function fmt(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

function HotelCard({
  hotel, rank, selected, onSelect,
}: {
  hotel: HotelRecommendation;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState(rank === 0);
  const isTop = rank === 0;

  return (
    <div className={`rounded-xl overflow-hidden border-2 transition-all duration-200 ${
      selected ? "border-[#2E7D32] shadow-[0_0_0_3px_rgba(46,125,50,0.12)]" : isTop ? "border-ocean/40" : "border-[#E3F2FD]"
    }`}>
      {/* Recommended banner */}
      {isTop && !selected && (
        <div className="bg-ocean px-4 py-1.5 flex items-center gap-2">
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">⭐ Recomendado · Mejor relación calidad/precio</span>
        </div>
      )}
      {selected && (
        <div className="bg-[#2E7D32] px-4 py-1.5 flex items-center gap-2">
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">✓ Seleccionado</span>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          selected ? "bg-[#F1F8E9]" : isTop ? "bg-[#E3F2FD]/40 hover:bg-[#E3F2FD]/70" : "bg-white hover:bg-[#F5F0E8]/40"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
            selected ? "bg-[#2E7D32] text-white" : isTop ? "bg-ocean text-white" : "bg-[#F5F0E8] text-[#78909C]"
          }`}>
            {selected ? "✓" : rank + 1}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#1A2332] truncate">{hotel.name}</p>
            <p className="text-[11px] text-[#78909C]">
              {"★".repeat(Math.max(0, hotel.stars ?? 0))} · {hotel.neighborhood}
              {hotel.rating ? ` · ${hotel.rating}/10` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <p className="text-[13px] font-bold text-sunset tabular-nums">
            {fmt(hotel.pricePerNightClp)}<span className="text-[10px] text-[#78909C] font-normal">/noche</span>
          </p>
          {open ? <ChevronUp size={14} className="text-[#B0BEC5]" /> : <ChevronDown size={14} className="text-[#B0BEC5]" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 bg-[#FAFAFA] border-t border-[#F0EBE3]">
          <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
            <div>
              <p className="text-[10px] font-bold text-[#2E7D32] flex items-center gap-1 mb-1.5 uppercase tracking-wide">
                <ThumbsUp size={10} /> A favor
              </p>
              {hotel.pros.map((pro, i) => (
                <p key={i} className="text-[11px] text-[#37474F] flex items-start gap-1.5 mb-1">
                  <span className="text-[#2E7D32] mt-0.5 shrink-0">✓</span>{pro}
                </p>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#E64A19] flex items-center gap-1 mb-1.5 uppercase tracking-wide">
                <ThumbsDown size={10} /> A tener en cuenta
              </p>
              {hotel.cons.map((con, i) => (
                <p key={i} className="text-[11px] text-[#37474F] flex items-start gap-1.5 mb-1">
                  <span className="text-[#E64A19] mt-0.5 shrink-0">·</span>{con}
                </p>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {!selected ? (
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                className="flex-1 py-2 rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-[12px] font-semibold transition-colors"
              >
                ✓ Elegir este hotel
              </button>
            ) : (
              <div className="flex-1 py-2 rounded-lg bg-[#E8F5E9] text-[#2E7D32] text-[12px] font-semibold text-center">
                ✓ Hotel seleccionado
              </div>
            )}
            <a
              href={hotel.bookingSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onSelect}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#003580] hover:bg-[#00267a] text-white text-[12px] font-semibold transition-colors"
            >
              <ExternalLink size={12} />
              Booking
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function FlightCard({
  flight, rank, selected, onSelect,
}: {
  flight: FlightOption;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState(rank === 0);
  const hrs = Math.floor(flight.durationMin / 60);
  const mins = flight.durationMin % 60;

  const isTop = rank === 0;

  return (
    <div className={`rounded-xl overflow-hidden border-2 transition-all duration-200 ${
      selected ? "border-[#2E7D32] shadow-[0_0_0_3px_rgba(46,125,50,0.12)]" : isTop ? "border-ocean/40" : "border-[#E3F2FD]"
    }`}>
      {/* Recommended / selected banner */}
      {isTop && !selected && (
        <div className="bg-ocean px-4 py-1.5">
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">⭐ Recomendado · Más barato y rápido</span>
        </div>
      )}
      {selected && (
        <div className="bg-[#2E7D32] px-4 py-1.5">
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">✓ Seleccionado</span>
        </div>
      )}
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          selected ? "bg-[#F1F8E9]" : isTop ? "bg-[#E3F2FD]/40 hover:bg-[#E3F2FD]/70" : "bg-white hover:bg-[#F5F0E8]/40"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Rank / selected indicator */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
            selected ? "bg-[#2E7D32] text-white" : rank === 0 ? "bg-ocean text-white" : "bg-[#F5F0E8] text-[#78909C]"
          }`}>
            {selected ? "✓" : rank + 1}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-[#1A2332] truncate">
                {flight.airline} {flight.flightNumber ?? ""}
              </p>
              {selected && (
                <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-1.5 py-0.5 rounded-full shrink-0">
                  Seleccionado
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#78909C]">
              {flight.departure} → {flight.arrival} · {hrs}h{mins > 0 ? ` ${mins}m` : ""}
              {flight.stops === 0 ? " · directo" : ` · ${flight.stops} escala`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <p className="text-[13px] font-bold text-sunset tabular-nums">
            {fmt(flight.priceClp)}<span className="text-[10px] text-[#78909C] font-normal">/total</span>
          </p>
          {open ? <ChevronUp size={14} className="text-[#B0BEC5]" /> : <ChevronDown size={14} className="text-[#B0BEC5]" />}
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-4 pb-4 bg-[#FAFAFA] border-t border-[#F0EBE3]">
          <div className="grid grid-cols-2 gap-3 mt-3 mb-3">
            <div>
              <p className="text-[10px] font-bold text-[#2E7D32] flex items-center gap-1 mb-1.5 uppercase tracking-wide">
                <ThumbsUp size={10} /> A favor
              </p>
              {flight.pros.map((pro, i) => (
                <p key={i} className="text-[11px] text-[#37474F] flex items-start gap-1.5 mb-1">
                  <span className="text-[#2E7D32] mt-0.5 shrink-0">✓</span>{pro}
                </p>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#E64A19] flex items-center gap-1 mb-1.5 uppercase tracking-wide">
                <ThumbsDown size={10} /> A tener en cuenta
              </p>
              {flight.cons.map((con, i) => (
                <p key={i} className="text-[11px] text-[#37474F] flex items-start gap-1.5 mb-1">
                  <span className="text-[#E64A19] mt-0.5 shrink-0">·</span>{con}
                </p>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {/* Select this flight */}
            {!selected ? (
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                className="flex-1 py-2 rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-[12px] font-semibold transition-colors"
              >
                ✓ Elegir este vuelo
              </button>
            ) : (
              <div className="flex-1 py-2 rounded-lg bg-[#E8F5E9] text-[#2E7D32] text-[12px] font-semibold text-center">
                ✓ Vuelo seleccionado
              </div>
            )}
            {/* Book link */}
            <a
              href={flight.bookingSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onSelect}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#1A73E8] hover:bg-[#1557b0] text-white text-[12px] font-semibold transition-colors"
            >
              <ExternalLink size={12} />
              Comprar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function DayCard({ day, flightSearchUrl }: { day: DayPlan; flightSearchUrl?: string }) {
  const [open, setOpen] = useState(day.dayNumber <= 2);
  const activities = [...(day.morning ?? []), ...(day.afternoon ?? [])];

  return (
    <div
      className="card border border-[#E3F2FD] overflow-hidden"
      style={{ animation: `fadeInUp 0.4s ease-out ${day.dayNumber * 0.05}s both` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-ocean hover:bg-ocean-dark transition-colors text-left"
      >
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-white/50 text-[9px] uppercase font-bold tracking-wide">Costo día</p>
            <p className="text-[16px] font-bold text-white tabular-nums">{fmt(day.dayTotalClp)}</p>
          </div>
          {open ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
        </div>
      </button>

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
              {activities.map((act, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3 border-b border-[#F5F0E8] hover:bg-[#FAF8F4] transition-colors"
                >
                  <div className="min-w-[40px] text-center">
                    <p className="text-[10px] font-bold text-[#78909C] tabular-nums">{act.time}</p>
                    <span className="text-[20px]">{act.emoji ?? "📍"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A2332]">{act.name}</p>
                    {act.tip && <p className="text-[11px] text-[#78909C] mt-0.5">{act.tip}</p>}
                    <p className="text-[11px] text-[#B0BEC5] flex items-center gap-1 mt-0.5">
                      <Clock size={9} /> {act.durationMin} min
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {act.costClp > 0 ? (
                      <p className="text-[12px] font-bold text-sunset tabular-nums">{fmt(act.costClp)}</p>
                    ) : (
                      <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                        Gratis
                      </span>
                    )}
                  </div>
                </div>
              ))}

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

type ExportTab = "itinerary" | "hotels" | "split";

export default function TripPage() {
  const { trip, selectFlight } = useTripStore();
  const [activeTab, setActiveTab] = useState<ExportTab>("hotels");
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
        body: JSON.stringify(trip),
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
      <div className="bg-white border-b border-[#E0D5C5] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/planificar" className="text-[#78909C] hover:text-ocean transition-colors shrink-0">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="font-serif text-[16px] font-bold text-[#1A2332] truncate">{trip.title}</p>
              <p className="text-[11px] text-[#78909C] flex items-center gap-2">
                <span>📅 {trip.startDate} → {trip.endDate}</span>
                <span className="flex items-center gap-1"><Users size={9} /> {trip.travelers.adults} adultos</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Total pill */}
            <div className="hidden sm:block bg-sunset-lighter border border-sunset/20 rounded-full px-3 py-1">
              <span className="text-[13px] font-bold text-sunset tabular-nums">{fmt(trip.costs.total)}</span>
            </div>
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
              className="btn btn-accent text-[13px] min-h-[38px] px-4 gap-1.5"
            >
              <Download size={15} />
              <span className="hidden sm:inline">{downloading === "pdf" ? "Generando..." : "PDF"}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6 flex border-t border-[#E0D5C5]">
          {([
            { id: "hotels",    label: "✈️ Vuelos & Hoteles" },
            { id: "itinerary", label: "📅 Itinerario" },
            { id: "split",     label: "👥 Dividir costos" },
          ] as { id: ExportTab; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                activeTab === id
                  ? "border-ocean text-ocean"
                  : "border-transparent text-[#78909C] hover:text-[#37474F]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === "itinerary" && (
          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
            {/* Days */}
            <div className="space-y-3">
              {trip.days.map((day) => {
                const leg = trip.transportLegs.find((l) => l.toCity === day.city && day.isTravelDay);
                return <DayCard key={day.dayNumber} day={day} flightSearchUrl={leg?.flightSearchUrl} />;
              })}
            </div>
            {/* Sidebar */}
            <div className="space-y-4">
              <CostSummary />
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

            {/* ── Selected summary (flights + hotels) ── */}
            {(Object.keys(selectedFlights).length > 0 || Object.keys(selectedHotels).length > 0) && (
              <div className="bg-[#F1F8E9] border border-[#C8E6C9] rounded-2xl p-4 space-y-3">
                <p className="text-[11px] font-bold text-[#2E7D32] uppercase tracking-widest">✓ Tu selección</p>

                {/* Flights */}
                {trip.transportLegs.map((leg) => {
                  const key = `${leg.fromCity}-${leg.toCity}`;
                  const f = flightOpts[key]?.[selectedFlights[key]];
                  if (!f) return null;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-[#1A2332]">✈️ {leg.fromCity} → {leg.toCity}</p>
                        <p className="text-[11px] text-[#78909C]">{f.airline} · {f.departure}→{f.arrival}{f.stops === 0 ? " · directo" : ` · ${f.stops} escala`}</p>
                      </div>
                      <p className="text-[13px] font-bold text-sunset tabular-nums shrink-0 ml-4">{fmt(f.priceClp)}</p>
                    </div>
                  );
                })}

                {/* Hotels */}
                {trip.cities.map((city) => {
                  const h = hotelRecs[city.name]?.[selectedHotels[city.name]];
                  if (!h) return null;
                  return (
                    <div key={city.name} className="flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-[#1A2332]">🏨 {city.name}</p>
                        <p className="text-[11px] text-[#78909C]">{h.name} · {h.neighborhood}</p>
                      </div>
                      <p className="text-[13px] font-bold text-sunset tabular-nums shrink-0 ml-4">{fmt(h.pricePerNightClp)}<span className="text-[10px] font-normal text-[#78909C]">/noche</span></p>
                    </div>
                  );
                })}

                {/* Grand total */}
                {(() => {
                  const flightTotal = trip.transportLegs.reduce((s, leg) => {
                    const f = flightOpts[`${leg.fromCity}-${leg.toCity}`]?.[selectedFlights[`${leg.fromCity}-${leg.toCity}`]];
                    return s + (f?.priceClp ?? 0);
                  }, 0);
                  const hotelTotal = trip.cities.reduce((s, city) => {
                    const h = hotelRecs[city.name]?.[selectedHotels[city.name]];
                    return s + (h ? h.pricePerNightClp * city.days : 0);
                  }, 0);
                  const total = flightTotal + hotelTotal;
                  if (total === 0) return null;
                  return (
                    <div className="pt-3 border-t border-[#C8E6C9] flex justify-between">
                      <p className="text-[12px] font-bold text-[#2E7D32]">Total vuelos + alojamiento</p>
                      <p className="text-[14px] font-bold text-sunset tabular-nums">{fmt(total)}</p>
                    </div>
                  );
                })()}
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
                      ? `${opts.length} vuelo${opts.length > 1 ? "s" : ""} encontrado${opts.length > 1 ? "s" : ""} · precios reales de Google Flights en CLP`
                      : loadingFlights
                      ? "Buscando vuelos en Google Flights..."
                      : "Precios en tiempo real en Google Flights"}
                  </p>

                  {loadingFlights && opts.length === 0 && (
                    <div className="flex items-center gap-3 text-[#78909C] py-3">
                      <Loader2 size={15} className="animate-spin" />
                      <span className="text-[13px]">
                        Abriendo Google Flights y analizando resultados{i > 0 ? ` (tramo ${i + 1})` : ""}...
                      </span>
                    </div>
                  )}

                  {opts.length > 0 && (
                    <div className="space-y-2">
                      {opts.map((opt, j) => (
                        <FlightCard
                          key={j}
                          flight={opt}
                          rank={j}
                          selected={selectedIdx === j}
                          onSelect={() => {
                            setSelectedFlights(prev => ({ ...prev, [key]: j }));
                            selectFlight(leg.fromCity, leg.toCity, j, opt.priceClp);
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {!loadingFlights && opts.length === 0 && (
                    <a
                      href={leg.flightSearchUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#E3F2FD] hover:border-ocean text-[13px] font-semibold text-ocean hover:text-ocean-dark transition-all"
                    >
                      <ExternalLink size={13} /> Buscar en Google Flights
                    </a>
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
                  <p className="font-serif text-[22px] font-bold text-[#1A2332] mb-1">🏨 Hoteles en {city.name}</p>
                  {recs.length > 0 && (
                    <p className="text-[13px] text-[#78909C] mb-4">
                      Top {recs.length} opciones · precios reales de Booking · ordenados por mejor relación calidad/precio
                    </p>
                  )}
                  {loadingHotels && recs.length === 0 && (
                    <div className="flex items-center gap-2 text-[#78909C] py-3">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-[13px]">Buscando disponibilidad...</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {recs.map((hotel, i) => (
                      <HotelCard
                        key={i}
                        hotel={hotel}
                        rank={i}
                        selected={selectedHotels[city.name] === i}
                        onSelect={() => setSelectedHotels(prev => ({ ...prev, [city.name]: i }))}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* ── CTA: proceed to itinerary ── */}
            {!loadingFlights && !loadingHotels && (
              <div className="sticky bottom-6 pt-4">
                {(() => {
                  const allFlights = trip.transportLegs.every(
                    l => selectedFlights[`${l.fromCity}-${l.toCity}`] != null
                  );
                  const allHotels = trip.cities.every(c => selectedHotels[c.name] != null);
                  const allDone = allFlights && allHotels;
                  const missing = !allFlights && !allHotels ? "vuelos y hoteles"
                    : !allFlights ? "vuelos" : "hoteles";
                  return (
                    <button
                      onClick={() => setActiveTab("itinerary")}
                      className={`w-full py-4 rounded-2xl text-[15px] font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                        allDone
                          ? "bg-ocean text-white hover:bg-ocean-dark"
                          : "bg-[#1A2332] text-white/60 hover:text-white/80"
                      }`}
                    >
                      {allDone ? "✅ Ver mi itinerario →" : "Ver itinerario →"}
                      {!allDone && (
                        <span className="text-[11px] font-normal opacity-60 ml-1">
                          (selecciona tus {missing} primero)
                        </span>
                      )}
                    </button>
                  );
                })()}
              </div>
            )}
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
    </div>
  );
}
