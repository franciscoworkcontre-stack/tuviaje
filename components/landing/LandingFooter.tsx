import Link from "next/link";
import { Map } from "lucide-react";

const LINKS = {
  Producto: [
    { label: "Cómo funciona", href: "#como-funciona" },
    { label: "Herramientas gratis", href: "#herramientas" },
    { label: "Precios", href: "#precios" },
    { label: "Planificar viaje", href: "/planificar" },
  ],
  Destinos: [
    { label: "Buenos Aires", href: "/destinos/buenos-aires" },
    { label: "Montevideo", href: "/destinos/montevideo" },
    { label: "São Paulo", href: "/destinos/sao-paulo" },
    { label: "Lima", href: "/destinos/lima" },
    { label: "Cartagena", href: "/destinos/cartagena" },
  ],
  Herramientas: [
    { label: "¿Cuánto cuesta viajar?", href: "/herramientas/costo-ciudad" },
    { label: "Vuelos baratos", href: "/herramientas/vuelos-baratos" },
    { label: "Itinerario gratis", href: "/herramientas/itinerario-ciudad" },
    { label: "Calculadora de presupuesto", href: "/herramientas/presupuesto" },
  ],
  Legal: [
    { label: "Términos de uso", href: "/legal/terminos" },
    { label: "Privacidad", href: "/legal/privacidad" },
    { label: "Contacto", href: "mailto:hola@tuviaje.app" },
  ],
};

export function LandingFooter() {
  return (
    <footer className="bg-[#0D1F3C] text-white/60 pt-16 pb-8 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-ocean flex items-center justify-center">
                <Map size={16} className="text-white" />
              </div>
              <span className="font-serif text-[18px] font-bold text-white">
                tu<span className="text-ocean-light">[viaje]</span>
              </span>
            </Link>
            <p className="text-[13px] leading-relaxed text-white/50 mb-4">
              Planifica tu viaje multi-ciudad con precios reales.
              <br />
              Hecho en Chile 🇨🇱 para el mundo.
            </p>
            <p className="text-[11px] text-white/30">
              una herramienta{" "}
              <span className="text-white/50 font-semibold">tu[X]</span>
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-4">
                {group}
              </p>
              <ul className="space-y-2.5">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] text-white/50 hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/30">
            © {new Date().getFullYear()} tu[viaje] · Precios estimados. Precios reales pueden variar.
          </p>
          <p className="text-[12px] text-white/25">
            Generado por tu[viaje] · una herramienta tu[X]
          </p>
        </div>
      </div>
    </footer>
  );
}
