import type { Metadata } from "next";
import Script from "next/script";
import { FeedbackFloating } from "@/components/FeedbackFloating";
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
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-N26SRTMGNS" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-N26SRTMGNS');
        `}</Script>
        {children}
        <FeedbackFloating />
      </body>
    </html>
  );
}
