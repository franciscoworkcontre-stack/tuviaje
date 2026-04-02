import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  Document, Page, View, Text, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { Trip, TravelerBalance } from "@/types/trip";

Font.register({
  family: "Source Sans",
  fonts: [
    { src: "https://fonts.gstatic.com/s/sourcesans3/v15/nwpBtKy2OAdR1K-IwhWudF-R3woAa8opPOrG97lvqx01MBZP.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/sourcesans3/v15/nwpBtKy2OAdR1K-IwhWudF-R3woAa8opPOrG97lvqx01MBZP.woff2", fontWeight: 700 },
  ],
});

const colors = {
  ocean: "#1565C0",
  oceanLight: "#42A5F5",
  oceanLighter: "#E3F2FD",
  sunset: "#FF7043",
  sunsetLighter: "#FBE9E7",
  sand: "#F5F0E8",
  sandDark: "#E0D5C5",
  text: "#1A2332",
  body: "#37474F",
  secondary: "#78909C",
  muted: "#B0BEC5",
  green: "#2E7D32",
  greenLight: "#E8F5E9",
  white: "#FFFFFF",
  dark: "#0D1F3C",
};

const s = StyleSheet.create({
  // Cover
  cover: { backgroundColor: colors.dark, padding: 0, position: "relative" },
  coverContent: { padding: 48, paddingTop: 72 },
  coverBadge: { flexDirection: "row", alignItems: "center", marginBottom: 24, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  coverBadgeText: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: "Source Sans" },
  coverTitle: { fontSize: 36, fontFamily: "Source Sans", fontWeight: 700, color: colors.white, lineHeight: 1.15, marginBottom: 12 },
  coverAccent: { color: colors.sunset },
  coverSub: { fontSize: 14, fontFamily: "Source Sans", color: "rgba(255,255,255,0.55)", marginBottom: 32 },
  coverMeta: { flexDirection: "row", gap: 24, flexWrap: "wrap" },
  coverMetaItem: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  coverMetaLabel: { fontSize: 9, color: "rgba(255,255,255,0.4)", fontFamily: "Source Sans", textTransform: "uppercase", letterSpacing: 0.5 },
  coverMetaValue: { fontSize: 14, color: colors.white, fontFamily: "Source Sans", fontWeight: 700 },
  coverFooter: { marginTop: 48, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  coverFooterText: { color: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "Source Sans" },

  // Pages
  page: { backgroundColor: colors.white, padding: 36, fontFamily: "Source Sans" },
  sectionLabel: { fontSize: 9, fontFamily: "Source Sans", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: colors.secondary, marginBottom: 8 },
  h2: { fontSize: 22, fontFamily: "Source Sans", fontWeight: 700, color: colors.text, marginBottom: 4 },
  h3: { fontSize: 15, fontFamily: "Source Sans", fontWeight: 700, color: colors.text },
  body: { fontSize: 11, fontFamily: "Source Sans", color: colors.body, lineHeight: 1.5 },
  caption: { fontSize: 9, fontFamily: "Source Sans", color: colors.secondary },
  divider: { height: 1, backgroundColor: colors.sandDark, marginVertical: 14 },

  // Cost summary
  costCard: { backgroundColor: colors.sand, borderRadius: 10, padding: 16, marginBottom: 8 },
  costRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  costLabel: { fontSize: 11, fontFamily: "Source Sans", color: colors.body },
  costValue: { fontSize: 11, fontFamily: "Source Sans", fontWeight: 700, color: colors.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.sandDark },
  totalLabel: { fontSize: 13, fontFamily: "Source Sans", fontWeight: 700, color: colors.text },
  totalValue: { fontSize: 22, fontFamily: "Source Sans", fontWeight: 700, color: colors.sunset },
  perPersonBadge: { backgroundColor: colors.oceanLighter, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-end", marginTop: 4 },
  perPersonText: { fontSize: 10, fontFamily: "Source Sans", color: colors.ocean, fontWeight: 700 },

  // Day card
  dayHeader: { backgroundColor: colors.ocean, borderRadius: 8, padding: 12, marginBottom: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayNum: { fontSize: 10, fontFamily: "Source Sans", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 },
  dayTitle: { fontSize: 14, fontFamily: "Source Sans", fontWeight: 700, color: colors.white },
  dayCity: { fontSize: 10, fontFamily: "Source Sans", color: "rgba(255,255,255,0.65)" },
  dayCost: { fontSize: 15, fontFamily: "Source Sans", fontWeight: 700, color: colors.white },
  actRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: colors.sand, gap: 8 },
  actTime: { fontSize: 9, fontFamily: "Source Sans", color: colors.secondary, width: 34 },
  actName: { fontSize: 10, fontFamily: "Source Sans", fontWeight: 700, color: colors.text, flex: 1 },
  actTip: { fontSize: 9, fontFamily: "Source Sans", color: colors.secondary, flex: 2 },
  actCost: { fontSize: 10, fontFamily: "Source Sans", fontWeight: 700, color: colors.sunset, width: 54, textAlign: "right" },
  freeBadge: { fontSize: 8, fontFamily: "Source Sans", color: colors.green, fontWeight: 700 },

  // Split
  splitCard: { borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  splitEmoji: { fontSize: 20, width: 30 },
  splitName: { fontSize: 13, fontFamily: "Source Sans", fontWeight: 700, color: colors.text },
  splitDetail: { fontSize: 9, fontFamily: "Source Sans", color: colors.secondary },
  splitOwes: { fontSize: 14, fontFamily: "Source Sans", fontWeight: 700, color: "#E64A19" },
  splitOwed: { fontSize: 14, fontFamily: "Source Sans", fontWeight: 700, color: colors.green },
  splitEven: { fontSize: 11, fontFamily: "Source Sans", color: colors.secondary },
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
  { key: "transport",      label: "✈️ Transporte" },
  { key: "accommodation",  label: "🏨 Alojamiento" },
  { key: "food",           label: "🍽️ Comida" },
  { key: "activities",     label: "🎭 Actividades" },
  { key: "localTransport", label: "🚇 Transporte local" },
  { key: "extras",         label: "🛍️ Extras" },
];

function TripPDF({ trip }: { trip: Trip }) {
  const balances = computeBalances(trip);
  const today = new Date().toLocaleDateString("es-CL");

  return (
    <Document title={trip.title} author="tu[viaje]">
      {/* ─── Cover ─────────────────────────────────────────────── */}
      <Page size="A4" style={s.cover}>
        <View style={s.coverContent}>
          <View style={s.coverBadge}>
            <Text style={s.coverBadgeText}>📍 Generado por tu[viaje] · {today}</Text>
          </View>
          <Text style={s.coverTitle}>
            {trip.originCity}
            {trip.cities.map((c) => ` → ${c.name}`).join("")}
          </Text>
          <Text style={[s.coverTitle, { fontSize: 20, marginBottom: 8 }]}>
            <Text style={s.coverAccent}>Tu plan completo 🗺️</Text>
          </Text>
          <Text style={s.coverSub}>
            {trip.startDate} → {trip.endDate} · {trip.totalDays} días · {trip.travelers.adults} {trip.travelers.adults === 1 ? "persona" : "personas"}
          </Text>
          <View style={s.coverMeta}>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Total estimado</Text>
              <Text style={[s.coverMetaValue, { color: colors.sunset }]}>{fmt(trip.costs.total)}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Por persona</Text>
              <Text style={s.coverMetaValue}>{fmt(trip.costs.perPerson)}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Por día/persona</Text>
              <Text style={s.coverMetaValue}>{fmt(trip.costs.perDayPerPerson)}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>Estilo de viaje</Text>
              <Text style={s.coverMetaValue}>{trip.travelStyle}</Text>
            </View>
          </View>
          <View style={s.coverFooter}>
            <Text style={s.coverFooterText}>
              Precios estimados al {today}. Los precios reales pueden variar.{"\n"}
              tu[viaje] — una herramienta tu[X] 🌎
            </Text>
          </View>
        </View>
      </Page>

      {/* ─── Presupuesto ──────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionLabel}>Resumen de costos</Text>
        <Text style={s.h2}>¿Cuánto cuesta el viaje?</Text>
        <View style={s.divider} />
        <View style={s.costCard}>
          {COST_CATEGORIES.map(({ key, label }) => (
            <View key={key} style={s.costRow}>
              <Text style={s.costLabel}>{label}</Text>
              <Text style={s.costValue}>{fmt((trip.costs as unknown as Record<string,number>)[key])}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalValue}>{fmt(trip.costs.total)}</Text>
          </View>
          <View style={s.perPersonBadge}>
            <Text style={s.perPersonText}>
              {fmt(trip.costs.perPerson)} por persona · {fmt(trip.costs.perDayPerPerson)}/día
            </Text>
          </View>
        </View>

        {/* Split summary if applicable */}
        {balances.length >= 2 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>División de costos</Text>
            <Text style={s.h2}>¿Quién le debe a quién?</Text>
            <View style={s.divider} />
            {balances.map((b) => (
              <View key={b.travelerId} style={[s.splitCard, { backgroundColor: b.color + "12" }]}>
                <Text style={s.splitEmoji}>{b.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.splitName}>{b.name}</Text>
                  <Text style={s.splitDetail}>Paga {fmt(b.totalPays)} · Le corresponde {fmt(b.totalOwes)}</Text>
                </View>
                {b.netBalance > 0 ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.caption}>Le deben</Text>
                    <Text style={s.splitOwed}>{fmt(b.netBalance)}</Text>
                  </View>
                ) : b.netBalance < 0 ? (
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
      </Page>

      {/* ─── Itinerario día a día ─────────────────────────────── */}
      {trip.days.map((day) => (
        <Page key={day.dayNumber} size="A4" style={s.page}>
          {/* Day header */}
          <View style={s.dayHeader}>
            <View>
              <Text style={s.dayNum}>Día {day.dayNumber} · {day.date}</Text>
              <Text style={s.dayTitle}>{day.isTravelDay ? "✈️ Día de viaje" : day.theme}</Text>
              <Text style={s.dayCity}>📍 {day.city}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[s.caption, { color: "rgba(255,255,255,0.5)" }]}>Costo del día</Text>
              <Text style={s.dayCost}>{fmt(day.dayTotalClp)}</Text>
            </View>
          </View>

          {!day.isTravelDay && (
            <>
              {/* Morning */}
              {day.morning?.length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 12 }]}>🌅 Mañana</Text>
                  {day.morning.map((act, i) => (
                    <View key={i} style={s.actRow}>
                      <Text style={s.actTime}>{act.time}</Text>
                      <Text style={s.actName}>{act.emoji} {act.name}</Text>
                      <Text style={s.actTip}>{act.tip ?? act.description?.slice(0, 60)}</Text>
                      {act.costClp > 0 ? (
                        <Text style={s.actCost}>{fmt(act.costClp)}</Text>
                      ) : (
                        <Text style={[s.actCost, s.freeBadge]}>GRATIS</Text>
                      )}
                    </View>
                  ))}
                </>
              )}
              {/* Lunch */}
              {day.lunch?.options?.[0] && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 10 }]}>☀️ Almuerzo</Text>
                  <View style={s.actRow}>
                    <Text style={s.actTime}>13:00</Text>
                    <Text style={s.actName}>🍽️ {day.lunch.recommended}</Text>
                    <Text style={s.actTip}>{day.lunch.options[0].cuisine} · {day.lunch.options[0].priceTier}</Text>
                    <Text style={s.actCost}>{fmt(day.lunch.options[0].costClp)}</Text>
                  </View>
                </>
              )}
              {/* Afternoon */}
              {day.afternoon?.length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 10 }]}>🌇 Tarde</Text>
                  {day.afternoon.map((act, i) => (
                    <View key={i} style={s.actRow}>
                      <Text style={s.actTime}>{act.time}</Text>
                      <Text style={s.actName}>{act.emoji} {act.name}</Text>
                      <Text style={s.actTip}>{act.tip ?? act.description?.slice(0, 60)}</Text>
                      {act.costClp > 0 ? (
                        <Text style={s.actCost}>{fmt(act.costClp)}</Text>
                      ) : (
                        <Text style={[s.actCost, s.freeBadge]}>GRATIS</Text>
                      )}
                    </View>
                  ))}
                </>
              )}
              {/* Dinner */}
              {day.dinner?.options?.[0] && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 10 }]}>🌙 Cena</Text>
                  <View style={s.actRow}>
                    <Text style={s.actTime}>20:00</Text>
                    <Text style={s.actName}>🌙 {day.dinner.recommended}</Text>
                    <Text style={s.actTip}>{day.dinner.options[0].cuisine} · {day.dinner.options[0].priceTier}</Text>
                    <Text style={s.actCost}>{fmt(day.dinner.options[0].costClp)}</Text>
                  </View>
                </>
              )}
            </>
          )}

          {/* Footer */}
          <View style={[s.divider, { marginTop: "auto" }]} />
          <Text style={s.caption}>tu[viaje] · {trip.title} · Página {day.dayNumber + 2}</Text>
        </Page>
      ))}

      {/* ─── Alojamiento ─────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionLabel}>Alojamiento</Text>
        <Text style={s.h2}>¿Dónde te quedas?</Text>
        <View style={s.divider} />
        {trip.accommodations.map((acc, i) => (
          <View key={i} style={[s.costCard, { marginBottom: 10 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={s.h3}>🏨 {acc.name}</Text>
              <Text style={[s.costValue, { color: colors.sunset }]}>{fmt(acc.totalCost)}</Text>
            </View>
            <Text style={s.body}>📍 {acc.city}{acc.neighborhood ? ` — ${acc.neighborhood}` : ""}</Text>
            <Text style={s.caption}>
              {acc.nights} noches × {fmt(acc.pricePerNight)}/noche
              {acc.rating ? ` · ⭐ ${acc.rating}` : ""}
              {acc.stars ? ` · ${"★".repeat(acc.stars)}` : ""}
            </Text>
            {acc.bookingUrl && (
              <Text style={[s.caption, { color: colors.ocean, marginTop: 4 }]}>
                🔗 {acc.bookingUrl}
              </Text>
            )}
          </View>
        ))}
        <View style={[s.divider, { marginTop: "auto" }]} />
        <Text style={s.caption}>tu[viaje] — una herramienta tu[X] 🌎 · Precios estimados al {today}</Text>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  const trip: Trip = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(TripPDF, { trip }) as any);
  const filename = `tuviaje-${trip.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
