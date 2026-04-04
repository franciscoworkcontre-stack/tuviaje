"use client";

import Link from "next/link";
import {
  ArrowRightIcon as ArrowRight,
  PlaneIcon as Plane,
  BedDoubleIcon as Hotel,
  UtensilsCrossedIcon as UtensilsCrossed,
  MapIcon as Map,
  FileDownIcon as FileDown,
} from "@/components/ui/AnimatedIcons";
import { useEffect, useRef, useState } from "react";

// ─── Product demo phases ──────────────────────────────────────
// Phase 0: typing          0 – 3 500ms
// Phase 1: agents working  3 500 – 7 800ms
// Phase 2: result / pdf    7 800 – 13 000ms → restart

const LOOP = 13500;
const TYPED_TEXT = "Quiero ir de Nueva York a París y Roma, 14 días en julio, somos 2 personas";

const MINI_AGENTS = [
  { emoji: "✈️", label: "Buscando mejores vuelos",     duration: 2200 },
  { emoji: "🏨", label: "Eligiendo hotel por barrio",  duration: 2800 },
  { emoji: "🗓️", label: "Armando itinerario día a día",duration: 3600 },
  { emoji: "💰", label: "Calculando costos reales",    duration: 2600 },
];

const COSTS = [
  { label: "✈️ Transporte",          value: "US$1,240",  note: "3 tramos · mejor vuelo seleccionado" },
  { label: "🏨 Alojamiento",         value: "US$820",    note: "13 noches · hoteles en barrios clave" },
  { label: "🍽️ Comida + actividades", value: "US$590",   note: "estimado por estilo comfort" },
];

function HeroProductDemo() {
  const [phase, setPhase]               = useState<0 | 1 | 2>(0);
  const [charCount, setCharCount]       = useState(0);
  const [agentsDone, setAgentsDone]     = useState<boolean[]>(MINI_AGENTS.map(() => false));
  const [showResult, setShowResult]     = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function schedule(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }

  function run() {
    clear();
    setPhase(0);
    setCharCount(0);
    setAgentsDone(MINI_AGENTS.map(() => false));
    setShowResult(false);

    // ── Phase 0: typing ──────────────────────────────────────
    let charIdx = 0;
    const typeInterval = setInterval(() => {
      charIdx += 2;
      setCharCount(Math.min(charIdx, TYPED_TEXT.length));
      if (charIdx >= TYPED_TEXT.length) clearInterval(typeInterval);
    }, 45);
    timers.current.push(typeInterval as unknown as ReturnType<typeof setTimeout>);

    // ── Phase 1: agents ──────────────────────────────────────
    schedule(() => {
      setPhase(1);
      MINI_AGENTS.forEach((agent, i) => {
        schedule(() => {
          setAgentsDone((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, 400 + i * 300 + agent.duration);
      });
    }, 3500);

    // ── Phase 2: result ───────────────────────────────────────
    schedule(() => {
      setPhase(2);
      schedule(() => setShowResult(true), 300);
    }, 7800);

    // ── Restart ───────────────────────────────────────────────
    schedule(run, LOOP);
  }

  useEffect(() => {
    run();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allAgentsDone = agentsDone.every(Boolean);

  return (
    <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* ── Header strip ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
          </div>
          <span className="text-white/30 text-[11px] font-mono ml-1">tu[viaje]</span>
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: phase === i ? 16 : 6,
                height: 6,
                backgroundColor: phase === i ? "#FF7043" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Phase 0: Typing ── */}
      <div
        className="px-5 pt-4 pb-2 transition-all duration-400"
        style={{
          opacity: phase === 0 ? 1 : 0,
          height: phase === 0 ? "auto" : 0,
          overflow: "hidden",
          pointerEvents: phase === 0 ? "auto" : "none",
        }}
      >
        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-2">
          ✏️ Describe tu viaje
        </p>
        <div className="bg-white/8 border border-white/12 rounded-xl px-3.5 py-3 min-h-[80px]">
          <p className="text-white/85 text-[13px] leading-relaxed">
            {TYPED_TEXT.slice(0, charCount)}
            <span
              className="inline-block w-0.5 h-3.5 bg-white/70 ml-0.5 align-middle"
              style={{ animation: "pulse 0.8s ease-in-out infinite" }}
            />
          </p>
        </div>
        <div className="flex gap-2 mt-3">
          {["Nueva York", "París", "Roma"].map((c) => (
            <div
              key={c}
              className="text-[10px] text-white/50 bg-white/8 border border-white/10 rounded-full px-2.5 py-1"
              style={{ opacity: charCount > 30 ? 1 : 0, transition: "opacity 0.4s" }}
            >
              📍 {c}
            </div>
          ))}
        </div>
        <div
          className="mt-4 mb-1"
          style={{ opacity: charCount >= TYPED_TEXT.length ? 1 : 0, transition: "opacity 0.5s" }}
        >
          <div className="btn btn-accent w-full text-[13px] min-h-[40px] justify-center gap-1.5 cursor-default">
            Planificar mi viaje
            <ArrowRight size={14} />
          </div>
        </div>
      </div>

      {/* ── Phase 1: Agents ── */}
      <div
        className="px-5 pt-4 pb-4 transition-all duration-400"
        style={{
          opacity: phase === 1 ? 1 : 0,
          height: phase === 1 ? "auto" : 0,
          overflow: "hidden",
          pointerEvents: phase === 1 ? "auto" : "none",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">
            🤖 Nosotros decidimos todo
          </p>
          <span
            className="text-[10px] text-white/30 tabular-nums"
            style={{ animation: "pulse 1.2s ease-in-out infinite" }}
          >
            {agentsDone.filter(Boolean).length}/{MINI_AGENTS.length} listos
          </span>
        </div>

        <div className="space-y-2">
          {MINI_AGENTS.map((agent, i) => {
            const done = agentsDone[i];
            return (
              <div
                key={agent.label}
                className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-500"
                style={{
                  backgroundColor: done ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                  borderColor: done ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                  animation: `fadeInUp 0.3s ease-out ${i * 100}ms both`,
                }}
              >
                <span className="text-[15px]">{agent.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-medium ${done ? "text-white/75" : "text-white/40"}`}>
                    {agent.label}
                  </p>
                  {!done && (
                    <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-white/40 rounded-full"
                        style={{
                          width: "100%",
                          transition: `width ${agent.duration}ms cubic-bezier(0.4,0,0.2,1)`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                  {done ? (
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-[9px] text-white font-bold">✓</span>
                    </div>
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white/15"
                      style={{
                        borderTopColor: "rgba(255,255,255,0.6)",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {allAgentsDone && (
          <div
            className="mt-3 text-center text-[11px] text-white/40"
            style={{ animation: "fadeInUp 0.4s ease-out both" }}
          >
            ✅ Todo listo · tu plan está armado
          </div>
        )}
      </div>

      {/* ── Phase 2: Result / PDF ── */}
      <div
        className="px-5 pt-4 pb-5 transition-all duration-400"
        style={{
          opacity: phase === 2 ? 1 : 0,
          height: phase === 2 ? "auto" : 0,
          overflow: "hidden",
          pointerEvents: phase === 2 ? "auto" : "none",
        }}
      >
        {/* Done badge */}
        <div
          className="flex items-center justify-between mb-4"
          style={{
            opacity: showResult ? 1 : 0,
            transform: showResult ? "translateY(0)" : "translateY(6px)",
            transition: "all 0.4s ease-out",
          }}
        >
          <div>
            <p className="text-white text-[13px] font-semibold">NYC → París → Roma</p>
            <p className="text-white/40 text-[11px]">14 días · 2 adultos · comfort</p>
          </div>
          <div className="bg-white/10 border border-white/20 text-[10px] font-bold text-white/70 px-2.5 py-1 rounded-full">
            ✓ listo
          </div>
        </div>

        {/* Cost rows */}
        <div
          className="space-y-1.5 mb-3"
          style={{
            opacity: showResult ? 1 : 0,
            transition: "opacity 0.5s ease-out 0.15s",
          }}
        >
          {COSTS.map(({ label, value, note }, i) => (
            <div
              key={label}
              className="flex items-center justify-between py-2 border-b border-white/8"
              style={{
                animation: showResult ? `fadeInUp 0.35s ease-out ${i * 80}ms both` : undefined,
              }}
            >
              <div>
                <p className="text-white/75 text-[13px]">{label}</p>
                <p className="text-white/30 text-[10px]">{note}</p>
              </div>
              <p className="text-white/80 text-[14px] font-bold tabular-nums">{value}</p>
            </div>
          ))}

          {/* Total */}
          <div
            className="flex items-center justify-between pt-2"
            style={{
              opacity: showResult ? 1 : 0,
              transition: "opacity 0.4s ease-out 0.5s",
            }}
          >
            <p className="text-white/60 text-[13px] font-semibold">TOTAL estimado</p>
            <p className="text-sunset text-[22px] font-bold tabular-nums">US$2,650</p>
          </div>
          <p
            className="text-white/30 text-[10px] text-right"
            style={{ opacity: showResult ? 1 : 0, transition: "opacity 0.4s 0.6s" }}
          >
            US$1,325 por persona · US$95/día
          </p>
        </div>

        {/* PDF + split buttons */}
        <div
          className="flex gap-2 mt-4"
          style={{
            opacity: showResult ? 1 : 0,
            transform: showResult ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.5s ease-out 0.7s",
          }}
        >
          <div className="btn btn-accent flex-1 text-[12px] min-h-[38px] justify-center gap-1.5 cursor-default">
            📄 Descargar PDF
          </div>
          <div className="btn flex-1 text-[12px] min-h-[38px] justify-center gap-1.5 cursor-default border border-white/20 text-white/70">
            👥 Dividir costos
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Apps strip ───────────────────────────────────────────────
const APPS_REPLACED = [
  { icon: Plane,           label: "Google Flights" },
  { icon: Hotel,           label: "Google Hotels" },
  { icon: UtensilsCrossed, label: "TripAdvisor" },
  { icon: Map,             label: "Google Maps" },
  { icon: FileDown,        label: "Excel" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0D1F3C] py-20 px-6">
      {/* Glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(21,101,192,0.22) 0%, rgba(21,101,192,0.06) 50%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,112,67,0.14) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* ── Left — copy ── */}
          <div>
            <div
              className="inline-flex items-center gap-2 bg-white/10 text-white/75 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-8 border border-white/10"
              style={{ animation: "fadeInDown 0.5s ease-out both" }}
            >
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
              Para viajeros del mundo
            </div>

            <h1
              className="text-[44px] md:text-[58px] font-bold text-white leading-[1.06] tracking-tight mb-6"
              style={{ animation: "fadeInUp 0.65s ease-out 0.1s both" }}
            >
              Describe el viaje.
              <br />
              <span className="text-sunset">Nosotros lo armamos.</span>
            </h1>

            <p
              className="text-[17px] md:text-[19px] text-white/60 leading-relaxed mb-10 max-w-lg"
              style={{ animation: "fadeInUp 0.65s ease-out 0.22s both" }}
            >
              Escribe a dónde quieres ir y cuántos días tienes.
              Nosotros elegimos el mejor vuelo, el hotel en el barrio correcto
              y armamos el itinerario completo con costos reales.
              <br className="hidden sm:block" />
              <span className="text-white/40 text-[15px]"> Tú solo revisas y descargas.</span>
            </p>

            <div
              className="flex flex-col sm:flex-row items-start gap-4 mb-12"
              style={{ animation: "fadeInUp 0.65s ease-out 0.34s both" }}
            >
              <Link href="/planificar" className="btn btn-accent text-[16px] px-8 min-h-[52px] w-full sm:w-auto">
                Planificar mi viaje
                <ArrowRight size={18} />
              </Link>
              <Link href="#como-funciona" className="btn text-[15px] px-7 min-h-[52px] w-full sm:w-auto border-2 border-white/20 text-white hover:bg-white/8">
                Ver cómo funciona
              </Link>
            </div>

            <div
              className="flex flex-wrap gap-2"
              style={{ animation: "fadeInUp 0.65s ease-out 0.44s both" }}
            >
              {APPS_REPLACED.map(({ icon: Icon, label }) => (
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

          {/* ── Right — product demo ── */}
          <div
            className="relative"
            style={{ animation: "scaleIn 0.8s ease-out 0.5s both" }}
          >
            <div
              aria-hidden
              className="absolute inset-x-8 -bottom-4 h-12 rounded-b-2xl blur-xl"
              style={{ background: "rgba(21,101,192,0.35)" }}
            />
            <HeroProductDemo />
          </div>

        </div>
      </div>
    </section>
  );
}
