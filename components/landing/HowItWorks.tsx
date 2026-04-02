const STEPS = [
  {
    number: "01",
    emoji: "🗺️",
    title: "Elige tus ciudades",
    description:
      "Ingresa tu ciudad de origen, agrega destinos en orden y elige las fechas. Hasta 10 ciudades por viaje.",
    detail: "Santiago → Buenos Aires → Montevideo → São Paulo",
    color: "bg-ocean-lighter border-ocean/20",
    textColor: "text-ocean",
  },
  {
    number: "02",
    emoji: "✈️",
    title: "Compara precios de transporte",
    description:
      "Buscamos vuelos, buses y trenes entre cada tramo. Ves precios reales y eliges el que más te conviene.",
    detail: "Sky $32.000 · LATAM $45.000 · Bus cama $25.000",
    color: "bg-[#E8F5E9] border-[#2E7D32]/20",
    textColor: "text-[#2E7D32]",
  },
  {
    number: "03",
    emoji: "🧭",
    title: "Personaliza por ciudad",
    description:
      "¿Primera vez o ya conoces? ¿Mochilero, comfort o premium? El agente adapta el plan a tu estilo.",
    detail: "Cultura · Comida · Naturaleza · Nightlife · Aventura",
    color: "bg-sunset-lighter border-sunset/20",
    textColor: "text-sunset-dark",
  },
  {
    number: "04",
    emoji: "🤖",
    title: "La IA genera tu itinerario",
    description:
      "Claude crea un plan día a día: actividades con horarios, restaurantes, tips locales y costos reales.",
    detail: "09:00 Plaza de Mayo → 11:00 Café Tortoni → 13:30 La Brigada",
    color: "bg-[#EDE8FE] border-[#7B1FA2]/20",
    textColor: "text-[#7B1FA2]",
  },
  {
    number: "05",
    emoji: "✏️",
    title: "Edita lo que quieras",
    description:
      "Cambia restaurantes, quita actividades, ajusta días. Cada cambio recalcula el presupuesto al instante.",
    detail: "Intercambia, agrega o elimina — el total se actualiza solo",
    color: "bg-[#FFF8E1] border-[#F9A825]/20",
    textColor: "text-[#9A6D08]",
  },
  {
    number: "06",
    emoji: "📄",
    title: "Descarga tu PDF",
    description:
      "Exporta tu viaje completo: itinerario, presupuesto, hoteles y actividades en formato magazine.",
    detail: "PDF con portada, mapa de ruta, día a día y links de reserva",
    color: "bg-ocean-lighter border-ocean/20",
    textColor: "text-ocean",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 px-6 bg-linen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className="text-center mb-14"
          style={{ animation: "fadeInUp 0.6s ease-out both" }}
        >
          <p className="section-label mb-3">Cómo funciona</p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[#1A2332] mb-4">
            De la idea al itinerario en 6 pasos
          </h2>
          <p className="text-[17px] text-[#78909C] max-w-xl mx-auto">
            Sin abrir 6 pestañas distintas. Sin armar Excel. Sin perder una tarde investigando.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {STEPS.map(({ number, emoji, title, description, detail, color, textColor }, i) => (
            <div
              key={number}
              className={`card p-6 border ${color} hover:shadow-[0_8px_24px_rgba(21,101,192,0.12)] transition-shadow`}
              style={{ animation: `fadeInUp 0.55s ease-out ${0.1 + i * 0.09}s both` }}
            >
              <div className="flex items-start gap-4 mb-4">
                <span className="text-[28px]">{emoji}</span>
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${textColor} mb-0.5`}>
                    Paso {number}
                  </p>
                  <h3 className="font-serif text-[18px] font-semibold text-[#1A2332]">
                    {title}
                  </h3>
                </div>
              </div>
              <p className="text-[14px] text-[#37474F] leading-relaxed mb-4">{description}</p>
              <div className={`text-[12px] font-mono px-3 py-2 rounded-lg border ${color} ${textColor} opacity-80`}>
                {detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
