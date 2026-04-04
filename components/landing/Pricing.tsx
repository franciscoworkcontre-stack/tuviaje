import Link from "next/link";
import { CheckIcon as Check, XIcon as X } from "@/components/ui/AnimatedIcons";

const FREE_FEATURES = [
  { text: "1 viaje por mes", included: true },
  { text: "Hasta 3 ciudades", included: true },
  { text: "Itinerario básico", included: true },
  { text: "Ver precios de transporte", included: true },
  { text: "Recomendaciones de restaurantes", included: false },
  { text: "Exportar PDF", included: false },
  { text: "Optimizador de costos", included: false },
  { text: "Compartir con compañeros", included: false },
];

const PRO_FEATURES = [
  { text: "Viajes ilimitados", included: true },
  { text: "Hasta 10 ciudades por viaje", included: true },
  { text: "Itinerario completo con restaurantes", included: true },
  { text: "Ver precios de transporte", included: true },
  { text: "Recomendaciones de restaurantes", included: true },
  { text: "Exportar PDF magazine-quality", included: true },
  { text: "Optimizador de costos con IA", included: true },
  { text: "Compartir con compañeros de viaje", included: true },
];

export function Pricing() {
  return (
    <section id="precios" className="py-20 px-6 bg-[#F5F0E8]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div
          className="text-center mb-14"
          style={{ animation: "fadeInUp 0.6s ease-out both" }}
        >
          <p className="section-label mb-3">Precios</p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[#1A2332] mb-4">
            Comienza gratis, mejora cuando quieras
          </h2>
          <p className="text-[17px] text-[#78909C] max-w-xl mx-auto">
            El plan Pro cuesta menos que un café por semana.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div
            className="card p-7 border border-[#E0D5C5]"
            style={{ animation: "fadeInUp 0.55s ease-out 0.1s both" }}
          >
            <div className="mb-6">
              <p className="text-[12px] font-bold uppercase tracking-widest text-[#78909C] mb-2">
                Gratis
              </p>
              <div className="flex items-end gap-2 mb-1">
                <span className="font-serif text-[42px] font-bold text-[#1A2332]">$0</span>
              </div>
              <p className="text-[13px] text-[#B0BEC5]">Para siempre · Sin tarjeta</p>
            </div>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map(({ text, included }) => (
                <li key={text} className="flex items-center gap-3">
                  {included ? (
                    <Check size={16} className="text-[#2E7D32] shrink-0" />
                  ) : (
                    <X size={16} className="text-[#B0BEC5] shrink-0" />
                  )}
                  <span className={`text-[14px] ${included ? "text-[#37474F]" : "text-[#B0BEC5]"}`}>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/registro"
              className="btn btn-outline w-full justify-center text-[15px]"
            >
              Crear cuenta gratis
            </Link>
          </div>

          {/* Pro */}
          <div
            className="card p-7 border-2 border-ocean relative overflow-hidden"
            style={{ animation: "fadeInUp 0.55s ease-out 0.2s both" }}
          >
            {/* Popular badge */}
            <div className="absolute top-4 right-4 bg-ocean text-white text-[11px] font-bold px-3 py-1 rounded-full">
              Más popular
            </div>
            {/* Ocean subtle glow */}
            <div
              aria-hidden
              className="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(21,101,192,0.08) 0%, transparent 70%)" }}
            />

            <div className="mb-6">
              <p className="text-[12px] font-bold uppercase tracking-widest text-ocean mb-2">
                Pro
              </p>
              <div className="flex items-end gap-2 mb-1">
                <span className="font-serif text-[42px] font-bold text-[#1A2332]">US$5</span>
                <span className="text-[14px] text-[#78909C] mb-2">/mes</span>
              </div>
              <p className="text-[13px] text-[#78909C]">Cancela cuando quieras</p>
            </div>

            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map(({ text, included }) => (
                <li key={text} className="flex items-center gap-3">
                  <Check size={16} className="text-ocean shrink-0" />
                  <span className="text-[14px] text-[#37474F]">{text}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/registro?plan=pro"
              className="btn btn-primary w-full justify-center text-[15px]"
            >
              Empezar con Pro
            </Link>
            <p className="text-center text-[12px] text-[#B0BEC5] mt-3">
              14 días gratis, sin compromiso
            </p>
          </div>
        </div>

        {/* Future B2B note */}
        <p
          className="text-center text-[13px] text-[#B0BEC5] mt-8"
          style={{ animation: "fadeIn 0.6s ease-out 0.4s both" }}
        >
          ¿Agencia de viajes? Próximamente: acceso B2B al motor de tu[viaje].{" "}
          <a href="mailto:hola@tuviaje.org" className="text-ocean hover:underline">
            Contáctanos
          </a>
        </p>
      </div>
    </section>
  );
}
