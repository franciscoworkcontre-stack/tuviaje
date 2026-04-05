import Link from "next/link";
import { ArrowRightIcon as ArrowRight } from "@/components/ui/AnimatedIcons";

const TOOLS = [
  {
    emoji: "💰",
    title: "¿Cuánto cuesta viajar a [Ciudad]?",
    description:
      "Ingresa la ciudad y cuántos días. Te mostramos el costo estimado por día según tu estilo: mochilero, comfort o premium.",
    cta: "Calcular costo",
    href: "/herramientas/costo-ciudad",
    color: "border-l-4 border-ocean",
  },
  {
    emoji: "📅",
    title: "Comparador de vuelos — Heatmap de precios",
    description:
      "Heatmap de precios para los próximos 3 meses. Encuentra el día más barato para volar.",
    cta: "Ver vuelos baratos",
    href: "/herramientas/vuelos-baratos",
    color: "border-l-4 border-[#2E7D32]",
  },
  {
    emoji: "🗓️",
    title: "¿Qué hacer en [Ciudad] en X días?",
    description:
      "Itinerario gratuito para 2–3 días en cualquier ciudad. El plan completo requiere cuenta.",
    cta: "Ver itinerario gratis",
    href: "/herramientas/itinerario-ciudad",
    color: "border-l-4 border-sunset",
  },
  {
    emoji: "🧮",
    title: "Calculadora de presupuesto de viaje",
    description:
      "Ruta, destinos, días y estilo → estimado total del viaje. Sin necesidad de crear cuenta.",
    cta: "Calcular presupuesto",
    href: "/herramientas/presupuesto",
    color: "border-l-4 border-[#7B1FA2]",
  },
];

export function SEOTools() {
  return (
    <section id="herramientas" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className="text-center mb-12"
          style={{ animation: "fadeInUp 0.6s ease-out both" }}
        >
          <h2 className="text-[36px] md:text-[44px] font-bold text-[#1A2332] mb-4">
            Empieza sin crear cuenta
          </h2>
          <p className="text-[17px] text-[#78909C] max-w-xl mx-auto">
            Calculadoras e itinerarios rápidos, gratis. Sin registro, sin tarjeta.
          </p>
        </div>

        {/* Tools grid */}
        <div className="grid sm:grid-cols-2 gap-5">
          {TOOLS.map(({ emoji, title, description, cta, href, color }, i) => (
            <div
              key={title}
              className={`card p-6 ${color} hover:shadow-[0_8px_24px_rgba(21,101,192,0.1)] transition-shadow`}
              style={{ animation: `fadeInUp 0.5s ease-out ${0.1 + i * 0.1}s both` }}
            >
              <div className="flex items-start gap-4">
                <span className="text-[32px]">{emoji}</span>
                <div className="flex-1">
                  <h3 className="font-serif text-[18px] font-semibold text-[#1A2332] mb-2 leading-snug">
                    {title}
                  </h3>
                  <p className="text-[14px] text-[#78909C] leading-relaxed mb-4">
                    {description}
                  </p>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ocean hover:underline"
                  >
                    {cta}
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
