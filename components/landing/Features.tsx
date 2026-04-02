import {
  PlaneIcon as Plane,
  BusIcon as Bus,
  BedDoubleIcon as BedDouble,
  UtensilsCrossedIcon as UtensilsCrossed,
  DollarSignIcon as DollarSign,
  FileDownIcon as FileDown,
  MapIcon as Map,
  SparklesIcon as Sparkles,
} from "@/components/ui/AnimatedIcons";

const FEATURES = [
  {
    icon: Plane,
    title: "Vuelos reales en tiempo real",
    description:
      "Precios actuales de LATAM, Sky, JetSMART y más. Comparamos todos los tramos de tu viaje en paralelo.",
    badge: "Kiwi Tequila API",
    color: "text-ocean bg-ocean-lighter",
  },
  {
    icon: Bus,
    title: "Buses y trenes incluidos",
    description:
      "Pullman, Andesmar, Turbus y operadores regionales. Si el bus es más barato que el vuelo, te lo decimos.",
    badge: "BusBud + Rome2Rio",
    color: "text-[#2E7D32] bg-[#E8F5E9]",
  },
  {
    icon: BedDouble,
    title: "Hoteles y hostales",
    description:
      "Desde suites 5 estrellas hasta hostales mochileros. Filtrado por zona, precio y proximidad a tus actividades.",
    badge: "Booking.com + Hostelworld",
    color: "text-ocean bg-ocean-lighter",
  },
  {
    icon: UtensilsCrossed,
    title: "Restaurantes por comida",
    description:
      "Almuerzo y cena recomendados cada día. 3 opciones por presupuesto: económico, medio y premium.",
    badge: "Google Places + Claude AI",
    color: "text-[#E64A19] bg-[#FBE9E7]",
  },
  {
    icon: DollarSign,
    title: "Presupuesto total detallado",
    description:
      "Todo consolidado: transporte, alojamiento, comida, actividades y transporte local. Por categoría, ciudad y día.",
    badge: "En CLP, USD o EUR",
    color: "text-[#9A6D08] bg-[#FFF8E1]",
  },
  {
    icon: Map,
    title: "Mapas interactivos",
    description:
      "Ruta entre ciudades y mapa del día a día. Ve los recorridos, distancias y tiempos de traslado.",
    badge: "Mapbox GL JS",
    color: "text-[#7B1FA2] bg-[#EDE8FE]",
  },
  {
    icon: FileDown,
    title: "PDF magazine-quality",
    description:
      "Exporta tu viaje completo. Portada, mapa de ruta, itinerario por día, hoteles y links de reserva.",
    badge: "Imprimible o digital",
    color: "text-ocean bg-ocean-lighter",
  },
  {
    icon: Sparkles,
    title: "IA que aprende tu estilo",
    description:
      "Primera vez o ya conoces la ciudad: el plan cambia. Mochilero o premium: los precios cambian. Tú decides.",
    badge: "Claude API",
    color: "text-[#7B1FA2] bg-[#EDE8FE]",
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
          <p className="section-label mb-3">Todo incluido</p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[#1A2332] mb-4">
            Un solo lugar para todo tu viaje
          </h2>
          <p className="text-[17px] text-[#78909C] max-w-xl mx-auto">
            Cada parte del viaje integrada, con precios reales y enlaces directos para reservar.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, description, badge, color }, i) => (
            <div
              key={title}
              className="card p-5 hover:shadow-[0_8px_24px_rgba(21,101,192,0.12)] transition-all hover:-translate-y-0.5"
              style={{ animation: `fadeInUp 0.5s ease-out ${0.08 + i * 0.07}s both` }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-serif text-[16px] font-semibold text-[#1A2332] mb-2 leading-snug">
                {title}
              </h3>
              <p className="text-[13px] text-[#78909C] leading-relaxed mb-3">{description}</p>
              <span className="text-[10px] font-semibold bg-[#F5F0E8] text-[#546E7A] px-2 py-0.5 rounded-full">
                {badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
