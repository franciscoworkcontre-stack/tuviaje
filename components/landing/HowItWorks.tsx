const STEPS = [
  {
    number: "01",
    title: "Describe tu viaje",
    description:
      "Escribe a dónde quieres ir, cuántos días tienes y cuántas personas viajan. Sin formularios — texto libre, como le escribirías a un amigo.",
    example: "\"Nueva York a París y Roma, 14 días, 2 personas\"",
    accent: "#1565C0",
    bg: "#EFF6FF",
    border: "#1565C020",
  },
  {
    number: "02",
    title: "Nosotros decidimos todo",
    description:
      "Buscamos los mejores vuelos, elegimos hotel en el barrio correcto y armamos un itinerario día a día con costos reales. Ninguna decisión queda pendiente para ti.",
    example: "Vuelos · hoteles · actividades · presupuesto total",
    accent: "#FF7043",
    bg: "#FFF3EE",
    border: "#FF704320",
    highlight: true,
  },
  {
    number: "03",
    title: "Revisa y descarga",
    description:
      "Ajusta lo que quieras — cambia un hotel, salta una actividad — y descarga el PDF para llevar en el viaje o dividir los costos con tu grupo.",
    example: "PDF · desglose por categoría · división de costos",
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

          {STEPS.map(({ number, title, description, example, accent, bg, border, highlight }, i) => (
            <div
              key={number}
              className="relative rounded-2xl border-2 p-7 transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]"
              style={{
                backgroundColor: bg,
                borderColor: highlight ? accent + "50" : border,
                animation: `fadeInUp 0.55s ease-out ${0.1 + i * 0.12}s both`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-5 text-[13px] font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {number}
              </div>

              <h3 className="font-serif text-[20px] font-semibold text-[#1A2332] mb-3 leading-tight">
                {title}
              </h3>

              <p className="text-[14px] text-[#37474F] leading-relaxed mb-5">{description}</p>

              <p className="text-[12px] text-[#78909C]">{example}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
