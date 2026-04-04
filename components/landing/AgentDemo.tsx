"use client";

import { useEffect, useState, useRef } from "react";

type AgentStatus = "idle" | "searching" | "done";

interface Agent {
  id: string;
  emoji: string;
  name: string;
  task: string;
  resultHighlight: string;
  completionMessage: string; // toast shown when agent finishes
  duration: number;
}

const AGENTS: Agent[] = [
  {
    id: "flights",
    emoji: "✈️",
    name: "Transport Agent",
    task: "Comparando 1.247 vuelos y rutas...",
    resultHighlight: "Sky LA482 — $32.000 / persona",
    completionMessage: "¡Te conseguí el mejor vuelo al mejor precio! ✈️",
    duration: 900,
  },
  {
    id: "buses",
    emoji: "🚌",
    name: "Bus & Train Agent",
    task: "Escaneando Pullman, Andesmar, Rome2Rio...",
    resultHighlight: "Pullman cama suite — $22.000",
    completionMessage: "¡Encontré la mejor opción en bus! 🚌",
    duration: 800,
  },
  {
    id: "hotels",
    emoji: "🏨",
    name: "Accommodation Agent",
    task: "Revisando 3.820 hoteles y hostales...",
    resultHighlight: "Hotel Clasico BA ⭐ 4.2 — $38.000/noche",
    completionMessage: "¡Te conseguí el mejor hotel de la zona! 🏨",
    duration: 1000,
  },
  {
    id: "itinerary",
    emoji: "🤖",
    name: "Itinerary Agent (Claude)",
    task: "Generando plan día a día con IA...",
    resultHighlight: "14 días · 42 actividades · 9 restaurantes",
    completionMessage: "¡Planeé tu viaje para que sea inolvidable! 🗺️",
    duration: 1100,
  },
  {
    id: "optimizer",
    emoji: "💡",
    name: "Optimizer Agent",
    task: "Buscando ahorros y combinaciones...",
    resultHighlight: "Volar el jueves ahorra $18.000 ↓",
    completionMessage: "¡Calculé todo para que gastes lo justo! 💰",
    duration: 850,
  },
];

// Sequential timing constants
const TOAST_MS      = 950;  // how long each completion message stays
const GAP           = 300;  // pause between toast end and next agent start
// Total agent time ≈ 600 + 5×(~950 + 950 + 300) = ~12 000ms
// PDF shows at ~12 600ms, loop restarts at 17 500ms → ~5s of PDF visible
const LOOP_DURATION = 17500;

// ─── Agent card — fixed height, no layout shift ───────────────
function AgentCard({ agent, status }: { agent: Agent; status: AgentStatus }) {
  const isIdle      = status === "idle";
  const isSearching = status === "searching";
  const isDone      = status === "done";

  return (
    <div
      className="rounded-xl border px-4 py-2.5 transition-colors duration-400"
      style={{
        backgroundColor: isDone
          ? "rgba(255,255,255,0.08)"
          : isSearching
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.03)",
        borderColor: isDone
          ? "rgba(255,255,255,0.22)"
          : "rgba(255,255,255,0.08)",
        opacity: isIdle ? 0.3 : 1,
        transition: "opacity 0.4s, background-color 0.4s, border-color 0.4s",
      }}
    >
      {/* Row */}
      <div className="flex items-center gap-3">
        <span className="text-[16px] shrink-0" style={{ opacity: isIdle ? 0.5 : 1 }}>
          {agent.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-semibold leading-none mb-0.5 ${isIdle ? "text-white/25" : "text-white/80"}`}>
            {agent.name}
          </p>
          <p className="text-[10px] text-white/35 truncate">
            {isIdle
              ? "En espera..."
              : isSearching
              ? agent.task
              : `→ ${agent.resultHighlight}`}
          </p>
        </div>
        {/* Status dot — always same size, no layout shift */}
        <div className="shrink-0 w-5 h-5 flex items-center justify-center">
          {isIdle && (
            <div className="w-3.5 h-3.5 rounded-full border border-white/15" />
          )}
          {isSearching && (
            <div
              className="w-3.5 h-3.5 rounded-full border-2 border-white/10"
              style={{
                borderTopColor: "rgba(255,255,255,0.65)",
                animation: "spin 0.7s linear infinite",
              }}
            />
          )}
          {isDone && (
            <div className="w-3.5 h-3.5 rounded-full bg-white/25 flex items-center justify-center">
              <span className="text-[7px] text-white font-bold leading-none">✓</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar space — ALWAYS rendered to avoid layout shift */}
      <div className="h-0.5 mt-2 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            backgroundColor: isSearching
              ? "rgba(255,255,255,0.45)"
              : isDone
              ? "rgba(255,255,255,0.15)"
              : "transparent",
            width: isSearching || isDone ? "100%" : "0%",
            transition: isSearching
              ? `width ${agent.duration}ms cubic-bezier(0.4,0,0.2,1)`
              : isDone
              ? "none"
              : "none",
          }}
        />
      </div>
    </div>
  );
}

// ─── Completion toast ─────────────────────────────────────────
function CompletionToast({ message }: { message: string | null }) {
  return (
    <div
      className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 px-6"
      style={{
        opacity: message ? 1 : 0,
        transform: message
          ? "translateY(-50%) scale(1)"
          : "translateY(-46%) scale(0.92)",
        transition: "opacity 0.25s ease-out, transform 0.25s ease-out",
      }}
    >
      <div className="bg-[#0D1F3C]/90 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-center max-w-xs">
        <p className="text-white font-semibold text-[15px] leading-snug">{message}</p>
      </div>
    </div>
  );
}

// ─── PDF Mock ─────────────────────────────────────────────────
function PDFMock({ visible }: { visible: boolean }) {
  return (
    <div
      className="relative"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateX(0) rotate(1deg)"
          : "translateX(32px) rotate(3deg)",
        transition: "all 0.65s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <div
        className="absolute -bottom-2 -right-2 w-full h-full rounded-xl"
        style={{ backgroundColor: "#E0D5C5", transform: "rotate(2deg)" }}
      />
      <div
        className="absolute -bottom-1 -right-1 w-full h-full rounded-xl bg-white"
        style={{ transform: "rotate(1deg)" }}
      />

      <div className="relative bg-white rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        {/* Cover */}
        <div className="bg-[#0D1F3C] px-5 pt-5 pb-4 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,112,67,0.18) 0%, transparent 70%)" }}
          />
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-ocean flex items-center justify-center text-[8px]">🗺️</div>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
              tu[viaje] · Plan completo
            </span>
          </div>
          <p className="text-white text-[15px] font-bold leading-tight mb-1">
            Santiago → Buenos Aires<br />→ São Paulo
          </p>
          <p className="text-white/50 text-[9px]">15 jul – 29 jul 2026 · 2 adultos</p>
          <div className="flex gap-2 mt-3">
            <div className="bg-white/8 rounded-lg px-2.5 py-1.5">
              <p className="text-[7px] text-white/40 uppercase">Total</p>
              <p className="text-[13px] font-bold text-sunset tabular-nums">$1.842.000</p>
            </div>
            <div className="bg-white/8 rounded-lg px-2.5 py-1.5">
              <p className="text-[7px] text-white/40 uppercase">Por persona</p>
              <p className="text-[13px] font-bold text-white tabular-nums">$921.000</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#E0D5C5]" />

        {/* Cost breakdown */}
        <div className="bg-white px-5 py-4">
          <p className="text-[8px] font-bold uppercase tracking-widest text-[#78909C] mb-3">Resumen de costos</p>
          {[
            { label: "✈️ Transporte",     pct: 17, amount: "$320K" },
            { label: "🏨 Alojamiento",    pct: 42, amount: "$780K" },
            { label: "🍽️ Comida",         pct: 21, amount: "$390K" },
            { label: "🎭 Actividades",    pct: 10, amount: "$180K" },
            { label: "🚇 Local + extras", pct: 10, amount: "$172K" },
          ].map(({ label, pct, amount }) => (
            <div key={label} className="mb-2">
              <div className="flex justify-between mb-0.5">
                <span className="text-[8px] text-[#37474F]">{label}</span>
                <span className="text-[8px] font-bold text-[#1A2332] tabular-nums">{amount}</span>
              </div>
              <div className="h-1 bg-[#F5F0E8] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-ocean"
                  style={{
                    width: visible ? `${pct}%` : "0%",
                    transition: `width 0.9s ease-out ${150 + pct * 10}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Day strip */}
        <div className="bg-[#F5F0E8] px-5 py-3 border-t border-[#E0D5C5]">
          <p className="text-[7px] font-bold uppercase tracking-widest text-[#78909C] mb-1.5">Día 2 · Buenos Aires</p>
          {[
            { time: "09:00", act: "🏛️ Plaza de Mayo", cost: "Gratis" },
            { time: "11:00", act: "☕ Café Tortoni",   cost: "$5.000" },
            { time: "13:30", act: "🍽️ La Brigada",    cost: "$12.000" },
            { time: "21:30", act: "🎭 Show de tango",  cost: "$35.000" },
          ].map(({ time, act, cost }) => (
            <div key={act} className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] text-[#B0BEC5] w-7 tabular-nums">{time}</span>
                <span className="text-[8px] text-[#37474F]">{act}</span>
              </div>
              <span className={`text-[7px] font-bold tabular-nums ${cost === "Gratis" ? "text-[#2E7D32]" : "text-sunset"}`}>
                {cost}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white px-5 py-2 border-t border-[#E0D5C5] flex justify-between">
          <span className="text-[7px] text-[#B0BEC5]">Generado por tu[viaje]</span>
          <span className="text-[7px] text-[#B0BEC5]">una herramienta tu[X] 🌎</span>
        </div>
      </div>

      <div
        className="absolute -top-3 -right-3 bg-[#2E7D32] text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-lg"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0)",
          transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.45s",
        }}
      >
        ✓ PDF listo
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export function AgentDemo() {
  const [phase, setPhase]           = useState(0);
  const [statuses, setStatuses]     = useState<AgentStatus[]>(AGENTS.map(() => "idle"));
  const [toast, setToast]           = useState<string | null>(null);
  const timers                      = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function schedule(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }

  function showToast(msg: string) {
    setToast(msg);
    schedule(() => setToast(null), 1400);
  }

  function run() {
    clear();
    setPhase(0);
    setStatuses(AGENTS.map(() => "idle"));
    setToast(null);

    setPhase(1);

    // Sequential: each agent starts only after the previous one's toast ends.
    // cursor tracks the absolute ms offset from now.
    let cursor = 600; // initial pause before first agent

    AGENTS.forEach((agent, i) => {
      const startAt  = cursor;
      const finishAt = startAt + agent.duration;

      // activate this agent
      schedule(() => {
        setStatuses((prev) => {
          const next = [...prev];
          next[i] = "searching";
          return next;
        });
      }, startAt);

      // finish + show toast
      schedule(() => {
        setStatuses((prev) => {
          const next = [...prev];
          next[i] = "done";
          return next;
        });
        setToast(agent.completionMessage);
      }, finishAt);

      // hide toast
      schedule(() => setToast(null), finishAt + TOAST_MS);

      // next agent starts after toast + small gap
      cursor = finishAt + TOAST_MS + GAP;
    });

    // All agents done: cursor is after the last toast+gap
    const allDoneAt = cursor - GAP; // last finishAt + TOAST_MS

    // Summary bar
    schedule(() => setPhase(2), allDoneAt);

    // PDF slides in
    schedule(() => setPhase(3), allDoneAt + 600);

    // Restart
    schedule(run, LOOP_DURATION);
  }

  useEffect(() => {
    run();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDone    = statuses.every((s) => s === "done");
  const pdfVisible = phase >= 3;

  return (
    <section className="bg-[#0D1F3C] py-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-4 py-1.5 text-[11px] font-semibold text-white/50 mb-5 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
            Tecnología de agentes IA
          </div>
          <h2 className="font-serif text-[36px] md:text-[48px] font-bold text-white leading-tight mb-4">
            No es una búsqueda.<br />
            <span className="text-sunset">Son 5 agentes trabajando para ti.</span>
          </h2>
          <p className="text-[17px] text-white/50 max-w-xl mx-auto">
            En paralelo. En segundos. El mejor vuelo, el mejor hotel,
            el plan completo — y un PDF listo para compartir.
          </p>
        </div>

        {/* Demo grid */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-10 items-center">

          {/* Left: agents panel — fixed height, relative for toast */}
          <div className="bg-white/4 border border-white/8 rounded-2xl p-5 backdrop-blur-sm relative">

            {/* Toast overlay */}
            <CompletionToast message={toast} />

            {/* Request chip */}
            <div className="flex items-center gap-3 bg-white/8 border border-white/10 rounded-xl px-4 py-3 mb-4">
              <span className="text-[18px]">🗺️</span>
              <div className="min-w-0">
                <p className="text-white text-[13px] font-semibold truncate">
                  "Nueva York → París → Roma, 14 días, 2 personas"
                </p>
                <p className="text-white/35 text-[10px] mt-0.5">
                  Solicitud recibida · {phase < 2 ? "Agentes trabajando..." : "¡Plan listo!"}
                </p>
              </div>
              <div className="ml-auto shrink-0 w-2 h-2 rounded-full"
                style={{
                  backgroundColor: allDone ? "#4CAF50" : "#FF7043",
                  animation: !allDone ? "pulse 1s ease-in-out infinite" : undefined,
                }}
              />
            </div>

            {/* Agent cards */}
            <div className="space-y-2">
              {AGENTS.map((agent, i) => (
                <AgentCard key={agent.id} agent={agent} status={statuses[i]} />
              ))}
            </div>

            {/* Summary footer */}
            <div
              className="mt-4 rounded-xl border px-4 py-3 flex items-center justify-between transition-all duration-600"
              style={{
                backgroundColor: allDone ? "rgba(46,125,50,0.12)" : "rgba(255,255,255,0.03)",
                borderColor:     allDone ? "rgba(46,125,50,0.35)" : "rgba(255,255,255,0.07)",
              }}
            >
              <div>
                <p className="text-[12px] font-bold transition-colors duration-500"
                  style={{ color: allDone ? "#4CAF50" : "rgba(255,255,255,0.25)" }}>
                  {allDone ? "✅ Plan listo en 4.3 segundos" : "⏳ Agentes trabajando..."}
                </p>
                {allDone && (
                  <p className="text-white/40 text-[10px] mt-0.5"
                    style={{ animation: "fadeInUp 0.4s ease-out both" }}>
                    14 días · $1.842.000 total · PDF generado
                  </p>
                )}
              </div>
              {allDone && (
                <div className="text-[20px] font-bold tabular-nums text-sunset"
                  style={{ animation: "scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                  $1.842.000
                </div>
              )}
            </div>
          </div>

          {/* Right: PDF — hidden on mobile, shown on lg+ */}
          <div className="hidden lg:flex items-center justify-center">
            <PDFMock visible={pdfVisible} />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <p className="text-[15px] text-white/50 mb-5">
            Tus viajes, planificados por agentes que no descansan.
          </p>
          <a href="/planificar" className="btn btn-accent text-[16px] px-10 min-h-[52px] inline-flex items-center gap-2">
            Planificar mi viaje ahora →
          </a>
        </div>

      </div>
    </section>
  );
}
