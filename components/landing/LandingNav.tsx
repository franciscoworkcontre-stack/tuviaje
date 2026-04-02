import Link from "next/link";
import { Map, Menu } from "lucide-react";

export function LandingNav() {
  return (
    <nav
      className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E0D5C5]"
      style={{ animation: "fadeInDown 0.4s ease-out both" }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-ocean flex items-center justify-center transition-transform group-hover:scale-105">
            <Map size={16} className="text-white" />
          </div>
          <span className="font-serif text-[20px] font-bold text-[#1A2332]">
            tu<span className="text-ocean">[viaje]</span>
          </span>
        </Link>

        {/* Nav links — desktop */}
        <div className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#78909C]">
          <Link href="#como-funciona" className="hover:text-ocean transition-colors">Cómo funciona</Link>
          <Link href="#herramientas" className="hover:text-ocean transition-colors">Herramientas gratis</Link>
          <Link href="#precios" className="hover:text-ocean transition-colors">Precios</Link>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:block text-[14px] font-semibold text-[#37474F] hover:text-ocean transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/planificar"
            className="btn btn-primary text-[14px] px-5 min-h-[40px]"
          >
            Planificar viaje
          </Link>
          {/* Mobile menu icon */}
          <button className="md:hidden p-2 text-[#78909C]" aria-label="Menú">
            <Menu size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}
