import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  Document, Page, View, Text, StyleSheet, Font, Link,
} from "@react-pdf/renderer";
import type { Trip, TravelerBalance } from "@/types/trip";

// react-pdf supports TTF/OTF/WOFF, not WOFF2
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff", fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const c = {
  ocean:         "#1565C0",
  oceanLight:    "#42A5F5",
  oceanLighter:  "#E3F2FD",
  sunset:        "#FF7043",
  sunsetDark:    "#E64A19",
  sand:          "#F5F0E8",
  sandDark:      "#E0D5C5",
  text:          "#1A2332",
  body:          "#37474F",
  secondary:     "#78909C",
  muted:         "#B0BEC5",
  green:         "#2E7D32",
  greenLight:    "#E8F5E9",
  white:         "#FFFFFF",
  dark:          "#0D1F3C",
  darkMid:       "#14294D",
};

const s = StyleSheet.create({
  // ── Cover ────────────────────────────────────────────────────
  cover: { backgroundColor: c.dark, padding: 0 },
  coverGradient: { backgroundColor: c.darkMid, paddingHorizontal: 48, paddingTop: 56, paddingBottom: 48 },
  coverBadge: {
    flexDirection: "row", alignItems: "center", marginBottom: 28,
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, alignSelf: "flex-start",
  },
  coverBadgeText: { color: "rgba(255,255,255,0.65)", fontSize: 10, fontFamily: "Inter" },
  coverTitle: {
    fontSize: 34, fontFamily: "Inter", fontWeight: 700,
    color: c.white, lineHeight: 1.2, marginBottom: 10,
  },
  coverAccent: { color: c.sunset },
  coverSub: { fontSize: 13, fontFamily: "Inter", color: "rgba(255,255,255,0.5)", marginBottom: 36 },
  coverMetaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 48 },
  coverMetaItem: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, minWidth: 100,
  },
  coverMetaLabel: { fontSize: 8, color: "rgba(255,255,255,0.4)", fontFamily: "Inter", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  coverMetaValue: { fontSize: 15, color: c.white, fontFamily: "Inter", fontWeight: 700 },
  coverMetaAccent: { color: c.sunset },

  // Cover bottom band
  coverBand: { backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 48, paddingVertical: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  coverBrandUrl: { fontSize: 18, fontFamily: "Inter", fontWeight: 700, color: "rgba(255,255,255,0.9)" },
  coverBrandSub: { fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "Inter", marginTop: 2 },
  coverDisclaimer: { fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "Inter", textAlign: "right", maxWidth: 180 },

  // ── Pages ────────────────────────────────────────────────────
  page: { backgroundColor: c.white, paddingHorizontal: 40, paddingVertical: 36, fontFamily: "Inter" },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pageHeaderBrand: { fontSize: 8, color: c.muted, fontFamily: "Inter", fontWeight: 700, letterSpacing: 0.5 },
  pageHeaderTitle: { fontSize: 8, color: c.muted, fontFamily: "Inter" },

  sectionLabel: { fontSize: 8, fontFamily: "Inter", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: c.secondary, marginBottom: 6 },
  h2: { fontSize: 22, fontFamily: "Inter", fontWeight: 700, color: c.text, marginBottom: 2 },
  h3: { fontSize: 14, fontFamily: "Inter", fontWeight: 700, color: c.text },
  body: { fontSize: 11, fontFamily: "Inter", color: c.body, lineHeight: 1.5 },
  caption: { fontSize: 8, fontFamily: "Inter", color: c.secondary },
  divider: { height: 1, backgroundColor: c.sandDark, marginVertical: 14 },

  // ── Cost summary ─────────────────────────────────────────────
  costCard: { backgroundColor: c.sand, borderRadius: 10, padding: 16, marginBottom: 8 },
  costRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4.5, borderBottomWidth: 1, borderBottomColor: c.sandDark },
  costLabel: { fontSize: 11, fontFamily: "Inter", color: c.body },
  costValue: { fontSize: 11, fontFamily: "Inter", fontWeight: 700, color: c.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 14, fontFamily: "Inter", fontWeight: 700, color: c.text },
  totalValue: { fontSize: 24, fontFamily: "Inter", fontWeight: 700, color: c.sunset },
  perPersonBadge: {
    backgroundColor: c.oceanLighter, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: "flex-end", marginTop: 6,
  },
  perPersonText: { fontSize: 10, fontFamily: "Inter", color: c.ocean, fontWeight: 700 },

  // ── Day card ─────────────────────────────────────────────────
  dayHeader: {
    backgroundColor: c.ocean, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 2, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  dayNum: { fontSize: 9, fontFamily: "Inter", fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 1 },
  dayTitle: { fontSize: 14, fontFamily: "Inter", fontWeight: 700, color: c.white },
  dayCity: { fontSize: 9, fontFamily: "Inter", color: "rgba(255,255,255,0.6)", marginTop: 1 },
  dayCost: { fontSize: 16, fontFamily: "Inter", fontWeight: 700, color: c.white },

  actRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: "#F0EBE3", gap: 8, alignItems: "flex-start" },
  actTime: { fontSize: 9, fontFamily: "Inter", color: c.secondary, width: 32, paddingTop: 1 },
  actName: { fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: c.text, flex: 1 },
  actTip: { fontSize: 9, fontFamily: "Inter", color: c.secondary, flex: 2, lineHeight: 1.4 },
  actCost: { fontSize: 10, fontFamily: "Inter", fontWeight: 700, color: c.sunset, width: 58, textAlign: "right" },
  freeBadge: { fontSize: 8, fontFamily: "Inter", color: c.green, fontWeight: 700 },

  // ── Split ────────────────────────────────────────────────────
  splitCard: { borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  splitEmoji: { fontSize: 20, width: 32 },
  splitName: { fontSize: 13, fontFamily: "Inter", fontWeight: 700, color: c.text },
  splitDetail: { fontSize: 9, fontFamily: "Inter", color: c.secondary },
  splitOwes: { fontSize: 14, fontFamily: "Inter", fontWeight: 700, color: c.sunsetDark },
  splitOwed: { fontSize: 14, fontFamily: "Inter", fontWeight: 700, color: c.green },
  splitEven: { fontSize: 11, fontFamily: "Inter", color: c.secondary },

  // ── Back cover ────────────────────────────────────────────────
  backCover: { backgroundColor: c.dark, padding: 48, flex: 1, justifyContent: "space-between" },
  backTitle: { fontSize: 28, fontFamily: "Inter", fontWeight: 700, color: c.white, lineHeight: 1.25, marginBottom: 12 },
  backSub: { fontSize: 13, fontFamily: "Inter", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 340 },
  backUrl: { fontSize: 26, fontFamily: "Inter", fontWeight: 700, color: c.sunset, marginTop: 32 },
  backUrlSub: { fontSize: 11, fontFamily: "Inter", color: "rgba(255,255,255,0.4)", marginTop: 4 },
  backFeatures: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 36 },
  backFeaturePill: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  backFeatureText: { fontSize: 11, fontFamily: "Inter", color: "rgba(255,255,255,0.8)" },
  backFooter: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 16 },
  backFooterText: { fontSize: 9, fontFamily: "Inter", color: "rgba(255,255,255,0.25)" },

  // ── Page footer ──────────────────────────────────────────────
  pageFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 12, borderTopWidth: 1, borderTopColor: c.sandDark },
  pageFooterBrand: { fontSize: 8, fontFamily: "Inter", fontWeight: 700, color: c.ocean },
  pageFooterPage: { fontSize: 8, fontFamily: "Inter", color: c.muted },
});

function fmt(n: number) { return "$" + Math.abs(n).toLocaleString("es-CL"); }

function computeBalances(trip: Trip): TravelerBalance[] {
  const { travelers_list, splitAssignments } = trip;
  const paid: Record<string, number> = {};
  const owes: Record<string, number> = {};
  for (const t of travelers_list) { paid[t.id] = 0; owes[t.id] = 0; }
  for (const a of splitAssignments) {
    paid[a.paidBy] = (paid[a.paidBy] ?? 0) + a.amountClp;
    const per = a.splitBetween.length ? a.amountClp / a.splitBetween.length : 0;
    for (const id of a.splitBetween) owes[id] = (owes[id] ?? 0) + per;
  }
  return travelers_list.map((t) => ({
    travelerId: t.id, name: t.name, emoji: t.emoji, color: t.color,
    totalPays: paid[t.id] ?? 0, totalOwes: owes[t.id] ?? 0,
    netBalance: (paid[t.id] ?? 0) - (owes[t.id] ?? 0), owesTo: [],
  }));
}

const COST_CATEGORIES = [
  { key: "transport",      label: "✈️  Transporte entre ciudades" },
  { key: "accommodation",  label: "🏨  Alojamiento" },
  { key: "food",           label: "🍽️  Comida" },
  { key: "activities",     label: "🎭  Actividades" },
  { key: "localTransport", label: "🚇  Transporte local" },
  { key: "extras",         label: "🛍️  Extras y seguros" },
];

function PageHeader({ title, tripTitle }: { title: string; tripTitle: string }) {
  return (
    <View style={s.pageHeader}>
      <Text style={s.pageHeaderBrand}>TUVIAJE.COM</Text>
      <Text style={s.pageHeaderTitle}>{tripTitle} · {title}</Text>
    </View>
  );
}

function PageFooter({ page, total }: { page: number; total: number }) {
  return (
    <View style={s.pageFooter}>
      <Text style={s.pageFooterBrand}>tuviaje.com — Planifica tu próximo viaje gratis</Text>
      <Text style={s.pageFooterPage}>{page} / {total}</Text>
    </View>
  );
}

function TripPDF({ trip }: { trip: Trip }) {
  const balances = computeBalances(trip);
  const today = new Date().toLocaleDateString("es-CL");
  const destinations = trip.cities.map((c) => c.name).join(" → ");
  const totalPages = 2 + trip.days.length + 1 + 1; // cover + costs + days + accom + back

  return (
    <Document title={trip.title} author="tuviaje.com" creator="tuviaje.com" producer="tuviaje.com">

      {/* ─── Cover ──────────────────────────────────────────────── */}
      <Page size="A4" style={s.cover}>
        <View style={[s.coverGradient, { flex: 1 }]}>
          <View style={s.coverBadge}>
            <Text style={s.coverBadgeText}>🤖 Generado por tuviaje.com · {today}</Text>
          </View>

          <Text style={s.coverTitle}>
            {trip.originCity} → {destinations}
          </Text>
          <Text style={[s.coverTitle, { fontSize: 18, color: "rgba(255,255,255,0.45)", fontWeight: 400, marginTop: -6 }]}>
            Tu plan completo, día a día 🗺️
          </Text>
          <Text style={s.coverSub}>
            {trip.startDate}  →  {trip.endDate}  ·  {trip.totalDays} días  ·  {trip.travelers.adults} {trip.travelers.adults === 1 ? "viajero" : "viajeros"}
          </Text>

          <View style={s.coverMetaGrid}>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Costo total</Text>
              <Text style={[s.coverMetaValue, s.coverMetaAccent]}>{fmt(trip.costs.total)}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Por persona</Text>
              <Text style={s.coverMetaValue}>{fmt(trip.costs.perPerson)}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Por día / persona</Text>
              <Text style={s.coverMetaValue}>{fmt(trip.costs.perDayPerPerson)}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Estilo</Text>
              <Text style={[s.coverMetaValue, { textTransform: "capitalize" }]}>{trip.travelStyle}</Text>
            </View>
          </View>
        </View>

        {/* Bottom band */}
        <View style={s.coverBand}>
          <View>
            <Text style={s.coverBrandUrl}>tuviaje.com</Text>
            <Text style={s.coverBrandSub}>Planifica tu próximo viaje en segundos, gratis</Text>
          </View>
          <Text style={s.coverDisclaimer}>
            Precios estimados al {today}.{"\n"}
            Los valores reales pueden variar.
          </Text>
        </View>
      </Page>

      {/* ─── Presupuesto ────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader title="Presupuesto" tripTitle={trip.title} />

        <Text style={s.sectionLabel}>Resumen de costos</Text>
        <Text style={s.h2}>¿Cuánto cuesta el viaje?</Text>
        <View style={s.divider} />

        <View style={s.costCard}>
          {COST_CATEGORIES.map(({ key, label }) => (
            <View key={key} style={s.costRow}>
              <Text style={s.costLabel}>{label}</Text>
              <Text style={s.costValue}>{fmt((trip.costs as unknown as Record<string, number>)[key])}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalValue}>{fmt(trip.costs.total)}</Text>
          </View>
          <View style={s.perPersonBadge}>
            <Text style={s.perPersonText}>
              {fmt(trip.costs.perPerson)} por persona  ·  {fmt(trip.costs.perDayPerPerson)} / día
            </Text>
          </View>
        </View>

        {/* Cost split summary */}
        {balances.length >= 2 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>División de gastos</Text>
            <Text style={s.h2}>¿Quién le debe a quién?</Text>
            <View style={s.divider} />
            {balances.map((b) => (
              <View key={b.travelerId} style={[s.splitCard, { backgroundColor: b.color + "18" }]}>
                <Text style={s.splitEmoji}>{b.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.splitName}>{b.name}</Text>
                  <Text style={s.splitDetail}>
                    Paga {fmt(b.totalPays)}  ·  Le corresponde {fmt(b.totalOwes)}
                  </Text>
                </View>
                {b.netBalance > 500 ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.caption}>Le deben</Text>
                    <Text style={s.splitOwed}>{fmt(b.netBalance)}</Text>
                  </View>
                ) : b.netBalance < -500 ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.caption}>Debe</Text>
                    <Text style={s.splitOwes}>{fmt(b.netBalance)}</Text>
                  </View>
                ) : (
                  <Text style={s.splitEven}>✅ A mano</Text>
                )}
              </View>
            ))}
          </>
        )}

        <PageFooter page={2} total={totalPages} />
      </Page>

      {/* ─── Itinerario día a día ──────────────────────────────── */}
      {trip.days.map((day, idx) => (
        <Page key={day.dayNumber} size="A4" style={s.page}>
          <PageHeader title={`Día ${day.dayNumber}`} tripTitle={trip.title} />

          <View style={s.dayHeader}>
            <View>
              <Text style={s.dayNum}>Día {day.dayNumber}  ·  {day.date}</Text>
              <Text style={s.dayTitle}>{day.isTravelDay ? "✈️ Día de viaje" : day.theme}</Text>
              <Text style={s.dayCity}>📍 {day.city}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[s.caption, { color: "rgba(255,255,255,0.45)" }]}>Costo del día</Text>
              <Text style={s.dayCost}>{fmt(day.dayTotalClp)}</Text>
            </View>
          </View>

          {!day.isTravelDay ? (
            <>
              {(day.morning?.length > 0) && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 10 }]}>🌅 Mañana</Text>
                  {day.morning.map((act, i) => (
                    <View key={i} style={s.actRow}>
                      <Text style={s.actTime}>{act.time}</Text>
                      <Text style={s.actName}>{act.emoji} {act.name}</Text>
                      <Text style={s.actTip}>{act.tip ?? act.description?.slice(0, 70)}</Text>
                      {act.costClp > 0
                        ? <Text style={s.actCost}>{fmt(act.costClp)}</Text>
                        : <Text style={[s.actCost, s.freeBadge]}>GRATIS</Text>}
                    </View>
                  ))}
                </>
              )}

              {day.lunch?.options?.[0] && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 8 }]}>☀️ Almuerzo</Text>
                  <View style={s.actRow}>
                    <Text style={s.actTime}>13:00</Text>
                    <Text style={s.actName}>🍽️ {day.lunch.recommended}</Text>
                    <Text style={s.actTip}>{day.lunch.options[0].cuisine}  ·  {day.lunch.options[0].priceTier}</Text>
                    <Text style={s.actCost}>{fmt(day.lunch.options[0].costClp)}</Text>
                  </View>
                </>
              )}

              {(day.afternoon?.length > 0) && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 8 }]}>🌇 Tarde</Text>
                  {day.afternoon.map((act, i) => (
                    <View key={i} style={s.actRow}>
                      <Text style={s.actTime}>{act.time}</Text>
                      <Text style={s.actName}>{act.emoji} {act.name}</Text>
                      <Text style={s.actTip}>{act.tip ?? act.description?.slice(0, 70)}</Text>
                      {act.costClp > 0
                        ? <Text style={s.actCost}>{fmt(act.costClp)}</Text>
                        : <Text style={[s.actCost, s.freeBadge]}>GRATIS</Text>}
                    </View>
                  ))}
                </>
              )}

              {day.dinner?.options?.[0] && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 8 }]}>🌙 Cena</Text>
                  <View style={s.actRow}>
                    <Text style={s.actTime}>20:00</Text>
                    <Text style={s.actName}>🌙 {day.dinner.recommended}</Text>
                    <Text style={s.actTip}>{day.dinner.options[0].cuisine}  ·  {day.dinner.options[0].priceTier}</Text>
                    <Text style={s.actCost}>{fmt(day.dinner.options[0].costClp)}</Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>✈️</Text>
              <Text style={[s.h3, { textAlign: "center" }]}>Día de viaje</Text>
              <Text style={[s.caption, { textAlign: "center", marginTop: 4 }]}>
                Revisa tu itinerario de transporte para este día
              </Text>
            </View>
          )}

          <PageFooter page={3 + idx} total={totalPages} />
        </Page>
      ))}

      {/* ─── Alojamiento ────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader title="Alojamiento" tripTitle={trip.title} />
        <Text style={s.sectionLabel}>Alojamiento</Text>
        <Text style={s.h2}>¿Dónde te quedas?</Text>
        <View style={s.divider} />

        {trip.accommodations.map((acc, i) => (
          <View key={i} style={[s.costCard, { marginBottom: 10 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={s.h3}>🏨 {acc.name}</Text>
              <Text style={[s.costValue, { color: c.sunset }]}>{fmt(acc.totalCost)}</Text>
            </View>
            <Text style={s.body}>📍 {acc.city}{acc.neighborhood ? `  —  ${acc.neighborhood}` : ""}</Text>
            <Text style={s.caption}>
              {acc.nights} {acc.nights === 1 ? "noche" : "noches"}  ×  {fmt(acc.pricePerNight)}/noche
              {acc.rating ? `  ·  ⭐ ${acc.rating}` : ""}
              {acc.stars ? `  ·  ${"★".repeat(acc.stars)}` : ""}
            </Text>
            {acc.bookingUrl && (
              <Text style={[s.caption, { color: c.ocean, marginTop: 4 }]}>🔗 {acc.bookingUrl}</Text>
            )}
          </View>
        ))}

        <PageFooter page={totalPages - 1} total={totalPages} />
      </Page>

      {/* ─── Back cover / CTA ───────────────────────────────────── */}
      <Page size="A4" style={{ backgroundColor: c.dark, padding: 0 }}>
        <View style={s.backCover}>
          <View>
            <Text style={[s.sectionLabel, { color: "rgba(255,255,255,0.3)", marginBottom: 16 }]}>
              ¿TE GUSTÓ EL PLAN?
            </Text>
            <Text style={s.backTitle}>
              Planifica tu{"\n"}próximo viaje{"\n"}en segundos
            </Text>
            <Text style={s.backSub}>
              Describe a dónde quieres ir y cuándo, y nuestros agentes IA
              arman tu itinerario completo con costos, actividades, alojamiento
              y transporte — todo de una vez.
            </Text>

            <View style={s.backFeatures}>
              {["🤖 Agentes IA", "✈️ Vuelos", "🏨 Hoteles", "📅 Itinerario día a día", "💰 División de gastos", "📄 PDF exportable"].map((f) => (
                <View key={f} style={s.backFeaturePill}>
                  <Text style={s.backFeatureText}>{f}</Text>
                </View>
              ))}
            </View>

            <Text style={s.backUrl}>tuviaje.com</Text>
            <Text style={s.backUrlSub}>Gratis · Sin registro · Listo en menos de un minuto</Text>
          </View>

          <View style={s.backFooter}>
            <Text style={s.backFooterText}>
              Este PDF fue generado automáticamente por tuviaje.com el {today}.
              Los precios son estimaciones y pueden variar. Verifica siempre con las plataformas de booking antes de comprar.
            </Text>
          </View>
        </View>
      </Page>

    </Document>
  );
}

export async function POST(req: NextRequest) {
  const trip: Trip = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(TripPDF, { trip }) as any);
  const slug = trip.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-").toLowerCase();
  const filename = `tuviaje-${slug}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
