import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tu[viaje] — Planifica tu viaje, conoce el costo real",
  description:
    "Planifica viajes multi-ciudad con vuelos, buses, hoteles y actividades en un solo lugar. Itinerario completo + presupuesto exportable. Para viajeros desde Chile.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full font-sans bg-linen text-[#1A2332]">
        {children}
      </body>
    </html>
  );
}
