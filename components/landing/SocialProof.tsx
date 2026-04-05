const STATS = [
  { value: "6 apps",    label: "en una sola" },
  { value: "~20 seg",   label: "para generar el itinerario" },
  { value: "Sin cuenta", label: "para empezar" },
  { value: "PDF",        label: "para llevar en el viaje" },
];

export function SocialProof() {
  return (
    <section className="bg-white border-b border-[#E0D5C5]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }, i) => (
            <div
              key={value}
              className="text-center"
              style={{ animation: `fadeInUp 0.5s ease-out ${0.1 + i * 0.1}s both` }}
            >
              <p className="font-serif text-[26px] font-bold text-ocean mb-1">{value}</p>
              <p className="text-[13px] text-[#78909C]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
