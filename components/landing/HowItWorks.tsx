const STEPS = [
  {
    number: "01",
    emoji: "✏️",
    title: "Describe tu viaje",
    description:
      "Escribe a dónde quieres ir, cuántos días tienes y cuántas personas viajan. Sin formularios complejos — texto libre, como le escribirías a un amigo.",
    detail: "\"Nueva York a París y Roma, 14 días, 2 personas\"",
    accent: "#1565C0",
    bg: "#EFF6FF",
    border: "#1565C020",
  },
  {
    number: "02",
    emoji: "🤖",
    title: "Nosotros decidimos todo",
    description:
      "Buscamos los mejores vuelos, elegimos hotel en el barrio correcto y armamos un itinerario día a día con costos reales. Ninguna decisión queda pendiente para ti.",
    detail: "Vuelos · hoteles · actividades · comidas · presupuesto total",
    accent: "#FF7043",
    bg: "#FFF3EE",
    border: "#FF704320",
    highlight: true,
  },
  {
    number: "03",
    emoji: "📄",
    title: "Revisa y descarga",
    description:
      "Revisa el plan, ajusta lo que quieras — cambia un hotel, salta una actividad — y descarga el PDF para llevar en el viaje o dividir los costos con tu grupo.",
    detail: "PDF · desglose por categoría · división de costos",
    accent: "#2E7D32",
    bg: "#EDFBEE",
    border: "#2E7D3220",
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
            Tres pasos. Uno es tuyo.
          </h2>
          <p className="text-[17px] text-[#78909C] max-w-xl mx-auto">
            Describes el viaje. Nosotros armamos todo. Tú solo revisas.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div
            aria-hidden
            className="hidden md:block absolute top-[52px] left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px"
            style={{ background: "linear-gradient(to right, #1565C030, #FF704340, #2E7D3230)" }}
          />

          {STEPS.map(({ number, emoji, title, description, detail, accent, bg, border, highlight }, i) => (
            <div
              key={number}
              className="relative rounded-2xl border-2 p-7 transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]"
              style={{
                backgroundColor: bg,
                borderColor: highlight ? accent + "50" : border,
                boxShadow: highlight ? `0 0 0 1px ${accent}15` : undefined,
                animation: `fadeInUp 0.55s ease-out ${0.1 + i * 0.12}s both`,
              }}
            >
              {/* Number circle */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-5 text-[13px] font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {number}
              </div>

              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-[28px] leading-none">{emoji}</span>
                <h3 className="font-serif text-[20px] font-semibold text-[#1A2332] leading-tight">
                  {title}
                </h3>
              </div>

              <p className="text-[14px] text-[#37474F] leading-relaxed mb-5">{description}</p>

              <div
                className="text-[11px] font-mono px-3 py-2.5 rounded-xl border leading-relaxed"
                style={{ backgroundColor: accent + "10", borderColor: accent + "20", color: accent }}
              >
                {detail}
              </div>

              {highlight && (
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: accent }}
                >
                  Autopilot
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
