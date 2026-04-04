"use client";

import Link from "next/link";
import { useState } from "react";
import { MapIcon as Map, MenuIcon as Menu, XIcon as X } from "@/components/ui/AnimatedIcons";

export function LandingNav() {
  const [open, setOpen] = useState(false);

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
          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-[#78909C]"
            aria-label="Menú"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="md:hidden border-t border-[#E0D5C5] bg-white/95 backdrop-blur-md px-6 py-4 flex flex-col gap-1">
          <Link href="#como-funciona" onClick={() => setOpen(false)} className="py-3 text-[15px] font-medium text-[#37474F] hover:text-ocean transition-colors border-b border-[#F5F0E8]">
            Cómo funciona
          </Link>
          <Link href="#herramientas" onClick={() => setOpen(false)} className="py-3 text-[15px] font-medium text-[#37474F] hover:text-ocean transition-colors border-b border-[#F5F0E8]">
            Herramientas gratis
          </Link>
          <Link href="/login" onClick={() => setOpen(false)} className="py-3 text-[15px] font-medium text-[#37474F] hover:text-ocean transition-colors border-b border-[#F5F0E8]">
            Iniciar sesión
          </Link>
          <div className="pt-3">
            <Link
              href="/planificar"
              onClick={() => setOpen(false)}
              className="btn btn-primary text-[15px] px-5 min-h-[44px] w-full justify-center"
            >
              Planificar viaje
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
