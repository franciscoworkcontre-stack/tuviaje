"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, FileSpreadsheet, ChevronDown, ChevronUp,
  MapPin, Clock, Users
} from "lucide-react";
import { useTripStore } from "@/stores/tripStore";
import { CostSummary } from "@/components/trip/CostSummary";
import { CostSplitter } from "@/components/trip/CostSplitter";
import type { DayPlan } from "@/types/trip";

function fmt(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

function DayCard({ day }: { day: DayPlan }) {
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
            <div className="p-5 text-center text-[#78909C]">
              <span className="text-[32px]">✈️</span>
              <p className="font-semibold text-[#1A2332] mt-2">Día de viaje</p>
              <p className="text-[13px]">Revisa los detalles del transporte en tu itinerario</p>
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

type ExportTab = "itinerary" | "split";

export default function TripPage() {
  const { trip } = useTripStore();
  const [activeTab, setActiveTab] = useState<ExportTab>("itinerary");
  const [downloading, setDownloading] = useState<"sheet" | "pdf" | null>(null);

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
          {(["itinerary", "split"] as ExportTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-ocean text-ocean"
                  : "border-transparent text-[#78909C] hover:text-[#37474F]"
              }`}
            >
              {tab === "itinerary" ? "📅 Itinerario" : "👥 Dividir costos"}
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
              {trip.days.map((day) => (
                <DayCard key={day.dayNumber} day={day} />
              ))}
            </div>
            {/* Sidebar */}
            <div className="space-y-4">
              <CostSummary />
              {/* Accommodations */}
              {trip.accommodations.length > 0 && (
                <div className="card p-5 border border-[#E3F2FD]">
                  <p className="section-label mb-3">Alojamiento</p>
                  {trip.accommodations.map((acc, i) => (
                    <div key={i} className="py-3 border-b border-[#F5F0E8] last:border-0">
                      <p className="text-[13px] font-semibold text-[#1A2332]">🏨 {acc.name}</p>
                      <p className="text-[11px] text-[#78909C]">{acc.city} · {acc.nights} noches</p>
                      <p className="text-[12px] font-bold text-sunset tabular-nums mt-0.5">{fmt(acc.totalCost)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
