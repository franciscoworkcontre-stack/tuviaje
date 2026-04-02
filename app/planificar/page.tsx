"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Loader2, X, Plus, Minus } from "lucide-react";
import { useTripStore } from "@/stores/tripStore";
import type { TravelStyle } from "@/types/trip";

const STYLE_OPTIONS: { value: TravelStyle; emoji: string; label: string; desc: string; price: string }[] = [
  { value: "mochilero", emoji: "🎒", label: "Mochilero",  desc: "Hostales, comida callejera, transporte público", price: "$30K–50K/día" },
  { value: "comfort",   emoji: "🧳", label: "Comfort",    desc: "Hotel 3–4★, buenos restaurantes, mix de transporte",  price: "$80K–150K/día" },
  { value: "premium",   emoji: "✨", label: "Premium",    desc: "Hotel 5★, restaurantes top, taxis y experiencias privadas", price: "$200K–400K/día" },
];

const EXAMPLE_PROMPTS = [
  "Quiero ir de Santiago a Buenos Aires y Montevideo, 2 semanas en julio, somos 2",
  "Viaje a Lima y Cartagena, 10 días en agosto, mi esposa y yo, comfort",
  "Mochilero por Brasil: São Paulo, Río y Florianópolis, 3 semanas",
];

// Naive AI-like parser — real version calls Claude
function parseNaturalInput(text: string) {
  const lower = text.toLowerCase();
  const cities: string[] = [];
  const knownCities = [
    "buenos aires","montevideo","são paulo","lima","bogotá","bogota",
    "cartagena","río de janeiro","rio de janeiro","medellín","medellin",
    "ciudad de méxico","ciudad de mexico","cancún","cancun","cusco",
    "quito","asunción","asuncion","florianópolis","florianopolis",
  ];
  for (const city of knownCities) {
    if (lower.includes(city)) {
      cities.push(city.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
    }
  }

  const adultsMatch = text.match(/(\d+)\s*(personas?|adultos?|viajeros?)/i);
  const adults = adultsMatch ? parseInt(adultsMatch[1]) : text.includes("esposa") || text.includes("pareja") ? 2 : 1;

  const daysMatch = text.match(/(\d+)\s*(días?|semanas?)/i);
  const daysUnit = text.match(/semanas?/i) ? 7 : 1;
  const days = daysMatch ? parseInt(daysMatch[1]) * daysUnit : 10;

  const style: TravelStyle = lower.includes("mochilero") ? "mochilero"
    : lower.includes("premium") || lower.includes("lujo") ? "premium"
    : "comfort";

  const monthNames: Record<string,number> = {
    enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,
    julio:6,agosto:7,septiembre:8,octubre:9,noviembre:10,diciembre:11,
  };
  let startDate = "";
  let endDate = "";
  for (const [month, idx] of Object.entries(monthNames)) {
    if (lower.includes(month)) {
      const year = new Date().getFullYear() + (idx < new Date().getMonth() ? 1 : 0);
      startDate = `${year}-${String(idx + 1).padStart(2,"0")}-15`;
      endDate = new Date(new Date(startDate).getTime() + days * 86400000)
        .toISOString().split("T")[0];
      break;
    }
  }
  if (!startDate) {
    const base = new Date();
    base.setMonth(base.getMonth() + 2);
    startDate = base.toISOString().split("T")[0];
    endDate = new Date(base.getTime() + days * 86400000).toISOString().split("T")[0];
  }

  return { cities, adults, style, startDate, endDate };
}

export default function PlanificarPage() {
  const router = useRouter();
  const { planningInput, setPlanningInput, setTrip, setIsGenerating, setGeneratingStep } = useTripStore();

  const [step, setStep] = useState<"input" | "confirm" | "generating">("input");
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);

  // Confirmed fields
  const [origin] = useState("Santiago");
  const [cities, setCities] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [style, setStyle] = useState<TravelStyle>("comfort");
  const [newCity, setNewCity] = useState("");

  const GENERATING_STEPS = [
    "✈️ Buscando vuelos entre ciudades...",
    "🏨 Encontrando alojamiento en tu rango...",
    "🤖 Generando itinerario día a día...",
    "💰 Calculando costos detallados...",
    "✨ Preparando tu plan...",
  ];

  async function handleParse() {
    if (!rawText.trim()) return;
    setParsing(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate
    const parsed = parseNaturalInput(rawText);
    setCities(parsed.cities.length ? parsed.cities : ["Buenos Aires"]);
    setAdults(parsed.adults);
    setStyle(parsed.style);
    setStartDate(parsed.startDate);
    setEndDate(parsed.endDate);
    setParsing(false);
    setStep("confirm");
  }

  async function handleGenerate() {
    if (!cities.length || !startDate || !endDate) return;
    setStep("generating");

    const input = {
      rawText,
      originCity: origin,
      destinationCities: cities,
      startDate,
      endDate,
      adults,
      children: 0,
      travelStyle: style,
      flexibleDates: false,
      confirmed: true,
    };
    setPlanningInput(input);

    // Animate steps
    setIsGenerating(true);
    for (const s of GENERATING_STEPS) {
      setGeneratingStep(s);
      await new Promise((r) => setTimeout(r, 1800));
    }

    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (data.trip) {
        setTrip(data.trip);
        router.push(`/viaje/${data.trip.id}`);
      }
    } catch (e) {
      console.error(e);
      setStep("confirm");
    } finally {
      setIsGenerating(false);
    }
  }

  function removeCity(i: number) {
    setCities((c) => c.filter((_, idx) => idx !== i));
  }
  function addCity() {
    const trimmed = newCity.trim();
    if (trimmed && !cities.includes(trimmed)) {
      setCities((c) => [...c, trimmed]);
      setNewCity("");
    }
  }

  // ─── Step: generating ─────────────────────────────────────────
  if (step === "generating") {
    return <GeneratingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#0D1F3C] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-10" style={{ animation: "fadeInDown 0.4s ease-out both" }}>
          <p className="font-serif text-[28px] font-bold text-white mb-1">
            tu<span className="text-ocean-light">[viaje]</span>
          </p>
          <p className="text-white/50 text-[14px]">Cuéntanos tu viaje y lo planificamos todo</p>
        </div>

        {/* ─── Step 1: conversacional ─── */}
        {step === "input" && (
          <div
            className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
            style={{ animation: "scaleIn 0.5s ease-out 0.1s both" }}
          >
            <p className="text-white/80 text-[15px] font-semibold mb-3">
              ✏️ Describe tu viaje
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Quiero ir de Santiago a Buenos Aires y Montevideo, 2 semanas en julio, somos 2 personas..."
              rows={4}
              className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-[15px] resize-none focus:outline-none focus:border-ocean-light/60 transition-colors"
              onKeyDown={(e) => e.key === "Enter" && e.metaKey && handleParse()}
            />

            {/* Example prompts */}
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-white/30 text-[11px] font-semibold uppercase tracking-wide">Ejemplos</p>
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setRawText(p)}
                  className="text-left text-[12px] text-white/45 hover:text-white/75 transition-colors px-3 py-2 rounded-lg border border-white/8 hover:border-white/20"
                >
                  "{p}"
                </button>
              ))}
            </div>

            <button
              onClick={handleParse}
              disabled={!rawText.trim() || parsing}
              className="btn btn-accent w-full mt-5 text-[15px] min-h-[50px] disabled:opacity-40"
            >
              {parsing ? (
                <><Loader2 size={16} className="animate-spin" /> Interpretando...</>
              ) : (
                <><Sparkles size={16} /> Planificar mi viaje <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {/* ─── Step 2: confirmación estructurada ─── */}
        {step === "confirm" && (
          <div
            className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-6"
            style={{ animation: "scaleIn 0.4s ease-out both" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold text-[16px]">✅ ¿Se entiende así tu viaje?</p>
              <button
                onClick={() => setStep("input")}
                className="text-white/40 hover:text-white/70 text-[13px] flex items-center gap-1"
              >
                <X size={13} /> Reescribir
              </button>
            </div>

            {/* Origin (fixed) */}
            <div>
              <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide mb-2">Origen</p>
              <div className="bg-white/8 rounded-xl px-4 py-3 text-white/70 text-[14px] border border-white/10">
                📍 {origin}
              </div>
            </div>

            {/* Cities */}
            <div>
              <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide mb-2">Ciudades de destino</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {cities.map((c, i) => (
                  <div
                    key={c}
                    className="flex items-center gap-2 bg-ocean/30 border border-ocean/40 rounded-full px-3 py-1.5 text-[13px] text-white"
                  >
                    <span>{i + 1}. {c}</span>
                    <button onClick={() => removeCity(i)} className="text-white/50 hover:text-white">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCity()}
                  placeholder="Agregar ciudad..."
                  className="flex-1 bg-white/8 border border-white/15 rounded-xl px-3 py-2 text-white placeholder-white/30 text-[13px] focus:outline-none focus:border-ocean-light/60"
                />
                <button
                  onClick={addCity}
                  className="bg-ocean/40 hover:bg-ocean/60 border border-ocean/40 rounded-xl px-3 py-2 text-white transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide mb-2">Fecha de ida</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-3 text-white text-[14px] focus:outline-none focus:border-ocean-light/60 [color-scheme:dark]"
                />
              </div>
              <div>
                <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide mb-2">Fecha de vuelta</p>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-3 text-white text-[14px] focus:outline-none focus:border-ocean-light/60 [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Adults */}
            <div>
              <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide mb-2">Viajeros</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setAdults((a) => Math.max(1, a - 1))}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="text-white font-bold text-[20px] w-8 text-center tabular-nums">{adults}</span>
                <button
                  onClick={() => setAdults((a) => Math.min(10, a + 1))}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <Plus size={14} />
                </button>
                <span className="text-white/50 text-[13px]">adultos</span>
              </div>
            </div>

            {/* Style */}
            <div>
              <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide mb-2">Estilo de viaje</p>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStyle(opt.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      style === opt.value
                        ? "border-ocean-light/60 bg-ocean/25 text-white"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/25"
                    }`}
                  >
                    <span className="text-[20px] block mb-1">{opt.emoji}</span>
                    <p className="text-[12px] font-semibold">{opt.label}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{opt.price}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!cities.length || !startDate || !endDate}
              className="btn btn-accent w-full text-[15px] min-h-[52px] disabled:opacity-40"
            >
              <Sparkles size={16} />
              Generar mi itinerario completo
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GeneratingScreen() {
  const { generatingStep } = useTripStore();
  const steps = [
    "✈️ Buscando vuelos entre ciudades...",
    "🏨 Encontrando alojamiento en tu rango...",
    "🤖 Generando itinerario día a día...",
    "💰 Calculando costos detallados...",
    "✨ Preparando tu plan...",
  ];

  return (
    <div className="min-h-screen bg-[#0D1F3C] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-ocean/20" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-ocean-light"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[28px]">🗺️</span>
        </div>
        <p className="font-serif text-[22px] font-bold text-white mb-2">Armando tu viaje...</p>
        <p
          className="text-[14px] text-white/60 mb-8 min-h-[20px] transition-all"
          key={generatingStep}
          style={{ animation: "fadeInUp 0.3s ease-out both" }}
        >
          {generatingStep}
        </p>
        <div className="flex flex-col gap-2">
          {steps.map((s) => (
            <div
              key={s}
              className={`text-[12px] px-4 py-2 rounded-lg border transition-all ${
                s === generatingStep
                  ? "border-ocean-light/40 bg-ocean/20 text-white"
                  : "border-white/8 text-white/25"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
