"use client";

import { useState } from "react";
import {
  ChevronDownIcon as ChevronDown,
  ChevronUpIcon as ChevronUp,
  MapPinIcon as MapPin,
} from "@/components/ui/AnimatedIcons";

const DAY_EXAMPLE = {
  number: 2,
  city: "París",
  date: "Miércoles 16 julio",
  theme: "Lo imperdible de París",
  cost: 120,
  currency: "US$",
  activities: [
    {
      time: "09:00",
      emoji: "🗼",
      name: "Torre Eiffel (subida)",
      duration: "1.5 hr",
      cost: 29,
      tip: "Reserva online con 2 semanas de anticipación",
      category: "culture",
    },
    {
      time: "11:00",
      emoji: "☕",
      name: "Café de Flore, Saint-Germain",
      duration: "45 min",
      cost: 12,
      tip: "El café más famoso de París. Pedir café au lait + croissant",
      category: "food",
    },
    {
      time: "12:30",
      emoji: "🎨",
      name: "Museo del Louvre",
      duration: "2 hr",
      cost: 22,
      tip: "Entra por la pirámide · llega 30 min antes de apertura",
      category: "culture",
    },
    {
      time: "15:30",
      emoji: "🍽️",
      name: "Almuerzo: L'As du Fallafel, Marais",
      duration: "45 min",
      cost: 10,
      tip: "El mejor falafel de París · cola normal de 10 min",
      category: "food",
    },
    {
      time: "20:00",
      emoji: "🍷",
      name: "Cena: Bistrot Paul Bert",
      duration: "2 hr",
      cost: 45,
      tip: "Bistró clásico parisino · reserva indispensable",
      category: "food",
    },
    {
      time: "22:00",
      emoji: "🌉",
      name: "Paseo nocturno Pont des Arts",
      duration: "1 hr",
      cost: 0,
      tip: "Gratis · vistas al Sena iluminado",
      category: "nightlife",
    },
  ],
};

const CATEGORY_COLORS: Record<string, string> = {
  culture: "bg-ocean-lighter text-ocean",
  food: "bg-[#FBE9E7] text-[#E64A19]",
  nightlife: "bg-[#FFF8E1] text-[#9A6D08]",
};

export function ItineraryPreview() {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className="text-center mb-12"
          style={{ animation: "fadeInUp 0.6s ease-out both" }}
        >
          <p className="section-label mb-3">El itinerario</p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[#1A2332] mb-4">
            Día a día, con costos reales
          </h2>
          <p className="text-[17px] text-[#78909C] max-w-xl mx-auto">
            Así se ve un día en tu plan. Cada actividad es editable, intercambiable y enlazada a reservas.
          </p>
        </div>

        <div
          className="max-w-2xl mx-auto"
          style={{ animation: "scaleIn 0.6s ease-out 0.2s both" }}
        >
          {/* Day card */}
          <div className="card border border-[#E3F2FD] overflow-hidden">
            {/* Day header */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between p-5 bg-ocean text-white hover:bg-ocean-dark transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg px-3 py-1 text-[13px] font-bold">
                  DÍA {DAY_EXAMPLE.number}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[15px]">{DAY_EXAMPLE.date}</p>
                  <p className="text-white/70 text-[12px] flex items-center gap-1">
                    <MapPin size={10} />
                    {DAY_EXAMPLE.city} · {DAY_EXAMPLE.theme}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">
                    Costo del día
                  </p>
                  <p className="text-[18px] font-bold tabular-nums">
                    {DAY_EXAMPLE.currency}{DAY_EXAMPLE.cost.toLocaleString("en-US")}
                  </p>
                </div>
                {expanded ? <ChevronUp size={18} className="opacity-60" /> : <ChevronDown size={18} className="opacity-60" />}
              </div>
            </button>

            {/* Activities */}
            {expanded && (
              <div className="divide-y divide-[#F5F0E8]">
                {DAY_EXAMPLE.activities.map((act, i) => (
                  <div
                    key={act.name}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-[#FAF8F4] transition-colors group"
                    style={{ animation: `slideUp 0.3s ease-out ${i * 0.06}s both` }}
                  >
                    <div className="text-center min-w-[44px]">
                      <p className="text-[11px] font-bold text-[#78909C] tabular-nums">{act.time}</p>
                      <div className="text-[22px] mt-1">{act.emoji}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[14px] font-semibold text-[#1A2332]">{act.name}</p>
                          <p className="text-[12px] text-[#78909C] mt-0.5">{act.tip}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {act.cost > 0 ? (
                            <p className="text-[13px] font-bold text-sunset tabular-nums">
                              {DAY_EXAMPLE.currency}{act.cost.toLocaleString("en-US")}
                            </p>
                          ) : (
                            <span className="text-[11px] font-semibold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                              Gratis
                            </span>
                          )}
                          <p className="text-[10px] text-[#B0BEC5] mt-0.5">{act.duration}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[act.category]}`}>
                          {act.category}
                        </span>
                      </div>
                    </div>
                    {/* Edit controls (visible on hover) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                      <button className="w-6 h-6 rounded flex items-center justify-center text-[#B0BEC5] hover:text-ocean hover:bg-ocean-lighter text-[12px]">✏️</button>
                      <button className="w-6 h-6 rounded flex items-center justify-center text-[#B0BEC5] hover:text-[#E64A19] hover:bg-[#FBE9E7] text-[12px]">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-4 bg-[#FAF8F4] border-t border-[#E0D5C5] flex items-center justify-between">
              <button className="text-[13px] font-semibold text-ocean flex items-center gap-1 hover:underline">
                🗺️ Ver ruta del día en mapa
              </button>
              <button className="text-[13px] font-semibold text-[#78909C] flex items-center gap-1 hover:text-ocean">
                Regenerar este día ↺
              </button>
            </div>
          </div>

          {/* CTA below */}
          <p className="text-center text-[14px] text-[#78909C] mt-6">
            Tu plan tendrá todos los días así —{" "}
            <a href="/planificar" className="text-ocean font-semibold hover:underline">
              Crea el tuyo gratis →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

