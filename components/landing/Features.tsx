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
      "Buscamos en Google Flights y puntuamos cada opción por precio y duración según tu estilo. No ves una lista — ves el ganador.",
    span: "lg:col-span-2",
    accent: "#1565C0",
    bg: "#EFF6FF",
  },
  {
    icon: BedDouble,
    title: "Hotel en el barrio correcto",
    description:
      "No buscamos \"hotel en Buenos Aires\" — buscamos \"hotel en Palermo\". La zona importa tanto como el precio.",
    span: "lg:col-span-2",
    accent: "#6A1B9A",
    bg: "#F3E8FD",
  },
  {
    icon: Map,
    title: "Itinerario día a día",
    description:
      "Actividades con horarios, restaurantes por presupuesto y transporte local. Cada día tiene tema.",
    span: "lg:col-span-2",
    accent: "#2E7D32",
    bg: "#EDFBEE",
  },
  {
    icon: DollarSign,
    title: "Costos de búsquedas reales",
    description:
      "Los precios de vuelos y hoteles vienen de búsquedas en vivo, no de promedios históricos. Desglose completo en USD, EUR, GBP y más.",
    span: "lg:col-span-3",
    accent: "#9A6D08",
    bg: "#FFF8E1",
  },
  {
    icon: Sparkles,
    title: "Estrategia de vuelos",
    description:
      "Para multi-ciudad analizamos si conviene ida y vuelta con hub o vuelos one-way independientes. La decisión la tomamos nosotros y te explicamos por qué.",
    span: "lg:col-span-3",
    accent: "#7B1FA2",
    bg: "#EDE8FE",
  },
  {
    icon: FileDown,
    title: "PDF listo para el viaje",
    description:
      "Portada, mapa de ruta, itinerario por día, hoteles y links de reserva en un archivo imprimible o compartible.",
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
          <h2 className="text-[36px] md:text-[44px] font-bold text-[#1A2332] mb-4">
            Decisiones que nosotros tomamos por ti
          </h2>
          <p className="text-[17px] text-[#78909C] max-w-xl mx-auto">
            No ves opciones para elegir. Ves el resultado. Cada decisión tiene lógica y puedes revisarla.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {FEATURES.map(({ icon: Icon, title, description, span, accent, bg }, i) => (
            <div
              key={title}
              className={`group relative rounded-2xl border p-6 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5 ${span}`}
              style={{
                backgroundColor: bg,
                borderColor: accent + "25",
                animation: `fadeInUp 0.5s ease-out ${0.08 + i * 0.07}s both`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: accent + "18", color: accent }}
              >
                <Icon size={20} />
              </div>

              <h3 className="font-serif text-[16px] font-semibold text-[#1A2332] mb-2 leading-snug">
                {title}
              </h3>
              <p className="text-[13px] text-[#546E7A] leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
