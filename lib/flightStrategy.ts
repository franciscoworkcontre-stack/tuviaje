/**
 * Flight Strategy Engine
 *
 * Analyzes the full trip topology, generates candidate purchase strategies,
 * prices them in parallel via SerpAPI, and returns ONE recommendation
 * with cost+time scoring.
 *
 * Score = totalCostCLP + (extraTravelHours × HOUR_VALUE_CLP)
 * Winner = lowest score.
 */

import { fetchLegFlights, fetchRoundTripBestPrice, flightScore, HOUR_VALUE_CLP as STYLE_HOUR_VALUES } from "@/lib/fetchFlights";
import type { FlightOption } from "@/types/trip";

// ── Region map ──────────────────────────────────────────────────────────────
const IATA_REGION: Record<string, string> = {
  // LATAM
  SCL:"latam", LIM:"latam", BOG:"latam", MEX:"latam", EZE:"latam", AEP:"latam",
  GRU:"latam", GIG:"latam", SSA:"latam", UIO:"latam", MVD:"latam", ASU:"latam",
  VVI:"latam", LPB:"latam", MDE:"latam", CTG:"latam", HAV:"latam", PTY:"latam",
  SJO:"latam", GUA:"latam", SAL:"latam", CUN:"latam", SJU:"latam", SDQ:"latam",
  // North America
  JFK:"northamerica", EWR:"northamerica", LGA:"northamerica", LAX:"northamerica",
  MIA:"northamerica", ORD:"northamerica", DFW:"northamerica", SFO:"northamerica",
  ATL:"northamerica", YYZ:"northamerica", BOS:"northamerica", SEA:"northamerica",
  DEN:"northamerica", MSP:"northamerica", YVR:"northamerica", YUL:"northamerica",
  // Europe
  MAD:"europe", LHR:"europe", CDG:"europe", AMS:"europe", FCO:"europe",
  FRA:"europe", BCN:"europe", LIS:"europe", MXP:"europe", ZRH:"europe",
  VIE:"europe", MUC:"europe", OSL:"europe", ARN:"europe", CPH:"europe",
  DUB:"europe", ATH:"europe", IST:"europe", WAW:"europe", PRG:"europe",
  BRU:"europe", HEL:"europe", NAP:"europe", NCE:"europe", LYS:"europe",
  OPO:"europe", SVQ:"europe", AGP:"europe", PMI:"europe", VLC:"europe",
  // Middle East
  DXB:"middleeast", AUH:"middleeast", DOH:"middleeast", AMM:"middleeast",
  // Asia
  SIN:"asia", HKG:"asia", ICN:"asia", NRT:"asia", HND:"asia", PVG:"asia",
  PEK:"asia", PKX:"asia", BKK:"asia", KUL:"asia", DEL:"asia", BOM:"asia",
  // Oceania
  SYD:"oceania", MEL:"oceania", AKL:"oceania",
  // Africa
  JNB:"africa", NBO:"africa", CMN:"africa", CAI:"africa",
};

function region(iata?: string) {
  return iata ? (IATA_REGION[iata.toUpperCase()] ?? "unknown") : "unknown";
}

function isIntercontinental(fromIata?: string, toIata?: string) {
  const r1 = region(fromIata);
  const r2 = region(toIata);
  return r1 !== "unknown" && r2 !== "unknown" && r1 !== r2;
}

// ── Types ───────────────────────────────────────────────────────────────────
export interface StrategyLeg {
  fromCity: string;
  toCity:   string;
  fromIata: string;
  toIata:   string;
  date:     string;
}

export type StrategyType =
  | "all_one_way"            // every leg bought separately
  | "rt_hub_plus_regionals"  // RT to intercontinental hub + cheap regional legs
  | "rt_direct";             // simple RT, single destination

export interface FlightStrategyRecommendation {
  type:            StrategyType;
  hubCity?:        string;
  hubIata?:        string;
  explanation:     string;    // 1-2 Spanish sentences
  reasoning:       string[];  // why this strategy wins (bullet points)
  howToBuy:        string[];  // step-by-step purchase guide
  savingsClp?:     number;    // vs runner-up strategy
  rtReturnDate?:   string;    // date for the return if using RT
  // The connector leg needed to return to hub when using RT strategy
  connectorLeg?:   { fromCity: string; toCity: string; fromIata: string; toIata: string; approxDate: string };
}

// ── Main export ──────────────────────────────────────────────────────────────
export interface StrategyResult {
  recommendation:  FlightStrategyRecommendation;
  flightOptions:   Record<string, FlightOption[]>;  // all fetched options keyed by "from-to"
}

export async function analyzeFlightStrategy(
  legs:        StrategyLeg[],
  adults:      number,
  originCity:  string,
  roundTrip:   boolean,
  travelStyle: string = "comfort",
  children:    number = 0,
  infants:     number = 0,
): Promise<StrategyResult> {
  if (!legs.length) {
    return { recommendation: noFlightsRec(), flightOptions: {} };
  }

  // ── Identify topology ──────────────────────────────────────────────────────
  const firstLeg   = legs[0];
  const lastLeg    = legs[legs.length - 1];
  const isRT       = roundTrip;
  const firstIsIC  = isIntercontinental(firstLeg.fromIata, firstLeg.toIata);
  const hasRegionals = legs.length > 1; // more legs after the first

  // Determine if we have a "hub + regionals" pattern:
  // - round trip
  // - first leg is intercontinental (origin → hub in different region)
  // - there are additional legs in the hub's region
  const isHubPattern = isRT && firstIsIC && hasRegionals;

  // ── Simple round-trip (single destination) ─────────────────────────────────
  if (isRT && legs.length === 1) {
    return analyzeSimpleRT(legs[0], adults, travelStyle, children, infants);
  }

  // ── Hub + regionals ────────────────────────────────────────────────────────
  if (isHubPattern) {
    return analyzeHubPattern(legs, adults, originCity, travelStyle, children, infants);
  }

  // ── Default: all one-ways (no special structure detected) ──────────────────
  return analyzeAllOneWay(legs, adults, travelStyle, children, infants);
}

// ── Strategy: all one-ways ───────────────────────────────────────────────────
async function analyzeAllOneWay(legs: StrategyLeg[], adults: number, travelStyle: string, children = 0, infants = 0): Promise<StrategyResult> {
  const flightOptions = await fetchAllLegsParallel(legs, adults, travelStyle, children, infants);
  const totalClp = sumBestPrices(flightOptions, legs);

  const rec: FlightStrategyRecommendation = {
    type: "all_one_way",
    explanation: `Analizamos ${legs.length} tramo${legs.length > 1 ? "s" : ""} de vuelo y la estrategia óptima es comprar cada ticket por separado para máxima flexibilidad y menor costo total.`,
    reasoning: [
      "Cada tramo tiene aerolíneas y precios distintos — un ticket combinado costaría más",
      "Comprar por separado permite elegir la mejor opción por tramo",
      legs.some(l => !isIntercontinental(l.fromIata, l.toIata))
        ? "Los vuelos regionales son más baratos comprados individualmente" : "",
    ].filter(Boolean),
    howToBuy: legs.map((l, i) =>
      `${i + 1}. Compra el vuelo ${l.fromCity} → ${l.toCity} (${l.fromIata} → ${l.toIata}) para el ${l.date}`
    ),
  };

  return { recommendation: rec, flightOptions };
}

// ── Strategy: simple round-trip ──────────────────────────────────────────────
async function analyzeSimpleRT(leg: StrategyLeg, adults: number, travelStyle: string, children = 0, infants = 0): Promise<StrategyResult> {
  const returnDate = leg.date; // caller sets last leg date as return

  // Fetch RT price and two one-way prices in parallel
  const [rtBest, owOut, owReturn] = await Promise.all([
    fetchRoundTripBestPrice(leg.fromIata, leg.toIata, leg.date, returnDate, adults, children, infants),
    fetchLegFlights(leg.fromIata, leg.toIata, leg.date, adults, travelStyle, children, infants),
    fetchRoundTripBestPrice(leg.toIata, leg.fromIata, returnDate, returnDate, adults, children, infants),
  ]);

  const owOutPrice = owOut[0]?.priceClp ?? 0;
  const owRetPrice = owReturn ?? 0;
  const owTotal    = owOutPrice + owRetPrice;
  const rtTotal    = rtBest ?? 0;

  const useRT    = rtTotal > 0 && rtTotal < owTotal;
  const savings  = useRT ? owTotal - rtTotal : 0;

  const flightOptions: Record<string, FlightOption[]> = {
    [`${leg.fromCity}-${leg.toCity}`]: owOut,
  };

  const rec: FlightStrategyRecommendation = {
    type: "rt_direct",
    explanation: useRT
      ? `El ticket ida/vuelta ${leg.fromCity}↔${leg.toCity} es ${Math.round(savings / 950).toLocaleString("en-US")} USD más barato que comprar dos one-ways por separado.`
      : `Comprando los vuelos por separado obtienes mayor flexibilidad sin costo adicional significativo.`,
    reasoning: useRT
      ? [
          `Ticket RT: ${fmtClp(rtTotal)} vs dos OW: ${fmtClp(owTotal)}`,
          `Ahorro de ${fmtClp(savings)} comprando como ida/vuelta`,
          "Un solo proceso de compra en la misma aerolínea",
        ]
      : [
          "Los precios one-way son similares al RT en esta ruta",
          "Comprar por separado da más flexibilidad de horarios",
        ],
    howToBuy: useRT
      ? [
          `1. Busca el vuelo ${leg.fromIata} → ${leg.toIata} como ROUND TRIP, no como one-way`,
          `2. Fecha de ida: ${leg.date}`,
          `3. Fecha de vuelta: ${returnDate}`,
        ]
      : [
          `1. Compra el vuelo de ida: ${leg.fromIata} → ${leg.toIata} para el ${leg.date}`,
          `2. Compra el vuelo de vuelta por separado para el ${returnDate}`,
        ],
    savingsClp: savings > 0 ? savings : undefined,
    rtReturnDate: returnDate,
  };

  return { recommendation: rec, flightOptions };
}

// ── Strategy: hub + regionals ────────────────────────────────────────────────
async function analyzeHubPattern(
  legs:        StrategyLeg[],
  adults:      number,
  originCity:  string,
  travelStyle: string,
  children:    number = 0,
  infants:     number = 0,
): Promise<StrategyResult> {
  const hubLeg       = legs[0];  // e.g. SCL → MAD
  const regionalLegs = legs.slice(1, -1); // e.g. MAD→ROM, ROM→BCN
  const returnLeg    = legs[legs.length - 1]; // e.g. BCN→SCL or last city→origin

  // The "last city before return" — we need a connector back to hub if using RT
  const lastRegionalLeg    = regionalLegs[regionalLegs.length - 1] ?? hubLeg;
  const lastCityBeforeHub  = lastRegionalLeg.toCity;
  const lastIataBeforeHub  = lastRegionalLeg.toIata;

  // Connector needed for RT strategy: lastCity → hub
  const needsConnector = lastIataBeforeHub !== hubLeg.toIata;
  const connectorLeg: StrategyLeg | null = needsConnector
    ? {
        fromCity: lastCityBeforeHub,
        toCity:   hubLeg.toCity,
        fromIata: lastIataBeforeHub,
        toIata:   hubLeg.toIata,
        date:     returnLeg.date,
      }
    : null;

  // ── Fetch all prices in parallel ──────────────────────────────────────────
  // Strategy A (RT hub): RT price for hub leg + all regional OWs + connector
  // Strategy B (all OW): all legs as one-way including the return

  const allLegsToFetch: StrategyLeg[] = [
    ...legs,
    ...(connectorLeg ? [connectorLeg] : []),
  ];

  const [rtHubPrice, allOWOptions] = await Promise.all([
    fetchRoundTripBestPrice(hubLeg.fromIata, hubLeg.toIata, hubLeg.date, returnLeg.date, adults, children, infants),
    fetchAllLegsParallel(allLegsToFetch, adults, travelStyle, children, infants),
  ]);

  // ── Strategy A costs ──────────────────────────────────────────────────────
  // RT hub price + regional OWs + connector (if needed)
  const regionalKeys    = regionalLegs.map(l => `${l.fromCity}-${l.toCity}`);
  const connectorKey    = connectorLeg ? `${connectorLeg.fromCity}-${connectorLeg.toCity}` : null;

  const regionalCostA   = regionalKeys.reduce((s, k) =>
    s + (allOWOptions[k]?.[0]?.priceClp ?? 0), 0);
  const connectorCostA  = connectorKey
    ? (allOWOptions[connectorKey]?.[0]?.priceClp ?? 0)
    : 0;
  const rtCostA         = (rtHubPrice ?? 0);
  const totalA          = rtCostA + regionalCostA + connectorCostA;

  // Extra travel time for Strategy A: the connector leg (approx 1.5h average intra-region)
  const extraTimeA = connectorLeg ? 90 : 0; // minutes
  const hourValue = STYLE_HOUR_VALUES[travelStyle] ?? STYLE_HOUR_VALUES.comfort;
  const timePenaltyA = Math.round(extraTimeA / 60 * hourValue);
  const scoreA = totalA + timePenaltyA;

  // ── Strategy B costs ──────────────────────────────────────────────────────
  // All one-ways: hub OW + regionals + return leg
  const hubKey     = `${hubLeg.fromCity}-${hubLeg.toCity}`;
  const returnKey  = `${returnLeg.fromCity}-${returnLeg.toCity}`;
  const hubCostB   = allOWOptions[hubKey]?.[0]?.priceClp ?? 0;
  const retCostB   = allOWOptions[returnKey]?.[0]?.priceClp ?? 0;
  const totalB     = hubCostB + regionalCostA + retCostB;
  const scoreB     = totalB; // no time penalty

  // ── Pick winner ───────────────────────────────────────────────────────────
  const useRT    = rtCostA > 0 && scoreA < scoreB;
  const savings  = useRT ? totalB - totalA : totalA - totalB;
  const winner   = useRT ? "rt_hub_plus_regionals" : "all_one_way";

  const hubName  = hubLeg.toCity;
  const origin   = hubLeg.fromCity;
  const returnD  = returnLeg.date;

  let explanation: string;
  let reasoning:   string[];
  let howToBuy:    string[];

  if (useRT) {
    explanation = `Comprando el tramo ${origin} ↔ ${hubName} como ida/vuelta y los vuelos internos por separado ahorras ${fmtClp(savings)} vs comprar todo en tickets independientes.`;
    reasoning = [
      `RT ${origin}↔${hubName}: ${fmtClp(rtCostA)} — ${fmtClp(totalB - rtCostA - regionalCostA)} más barato que dos one-ways`,
      `${regionalLegs.length} vuelo${regionalLegs.length > 1 ? "s" : ""} regional${regionalLegs.length > 1 ? "es" : ""} (${regionalLegs.map(l => `${l.fromIata}→${l.toIata}`).join(", ")}): ${fmtClp(regionalCostA)}`,
      connectorLeg
        ? `Vuelo conector ${lastIataBeforeHub}→${hubLeg.toIata} para tomar el regreso: ~${fmtClp(connectorCostA)} · solo ${extraTimeA} min extra`
        : `El último vuelo regional ya termina en ${hubName} — cero vuelos extra`,
      `Ahorro neto total: ${fmtClp(savings)}`,
    ].filter(Boolean);
    howToBuy = [
      `1. Busca el vuelo ${hubLeg.fromIata} ↔ ${hubLeg.toIata} como ROUND TRIP — ida ${hubLeg.date}, vuelta ${returnD}`,
      ...regionalLegs.map((l, i) =>
        `${i + 2}. Compra el vuelo ${l.fromCity} → ${l.toCity} (${l.fromIata}→${l.toIata}) para el ${l.date}`
      ),
      ...(connectorLeg
        ? [`${regionalLegs.length + 2}. Compra el conector ${connectorLeg.fromCity} → ${connectorLeg.toCity} (${connectorLeg.fromIata}→${connectorLeg.toIata}) para el ${connectorLeg.date}`]
        : []
      ),
    ];
  } else {
    explanation = `Para este viaje comprar cada vuelo por separado es la estrategia más económica — el RT a ${hubName} no compensa el costo del vuelo conector de regreso.`;
    reasoning = [
      `All one-way total: ${fmtClp(totalB)}`,
      `RT + regionales + conector: ${fmtClp(totalA)} (${fmtClp(timePenaltyA)} de penalización por tiempo extra)`,
      connectorLeg
        ? `El conector ${lastIataBeforeHub}→${hubLeg.toIata} (${fmtClp(connectorCostA)}) reduce el ahorro del RT`
        : "Sin vuelo conector necesario — las rutas son directas",
      "One-way da más flexibilidad si hay cambios de plan",
    ];
    howToBuy = legs.map((l, i) =>
      `${i + 1}. Compra el vuelo ${l.fromCity} → ${l.toCity} (${l.fromIata}→${l.toIata}) para el ${l.date}`
    );
  }

  // Remove zero-cost/empty options from result
  const flightOptions: Record<string, FlightOption[]> = Object.fromEntries(
    Object.entries(allOWOptions).filter(([, v]) => v.length > 0)
  );

  const rec: FlightStrategyRecommendation = {
    type: winner,
    hubCity:   winner === "rt_hub_plus_regionals" ? hubName : undefined,
    hubIata:   winner === "rt_hub_plus_regionals" ? hubLeg.toIata : undefined,
    explanation,
    reasoning,
    howToBuy,
    savingsClp: savings > 0 ? savings : undefined,
    rtReturnDate: winner === "rt_hub_plus_regionals" ? returnD : undefined,
    connectorLeg: (winner === "rt_hub_plus_regionals" && connectorLeg)
      ? { fromCity: connectorLeg.fromCity, toCity: connectorLeg.toCity, fromIata: connectorLeg.fromIata, toIata: connectorLeg.toIata, approxDate: connectorLeg.date }
      : undefined,
  };

  return { recommendation: rec, flightOptions };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function fetchAllLegsParallel(
  legs:        StrategyLeg[],
  adults:      number,
  travelStyle: string,
  children:    number = 0,
  infants:     number = 0,
): Promise<Record<string, FlightOption[]>> {
  const entries = await Promise.all(
    legs.map(async l => {
      const key = `${l.fromCity}-${l.toCity}`;
      try {
        const opts = await fetchLegFlights(l.fromIata, l.toIata, l.date, adults, travelStyle, children, infants);
        return [key, opts] as const;
      } catch {
        return [key, [] as FlightOption[]] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

function sumBestPrices(
  options: Record<string, FlightOption[]>,
  legs: StrategyLeg[],
): number {
  return legs.reduce((s, l) => {
    const key = `${l.fromCity}-${l.toCity}`;
    return s + (options[key]?.[0]?.priceClp ?? 0);
  }, 0);
}

function fmtClp(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function noFlightsRec(): FlightStrategyRecommendation {
  return {
    type: "all_one_way",
    explanation: "No se detectaron tramos de vuelo para este viaje.",
    reasoning: [],
    howToBuy: [],
  };
}
