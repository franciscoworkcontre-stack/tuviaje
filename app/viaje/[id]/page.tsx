"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, FileSpreadsheet, ChevronDown, ChevronUp,
  MapPin, Clock, Users, ExternalLink, ThumbsUp, ThumbsDown, Loader2
} from "lucide-react";
import { useTripStore } from "@/stores/tripStore";
import { CostSummary } from "@/components/trip/CostSummary";
import { CostSplitter } from "@/components/trip/CostSplitter";
import type { DayPlan, HotelRecommendation } from "@/types/trip";

function fmt(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

function HotelCard({ hotel, rank }: { hotel: HotelRecommendation; rank: number }) {
  const [open, setOpen] = useState(rank === 0);
  return (
    <div className="border border-[#E3F2FD] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F5F0E8]/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${rank === 0 ? "bg-sunset text-white" : "bg-[#F5F0E8] text-[#78909C]"}`}>
            {rank + 1}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#1A2332] truncate">{hotel.name}</p>
            <p className="text-[11px] text-[#78909C]">
              {"★".repeat(hotel.stars)} · {hotel.neighborhood}
              {hotel.rating && ` · ${hotel.rating}/10`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <p className="text-[13px] font-bold text-sunset tabular-nums">{fmt(hotel.pricePerNightClp)}<span className="text-[10px] text-[#78909C] font-normal">/noche</span></p>
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
          <a
            href={hotel.bookingSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-[#003580] hover:bg-[#00267a] text-white text-[12px] font-semibold transition-colors"
          >
            <ExternalLink size={12} />
            Ver en Booking.com
          </a>
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
          {day.isTravelDay ? (
            <div className="p-5 text-center">
              <span className="text-[32px]">✈️</span>
              <p className="font-semibold text-[#1A2332] mt-2">Día de viaje a {day.city}</p>
              <p className="text-[13px] text-[#78909C] mb-4">Busca el vuelo con precios en tiempo real</p>
              {flightSearchUrl && (
                <a
                  href={flightSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ocean text-white text-[13px] font-semibold hover:bg-ocean-dark transition-colors"
                >
                  <ExternalLink size={14} />
                  Buscar vuelos en Google Flights
                </a>
              )}
            </div>
          ) : (
            <div>
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
          )}
        </div>
      )}
    </div>
  );
}

type ExportTab = "itinerary" | "hotels" | "split";

export default function TripPage() {
  const { trip } = useTripStore();
  const [activeTab, setActiveTab] = useState<ExportTab>("itinerary");
  const [downloading, setDownloading] = useState<"sheet" | "pdf" | null>(null);
  const [hotelRecs, setHotelRecs] = useState<Record<string, HotelRecommendation[]>>(
    () => trip?.hotelRecommendations ?? {}
  );
  const [loadingHotels, setLoadingHotels] = useState(false);
  const hotelsFetched = useRef(false);

  useEffect(() => {
    if (activeTab !== "hotels" || hotelsFetched.current || !trip) return;
    const hasRecs = trip.cities.every(c => (hotelRecs[c.name] ?? []).length > 0);
    if (hasRecs) return;
    hotelsFetched.current = true;
    setLoadingHotels(true);
    fetch("/api/hotels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cities: trip.cities.map(c => c.name),
        travelStyle: trip.travelStyle,
      }),
    })
      .then(r => r.json())
      .then(data => { if (data.hotelRecommendations) setHotelRecs(data.hotelRecommendations); })
      .catch(() => {})
      .finally(() => setLoadingHotels(false));
  }, [activeTab, trip]);

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
            { id: "itinerary", label: "📅 Itinerario" },
            { id: "hotels",    label: "🏨 Vuelos & Hoteles" },
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
            {/* Transport legs */}
            <div>
              <p className="font-serif text-[22px] font-bold text-[#1A2332] mb-1">Vuelos</p>
              <p className="text-[13px] text-[#78909C] mb-4">Precios en tiempo real directo en Google Flights</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {trip.transportLegs.map((leg, i) => (
                  <a
                    key={i}
                    href={leg.flightSearchUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#E3F2FD] hover:border-ocean hover:shadow-md transition-all group"
                  >
                    <div>
                      <p className="text-[14px] font-bold text-[#1A2332]">{leg.fromCity} → {leg.toCity}</p>
                      {leg.fromIata && leg.toIata && (
                        <p className="text-[11px] text-[#78909C] font-mono mt-0.5">{leg.fromIata} · {leg.toIata}</p>
                      )}
                      {leg.date && <p className="text-[11px] text-[#78909C] mt-0.5">📅 {leg.date}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="bg-ocean text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 group-hover:bg-ocean-dark transition-colors">
                        <ExternalLink size={11} />
                        Google Flights
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Hotel recommendations per city */}
            {loadingHotels && (
              <div className="flex items-center gap-3 text-[#78909C] py-4">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[13px]">Buscando las mejores opciones...</span>
              </div>
            )}
            {trip.cities.map((city) => {
              const recs = hotelRecs[city.name] ?? [];
              if (recs.length === 0 && !loadingHotels) return null;
              return (
                <div key={city.name}>
                  <p className="font-serif text-[22px] font-bold text-[#1A2332] mb-1">Hoteles en {city.name}</p>
                  <p className="text-[13px] text-[#78909C] mb-4">
                    Top {recs.length} opciones para estilo {trip.travelStyle} · ordenados por mejor relación calidad/precio
                  </p>
                  <div className="space-y-2">
                    {(hotelRecs[city.name] ?? []).map((hotel, i) => (
                      <HotelCard key={i} hotel={hotel} rank={i} />
                    ))}
                  </div>
                </div>
              );
            })}
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
