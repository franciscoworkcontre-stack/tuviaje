import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { Trip, SplitAssignment } from "@/types/trip";

// ─── Formatting helpers ────────────────────────────────────────────────────

function clp(n: number): string {
  return `$ ${n.toLocaleString("es-CL")}`;
}

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function travelStyleLabel(style: string): string {
  const map: Record<string, string> = {
    mochilero: "Mochilero / Económico",
    comfort: "Comfort / Equilibrado",
    premium: "Premium / Lujo",
  };
  return map[style] ?? style;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function transportTypeLabel(t: string): string {
  const map: Record<string, string> = {
    flight: "Vuelo",
    bus: "Bus",
    train: "Tren",
    car: "Auto / Arriendo",
  };
  return map[t] ?? t;
}

function minutesToHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// ─── Balance computation ──────────────────────────────────────────────────

interface Balance {
  id: string;
  name: string;
  emoji: string;
  totalPays: number;
  totalOwes: number;
  net: number;
}

function computeBalances(trip: Trip): Balance[] {
  const { travelers_list, splitAssignments } = trip;
  const paid: Record<string, number> = {};
  const owes: Record<string, number> = {};
  for (const t of travelers_list) {
    paid[t.id] = 0;
    owes[t.id] = 0;
  }
  for (const a of splitAssignments) {
    paid[a.paidBy] = (paid[a.paidBy] ?? 0) + a.amountClp;
    const per = a.splitBetween.length ? a.amountClp / a.splitBetween.length : 0;
    for (const id of a.splitBetween) owes[id] = (owes[id] ?? 0) + per;
  }
  return travelers_list.map((t) => ({
    id: t.id,
    name: t.name,
    emoji: t.emoji,
    totalPays: paid[t.id] ?? 0,
    totalOwes: owes[t.id] ?? 0,
    net: (paid[t.id] ?? 0) - (owes[t.id] ?? 0),
  }));
}

// Greedy minimum-transactions algorithm
interface Transaction {
  from: string;
  to: string;
  amount: number;
}

function minimizeTransactions(balances: Balance[]): Transaction[] {
  const pos = balances.filter((b) => b.net > 0.5).map((b) => ({ ...b }));
  const neg = balances.filter((b) => b.net < -0.5).map((b) => ({ ...b }));
  const txns: Transaction[] = [];
  let pi = 0;
  let ni = 0;
  while (pi < pos.length && ni < neg.length) {
    const credit = pos[pi].net;
    const debt = -neg[ni].net;
    const amount = Math.min(credit, debt);
    txns.push({ from: neg[ni].name, to: pos[pi].name, amount: Math.round(amount) });
    pos[pi].net -= amount;
    neg[ni].net += amount;
    if (pos[pi].net < 0.5) pi++;
    if (-neg[ni].net < 0.5) ni++;
  }
  return txns;
}

// ─── Sheet builder helpers ─────────────────────────────────────────────────

type Row = (string | number)[];

/** A blank separator row */
function blank(cols: number): Row {
  return Array(cols).fill("");
}

/** A section header row — all caps label in col 0, rest empty */
function sectionHeader(label: string, cols: number): Row {
  const row: Row = Array(cols).fill("");
  row[0] = label;
  return row;
}

/** A divider row using dashes */
function divider(cols: number, char = "─"): Row {
  return Array(cols).fill(char.repeat(28));
}

function makeSheet(rows: Row[], colWidths: number[]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  // Freeze first row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  return ws;
}

// ─── Sheet 1: Portada ─────────────────────────────────────────────────────

function buildPortada(trip: Trip): XLSX.WorkSheet {
  const adults = trip.travelers.adults;
  const children = trip.travelers.children;
  const travelerDesc =
    children > 0
      ? `${adults} adulto${adults !== 1 ? "s" : ""} + ${children} niño${children !== 1 ? "s" : ""}`
      : `${adults} adulto${adults !== 1 ? "s" : ""}`;

  const cityList = trip.cities.map((c) => `${c.name} (${c.days}d)`).join("  ·  ");

  const rows: Row[] = [
    [""],
    ["TU VIAJE — PLAN DE VIAJE PERSONALIZADO"],
    [""],
    ["Nombre del viaje", trip.title],
    ["Origen", trip.originCity],
    ["Destinos", cityList],
    ["Fecha de salida", formatDate(trip.startDate)],
    ["Fecha de regreso", formatDate(trip.endDate)],
    ["Duración total", `${trip.totalDays} días`],
    ["Viajeros", travelerDesc],
    ["Estilo de viaje", travelStyleLabel(trip.travelStyle)],
    ["Moneda base", trip.currency],
    [""],
    divider(2),
    [""],
    ["RESUMEN ECONOMICO"],
    [""],
    ["Costo total del viaje", clp(trip.costs.total)],
    ["Costo por persona", clp(trip.costs.perPerson)],
    ["Costo por persona por dia", clp(trip.costs.perDayPerPerson)],
    [""],
    divider(2),
    [""],
    ["CIUDADES DEL ITINERARIO"],
    [""],
    ...trip.cities.map((c) => [
      `${c.name}, ${c.country}`,
      `${c.days} dia${c.days !== 1 ? "s" : ""}${c.firstTime ? " — Primera visita" : ""}`,
    ]),
    [""],
    divider(2),
    [""],
    ["Documento generado por TuViaje.app", formatDate(new Date().toISOString().slice(0, 10))],
    [""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 50 }];
  return ws;
}

// ─── Sheet 2: Presupuesto ─────────────────────────────────────────────────

function buildPresupuesto(trip: Trip): XLSX.WorkSheet {
  const { costs } = trip;
  const adults = trip.travelers.adults + trip.travelers.children || 1;

  const categories: [string, number][] = [
    ["Transporte entre ciudades", costs.transport],
    ["Alojamiento", costs.accommodation],
    ["Alimentacion (comidas y cafes)", costs.food],
    ["Actividades y entradas", costs.activities],
    ["Transporte local (metro, taxi, bus)", costs.localTransport],
    ["Extras y compras", costs.extras],
  ];

  const cols = 4;
  const rows: Row[] = [
    sectionHeader("PRESUPUESTO DEL VIAJE", cols),
    blank(cols),
    ["CATEGORIA", "MONTO TOTAL (CLP)", "POR PERSONA (CLP)", "% DEL TOTAL"],
    divider(cols).map(() => "─────────────────────────"),
    ...categories.map(([label, amount]) => [
      label,
      clp(amount),
      clp(Math.round(amount / adults)),
      pct(amount, costs.total),
    ]),
    divider(cols).map(() => "─────────────────────────"),
    ["TOTAL DEL VIAJE", clp(costs.total), clp(costs.perPerson), "100%"],
    blank(cols),
    ["Por dia por persona", clp(costs.perDayPerPerson), "", ""],
    blank(cols),
  ];

  // City breakdown if available
  if (costs.byCityClp && Object.keys(costs.byCityClp).length > 0) {
    rows.push(blank(cols));
    rows.push(sectionHeader("DESGLOSE POR CIUDAD", cols));
    rows.push(blank(cols));
    rows.push(["CIUDAD", "COSTO ESTIMADO (CLP)", "POR PERSONA", "% DEL TOTAL"]);
    rows.push(divider(cols).map(() => "─────────────────────────") as Row);
    for (const [city, amount] of Object.entries(costs.byCityClp)) {
      rows.push([city, clp(amount), clp(Math.round(amount / adults)), pct(amount, costs.total)]);
    }
    rows.push(blank(cols));
  }

  // Budget utilization
  if (trip.budgetMaxClp) {
    rows.push(blank(cols));
    rows.push(sectionHeader("CONTROL DE PRESUPUESTO", cols));
    rows.push(blank(cols));
    rows.push(["Presupuesto maximo definido", clp(trip.budgetMaxClp), "", ""]);
    rows.push(["Costo total real", clp(costs.total), "", ""]);
    const diff = trip.budgetMaxClp - costs.total;
    rows.push([
      diff >= 0 ? "Margen disponible" : "Exceso sobre presupuesto",
      clp(Math.abs(diff)),
      "",
      "",
    ]);
    rows.push(blank(cols));
  }

  return makeSheet(rows, [38, 22, 22, 14]);
}

// ─── Sheet 3: Itinerario ──────────────────────────────────────────────────

function buildItinerario(trip: Trip): XLSX.WorkSheet {
  const cols = 7;
  const rows: Row[] = [
    sectionHeader("ITINERARIO DIA A DIA", cols),
    blank(cols),
    ["DIA", "FECHA", "CIUDAD", "HORA", "ACTIVIDAD", "TIP / DESCRIPCION", "COSTO (CLP)"],
    divider(cols).map(() => "─────────────────────────") as Row,
  ];

  for (const day of trip.days) {
    if (day.isTravelDay) {
      // Travel day block
      rows.push(blank(cols));
      rows.push([
        `Dia ${day.dayNumber}`,
        formatDate(day.date),
        `${day.city} — DIA DE VIAJE`,
        "",
        "Traslado / Llegada a destino",
        "",
        "",
      ]);
      rows.push(blank(cols));
      continue;
    }

    // Day header
    rows.push(blank(cols));
    rows.push([
      `Dia ${day.dayNumber}`,
      formatDate(day.date),
      day.city,
      "",
      day.theme ? `Tema: ${day.theme}` : "",
      "",
      "",
    ]);
    rows.push(divider(cols).map(() => "· · · · · · · · · · · ·") as Row);

    // Morning activities
    if (day.morning?.length) {
      rows.push(["", "", "", "", "— MANANA —", "", ""]);
      for (const act of day.morning) {
        rows.push([
          "",
          "",
          "",
          act.time,
          `${act.emoji ?? ""} ${act.name}`.trim(),
          act.tip ?? act.description ?? "",
          act.costClp > 0 ? clp(act.costClp) : "Gratis",
        ]);
      }
    }

    // Lunch
    const lunch = day.lunch?.options?.[0];
    if (lunch) {
      rows.push(["", "", "", "", "— ALMUERZO —", "", ""]);
      rows.push([
        "",
        "",
        "",
        "13:00",
        lunch.name,
        `${lunch.cuisine} — Precio: ${lunch.priceTier}`,
        clp(lunch.costClp),
      ]);
    }

    // Afternoon activities
    if (day.afternoon?.length) {
      rows.push(["", "", "", "", "— TARDE —", "", ""]);
      for (const act of day.afternoon) {
        rows.push([
          "",
          "",
          "",
          act.time,
          `${act.emoji ?? ""} ${act.name}`.trim(),
          act.tip ?? act.description ?? "",
          act.costClp > 0 ? clp(act.costClp) : "Gratis",
        ]);
      }
    }

    // Dinner
    const dinner = day.dinner?.options?.[0];
    if (dinner) {
      rows.push(["", "", "", "", "— CENA —", "", ""]);
      rows.push([
        "",
        "",
        "",
        "20:00",
        dinner.name,
        `${dinner.cuisine} — Precio: ${dinner.priceTier}`,
        clp(dinner.costClp),
      ]);
    }

    // Evening activity
    if (day.eveningActivity) {
      const ev = day.eveningActivity;
      rows.push(["", "", "", "", "— NOCHE —", "", ""]);
      rows.push([
        "",
        "",
        "",
        ev.time,
        `${ev.emoji ?? ""} ${ev.name}`.trim(),
        ev.tip ?? ev.description ?? "",
        ev.costClp > 0 ? clp(ev.costClp) : "Gratis",
      ]);
    }

    // Daily total
    rows.push(divider(cols).map(() => "─────────────────────────") as Row);
    rows.push([
      "",
      "",
      "",
      "",
      `TOTAL DIA ${day.dayNumber}`,
      "Incluye actividades + comidas + transporte local",
      clp(day.dayTotalClp),
    ]);
    rows.push(blank(cols));
  }

  return makeSheet(rows, [8, 14, 20, 8, 35, 40, 16]);
}

// ─── Sheet 4: Alojamiento & Vuelos ────────────────────────────────────────

function buildAlojamientoVuelos(trip: Trip): XLSX.WorkSheet {
  const cols = 8;
  const rows: Row[] = [];

  // ── ALOJAMIENTO section ──
  rows.push(sectionHeader("ALOJAMIENTO", cols));
  rows.push(blank(cols));
  rows.push([
    "CIUDAD",
    "HOTEL / ALOJAMIENTO",
    "ESTRELLAS",
    "NOCHES",
    "PRECIO / NOCHE (CLP)",
    "TOTAL (CLP)",
    "BARRIO / ZONA",
    "URL DE RESERVA",
  ]);
  rows.push(divider(cols).map(() => "─────────────────────────") as Row);

  let accTotal = 0;
  for (const acc of trip.accommodations) {
    accTotal += acc.totalCost;
    rows.push([
      acc.city,
      acc.name,
      acc.stars ? `${"★".repeat(acc.stars)}` : "—",
      acc.nights,
      clp(acc.pricePerNight),
      clp(acc.totalCost),
      acc.neighborhood ?? "—",
      acc.bookingUrl ?? "Buscar en Booking.com",
    ]);
  }

  rows.push(divider(cols).map(() => "─────────────────────────") as Row);
  rows.push(["TOTAL ALOJAMIENTO", "", "", "", "", clp(accTotal), "", ""]);
  rows.push(blank(cols));
  rows.push(blank(cols));

  // ── TRANSPORTE section ──
  rows.push(sectionHeader("TRANSPORTE ENTRE CIUDADES", cols));
  rows.push(blank(cols));
  rows.push([
    "TRAMO",
    "TIPO",
    "PROVEEDOR",
    "SALIDA",
    "LLEGADA",
    "DURACION",
    "PRECIO/PERSONA (CLP)",
    "PRECIO TOTAL (CLP)",
  ]);
  rows.push(divider(cols).map(() => "─────────────────────────") as Row);

  let legTotal = 0;
  for (const leg of trip.transportLegs) {
    const opt = leg.selected ?? leg.options?.[0];
    const tramo = `${leg.fromCity} → ${leg.toCity}`;
    if (opt) {
      legTotal += opt.priceTotal;
      rows.push([
        tramo,
        transportTypeLabel(opt.type),
        opt.provider,
        opt.departureTime ?? "—",
        opt.arrivalTime ?? "—",
        minutesToHM(opt.durationMinutes),
        clp(opt.pricePerPerson),
        clp(opt.priceTotal),
      ]);
      if (opt.flightNumber) {
        rows.push(["", `Vuelo: ${opt.flightNumber}`, `Escalas: ${opt.stops ?? 0}`, "", "", "", "", ""]);
      }
    } else {
      rows.push([tramo, "Por definir", "", leg.date ?? "", "", "", "", ""]);
    }
    if (leg.flightSearchUrl) {
      rows.push(["", "Buscar vuelos:", leg.flightSearchUrl, "", "", "", "", ""]);
    }
  }

  rows.push(divider(cols).map(() => "─────────────────────────") as Row);
  rows.push(["TOTAL TRANSPORTE", "", "", "", "", "", "", clp(legTotal)]);
  rows.push(blank(cols));

  return makeSheet(rows, [28, 16, 22, 10, 10, 12, 22, 22]);
}

// ─── Sheet 5: Division de gastos ─────────────────────────────────────────

function buildDivision(trip: Trip): XLSX.WorkSheet {
  const balances = computeBalances(trip);
  const transactions = minimizeTransactions(balances);
  const cols = 5;
  const rows: Row[] = [];

  // ── Balance summary ──
  rows.push(sectionHeader("DIVISION DE GASTOS — RESUMEN DE BALANCES", cols));
  rows.push(blank(cols));
  rows.push(["VIAJERO", "PAGO POR ADELANTADO", "LE CORRESPONDE", "BALANCE NETO", "ESTADO"]);
  rows.push(divider(cols).map(() => "─────────────────────────") as Row);

  for (const b of balances) {
    const absNet = Math.abs(b.net);
    let estado: string;
    if (b.net > 0.5) estado = `Le deben ${clp(b.net)}`;
    else if (b.net < -0.5) estado = `Debe ${clp(absNet)}`;
    else estado = "A mano — sin deuda";
    rows.push([
      `${b.emoji}  ${b.name}`,
      clp(b.totalPays),
      clp(b.totalOwes),
      b.net >= 0 ? `+${clp(absNet)}` : `-${clp(absNet)}`,
      estado,
    ]);
  }

  rows.push(blank(cols));
  rows.push(blank(cols));

  // ── Minimum transactions ──
  rows.push(sectionHeader("TRANSACCIONES MINIMAS PARA SALDAR DEUDAS", cols));
  rows.push(blank(cols));

  if (transactions.length === 0) {
    rows.push(["Todos los viajeros estan a mano. No hay deudas pendientes.", "", "", "", ""]);
  } else {
    rows.push(["N°", "QUIEN PAGA", "A QUIEN", "MONTO (CLP)", "MEDIO SUGERIDO"]);
    rows.push(divider(cols).map(() => "─────────────────────────") as Row);
    transactions.forEach((t, i) => {
      rows.push([
        `${i + 1}.`,
        t.from,
        t.to,
        clp(t.amount),
        "Transferencia bancaria / PayPal",
      ]);
    });
  }

  rows.push(blank(cols));
  rows.push(blank(cols));

  // ── Itemized assignments ──
  rows.push(sectionHeader("DETALLE DE GASTOS POR ITEM", cols));
  rows.push(blank(cols));
  rows.push(["CONCEPTO", "PAGADO POR", "DIVIDIDO ENTRE", "MONTO TOTAL (CLP)", "POR PERSONA (CLP)"]);
  rows.push(divider(cols).map(() => "─────────────────────────") as Row);

  const grouped: Record<string, SplitAssignment[]> = {};
  for (const a of trip.splitAssignments) {
    const category = a.itemId.split("-")[0] ?? "Otros";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(a);
  }

  for (const [category, assignments] of Object.entries(grouped)) {
    rows.push([category.toUpperCase(), "", "", "", ""]);
    for (const a of assignments) {
      const payer = trip.travelers_list.find((t) => t.id === a.paidBy);
      const members = a.splitBetween
        .map((id) => trip.travelers_list.find((t) => t.id === id)?.name ?? id)
        .join(", ");
      rows.push([
        `  ${a.label}`,
        payer?.name ?? "—",
        members || "Todos",
        clp(a.amountClp),
        a.splitBetween.length ? clp(Math.round(a.amountClp / a.splitBetween.length)) : "—",
      ]);
    }
    rows.push(blank(cols));
  }

  // ── Per-category totals per person ──
  rows.push(blank(cols));
  rows.push(sectionHeader("CUANTO LE TOCA A CADA VIAJERO POR CATEGORIA", cols));
  rows.push(blank(cols));

  const categoryMap: Record<string, string> = {
    transport: "Transporte",
    accommodation: "Alojamiento",
    food: "Alimentacion",
    activities: "Actividades",
    localTransport: "Transporte local",
    extras: "Extras",
  };

  const perPersonByCategory: Record<string, Record<string, number>> = {};
  for (const a of trip.splitAssignments) {
    if (!a.splitBetween.length) continue;
    const perP = a.amountClp / a.splitBetween.length;
    const cat = a.itemId.split("-")[0] ?? "otros";
    if (!perPersonByCategory[cat]) perPersonByCategory[cat] = {};
    for (const id of a.splitBetween) {
      perPersonByCategory[cat][id] = (perPersonByCategory[cat][id] ?? 0) + perP;
    }
  }

  const travelerNames = trip.travelers_list.map((t) => `${t.emoji} ${t.name}`);
  rows.push(["CATEGORIA", ...travelerNames, ""]);
  rows.push(divider(cols).map(() => "─────────────────────────") as Row);

  for (const [catKey, catLabel] of Object.entries(categoryMap)) {
    const catData = perPersonByCategory[catKey];
    if (!catData) continue;
    const personCosts = trip.travelers_list.map((t) =>
      catData[t.id] ? clp(Math.round(catData[t.id])) : "—"
    );
    rows.push([catLabel, ...personCosts, ""]);
  }

  rows.push(blank(cols));

  return makeSheet(rows, [36, 22, 30, 20, 20]);
}

// ─── POST handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const trip: Trip = await req.json();
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildPortada(trip), "Portada");
  XLSX.utils.book_append_sheet(wb, buildPresupuesto(trip), "Presupuesto");
  XLSX.utils.book_append_sheet(wb, buildItinerario(trip), "Itinerario");
  XLSX.utils.book_append_sheet(wb, buildAlojamientoVuelos(trip), "Alojamiento y Vuelos");
  XLSX.utils.book_append_sheet(wb, buildDivision(trip), "Division de Gastos");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const slug = trip.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const filename = `tuviaje-${slug}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
