"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon as ArrowRight,
  SparklesIcon as Sparkles,
  LoaderIcon as Loader2,
  XIcon as X,
  PlusIcon as Plus,
  MinusIcon as Minus,
  ChevronUpIcon as ChevronUp,
  ChevronDownIcon as ChevronDown,
  MapPinIcon as MapPin,
  CalendarIcon as Calendar,
  WandIcon as Wand2,
} from "@/components/ui/AnimatedIcons";
import { useTripStore } from "@/stores/tripStore";
import type { TravelStyle } from "@/types/trip";
import type { DateSuggestion } from "@/app/api/suggest-dates/route";

const STYLE_OPTIONS: { value: TravelStyle; emoji: string; label: string; range: string; desc: string }[] = [
  { value: "mochilero", emoji: "🎒", label: "Mochilero", range: "$30–50K/día", desc: "Hostales · buses · street food" },
  { value: "comfort",   emoji: "🧳", label: "Comfort",   range: "$80–150K/día", desc: "Hotel 3–4★ · buenos restós" },
  { value: "premium",   emoji: "✨", label: "Premium",   range: "$200K+/día", desc: "Hotel 5★ · privado · top" },
];

const EXAMPLES = [
  "Quiero ir de Nueva York a París y Roma, 2 semanas en julio, somos 2",
  "Viaje a Lima y Cartagena, 10 días en agosto, mi esposa y yo",
  "Mochilero por Brasil: São Paulo, Río y Florianópolis, 3 semanas",
];

interface CityRow { name: string; days: number; firstTime: boolean }

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${day} ${months[month - 1]} ${year}`;
}

export default function PlanificarPage() {
  const router = useRouter();
  const { setPlanningInput, setTrip, setIsGenerating, setGeneratingStep, setGeneratingSteps, setGeneratingEstimatedMs, setGeneratingCountdownSec } = useTripStore();

  const [step, setStep] = useState<"input" | "clarify" | "dates" | "confirm" | "generating" | "error">("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);

  // Flexible date suggestions
  const [suggestions, setSuggestions] = useState<DateSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [flexibleContext, setFlexibleContext] = useState<{month: string; year: number; duration: number} | null>(null);

  // Clarification
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [clarificationAnswer, setClarificationAnswer] = useState("");

  // Route state
  const [origin, setOrigin] = useState("");
  const [cityRows, setCityRows] = useState<CityRow[]>([]);
  const [departureDate, setDepartureDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [style, setStyle] = useState<TravelStyle>("comfort");
  const [newCity, setNewCity] = useState("");
  const [roundTrip, setRoundTrip] = useState(true);

  // Computed: arrival/departure date per city
  const cityDates = useCallback(() => {
    if (!departureDate) return cityRows.map(() => ({ arrival: "", departure: "" }));
    let cursor = departureDate;
    return cityRows.map((row) => {
      const arrival = cursor;
      const departure = addDays(cursor, row.days);
      cursor = addDays(departure, 1); // 1 day transit
      return { arrival, departure };
    });
  }, [departureDate, cityRows]);

  const endDate = cityRows.length > 0
    ? cityDates()[cityRows.length - 1]?.departure ?? ""
    : "";

  function buildGeneratingSteps(cities: CityRow[], originCity: string): string[] {
    const steps: string[] = [
      "🔍 Analizando rutas y fechas óptimas...",
    ];
    // One flight step per leg
    const allCities = [{ name: originCity }, ...cities];
    for (let i = 0; i < cities.length; i++) {
      steps.push(`✈️ Buscando vuelos ${allCities[i].name} → ${cities[i].name}...`);
    }
    steps.push("🏨 Buscando hoteles según tu estilo...");
    // One city itinerary step per city
    for (const city of cities) {
      steps.push(`🗺️ Armando itinerario en ${city.name} (${city.days} días)...`);
    }
    steps.push("💰 Calculando costos y desglose por persona...");
    steps.push("✨ Preparando tu plan completo...");
    return steps;
  }

  async function handleClarify() {
    if (!clarificationAnswer.trim()) return;
    const combined = `${rawText}. ${clarificationAnswer}`;
    setRawText(combined);
    setClarificationAnswer("");
    setParsing(true);
    setStep("input"); // temporarily show nothing while re-parsing
    await runParse(combined);
  }

  async function handleParse() {
    if (!rawText.trim()) return;
    setParsing(true);
    await runParse(rawText);
  }

  async function runParse(text: string) {
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const p = await res.json();
      const cities: string[] = p.destinationCities ?? ["Buenos Aires"];
      const days: number[] = p.daysPerCity ?? cities.map(() => 4);
      setCityRows(cities.map((name: string, i: number) => ({ name, days: days[i] ?? 4, firstTime: true })));
      setOrigin(p.originCity ?? "");
      setAdults(p.adults ?? 2);
      setChildren(p.children ?? 0);
      setInfants(p.infants ?? 0);
      setStyle(p.travelStyle ?? "comfort");

      // Needs clarification?
      if (p.needsClarification && p.clarificationQuestion) {
        setClarificationQuestion(p.clarificationQuestion);
        const cities: string[] = p.destinationCities ?? [];
        const days: number[] = p.daysPerCity ?? cities.map(() => 4);
        setCityRows(cities.map((name: string, i: number) => ({ name, days: days[i] ?? 4, firstTime: true })));
        setAdults(p.adults ?? 2);
        setChildren(p.children ?? 0);
        setInfants(p.infants ?? 0);
        setStyle(p.travelStyle ?? "comfort");
        setParsing(false);
        setStep("clarify");
        return;
      }

      // Fallback: if no departure date but has a month, treat as flexible
      const isFlexible = p.flexible ||
        (!p.departureDate && p.flexibleMonth) ||
        (!p.departureDate && /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i.test(rawText) && !/\bdel?\s+\d+\b/i.test(rawText));

      // Extract month from raw text as last resort
      const MONTHS: Record<string, number> = { enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,octubre:9,noviembre:10,diciembre:11 };
      const monthMatch = rawText.toLowerCase().match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i);
      const detectedMonth = p.flexibleMonth ?? monthMatch?.[1]?.toLowerCase() ?? null;
      const weeksMatch = rawText.match(/(\d+)\s*semanas?/i);
      const daysMatch = rawText.match(/(\d+)\s*d[ií]as?/i);
      const detectedDuration = p.flexibleDurationDays ?? (weeksMatch ? parseInt(weeksMatch[1]) * 7 : daysMatch ? parseInt(daysMatch[1]) : null);
      const detectedYear = p.flexibleYear ?? (() => {
        if (!detectedMonth) return new Date().getFullYear();
        const mIdx = MONTHS[detectedMonth] ?? 0;
        const now = new Date();
        return mIdx < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
      })();

      if (isFlexible && detectedMonth && detectedDuration) {
        // Flexible dates — go to suggestions step
        const ctx = { month: detectedMonth, year: detectedYear, duration: detectedDuration };
        setFlexibleContext(ctx);
        setLoadingSuggestions(true);
        setStep("dates");
        const sugRes = await fetch("/api/suggest-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: ctx.month,
            year: ctx.year,
            durationDays: ctx.duration,
            destinations: cities,
            travelStyle: p.travelStyle ?? "comfort",
            originCity: p.originCity ?? origin,
          }),
        });
        const sugData = await sugRes.json();
        setSuggestions(sugData.suggestions ?? []);
        setLoadingSuggestions(false);
      } else {
        setDepartureDate(p.departureDate ?? "");
        setStep("confirm");
      }
    } catch {
      setCityRows([{ name: "Buenos Aires", days: 4, firstTime: true }]);
      setParsing(false);
      setStep("confirm");
    }
  }

  function pickSuggestion(s: DateSuggestion) {
    // Just set the departure date — keep the daysPerCity already parsed from user text.
    // Recalculating from the suggestion's date window caused bugs when the LLM returned
    // a slightly different duration than what the user described.
    setDepartureDate(s.startDate);
    setStep("confirm");
  }

  async function handleGenerate() {
    if (!cityRows.length || !departureDate) return;
    setStep("generating");

    // Compute endDate directly here — don't rely on render-time closure
    const dates = cityDates();
    const computedEndDate = dates[dates.length - 1]?.departure ?? "";
    if (!computedEndDate) {
      setErrorMsg("No se pudo calcular la fecha de regreso. Revisa las fechas.");
      setStep("error");
      return;
    }

    const input = {
      rawText,
      originCity: origin,
      destinationCities: cityRows.map((r) => r.name),
      daysPerCity: cityRows.map((r) => r.days),
      firstTimeCities: Object.fromEntries(cityRows.map((r) => [r.name, r.firstTime])),
      startDate: departureDate,
      endDate: computedEndDate,
      adults,
      children,
      infants,
      travelStyle: style,
      flexibleDates: false,
      roundTrip,
      confirmed: true,
    };
    setPlanningInput(input);
    setIsGenerating(true);

    // Build dynamic steps based on actual cities
    const dynSteps = buildGeneratingSteps(cityRows, origin);
    setGeneratingSteps(dynSteps);
    // Estimate: 10s base + Haiku days (parallel, so bottleneck is longest city or hotels+flights ~12s)
    const estimatedMs = Math.max(22000, 10000 + Math.max(...cityRows.map(r => r.days)) * 1200);
    setGeneratingEstimatedMs(estimatedMs);

    // Start API immediately
    const apiPromise = fetch("/api/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    // Animate steps in sync with estimated timeline
    let done = false;
    const genStartMs = Date.now();
    apiPromise.finally(() => { done = true; });

    const msPerStep = estimatedMs / dynSteps.length;
    for (const s of dynSteps) {
      setGeneratingStep(s);
      await new Promise((r) => setTimeout(r, msPerStep));
      if (done) break;
    }

    // If API is still running, keep last step active + show countdown separately
    if (!done) setGeneratingStep(dynSteps[dynSteps.length - 1]);
    while (!done) {
      const elapsed = Date.now() - genStartMs;
      const remaining = Math.max(0, Math.ceil((estimatedMs - elapsed) / 1000));
      setGeneratingCountdownSec(remaining);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setGeneratingCountdownSec(0);

    try {
      const res = await apiPromise;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      if (data.trip) {
        setTrip(data.trip);
        setIsGenerating(false);
        router.push(`/viaje/${data.trip.id}`);
      } else {
        throw new Error(data.error ?? "Sin respuesta");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      setIsGenerating(false);
      setStep("error");
    }
  }

  function moveCity(i: number, dir: -1 | 1) {
    setCityRows((rows) => {
      const next = [...rows];
      const j = i + dir;
      if (j < 0 || j >= next.length) return rows;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function setDays(i: number, d: number) {
    setCityRows((rows) => rows.map((r, idx) => idx === i ? { ...r, days: Math.max(1, d) } : r));
  }

  function addCity() {
    const name = newCity.trim();
    if (name && !cityRows.find((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setCityRows((rows) => [...rows, { name, days: 4, firstTime: true }]);
      setNewCity("");
    }
  }

  if (step === "generating") return <GeneratingScreen />;

  if (step === "clarify") {
    return (
      <div className="min-h-screen bg-[#0D1F3C] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg" style={{ animation: "scaleIn 0.35s ease-out both" }}>
          <div className="text-center mb-8">
            <p className="font-serif text-[26px] font-bold text-white mb-1">
              tu<span className="text-ocean-light">[viaje]</span>
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-3">Una pregunta rápida</p>
            <p className="text-white text-[18px] font-semibold leading-snug mb-6">
              {clarificationQuestion}
            </p>
            <textarea
              value={clarificationAnswer}
              onChange={(e) => setClarificationAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.metaKey && handleClarify()}
              placeholder="Escribe aquí..."
              rows={3}
              className="w-full bg-white/8 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 text-[15px] resize-none focus:outline-none focus:border-ocean-light/50 transition-colors mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setStep("input")}
                className="flex-1 py-3 rounded-xl border border-white/15 text-white/50 hover:text-white/75 text-[14px] transition-colors"
              >
                ← Volver
              </button>
              <button
                onClick={handleClarify}
                disabled={!clarificationAnswer.trim() || parsing}
                className="flex-[2] btn btn-accent min-h-[48px] text-[14px] disabled:opacity-40"
              >
                {parsing
                  ? <><Loader2 size={14} className="animate-spin" /> Procesando...</>
                  : <>Continuar <ArrowRight size={14} /></>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "dates") {
    return (
      <div className="min-h-screen bg-[#0D1F3C] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8" style={{ animation: "fadeInDown 0.4s ease-out both" }}>
            <p className="font-serif text-[26px] font-bold text-white mb-1">
              tu<span className="text-ocean-light">[viaje]</span>
            </p>
          </div>

          <div style={{ animation: "scaleIn 0.35s ease-out both" }}>
            <div className="flex items-center justify-between px-1 mb-3">
              <div>
                <p className="text-white font-semibold text-[15px] flex items-center gap-2">
                  <Wand2 size={15} className="text-ocean-light" />
                  Mejor ventana en {flexibleContext?.month} {flexibleContext?.year}
                </p>
                <p className="text-white/40 text-[12px] mt-0.5">
                  {flexibleContext?.duration} días · {cityRows.map(r => r.name).join(" → ")}
                </p>
              </div>
              <button
                onClick={() => setStep("input")}
                className="text-white/35 hover:text-white/65 text-[12px] flex items-center gap-1 transition-colors"
              >
                <X size={12} /> Volver
              </button>
            </div>

            {loadingSuggestions ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-3 border-ocean/20" />
                  <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-ocean-light"
                    style={{ animation: "spin 1s linear infinite" }} />
                </div>
                <div className="text-center">
                  <p className="text-white/70 text-[14px] font-semibold">Analizando {flexibleContext?.month}...</p>
                  <p className="text-white/30 text-[12px] mt-1">Revisando feriados, temporadas y precios</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left bg-white/5 hover:bg-white/8 border border-white/10 hover:border-ocean-light/30 rounded-2xl p-4 transition-all group"
                    style={{ animation: `fadeInUp 0.3s ease-out ${i * 0.08}s both` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {s.badge && (
                          <p className="text-[11px] font-bold text-ocean-light mb-1.5">{s.badge}</p>
                        )}
                        <p className="text-[16px] font-bold text-white mb-1">{s.title}</p>
                        <p className="text-[12px] text-white/50 leading-relaxed">{s.reason}</p>
                        {s.warnings && (
                          <p className="text-[11px] text-sunset/70 mt-1.5 flex items-start gap-1">
                            <span className="shrink-0">⚠️</span> {s.warnings}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-ocean/30 border border-white/10 group-hover:border-ocean/50 flex items-center justify-center transition-all">
                          <ArrowRight size={14} className="text-white/30 group-hover:text-ocean-light transition-colors" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {/* Manual option */}
                <button
                  onClick={() => setStep("confirm")}
                  className="w-full text-center text-[12px] text-white/25 hover:text-white/50 transition-colors py-2"
                >
                  Prefiero elegir las fechas yo mismo →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-[#0D1F3C] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-[48px] mb-4">😵</p>
          <p className="font-serif text-[22px] font-bold text-white mb-2">Algo salió mal</p>
          <p className="text-[14px] text-white/50 mb-2">No pudimos generar el itinerario.</p>
          {errorMsg && (
            <p className="text-[11px] text-white/25 font-mono mb-4 px-3 py-2 bg-white/5 rounded-lg break-all">
              {errorMsg}
            </p>
          )}
          <button onClick={() => setStep("confirm")} className="btn btn-accent px-6">
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  const dates = cityDates();
  const canGenerate = cityRows.length > 0 && !!departureDate;

  return (
    <div className="min-h-screen bg-[#0D1F3C] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8" style={{ animation: "fadeInDown 0.4s ease-out both" }}>
          <p className="font-serif text-[26px] font-bold text-white mb-1">
            tu<span className="text-ocean-light">[viaje]</span>
          </p>
          <p className="text-white/40 text-[13px]">Cuéntanos tu viaje y lo planificamos todo</p>
        </div>

        {/* ── Step 1: input ── */}
        {step === "input" && (
          <div style={{ animation: "scaleIn 0.4s ease-out 0.1s both" }}>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
              {/* Textarea */}
              <div className="p-5 pb-3">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Quiero ir de Nueva York a París y Roma, 2 semanas en julio, somos 2 personas..."
                  rows={5}
                  className="w-full bg-transparent text-white placeholder-white/30 text-[16px] resize-none focus:outline-none leading-relaxed"
                  onKeyDown={(e) => e.key === "Enter" && e.metaKey && handleParse()}
                  autoFocus
                />
              </div>
              {/* Footer bar */}
              <div className="border-t border-white/8 px-5 py-3 flex items-center justify-between gap-3 bg-white/3">
                <p className="text-white/20 text-[12px] hidden sm:block">⌘↵ para continuar</p>
                <button
                  onClick={handleParse}
                  disabled={!rawText.trim() || parsing}
                  className="btn btn-accent text-[14px] min-h-[44px] px-6 ml-auto disabled:opacity-40"
                >
                  {parsing
                    ? <><Loader2 size={15} className="animate-spin" /> Interpretando...</>
                    : <><Sparkles size={15} /> Planificar <ArrowRight size={15} /></>
                  }
                </button>
              </div>
            </div>

            {/* Examples */}
            <div className="mt-5">
              <p className="text-white/25 text-[11px] font-semibold uppercase tracking-widest px-1 mb-2.5">
                Prueba con un ejemplo
              </p>
              <div className="space-y-2">
                {EXAMPLES.map((e) => (
                  <button
                    key={e}
                    onClick={() => setRawText(e)}
                    className="w-full text-left text-[13px] text-white/40 hover:text-white/70 transition-colors px-4 py-3 rounded-xl border border-white/8 hover:border-white/20 hover:bg-white/4"
                  >
                    "{e}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: confirm route ── */}
        {step === "confirm" && (
          <div style={{ animation: "scaleIn 0.35s ease-out both" }} className="space-y-3">

            {/* Header */}
            <div className="flex items-center justify-between px-1">
              <p className="text-white font-semibold text-[15px]">Confirma tu ruta</p>
              <button
                onClick={() => setStep("input")}
                className="text-white/35 hover:text-white/65 text-[12px] flex items-center gap-1 transition-colors"
              >
                <X size={12} /> Reescribir
              </button>
            </div>

            {/* Route card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">

              {/* Departure date row */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
                <div className="w-8 h-8 rounded-full bg-ocean/30 border border-ocean/50 flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-ocean-light" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-white/40 uppercase tracking-wide font-semibold">Origen</p>
                  <p className="text-[14px] font-semibold text-white">📍 {origin}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-[10px] text-white/35 uppercase tracking-wide flex items-center gap-1">
                    <Calendar size={9} /> Sale el
                  </p>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="bg-white/8 border border-white/15 rounded-lg px-2.5 py-1.5 text-white text-[13px] font-semibold focus:outline-none focus:border-ocean-light/50 [color-scheme:dark] w-[148px]"
                  />
                </div>
              </div>

              {/* City rows */}
              {cityRows.map((row, i) => (
                <div
                  key={i}
                  className="border-b border-white/8 last:border-b-0"
                  style={{ animation: `fadeInUp 0.25s ease-out ${i * 0.05}s both` }}
                >
                  {/* Transit indicator */}
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white/2">
                    <div className="w-8 flex justify-center">
                      <div className="w-[1px] h-4 bg-white/15" />
                    </div>
                    <p className="text-[10px] text-white/25">✈️ vuelo / traslado</p>
                  </div>

                  {/* City */}
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    {/* Number + reorder */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => moveCity(i, -1)}
                        disabled={i === 0}
                        className="text-white/20 hover:text-white/50 disabled:opacity-0 transition-colors p-0.5"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[12px] font-bold text-white/70">
                        {i + 1}
                      </div>
                      <button
                        onClick={() => moveCity(i, 1)}
                        disabled={i === cityRows.length - 1}
                        className="text-white/20 hover:text-white/50 disabled:opacity-0 transition-colors p-0.5"
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>

                    {/* City name + dates */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-white truncate">{row.name}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">
                        {dates[i]?.arrival ? `${fmtDate(dates[i].arrival)} → ${fmtDate(dates[i].departure)}` : "Agrega fecha de salida"}
                      </p>
                      {/* First time toggle */}
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => setCityRows((rows) => rows.map((r, idx) => idx === i ? { ...r, firstTime: true } : r))}
                          className={`text-[10px] px-2.5 py-1 rounded-l-lg border border-r-0 transition-colors font-semibold ${
                            row.firstTime
                              ? "bg-ocean/30 border-ocean-light/50 text-ocean-light"
                              : "bg-white/5 border-white/12 text-white/30 hover:text-white/50"
                          }`}
                        >
                          ✨ Primera vez
                        </button>
                        <button
                          onClick={() => setCityRows((rows) => rows.map((r, idx) => idx === i ? { ...r, firstTime: false } : r))}
                          className={`text-[10px] px-2.5 py-1 rounded-r-lg border transition-colors font-semibold ${
                            !row.firstTime
                              ? "bg-sunset/20 border-sunset/50 text-sunset"
                              : "bg-white/5 border-white/12 text-white/30 hover:text-white/50"
                          }`}
                        >
                          ↩ Ya la conozco
                        </button>
                      </div>
                    </div>

                    {/* Days counter */}
                    <div className="flex items-center gap-0 shrink-0 bg-white/8 border border-white/12 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setDays(i, row.days - 1)}
                        className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <div className="w-12 text-center">
                        <p className="text-[14px] font-bold text-white tabular-nums">{row.days}</p>
                        <p className="text-[9px] text-white/35 -mt-0.5">días</p>
                      </div>
                      <button
                        onClick={() => setDays(i, row.days + 1)}
                        className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => setCityRows((rows) => rows.filter((_, idx) => idx !== i))}
                      className="text-white/20 hover:text-white/50 transition-colors ml-1 mt-0.5 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Return row */}
              {roundTrip && cityRows.length > 0 && endDate && (
                <div className="border-t border-white/8">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white/2">
                    <div className="w-8 flex justify-center">
                      <div className="w-[1px] h-4 bg-white/15" />
                    </div>
                    <p className="text-[10px] text-white/25">✈️ vuelo de regreso</p>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-ocean/20 border border-ocean/30 flex items-center justify-center shrink-0">
                      <MapPin size={12} className="text-ocean-light/60" />
                    </div>
                    <div>
                      <p className="text-[13px] text-white/50">📍 {origin}</p>
                      <p className="text-[11px] text-white/30">{fmtDate(endDate)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Add city */}
              <div className="border-t border-white/8 flex gap-2 p-3">
                <input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCity()}
                  placeholder="+ Agregar ciudad..."
                  className="flex-1 bg-transparent text-white/60 placeholder-white/25 text-[13px] focus:outline-none px-2"
                />
                <button
                  onClick={addCity}
                  disabled={!newCity.trim()}
                  className="bg-ocean/30 hover:bg-ocean/50 disabled:opacity-30 border border-ocean/40 rounded-lg px-3 py-1.5 text-white text-[12px] font-semibold transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Travelers + style */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              {/* Adults */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/60 text-[13px] font-semibold">Viajeros</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAdults((a) => Math.max(1, a - 1))}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="text-white font-bold text-[18px] w-6 text-center tabular-nums">{adults}</span>
                  <button
                    onClick={() => setAdults((a) => Math.min(10, a + 1))}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                  <span className="text-white/35 text-[12px] w-[48px]">adultos</span>
                </div>
              </div>

              {/* Children 2–12 */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-[12px]">Niños <span className="text-white/25">(2–12 años · 75% tarifa)</span></p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setChildren((c) => Math.max(0, c - 1))}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="text-white font-bold text-[18px] w-6 text-center tabular-nums">{children}</span>
                  <button
                    onClick={() => setChildren((c) => Math.min(8, c + 1))}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                  <span className="text-white/35 text-[12px] w-[48px]">niños</span>
                </div>
              </div>

              {/* Infants 0–1 */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/40 text-[12px]">Bebés <span className="text-white/25">(0–1 año · ~10% tarifa)</span></p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setInfants((c) => Math.max(0, c - 1))}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="text-white font-bold text-[18px] w-6 text-center tabular-nums">{infants}</span>
                  <button
                    onClick={() => setInfants((c) => Math.min(adults, c + 1))}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                  <span className="text-white/35 text-[12px] w-[48px]">bebés</span>
                </div>
              </div>

              {/* Style selector */}
              <p className="text-white/60 text-[13px] font-semibold mb-2.5">Estilo de viaje</p>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStyle(opt.value)}
                    className={`relative rounded-xl p-3 text-left transition-all border ${
                      style === opt.value
                        ? "border-ocean-light/50 bg-ocean/20 shadow-[0_0_12px_rgba(66,165,245,0.15)]"
                        : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6"
                    }`}
                  >
                    <p className="text-[22px] mb-1.5">{opt.emoji}</p>
                    <p className={`text-[13px] font-bold ${style === opt.value ? "text-white" : "text-white/60"}`}>
                      {opt.label}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${style === opt.value ? "text-ocean-light/80" : "text-white/30"}`}>
                      {opt.range}
                    </p>
                    <p className={`text-[9px] mt-1 leading-tight ${style === opt.value ? "text-white/50" : "text-white/20"}`}>
                      {opt.desc}
                    </p>
                    {style === opt.value && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-ocean-light flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Round trip toggle */}
            <button
              onClick={() => setRoundTrip(r => !r)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all ${
                roundTrip
                  ? "border-ocean-light/40 bg-ocean/15 text-white"
                  : "border-white/10 bg-white/4 text-white/50 hover:text-white/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[18px]">🔄</span>
                <div className="text-left">
                  <p className="text-[13px] font-semibold">Vuelo de regreso a {origin}</p>
                  <p className="text-[11px] opacity-50 mt-0.5">
                    {roundTrip ? `Incluye vuelo de vuelta el ${endDate ? fmtDate(endDate) : "último día"}` : "Solo ida, sin vuelta incluida"}
                  </p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full transition-all relative shrink-0 ${roundTrip ? "bg-ocean" : "bg-white/15"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${roundTrip ? "left-5" : "left-1"}`} />
              </div>
            </button>

            {/* CTA */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="btn btn-accent w-full text-[15px] min-h-[52px] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Sparkles size={16} />
              Generar itinerario completo
              <ArrowRight size={16} />
            </button>

            {!departureDate && cityRows.length > 0 && (
              <p className="text-center text-[12px] text-white/30">
                Agrega la fecha de salida para continuar
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GeneratingScreen() {
  const { generatingStep, generatingSteps, generatingEstimatedMs } = useTripStore();
  const [pct, setPct] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      setElapsedSec(Math.floor(elapsed / 1000));
      const raw = elapsed / generatingEstimatedMs;
      // Ease-out up to 95%, then creep 0.04%/s toward 99% so bar never freezes
      if (raw < 1) {
        const eased = 1 - Math.pow(1 - Math.min(raw, 1), 2.2);
        setPct(parseFloat((eased * 95).toFixed(1)));
      } else {
        const extra = Math.min((elapsed - generatingEstimatedMs) / 1000 * 0.04, 4);
        setPct(parseFloat((95 + extra).toFixed(1)));
      }
    }, 500);
    return () => clearInterval(id);
  }, [generatingEstimatedMs]);

  const currentIdx = generatingSteps.indexOf(generatingStep);
  const isOnLastStep = generatingSteps.length > 0 &&
    (currentIdx === generatingSteps.length - 1 || currentIdx === -1);

  return (
    <div className="min-h-screen bg-[#0D1F3C] flex items-center justify-center px-6">
      <div className="text-center max-w-sm w-full">
        {/* Spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-ocean/15" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-ocean-light"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[28px]">🗺️</span>
        </div>

        <p className="font-serif text-[22px] font-bold text-white mb-1">Armando tu viaje...</p>

        {/* Current step label */}
        <p
          className="text-[13px] text-white/50 mb-5 min-h-[20px]"
          key={generatingStep}
          style={{ animation: "fadeInUp 0.3s ease-out both" }}
        >
          {generatingStep}
        </p>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-white/25">Progreso</span>
            <span className="text-[12px] font-bold text-ocean-light tabular-nums">
              {isOnLastStep ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`}
            </span>
          </div>
          <div className="h-2 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ocean to-ocean-light rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Steps checklist */}
        <div className="space-y-1.5 text-left">
          {generatingSteps.map((s, i) => {
            const isLast = i === generatingSteps.length - 1;
            const done = i < currentIdx;
            const active = i === currentIdx || (isLast && isOnLastStep);
            return (
              <div
                key={s}
                className={`text-[12px] px-3 py-2 rounded-xl border transition-all duration-500 flex items-center justify-between gap-2 ${
                  active
                    ? "border-ocean-light/30 bg-ocean/15 text-white"
                    : done
                    ? "border-white/6 text-white/35"
                    : "border-white/4 text-white/15"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-[11px] w-4 text-center">
                    {done ? "✓" : active ? "→" : "·"}
                  </span>
                  {s}
                </div>
                {active && isLast && (
                  <span className="text-[11px] text-ocean-light font-mono tabular-nums shrink-0">
                    {elapsedSec}s
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
