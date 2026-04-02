import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { Trip } from "@/types/trip";

function fmt(n: number) {
  return n.toLocaleString("es-CL");
}

function computeBalances(trip: Trip) {
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
    name: t.name,
    emoji: t.emoji,
    totalPays: paid[t.id] ?? 0,
    totalOwes: owes[t.id] ?? 0,
    net: (paid[t.id] ?? 0) - (owes[t.id] ?? 0),
  }));
}

export async function POST(req: NextRequest) {
  const trip: Trip = await req.json();
  const wb = XLSX.utils.book_new();

  // ─── Hoja 1: Resumen ───────────────────────────────────────────
  const summaryData = [
    [`🗺️ ${trip.title}`, "", "", ""],
    [`📅 ${trip.startDate} → ${trip.endDate}`, "", "", ""],
    [`👥 ${trip.travelers.adults} adultos`, "", "", ""],
    [`✈️ Estilo: ${trip.travelStyle}`, "", "", ""],
    ["", "", "", ""],
    ["CATEGORÍA", "MONTO (CLP)", "POR PERSONA", ""],
    ["✈️ Transporte entre ciudades", fmt(trip.costs.transport), fmt(Math.round(trip.costs.transport / trip.travelers.adults)), ""],
    ["🏨 Alojamiento", fmt(trip.costs.accommodation), fmt(Math.round(trip.costs.accommodation / trip.travelers.adults)), ""],
    ["🍽️ Comida", fmt(trip.costs.food), fmt(Math.round(trip.costs.food / trip.travelers.adults)), ""],
    ["🎭 Actividades", fmt(trip.costs.activities), fmt(Math.round(trip.costs.activities / trip.travelers.adults)), ""],
    ["🚇 Transporte local", fmt(trip.costs.localTransport), fmt(Math.round(trip.costs.localTransport / trip.travelers.adults)), ""],
    ["🛍️ Extras", fmt(trip.costs.extras), fmt(Math.round(trip.costs.extras / trip.travelers.adults)), ""],
    ["", "", "", ""],
    ["💰 TOTAL", fmt(trip.costs.total), fmt(trip.costs.perPerson), ""],
    ["📊 Por día/persona", fmt(trip.costs.perDayPerPerson), "", ""],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"] = [{ wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws1, "💰 Resumen");

  // ─── Hoja 2: Día a día ─────────────────────────────────────────
  const dayRows: (string | number)[][] = [
    ["DÍA", "FECHA", "CIUDAD", "HORARIO", "ACTIVIDAD", "DESCRIPCIÓN", "COSTO (CLP)", "TIP"],
  ];
  for (const day of trip.days) {
    if (day.isTravelDay) {
      dayRows.push([day.dayNumber, day.date, day.city, "—", "✈️ Día de viaje", "", 0, ""]);
      continue;
    }
    const acts = [...(day.morning ?? []), ...(day.afternoon ?? [])];
    for (const act of acts) {
      dayRows.push([
        day.dayNumber, day.date, day.city,
        act.time, `${act.emoji ?? ""} ${act.name}`,
        act.description, act.costClp, act.tip ?? "",
      ]);
    }
    const lunch = day.lunch?.options?.[0];
    if (lunch) dayRows.push([day.dayNumber, day.date, day.city, "13:00", `🍽️ Almuerzo: ${lunch.name}`, lunch.cuisine, lunch.costClp, ""]);
    const dinner = day.dinner?.options?.[0];
    if (dinner) dayRows.push([day.dayNumber, day.date, day.city, "20:00", `🌙 Cena: ${dinner.name}`, dinner.cuisine, dinner.costClp, ""]);
    dayRows.push([day.dayNumber, day.date, day.city, "", "TOTAL DEL DÍA →", "", day.dayTotalClp, ""]);
    dayRows.push(["", "", "", "", "", "", "", ""]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(dayRows);
  ws2["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 30 }, { wch: 28 }, { wch: 14 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, ws2, "📅 Día a día");

  // ─── Hoja 3: Por persona (split) ────────────────────────────────
  const balances = computeBalances(trip);
  const splitRows: (string | number)[][] = [
    ["PERSONA", "PAGA POR ADELANTADO", "LE CORRESPONDE", "BALANCE", "ESTADO"],
  ];
  for (const b of balances) {
    splitRows.push([
      `${b.emoji} ${b.name}`,
      fmt(b.totalPays),
      fmt(b.totalOwes),
      fmt(Math.abs(b.net)),
      b.net > 0 ? `Le deben $${fmt(b.net)}` : b.net < 0 ? `Debe $${fmt(-b.net)}` : "✅ A mano",
    ]);
  }
  splitRows.push(["", "", "", "", ""]);
  splitRows.push(["DETALLE POR CATEGORÍA", "PAGA", "DIVIDIDO ENTRE", "MONTO TOTAL", "POR PERSONA"]);
  for (const a of trip.splitAssignments) {
    const payer = trip.travelers_list.find((t) => t.id === a.paidBy);
    const members = a.splitBetween
      .map((id) => trip.travelers_list.find((t) => t.id === id)?.name ?? id)
      .join(", ");
    splitRows.push([
      a.label,
      payer?.name ?? "—",
      members,
      fmt(a.amountClp),
      a.splitBetween.length ? fmt(Math.round(a.amountClp / a.splitBetween.length)) : "—",
    ]);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(splitRows);
  ws3["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 30 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws3, "👥 Por persona");

  // ─── Hoja 4: Alojamiento ───────────────────────────────────────
  const hotelRows: (string | number)[][] = [
    ["CIUDAD", "HOTEL", "ESTRELLAS", "NOCHES", "PRECIO/NOCHE", "TOTAL", "BARRIO", "LINK"],
  ];
  for (const acc of trip.accommodations) {
    hotelRows.push([
      acc.city, acc.name, acc.stars ?? "—", acc.nights,
      fmt(acc.pricePerNight), fmt(acc.totalCost),
      acc.neighborhood ?? "—", acc.bookingUrl ?? "",
    ]);
  }
  const ws4 = XLSX.utils.aoa_to_sheet(hotelRows);
  ws4["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws4, "🏨 Alojamiento");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `tuviaje-${trip.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
