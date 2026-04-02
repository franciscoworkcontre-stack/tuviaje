import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  Document, Page, View, Text, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { Trip, TravelerBalance } from "@/types/trip";

// ─── Fonts ────────────────────────────────────────────────────────────────────
// Use ONLY built-in PDF fonts — zero network calls, zero cold-start timeouts.
// Helvetica = regular, Helvetica-Bold = bold. Always available in react-pdf.
Font.registerHyphenationCallback((word) => [word]);

const FONT  = "Helvetica";
const FONTB = "Helvetica-Bold";

// ─── Palette ──────────────────────────────────────────────────────────────────
const c = {
  ocean:        "#1565C0",
  oceanLight:   "#42A5F5",
  oceanLighter: "#E3F2FD",
  sunset:       "#FF7043",
  sunsetDark:   "#E64A19",
  sand:         "#F5F0E8",
  sandDark:     "#E0D5C5",
  text:         "#1A2332",
  body:         "#37474F",
  secondary:    "#78909C",
  muted:        "#B0BEC5",
  green:        "#2E7D32",
  greenLight:   "#E8F5E9",
  white:        "#FFFFFF",
  dark:         "#0D1F3C",
  darkMid:      "#14294D",
  amber:        "#F57F17",
  amberLight:   "#FFF8E1",
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Cover
  cover:           { backgroundColor: c.dark, padding: 0 },
  coverGradient:   { backgroundColor: c.darkMid, paddingHorizontal: 48, paddingTop: 52, paddingBottom: 44, flex: 1 },

  coverBadge:      { flexDirection: "row", alignItems: "center", marginBottom: 24, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, alignSelf: "flex-start" },
  coverBadgeText:  { color: "rgba(255,255,255,0.65)", fontSize: 9, fontFamily: FONT },

  coverStyleBadge: { flexDirection: "row", alignItems: "center", marginBottom: 20, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  coverStyleText:  { fontSize: 11, fontFamily: FONTB },

  coverTitle:      { fontSize: 32, fontFamily: FONTB, color: c.white, lineHeight: 1.2, marginBottom: 6 },
  coverSub:        { fontSize: 12, fontFamily: FONT, color: "rgba(255,255,255,0.5)", marginBottom: 24 },

  // Route map
  routeMap:        { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 20 },
  routeMapLabel:   { fontSize: 7, fontFamily: FONTB, color: "rgba(255,255,255,0.35)", marginBottom: 8 },
  routeMapLine:    { fontSize: 11, fontFamily: FONTB, color: c.white, marginBottom: 10 },
  routeStops:      { flexDirection: "row", flexWrap: "wrap" },
  routeStop:       { backgroundColor: "rgba(255,112,67,0.18)", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  routeStopText:   { fontSize: 9, fontFamily: FONTB, color: c.sunset },
  routeStopDays:   { fontSize: 8, fontFamily: FONT, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // Cover meta grid
  coverMetaGrid:   { flexDirection: "row", flexWrap: "wrap", marginBottom: 36 },
  coverMetaItem:   { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 100, marginRight: 10, marginBottom: 10 },
  coverMetaLabel:  { fontSize: 8, color: "rgba(255,255,255,0.4)", fontFamily: FONT, marginBottom: 3 },
  coverMetaValue:  { fontSize: 15, color: c.white, fontFamily: FONTB },
  coverMetaAccent: { color: c.sunset },

  // Cover cost breakdown
  coverCosts:      { marginBottom: 28 },
  coverCostRow:    { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  coverCostLabel:  { fontSize: 9, fontFamily: FONT, color: "rgba(255,255,255,0.5)" },
  coverCostValue:  { fontSize: 9, fontFamily: FONTB, color: "rgba(255,255,255,0.75)" },

  // Cover bottom band
  coverBand:       { backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 48, paddingVertical: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  coverBrandUrl:   { fontSize: 18, fontFamily: FONTB, color: "rgba(255,255,255,0.9)" },
  coverBrandSub:   { fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: FONT, marginTop: 2 },
  coverDisclaimer: { fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: FONT, textAlign: "right", maxWidth: 180 },

  // Content pages
  page:            { backgroundColor: c.white, paddingHorizontal: 40, paddingVertical: 36, fontFamily: FONT },
  pageHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pageHeaderBrand: { fontSize: 8, color: c.muted, fontFamily: FONTB },
  pageHeaderTitle: { fontSize: 8, color: c.muted, fontFamily: FONT },

  sectionLabel:    { fontSize: 8, fontFamily: FONTB, color: c.secondary, marginBottom: 6 },
  h2:              { fontSize: 22, fontFamily: FONTB, color: c.text, marginBottom: 2 },
  h3:              { fontSize: 14, fontFamily: FONTB, color: c.text },
  h4:              { fontSize: 11, fontFamily: FONTB, color: c.text },
  body:            { fontSize: 10, fontFamily: FONT, color: c.body, lineHeight: 1.55 },
  caption:         { fontSize: 8, fontFamily: FONT, color: c.secondary },
  divider:         { height: 1, backgroundColor: c.sandDark, marginVertical: 14 },

  // Cost summary
  costCard:        { backgroundColor: c.sand, borderRadius: 10, padding: 16, marginBottom: 8 },
  costRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: c.sandDark },
  costLabel:       { fontSize: 10, fontFamily: FONT, color: c.body, flex: 1 },
  costValue:       { fontSize: 10, fontFamily: FONTB, color: c.text },
  totalRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 12, marginTop: 4 },
  totalLabel:      { fontSize: 14, fontFamily: FONTB, color: c.text },
  totalValue:      { fontSize: 24, fontFamily: FONTB, color: c.sunset },
  perPersonBadge:  { backgroundColor: c.oceanLighter, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-end", marginTop: 6 },
  perPersonText:   { fontSize: 10, fontFamily: FONTB, color: c.ocean },

  // Split
  splitCard:       { borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center" },
  splitEmoji:      { fontSize: 20, width: 28, marginRight: 12 },
  splitName:       { fontSize: 12, fontFamily: FONTB, color: c.text },
  splitDetail:     { fontSize: 9, fontFamily: FONT, color: c.secondary },
  splitOwes:       { fontSize: 13, fontFamily: FONTB, color: c.sunsetDark },
  splitOwed:       { fontSize: 13, fontFamily: FONTB, color: c.green },
  splitEven:       { fontSize: 10, fontFamily: FONT, color: c.secondary },

  // Day card
  dayHeader:       { backgroundColor: c.ocean, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayNum:          { fontSize: 9, fontFamily: FONTB, color: "rgba(255,255,255,0.55)", marginBottom: 1 },
  dayTitle:        { fontSize: 14, fontFamily: FONTB, color: c.white },
  dayCity:         { fontSize: 9, fontFamily: FONT, color: "rgba(255,255,255,0.6)", marginTop: 1 },
  dayCost:         { fontSize: 16, fontFamily: FONTB, color: c.white },

  // Travel day
  travelDayBox:    { backgroundColor: c.amberLight, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: c.amber },
  travelDayTag:    { fontSize: 8, fontFamily: FONTB, color: c.amber, marginBottom: 2 },
  travelDayText:   { fontSize: 10, fontFamily: FONT, color: c.body, lineHeight: 1.5 },

  actRow:          { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: "#F0EBE3", alignItems: "flex-start" },
  actTime:         { fontSize: 9, fontFamily: FONT, color: c.secondary, width: 32, paddingTop: 1, marginRight: 8 },
  actName:         { fontSize: 10, fontFamily: FONTB, color: c.text, flex: 1 },
  actTip:          { fontSize: 9, fontFamily: FONT, color: c.secondary, flex: 2, lineHeight: 1.4 },
  actCost:         { fontSize: 10, fontFamily: FONTB, color: c.sunset, width: 58, textAlign: "right" },
  freeBadge:       { fontSize: 8, fontFamily: FONTB, color: c.green },

  // Accommodations table
  tableHeader:     { flexDirection: "row", backgroundColor: c.ocean, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 2 },
  tableHeaderCell: { fontSize: 8, fontFamily: FONTB, color: "rgba(255,255,255,0.85)" },
  tableRow:        { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.sandDark, alignItems: "center" },
  tableRowAlt:     { backgroundColor: c.sand },
  tableCell:       { fontSize: 10, fontFamily: FONT, color: c.body },
  tableCellBold:   { fontSize: 10, fontFamily: FONTB, color: c.text },

  // Optimizer tips
  tipCard:         { backgroundColor: c.oceanLighter, borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "flex-start" },
  tipNum:          { fontSize: 14, fontFamily: FONTB, color: c.ocean, width: 22, marginRight: 10 },
  tipText:         { fontSize: 10, fontFamily: FONT, color: c.body, lineHeight: 1.55, flex: 1 },

  // Back cover
  backCover:       { backgroundColor: c.dark, padding: 48, flex: 1, justifyContent: "space-between" },
  backTitle:       { fontSize: 28, fontFamily: FONTB, color: c.white, lineHeight: 1.25, marginBottom: 12 },
  backSub:         { fontSize: 12, fontFamily: FONT, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 340 },
  backUrl:         { fontSize: 26, fontFamily: FONTB, color: c.sunset, marginTop: 28 },
  backUrlSub:      { fontSize: 11, fontFamily: FONT, color: "rgba(255,255,255,0.4)", marginTop: 4 },
  backFeatures:    { flexDirection: "row", flexWrap: "wrap", marginTop: 32 },
  backFeaturePill: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 10, marginBottom: 10 },
  backFeatureText: { fontSize: 11, fontFamily: FONT, color: "rgba(255,255,255,0.8)" },
  backFooter:      { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 16 },
  backFooterText:  { fontSize: 9, fontFamily: FONT, color: "rgba(255,255,255,0.25)" },

  // Page footer
  pageFooter:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 12, borderTopWidth: 1, borderTopColor: c.sandDark },
  pageFooterBrand: { fontSize: 8, fontFamily: FONTB, color: c.ocean },
  pageFooterPage:  { fontSize: 8, fontFamily: FONT, color: c.muted },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return "$" + Math.abs(Math.round(n)).toLocaleString("es-CL");
}

function stars(n: number) {
  return "★".repeat(Math.min(n, 5));
}

const STYLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  mochilero: { label: "Mochilero",     bg: "#E8F5E9", color: "#2E7D32" },
  comfort:   { label: "Comfort",       bg: "#E3F2FD", color: "#1565C0" },
  premium:   { label: "Premium",       bg: "#FFF8E1", color: "#F57F17" },
};

const STYLE_EMOJI: Record<string, string> = {
  mochilero: "Mochilero",
  comfort:   "Comfort",
  premium:   "Premium",
};

const COST_CATEGORIES = [
  { key: "transport",      label: "Transporte entre ciudades" },
  { key: "accommodation",  label: "Alojamiento" },
  { key: "food",           label: "Comida" },
  { key: "activities",     label: "Actividades" },
  { key: "localTransport", label: "Transporte local" },
  { key: "extras",         label: "Extras y seguros" },
];

const COST_EMOJI: Record<string, string> = {
  transport:      "Avion",
  accommodation:  "Hotel",
  food:           "Comida",
  activities:     "Act.",
  localTransport: "Metro",
  extras:         "Bolsa",
};

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

function buildRouteText(trip: Trip): string {
  const stops = [trip.originCity, ...trip.cities.map((c) => c.name)];
  return stops.join("  ---->  ");
}

// ─── Sub-components ───────────────────────────────────────────────────────────
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

function ActRow({ act }: { act: { time: string; emoji?: string; name: string; tip?: string; description?: string; costClp: number } }) {
  return (
    <View style={s.actRow}>
      <Text style={s.actTime}>{act.time}</Text>
      <Text style={s.actName}>{act.emoji ? `${act.emoji} ` : ""}{act.name}</Text>
      <Text style={s.actTip}>{act.tip ?? (act.description ? act.description.slice(0, 80) : "")}</Text>
      {act.costClp > 0
        ? <Text style={s.actCost}>{fmt(act.costClp)}</Text>
        : <Text style={[s.actCost, s.freeBadge]}>GRATIS</Text>}
    </View>
  );
}

// ─── Main PDF component ───────────────────────────────────────────────────────
function TripPDF({ trip }: { trip: Trip }) {
  const balances = computeBalances(trip);
  const today = new Date().toLocaleDateString("es-CL");
  const destinations = trip.cities.map((city) => city.name).join(" → ");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const optimizerTips: string[] = (trip as any).optimizerTips ?? [];
  const hasTips = optimizerTips.length > 0;
  const totalPages = 2 + trip.days.length + 1 + (hasTips ? 1 : 0) + 1;

  const styleInfo = STYLE_BADGE[trip.travelStyle] ?? { label: trip.travelStyle, bg: c.sand, color: c.body };

  return (
    <Document title={trip.title} author="tuviaje.com" creator="tuviaje.com" producer="tuviaje.com">

      {/* ─── PORTADA ──────────────────────────────────────────────── */}
      <Page size="A4" style={s.cover}>
        <View style={s.coverGradient}>

          {/* Generated badge */}
          <View style={s.coverBadge}>
            <Text style={s.coverBadgeText}>Generado por tuviaje.com  ·  {today}</Text>
          </View>

          {/* Travel style badge */}
          <View style={[s.coverStyleBadge, { backgroundColor: styleInfo.bg }]}>
            <Text style={[s.coverStyleText, { color: styleInfo.color }]}>
              {STYLE_EMOJI[trip.travelStyle] ?? trip.travelStyle}  {styleInfo.label}
            </Text>
          </View>

          {/* Title */}
          <Text style={s.coverTitle}>{trip.originCity} → {destinations}</Text>
          <Text style={s.coverSub}>
            {trip.startDate}  →  {trip.endDate}  ·  {trip.totalDays} dias  ·  {trip.travelers.adults}{trip.travelers.adults === 1 ? " viajero" : " viajeros"}
          </Text>

          {/* Route map */}
          <View style={s.routeMap}>
            <Text style={s.routeMapLabel}>{"Ruta del viaje".toUpperCase()}</Text>
            <Text style={s.routeMapLine}>{buildRouteText(trip)}</Text>
            <View style={s.routeStops}>
              {trip.cities.map((city) => (
                <View key={city.name} style={s.routeStop}>
                  <Text style={s.routeStopText}>Pin {city.name}</Text>
                  <Text style={s.routeStopDays}>{city.days} {city.days === 1 ? "dia" : "dias"}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Meta grid */}
          <View style={s.coverMetaGrid}>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>{"Costo total".toUpperCase()}</Text>
              <Text style={[s.coverMetaValue, s.coverMetaAccent]}>{fmt(trip.costs.total)}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>{"Por persona".toUpperCase()}</Text>
              <Text style={s.coverMetaValue}>{fmt(trip.costs.perPerson)}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>{"Por dia / persona".toUpperCase()}</Text>
              <Text style={s.coverMetaValue}>{fmt(trip.costs.perDayPerPerson)}</Text>
            </View>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaLabel}>{"Ciudades".toUpperCase()}</Text>
              <Text style={s.coverMetaValue}>{trip.cities.length}</Text>
            </View>
          </View>

          {/* Cost breakdown mini */}
          <View style={s.coverCosts}>
            {COST_CATEGORIES.map(({ key, label }) => {
              const val = (trip.costs as unknown as Record<string, number>)[key] ?? 0;
              if (!val) return null;
              return (
                <View key={key} style={s.coverCostRow}>
                  <Text style={s.coverCostLabel}>{label}</Text>
                  <Text style={s.coverCostValue}>{fmt(val)}</Text>
                </View>
              );
            })}
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

      {/* ─── PRESUPUESTO ──────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader title="Presupuesto" tripTitle={trip.title} />

        <Text style={s.sectionLabel}>{"Resumen de costos".toUpperCase()}</Text>
        <Text style={s.h2}>Cuanto cuesta el viaje?</Text>
        <View style={s.divider} />

        <View style={s.costCard}>
          {COST_CATEGORIES.map(({ key, label }) => {
            const val = (trip.costs as unknown as Record<string, number>)[key] ?? 0;
            return (
              <View key={key} style={s.costRow}>
                <Text style={s.costLabel}>{label}</Text>
                <Text style={s.costValue}>{fmt(val)}</Text>
              </View>
            );
          })}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalValue}>{fmt(trip.costs.total)}</Text>
          </View>
          <View style={s.perPersonBadge}>
            <Text style={s.perPersonText}>
              {fmt(trip.costs.perPerson)} por persona  ·  {fmt(trip.costs.perDayPerPerson)} / dia
            </Text>
          </View>
        </View>

        {/* Cost split summary */}
        {balances.length >= 2 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>{"Division de gastos".toUpperCase()}</Text>
            <Text style={s.h2}>Quien le debe a quien?</Text>
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
                  <Text style={s.splitEven}>OK - A mano</Text>
                )}
              </View>
            ))}
          </>
        )}

        <PageFooter page={2} total={totalPages} />
      </Page>

      {/* ─── ITINERARIO DIA A DIA ─────────────────────────────────── */}
      {trip.days.map((day, idx) => (
        <Page key={day.dayNumber} size="A4" style={s.page}>
          <PageHeader title={`Dia ${day.dayNumber}`} tripTitle={trip.title} />

          {/* Day header bar */}
          <View style={s.dayHeader}>
            <View>
              <Text style={s.dayNum}>{`DIA ${day.dayNumber}  ·  ${day.date}`}</Text>
              <Text style={s.dayTitle}>{day.isTravelDay ? "Dia de viaje" : day.theme}</Text>
              <Text style={s.dayCity}>Pin {day.city}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[s.caption, { color: "rgba(255,255,255,0.45)" }]}>Costo del dia</Text>
              <Text style={s.dayCost}>{fmt(day.dayTotalClp)}</Text>
            </View>
          </View>

          {/* Travel day notice */}
          {day.isTravelDay && (
            <View style={s.travelDayBox}>
              <Text style={s.travelDayTag}>{"Dia de traslado".toUpperCase()}</Text>
              <Text style={s.travelDayText}>
                Hoy viajas hacia {day.city}. Revisa tu itinerario de transporte y ten a mano tus documentos.
                {day.morning?.length > 0 || day.afternoon?.length > 0
                  ? " A continuacion, las actividades del dia:"
                  : ""}
              </Text>
            </View>
          )}

          {/* Morning — always show if exists */}
          {(day.morning?.length > 0) && (
            <>
              <Text style={[s.sectionLabel, { marginTop: 10 }]}>{"Manana".toUpperCase()}</Text>
              {day.morning.map((act, i) => (
                <ActRow key={i} act={act} />
              ))}
            </>
          )}

          {/* Lunch — skip on travel days with no data */}
          {day.lunch?.options?.[0] && (
            <>
              <Text style={[s.sectionLabel, { marginTop: 8 }]}>{"Almuerzo".toUpperCase()}</Text>
              <View style={s.actRow}>
                <Text style={s.actTime}>13:00</Text>
                <Text style={s.actName}>{day.lunch.recommended}</Text>
                <Text style={s.actTip}>{day.lunch.options[0].cuisine}  ·  {day.lunch.options[0].priceTier}</Text>
                <Text style={s.actCost}>{fmt(day.lunch.options[0].costClp)}</Text>
              </View>
            </>
          )}

          {/* Afternoon — always show if exists */}
          {(day.afternoon?.length > 0) && (
            <>
              <Text style={[s.sectionLabel, { marginTop: 8 }]}>{"Tarde".toUpperCase()}</Text>
              {day.afternoon.map((act, i) => (
                <ActRow key={i} act={act} />
              ))}
            </>
          )}

          {/* Dinner */}
          {day.dinner?.options?.[0] && (
            <>
              <Text style={[s.sectionLabel, { marginTop: 8 }]}>{"Cena".toUpperCase()}</Text>
              <View style={s.actRow}>
                <Text style={s.actTime}>20:00</Text>
                <Text style={s.actName}>{day.dinner.recommended}</Text>
                <Text style={s.actTip}>{day.dinner.options[0].cuisine}  ·  {day.dinner.options[0].priceTier}</Text>
                <Text style={s.actCost}>{fmt(day.dinner.options[0].costClp)}</Text>
              </View>
            </>
          )}

          {/* Evening */}
          {day.eveningActivity && (
            <>
              <Text style={[s.sectionLabel, { marginTop: 8 }]}>{"Noche".toUpperCase()}</Text>
              <ActRow act={day.eveningActivity} />
            </>
          )}

          {/* Show placeholder only if travel day has zero activities at all */}
          {day.isTravelDay &&
            !day.morning?.length &&
            !day.afternoon?.length &&
            !day.dinner?.options?.[0] && (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <Text style={[s.caption, { textAlign: "center" }]}>
                  Sin actividades planificadas — dia de descanso y traslado.
                </Text>
              </View>
          )}

          <PageFooter page={3 + idx} total={totalPages} />
        </Page>
      ))}

      {/* ─── ALOJAMIENTO ──────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader title="Alojamiento" tripTitle={trip.title} />
        <Text style={s.sectionLabel}>{"Alojamiento".toUpperCase()}</Text>
        <Text style={s.h2}>Donde te quedas?</Text>
        <View style={s.divider} />

        {/* Table header */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, { flex: 3 }]}>{"Hotel".toUpperCase()}</Text>
          <Text style={[s.tableHeaderCell, { flex: 2 }]}>{"Ciudad / Barrio".toUpperCase()}</Text>
          <Text style={[s.tableHeaderCell, { flex: 1, textAlign: "center" }]}>{"Estrellas".toUpperCase()}</Text>
          <Text style={[s.tableHeaderCell, { flex: 1, textAlign: "center" }]}>{"Noches".toUpperCase()}</Text>
          <Text style={[s.tableHeaderCell, { flex: 2, textAlign: "right" }]}>{"Precio / noche".toUpperCase()}</Text>
          <Text style={[s.tableHeaderCell, { flex: 2, textAlign: "right" }]}>{"Total".toUpperCase()}</Text>
        </View>

        {trip.accommodations.map((acc, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <View style={{ flex: 3 }}>
              <Text style={s.tableCellBold}>{acc.name}</Text>
              {acc.rating ? <Text style={s.caption}>Rating {acc.rating}/10</Text> : null}
            </View>
            <View style={{ flex: 2 }}>
              <Text style={s.tableCell}>{acc.city}</Text>
              {acc.neighborhood ? <Text style={s.caption}>{acc.neighborhood}</Text> : null}
            </View>
            <Text style={[s.tableCell, { flex: 1, textAlign: "center" }]}>
              {acc.stars ? stars(acc.stars) : "-"}
            </Text>
            <Text style={[s.tableCell, { flex: 1, textAlign: "center" }]}>{acc.nights}</Text>
            <Text style={[s.tableCell, { flex: 2, textAlign: "right" }]}>{fmt(acc.pricePerNight)}</Text>
            <Text style={[s.tableCellBold, { flex: 2, textAlign: "right", color: c.sunset }]}>{fmt(acc.totalCost)}</Text>
          </View>
        ))}

        {/* Total row */}
        <View style={[s.tableRow, { backgroundColor: c.sand, borderTopWidth: 2, borderTopColor: c.ocean }]}>
          <Text style={[s.tableCellBold, { flex: 3 }]}>TOTAL ALOJAMIENTO</Text>
          <Text style={{ flex: 2 }} />
          <Text style={{ flex: 1 }} />
          <Text style={[s.tableCellBold, { flex: 1, textAlign: "center" }]}>
            {trip.accommodations.reduce((sum, a) => sum + a.nights, 0)} noc.
          </Text>
          <Text style={{ flex: 2 }} />
          <Text style={[s.tableCellBold, { flex: 2, textAlign: "right", color: c.sunset }]}>
            {fmt(trip.costs.accommodation)}
          </Text>
        </View>

        {/* Booking links */}
        {trip.accommodations.some((a) => a.bookingUrl) && (
          <View style={{ marginTop: 16 }}>
            <Text style={[s.sectionLabel, { marginBottom: 8 }]}>{"Links de reserva".toUpperCase()}</Text>
            {trip.accommodations.filter((a) => a.bookingUrl).map((acc, i) => (
              <Text key={i} style={[s.caption, { color: c.ocean, marginBottom: 3 }]}>
                {acc.name}: {acc.bookingUrl}
              </Text>
            ))}
          </View>
        )}

        <PageFooter page={2 + trip.days.length + 1} total={totalPages} />
      </Page>

      {/* ─── OPTIMIZER TIPS (condicional) ─────────────────────────── */}
      {hasTips && (
        <Page size="A4" style={s.page}>
          <PageHeader title="Consejos" tripTitle={trip.title} />
          <Text style={s.sectionLabel}>{"Optimizacion del viaje".toUpperCase()}</Text>
          <Text style={s.h2}>Consejos para ahorrar y disfrutar mas</Text>
          <View style={s.divider} />

          {optimizerTips.map((tip, i) => (
            <View key={i} style={s.tipCard}>
              <Text style={s.tipNum}>{i + 1}</Text>
              <Text style={s.tipText}>{tip}</Text>
            </View>
          ))}

          <PageFooter page={2 + trip.days.length + 2} total={totalPages} />
        </Page>
      )}

      {/* ─── BACK COVER / CTA ─────────────────────────────────────── */}
      <Page size="A4" style={{ backgroundColor: c.dark, padding: 0 }}>
        <View style={s.backCover}>
          <View>
            <Text style={[s.sectionLabel, { color: "rgba(255,255,255,0.3)", marginBottom: 16 }]}>
              TE GUSTO EL PLAN?
            </Text>
            <Text style={s.backTitle}>
              Planifica tu{"\n"}proximo viaje{"\n"}en segundos
            </Text>
            <Text style={s.backSub}>
              Describe a donde quieres ir y cuando, y nuestros agentes IA
              arman tu itinerario completo con costos, actividades, alojamiento
              y transporte — todo de una vez.
            </Text>

            <View style={s.backFeatures}>
              {[
                "Agentes IA", "Vuelos", "Hoteles",
                "Itinerario dia a dia", "Division de gastos", "PDF exportable",
              ].map((f) => (
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
              Este PDF fue generado automaticamente por tuviaje.com el {today}.
              Los precios son estimaciones y pueden variar. Verifica siempre con las plataformas de booking antes de comprar.
            </Text>
          </View>
        </View>
      </Page>

    </Document>
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const trip: Trip = await req.json();

    if (!trip || !trip.days || !trip.cities) {
      return new NextResponse(JSON.stringify({ error: "Datos de viaje inválidos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(React.createElement(TripPDF, { trip }) as any);

    const slug = (trip.title ?? "viaje")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const filename = `tuviaje-${slug}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[pdf/route] Error generating PDF:", err);
    return new NextResponse(
      JSON.stringify({ error: "Error generando el PDF", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
