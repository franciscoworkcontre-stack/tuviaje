import {
  PlaneIcon as Plane,
  BedDoubleIcon as BedDouble,
  DollarSignIcon as DollarSign,
  FileDownIcon as FileDown,
  SparklesIcon as Sparkles,
  MapIcon as Map,
} from "@/components/ui/AnimatedIcons";

const FEATURES = [
  {
    icon: Plane,
    title: "El mejor vuelo, ya elegido",
    description:
      "Buscamos en Google Flights y puntuamos cada opción por precio y duración según tu estilo de viaje. No ves una lista — ves el ganador directo.",
    detail: "Precio + tiempo penalizado = score. El menor gana.",
    span: "lg:col-span-2",
    accent: "#1565C0",
    bg: "#EFF6FF",
  },
  {
    icon: BedDouble,
    title: "Hotel en el barrio correcto",
    description:
      "No buscamos \"hotel en Buenos Aires\" — buscamos \"hotel en Palermo\". La zona importa tanto como el precio. Evaluamos con fórmula Bayesiana para no penalizar hoteles con pocas reseñas.",
    detail: "Búsqueda por barrio · scoring Bayesiano · validación IA",
    span: "lg:col-span-2",
    accent: "#6A1B9A",
    bg: "#F3E8FD",
  },
  {
    icon: Map,
    title: "Itinerario día a día",
    description:
      "Actividades con horarios, restaurantes por presupuesto y transporte local. Cada día tiene tema y el último incluye traslado al aeropuerto.",
    detail: "09:00 → 13:30 → 20:00 · día completo",
    span: "lg:col-span-2",
    accent: "#2E7D32",
    bg: "#EDFBEE",
  },
  {
    icon: DollarSign,
    title: "Costos reales, no estimados",
    description:
      "Los precios de vuelos y hoteles vienen de búsquedas reales, no de promedios históricos. El desglose muestra vuelos, alojamiento, comida, actividades y transporte local.",
    detail: "CLP · USD · EUR — tú eliges",
    span: "lg:col-span-3",
    accent: "#9A6D08",
    bg: "#FFF8E1",
  },
  {
    icon: Sparkles,
    title: "Estrategia de vuelos",
    description:
      "Para multi-ciudad analizamos si conviene ida y vuelta con hub central o vuelos one-way independientes. La decisión la tomamos nosotros y te explicamos por qué.",
    detail: "RT desde hub vs. one-way · ahorro calculado",
    span: "lg:col-span-3",
    accent: "#7B1FA2",
    bg: "#EDE8FE",
  },
  {
    icon: FileDown,
    title: "PDF magazine-quality",
    description:
      "Portada, mapa de ruta, itinerario por día, hoteles y links de reserva en un solo archivo imprimible.",
    detail: "Imprimible o digital · comparte con tu grupo",
    span: "lg:col-span-2",
    accent: "#1565C0",
    bg: "#EFF6FF",
  },
];

export function Features() {
  return (
    <section className="py-20 px-6 bg-[#F5F0E8]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className="text-center mb-14"
          style={{ animation: "fadeInUp 0.6s ease-out both" }}
        >
          <p className="section-label mb-3">En qué somos buenos</p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[#1A2332] mb-4">
            Decisiones que nosotros tomamos por ti
          </h2>
          <p className="text-[17px] text-[#78909C] max-w-xl mx-auto">
            No ves opciones para elegir. Ves el resultado. Cada decisión tiene lógica y puedes revisarla.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {FEATURES.map(({ icon: Icon, title, description, detail, span, accent, bg }, i) => (
            <div
              key={title}
              className={`group relative rounded-2xl border border-dashed p-6 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5 ${span}`}
              style={{
                backgroundColor: bg,
                borderColor: accent + "40",
                animation: `fadeInUp 0.5s ease-out ${0.08 + i * 0.07}s both`,
              }}
            >
              {/* Corner decoration */}
              <div
                className="absolute top-0 right-0 w-16 h-16 rounded-tr-2xl opacity-[0.06]"
                style={{ background: `radial-gradient(circle at top right, ${accent}, transparent 70%)` }}
              />

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: accent + "18", color: accent }}
              >
                <Icon size={20} />
              </div>

              <h3 className="font-serif text-[16px] font-semibold text-[#1A2332] mb-2 leading-snug">
                {title}
              </h3>
              <p className="text-[13px] text-[#546E7A] leading-relaxed mb-4">{description}</p>

              <div
                className="text-[11px] font-mono px-3 py-2 rounded-lg border"
                style={{ backgroundColor: accent + "10", borderColor: accent + "20", color: accent }}
              >
                {detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
