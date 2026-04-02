"use client";

import Link from "next/link";
import { ArrowRight, Plane, Bus, Hotel, UtensilsCrossed, Map, FileDown } from "lucide-react";
import { useEffect, useState } from "react";

const CITIES = ["Santiago", "Buenos Aires", "Montevideo", "São Paulo", "Lima", "Bogotá"];

// Animated route map showing city dots connected by a path
function RouteAnimation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 5), 1200);
    return () => clearInterval(t);
  }, []);

  const cities = [
    { x: 18, y: 72, name: "SCL" },
    { x: 42, y: 30, name: "EZE" },
    { x: 62, y: 52, name: "MVD" },
    { x: 80, y: 22, name: "GRU" },
  ];

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Ocean gradient background */}
        <defs>
          <linearGradient id="routeLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1565C0" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FF7043" stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Route path */}
        <polyline
          points={cities.map((c) => `${c.x},${c.y}`).join(" ")}
          fill="none"
          stroke="url(#routeLine)"
          strokeWidth="1.2"
          strokeDasharray="800"
          strokeDashoffset="0"
          style={{
            animation: "draw-line 2s ease-out 0.6s both",
            strokeDasharray: "800",
          }}
        />

        {/* City dots */}
        {cities.map((city, i) => (
          <g key={city.name}>
            <circle
              cx={city.x}
              cy={city.y}
              r="3.5"
              fill="white"
              stroke="#1565C0"
              strokeWidth="1.5"
              style={{
                animation: `city-pop 0.4s ease-out ${0.8 + i * 0.3}s both`,
              }}
            />
            <circle
              cx={city.x}
              cy={city.y}
              r="6"
              fill="#1565C0"
              fillOpacity={step === i ? 0.18 : 0}
              style={{ transition: "fill-opacity 0.4s" }}
            />
          </g>
        ))}
      </svg>

      {/* City labels */}
      {cities.map((city, i) => (
        <div
          key={city.name}
          className="absolute text-[10px] font-bold text-ocean bg-white/90 px-1.5 py-0.5 rounded shadow-sm border border-ocean/10"
          style={{
            left: `${city.x + 4}%`,
            top: `${city.y - 8}%`,
            animation: `fadeInUp 0.4s ease-out ${1 + i * 0.3}s both`,
          }}
        >
          {city.name}
        </div>
      ))}

      {/* Animated plane */}
      <div
        className="absolute text-[18px] pointer-events-none"
        style={{ animation: "plane-move 4s ease-in-out 1.5s infinite" }}
      >
        ✈️
      </div>
    </div>
  );
}

const APPS_REPLACED = [
  { icon: Plane, label: "Google Flights", color: "bg-ocean-lighter text-ocean" },
  { icon: Bus, label: "Rome2Rio", color: "bg-[#E8F5E9] text-[#2E7D32]" },
  { icon: Hotel, label: "Booking.com", color: "bg-[#E3F2FD] text-ocean" },
  { icon: UtensilsCrossed, label: "TripAdvisor", color: "bg-[#FBE9E7] text-[#E64A19]" },
  { icon: Map, label: "Google Maps", color: "bg-[#FFF8E1] text-[#F9A825]" },
  { icon: FileDown, label: "Excel", color: "bg-[#EDE8FE] text-[#7B1FA2]" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0D1F3C] py-20 px-6">
      {/* Ocean deep glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(21,101,192,0.22) 0%, rgba(21,101,192,0.06) 50%, transparent 70%)",
        }}
      />
      {/* Sunset warm glow — bottom left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,112,67,0.14) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 bg-white/10 text-white/75 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-8 border border-white/10"
              style={{ animation: "fadeInDown 0.5s ease-out both" }}
            >
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
              Hecho en Chile · Para viajeros latinoamericanos
            </div>

            {/* Headline */}
            <h1
              className="text-[44px] md:text-[58px] font-bold text-white leading-[1.06] tracking-tight mb-6"
              style={{ animation: "fadeInUp 0.65s ease-out 0.1s both" }}
            >
              Planifica tu viaje.
              <br />
              <span className="text-sunset">Conoce el costo real.</span>
            </h1>

            {/* Sub */}
            <p
              className="text-[17px] md:text-[19px] text-white/60 leading-relaxed mb-10 max-w-lg"
              style={{ animation: "fadeInUp 0.65s ease-out 0.22s both" }}
            >
              Describe tu viaje multi-ciudad y obtén un itinerario completo con
              vuelos reales, buses, hoteles, actividades y presupuesto exportable.
              <br className="hidden sm:block" />
              <span className="text-white/40 text-[15px]"> 6 apps reemplazadas por 1.</span>
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row items-start gap-4 mb-12"
              style={{ animation: "fadeInUp 0.65s ease-out 0.34s both" }}
            >
              <Link
                href="/planificar"
                className="btn btn-accent text-[16px] px-8 min-h-[52px] w-full sm:w-auto"
              >
                Planificar mi viaje
                <ArrowRight size={18} />
              </Link>
              <Link
                href="#como-funciona"
                className="btn text-[15px] px-7 min-h-[52px] w-full sm:w-auto border-2 border-white/20 text-white hover:bg-white/8"
              >
                Ver cómo funciona
              </Link>
            </div>

            {/* Apps replaced strip */}
            <div
              className="flex flex-wrap gap-2"
              style={{ animation: "fadeInUp 0.65s ease-out 0.44s both" }}
            >
              {APPS_REPLACED.map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-full px-3 py-1 text-[12px] text-white/60"
                >
                  <Icon size={12} className="opacity-60" />
                  {label}
                </div>
              ))}
              <div className="flex items-center gap-1 bg-sunset/20 border border-sunset/20 rounded-full px-3 py-1 text-[12px] text-sunset font-semibold">
                → tu[viaje] ✓
              </div>
            </div>
          </div>

          {/* Right — animated route card */}
          <div
            className="relative"
            style={{ animation: "scaleIn 0.8s ease-out 0.5s both" }}
          >
            {/* Glow behind */}
            <div
              aria-hidden
              className="absolute inset-x-8 -bottom-4 h-12 rounded-b-2xl blur-xl"
              style={{ background: "rgba(21,101,192,0.35)" }}
            />
            <div className="relative bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              {/* Card header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white text-[13px] font-semibold">
                    Santiago → São Paulo
                  </p>
                  <p className="text-white/40 text-[11px]">14 días · 2 adultos · 3 ciudades</p>
                </div>
                <div className="bg-[#2E7D32]/20 text-[11px] font-bold text-[#4CAF50] px-3 py-1 rounded-full">
                  Plan listo ✓
                </div>
              </div>

              {/* Route map */}
              <div className="relative h-40 mb-4 bg-ocean/8 rounded-xl overflow-hidden border border-white/5">
                <RouteAnimation />
              </div>

              {/* Cost breakdown */}
              <div className="space-y-2">
                {[
                  { label: "✈️ Transporte", value: "$320.000", note: "3 vuelos seleccionados" },
                  { label: "🏨 Alojamiento", value: "$780.000", note: "13 noches" },
                  { label: "🍽️ Comida + actividades", value: "$570.000", note: "estimado" },
                ].map(({ label, value, note }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/6">
                    <div>
                      <p className="text-white/75 text-[13px]">{label}</p>
                      <p className="text-white/35 text-[10px]">{note}</p>
                    </div>
                    <p className="text-white/80 text-[14px] font-bold tabular-nums">{value}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <p className="text-white/60 text-[13px] font-semibold">TOTAL estimado</p>
                  <p className="text-sunset text-[22px] font-bold tabular-nums">$1.842.000</p>
                </div>
                <p className="text-white/35 text-[10px] text-right">$921.000 por persona · $70.846/día</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
