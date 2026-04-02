"use client";

import { useEffect, useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────
type AgentStatus = "idle" | "searching" | "done";

interface Agent {
  id: string;
  emoji: string;
  name: string;
  task: string;
  result: string;
  resultHighlight: string; // the "best find"
  duration: number; // ms to complete
  color: string;
  bgColor: string;
}

const AGENTS: Agent[] = [
  {
    id: "flights",
    emoji: "✈️",
    name: "Transport Agent",
    task: "Comparando 1.247 vuelos y rutas...",
    result: "Encontré 3 opciones. Mejor precio:",
    resultHighlight: "Sky LA482 — $32.000 por persona",
    duration: 2800,
    color: "#1565C0",
    bgColor: "#E3F2FD",
  },
  {
    id: "buses",
    emoji: "🚌",
    name: "Bus & Train Agent",
    task: "Escaneando Pullman, Andesmar, Rome2Rio...",
    result: "Bus cama disponible desde",
    resultHighlight: "Pullman $22.000 — 18h, cama suite",
    duration: 2200,
    color: "#2E7D32",
    bgColor: "#E8F5E9",
  },
  {
    id: "hotels",
    emoji: "🏨",
    name: "Accommodation Agent",
    task: "Revisando 3.820 hoteles y hostales...",
    result: "Mejor relación precio/zona:",
    resultHighlight: "Hotel Clasico BA ⭐4.2 — $38.000/noche",
    duration: 3400,
    color: "#7B1FA2",
    bgColor: "#EDE8FE",
  },
  {
    id: "itinerary",
    emoji: "🤖",
    name: "Itinerary Agent (Claude)",
    task: "Generando plan día a día con IA...",
    result: "14 días planificados, 42 actividades,",
    resultHighlight: "9 restaurantes recomendados",
    duration: 4100,
    color: "#FF7043",
    bgColor: "#FBE9E7",
  },
  {
    id: "optimizer",
    emoji: "💡",
    name: "Optimizer Agent",
    task: "Buscando ahorros y combinaciones...",
    result: "3 tips de ahorro encontrados:",
    resultHighlight: "Volar jueves ahorra $18.000 ↓",
    duration: 3000,
    color: "#F9A825",
    bgColor: "#FFF8E1",
  },
];

// ─── Phase timing ─────────────────────────────────────────────
// Phase 0: input appears       0ms
// Phase 1: agents activate     800ms
// Phase 2: all done + summary  5200ms
// Phase 3: PDF slides in       6000ms
// Phase 4: hold                9000ms → restart at 11000ms

const PHASE_TIMINGS = [0, 800, 5200, 6200, 11000];
const LOOP_DURATION = 12000;

function ProgressBar({
  active,
  duration,
  color,
}: {
  active: boolean;
  duration: number;
  color: string;
}) {
  return (
    <div className="h-1 bg-white/20 rounded-full overflow-hidden mt-2">
      <div
        className="h-full rounded-full"
        style={{
          backgroundColor: color,
          width: active ? "100%" : "0%",
          transition: active ? `width ${duration}ms cubic-bezier(0.4,0,0.2,1)` : "none",
        }}
      />
    </div>
  );
}

function AgentCard({
  agent,
  status,
  delay,
}: {
  agent: Agent;
  status: AgentStatus;
  delay: number;
}) {
  return (
    <div
      className="rounded-xl border px-4 py-3 transition-all duration-500"
      style={{
        backgroundColor:
          status === "idle" ? "rgba(255,255,255,0.04)" : agent.bgColor + "22",
        borderColor:
          status === "idle"
            ? "rgba(255,255,255,0.08)"
            : agent.color + "44",
        opacity: status === "idle" ? 0.4 : 1,
        transform: status === "idle" ? "translateY(4px)" : "translateY(0)",
        animation:
          status !== "idle"
            ? `fadeInUp 0.4s ease-out ${delay}ms both`
            : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[18px] shrink-0">{agent.emoji}</span>
          <div className="min-w-0">
            <p
              className="text-[11px] font-bold"
              style={{ color: status === "idle" ? "rgba(255,255,255,0.3)" : agent.color }}
            >
              {agent.name}
            </p>
            <p className="text-[10px] text-white/40 truncate">
              {status === "idle"
                ? "En espera..."
                : status === "searching"
                ? agent.task
                : agent.result}
            </p>
          </div>
        </div>
        {/* Status indicator */}
        <div className="shrink-0">
          {status === "idle" && (
            <div className="w-5 h-5 rounded-full border border-white/15 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>
          )}
          {status === "searching" && (
            <div
              className="w-5 h-5 rounded-full border-2 border-transparent"
              style={{
                borderTopColor: agent.color,
                borderRightColor: agent.color + "66",
                animation: "spin 0.8s linear infinite",
              }}
            />
          )}
          {status === "done" && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: agent.color, color: "white" }}
            >
              ✓
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {status === "searching" && (
        <ProgressBar active={true} duration={agent.duration} color={agent.color} />
      )}

      {/* Result highlight */}
      {status === "done" && (
        <div
          className="mt-2 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold"
          style={{ backgroundColor: agent.color + "18", color: agent.color }}
        >
          → {agent.resultHighlight}
        </div>
      )}
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
        transform: visible ? "translateX(0) rotate(1deg)" : "translateX(40px) rotate(3deg)",
        transition: "all 0.7s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* Shadow page behind */}
      <div
        className="absolute -bottom-2 -right-2 w-full h-full rounded-xl"
        style={{ backgroundColor: "#E0D5C5", transform: "rotate(2deg)" }}
      />
      <div
        className="absolute -bottom-1 -right-1 w-full h-full rounded-xl bg-white"
        style={{ transform: "rotate(1deg)" }}
      />

      {/* Main PDF card */}
      <div className="relative bg-white rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        {/* Cover page — dark */}
        <div className="bg-[#0D1F3C] px-5 pt-5 pb-4">
          {/* Glow */}
          <div
            className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(255,112,67,0.2) 0%, transparent 70%)",
            }}
          />
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded bg-ocean flex items-center justify-center text-[8px]">
              🗺️
            </div>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
              tu[viaje] · Plan completo
            </span>
          </div>
          <p className="text-white text-[16px] font-bold leading-tight mb-1">
            Santiago → Buenos Aires
            <br />→ São Paulo
          </p>
          <p className="text-white/50 text-[9px]">
            15 jul – 29 jul 2026 · 2 adultos
          </p>
          <div className="flex gap-2 mt-3">
            <div className="bg-white/8 rounded-lg px-2.5 py-1.5">
              <p className="text-[7px] text-white/40 uppercase tracking-wide">Total</p>
              <p className="text-[13px] font-bold text-[#FF7043] tabular-nums">$1.842.000</p>
            </div>
            <div className="bg-white/8 rounded-lg px-2.5 py-1.5">
              <p className="text-[7px] text-white/40 uppercase tracking-wide">Por persona</p>
              <p className="text-[13px] font-bold text-white tabular-nums">$921.000</p>
            </div>
          </div>
        </div>

        {/* Page divider */}
        <div className="h-px bg-[#E0D5C5]" />

        {/* Cost breakdown page */}
        <div className="bg-white px-5 py-4">
          <p className="text-[8px] font-bold uppercase tracking-widest text-[#78909C] mb-3">
            Resumen de costos
          </p>
          {[
            { label: "✈️ Transporte", pct: 17, color: "#1565C0", amount: "$320K" },
            { label: "🏨 Alojamiento", pct: 42, color: "#7B1FA2", amount: "$780K" },
            { label: "🍽️ Comida",      pct: 21, color: "#FF7043", amount: "$390K" },
            { label: "🎭 Actividades", pct: 10, color: "#F9A825", amount: "$180K" },
            { label: "🚇 Local + extras", pct: 10, color: "#2E7D32", amount: "$172K" },
          ].map(({ label, pct, color, amount }) => (
            <div key={label} className="mb-2">
              <div className="flex justify-between mb-0.5">
                <span className="text-[8px] text-[#37474F]">{label}</span>
                <span className="text-[8px] font-bold text-[#1A2332] tabular-nums">{amount}</span>
              </div>
              <div className="h-1 bg-[#F5F0E8] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: visible ? `${pct}%` : "0%",
                    backgroundColor: color,
                    transition: `width 1s ease-out ${200 + pct * 10}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Day preview strip */}
        <div className="bg-[#F5F0E8] px-5 py-3 border-t border-[#E0D5C5]">
          <p className="text-[7px] font-bold uppercase tracking-widest text-[#78909C] mb-2">
            Día 2 · Buenos Aires
          </p>
          {[
            { time: "09:00", act: "🏛️ Plaza de Mayo", cost: "Gratis" },
            { time: "11:00", act: "☕ Café Tortoni", cost: "$5.000" },
            { time: "13:30", act: "🍽️ La Brigada", cost: "$12.000" },
            { time: "21:30", act: "🎭 Show de tango", cost: "$35.000" },
          ].map(({ time, act, cost }) => (
            <div
              key={act}
              className="flex items-center justify-between py-0.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] text-[#B0BEC5] w-7 tabular-nums">{time}</span>
                <span className="text-[8px] text-[#37474F]">{act}</span>
              </div>
              <span
                className={`text-[7px] font-bold tabular-nums ${
                  cost === "Gratis" ? "text-[#2E7D32]" : "text-[#FF7043]"
                }`}
              >
                {cost}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-white px-5 py-2 border-t border-[#E0D5C5] flex justify-between items-center">
          <span className="text-[7px] text-[#B0BEC5]">Generado por tu[viaje]</span>
          <span className="text-[7px] text-[#B0BEC5]">una herramienta tu[X] 🌎</span>
        </div>
      </div>

      {/* "PDF listo" badge */}
      <div
        className="absolute -top-3 -right-3 bg-[#2E7D32] text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-lg"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0)",
          transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.5s",
        }}
      >
        ✓ PDF listo
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export function AgentDemo() {
  const [phase, setPhase] = useState(0);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(
    AGENTS.map(() => "idle")
  );
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }

  function runAnimation() {
    clearTimers();
    setPhase(0);
    setAgentStatuses(AGENTS.map(() => "idle"));

    // Phase 1: agents start activating
    timerRef.current.push(
      setTimeout(() => {
        setPhase(1);
        // Activate each agent with stagger
        AGENTS.forEach((agent, i) => {
          timerRef.current.push(
            setTimeout(() => {
              setAgentStatuses((prev) => {
                const next = [...prev];
                next[i] = "searching";
                return next;
              });
            }, i * 300)
          );
          // Each agent completes after its duration
          timerRef.current.push(
            setTimeout(
              () => {
                setAgentStatuses((prev) => {
                  const next = [...prev];
                  next[i] = "done";
                  return next;
                });
              },
              i * 300 + agent.duration
            )
          );
        });
      }, PHASE_TIMINGS[1])
    );

    // Phase 2: summary
    timerRef.current.push(
      setTimeout(() => setPhase(2), PHASE_TIMINGS[2])
    );

    // Phase 3: PDF slides in
    timerRef.current.push(
      setTimeout(() => setPhase(3), PHASE_TIMINGS[3])
    );

    // Phase 4: restart
    timerRef.current.push(
      setTimeout(() => runAnimation(), LOOP_DURATION)
    );
  }

  useEffect(() => {
    runAnimation();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDone = agentStatuses.every((s) => s === "done");
  const pdfVisible = phase >= 3;

  return (
    <section className="bg-[#0D1F3C] py-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-4 py-1.5 text-[11px] font-semibold text-white/50 mb-5 uppercase tracking-widest"
          >
            <span
              className="w-2 h-2 rounded-full bg-[#2E7D32]"
              style={{ animation: "pulse 1.5s ease-in-out infinite" }}
            />
            Tecnología de agentes IA
          </div>
          <h2 className="font-serif text-[36px] md:text-[48px] font-bold text-white leading-tight mb-4">
            No es una búsqueda. <br />
            <span className="text-sunset">Son 5 agentes trabajando para ti.</span>
          </h2>
          <p className="text-[17px] text-white/50 max-w-xl mx-auto">
            En paralelo. En segundos. El mejor vuelo, el mejor hotel,
            el plan completo — y un PDF listo para compartir.
          </p>
        </div>

        {/* Demo grid */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* Left: agent activity */}
          <div className="bg-white/4 border border-white/8 rounded-2xl p-5 backdrop-blur-sm">
            {/* Trip request chip */}
            <div
              className="flex items-center gap-3 bg-white/8 border border-white/10 rounded-xl px-4 py-3 mb-5"
              style={{
                opacity: phase >= 0 ? 1 : 0,
                transform: phase >= 0 ? "translateY(0)" : "translateY(8px)",
                transition: "all 0.5s ease-out",
              }}
            >
              <span className="text-[20px]">🗺️</span>
              <div>
                <p className="text-white text-[13px] font-semibold">
                  "Santiago → Buenos Aires → São Paulo, 14 días en julio, 2 personas, comfort"
                </p>
                <p className="text-white/35 text-[10px] mt-0.5">
                  Solicitud recibida · Iniciando agentes...
                </p>
              </div>
              <div className="ml-auto shrink-0">
                <div
                  className="w-2 h-2 rounded-full bg-sunset"
                  style={{ animation: phase < 2 ? "pulse 1s ease-in-out infinite" : undefined }}
                />
              </div>
            </div>

            {/* Agents */}
            <div className="space-y-2.5">
              {AGENTS.map((agent, i) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  status={agentStatuses[i]}
                  delay={i * 60}
                />
              ))}
            </div>

            {/* Summary bar */}
            <div
              className="mt-5 rounded-xl border px-4 py-3 flex items-center justify-between transition-all duration-700"
              style={{
                backgroundColor: allDone ? "rgba(46,125,50,0.15)" : "rgba(255,255,255,0.04)",
                borderColor: allDone ? "rgba(46,125,50,0.4)" : "rgba(255,255,255,0.08)",
                opacity: phase >= 1 ? 1 : 0.3,
              }}
            >
              <div>
                <p
                  className="text-[12px] font-bold transition-colors duration-500"
                  style={{ color: allDone ? "#4CAF50" : "rgba(255,255,255,0.3)" }}
                >
                  {allDone ? "✅ Plan listo en 4.3 segundos" : "⏳ Agentes trabajando..."}
                </p>
                {allDone && (
                  <p
                    className="text-white/50 text-[10px] mt-0.5"
                    style={{ animation: "fadeInUp 0.4s ease-out both" }}
                  >
                    14 días planificados · $1.842.000 total · PDF generado
                  </p>
                )}
              </div>
              {allDone && (
                <div
                  className="text-[22px] font-bold tabular-nums text-sunset"
                  style={{ animation: "scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
                >
                  $1.842.000
                </div>
              )}
            </div>
          </div>

          {/* Right: PDF preview */}
          <div className="flex items-start justify-center lg:sticky lg:top-24">
            <PDFMock visible={pdfVisible} />
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14">
          <p className="text-[15px] text-white/50 mb-5">
            Tus viajes, planificados por agentes que no descansan.
          </p>
          <a
            href="/planificar"
            className="btn btn-accent text-[16px] px-10 min-h-[52px] inline-flex items-center gap-2"
          >
            Planificar mi viaje ahora →
          </a>
        </div>
      </div>
    </section>
  );
}
