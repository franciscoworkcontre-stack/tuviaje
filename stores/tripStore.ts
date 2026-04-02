import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Trip,
  PlanningInput,
  Traveler,
  SplitAssignment,
  TravelStyle,
  DayPlan,
  TransportLeg,
} from "@/types/trip";

const TRAVELER_EMOJIS = ["🧑", "👩", "🧔", "👱", "🧕", "👨‍🦱", "👩‍🦰", "🧒"];
const TRAVELER_COLORS = [
  "#1565C0", "#FF7043", "#2E7D32", "#7B1FA2",
  "#F9A825", "#546E7A", "#E64A19", "#0D47A1",
];

interface TripStore {
  // Planning flow
  planningInput: PlanningInput;
  setPlanningInput: (input: Partial<PlanningInput>) => void;
  resetPlanningInput: () => void;

  // Active trip
  trip: Trip | null;
  setTrip: (trip: Trip) => void;
  clearTrip: () => void;

  // Loading
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  generatingStep: string;
  setGeneratingStep: (step: string) => void;
  generatingSteps: string[];
  setGeneratingSteps: (steps: string[]) => void;
  generatingEstimatedMs: number;
  setGeneratingEstimatedMs: (ms: number) => void;
  generatingCountdownSec: number;
  setGeneratingCountdownSec: (sec: number) => void;

  // Day editing
  updateDay: (dayNumber: number, day: Partial<DayPlan>) => void;
  updateTransportLeg: (fromCity: string, toCity: string, selectedIndex: number) => void;
  selectFlight: (fromCity: string, toCity: string, flightIndex: number, priceClp: number) => void;

  // Cost splitting
  addTraveler: (name: string) => void;
  removeTraveler: (id: string) => void;
  renameTraveler: (id: string, name: string) => void;
  setSplitAssignment: (assignment: SplitAssignment) => void;
  removeSplitAssignment: (itemId: string) => void;
  setSplitEqualBetweenAll: () => void;
}

const defaultPlanningInput: PlanningInput = {
  rawText: "",
  originCity: "",
  destinationCities: [],
  daysPerCity: [],
  startDate: "",
  endDate: "",
  adults: 2,
  children: 0,
  travelStyle: "comfort",
  flexibleDates: false,
  confirmed: false,
};

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      // ─── Planning ──────────────────────────────────────────────
      planningInput: defaultPlanningInput,
      setPlanningInput: (input) =>
        set((s) => ({ planningInput: { ...s.planningInput, ...input } })),
      resetPlanningInput: () => set({ planningInput: defaultPlanningInput }),

      // ─── Trip ──────────────────────────────────────────────────
      trip: null,
      setTrip: (trip) => set({ trip }),
      clearTrip: () => set({ trip: null }),

      // ─── Loading ───────────────────────────────────────────────
      isGenerating: false,
      setIsGenerating: (v) => set({ isGenerating: v }),
      generatingStep: "",
      setGeneratingStep: (step) => set({ generatingStep: step }),
      generatingSteps: [],
      setGeneratingSteps: (steps) => set({ generatingSteps: steps }),
      generatingEstimatedMs: 60000,
      setGeneratingEstimatedMs: (ms) => set({ generatingEstimatedMs: ms }),
      generatingCountdownSec: 0,
      setGeneratingCountdownSec: (sec) => set({ generatingCountdownSec: sec }),

      // ─── Day editing ───────────────────────────────────────────
      updateDay: (dayNumber, partial) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) =>
                d.dayNumber === dayNumber ? { ...d, ...partial } : d
              ),
            },
          };
        }),

      updateTransportLeg: (fromCity, toCity, selectedIndex) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              transportLegs: s.trip.transportLegs.map((leg) => {
                if (leg.fromCity === fromCity && leg.toCity === toCity) {
                  return { ...leg, selected: leg.options[selectedIndex] };
                }
                return leg;
              }),
            },
          };
        }),

      selectFlight: (fromCity, toCity, flightIndex, priceClp) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              transportLegs: s.trip.transportLegs.map((leg) =>
                leg.fromCity === fromCity && leg.toCity === toCity
                  ? { ...leg, selectedFlightIndex: flightIndex, selectedFlightPriceClp: priceClp }
                  : leg
              ),
            },
          };
        }),

      // ─── Cost splitting ────────────────────────────────────────
      addTraveler: (name) =>
        set((s) => {
          if (!s.trip) return s;
          const idx = s.trip.travelers_list.length;
          const newTraveler: Traveler = {
            id: `t-${Date.now()}`,
            name,
            emoji: TRAVELER_EMOJIS[idx % TRAVELER_EMOJIS.length],
            color: TRAVELER_COLORS[idx % TRAVELER_COLORS.length],
          };
          return {
            trip: {
              ...s.trip,
              travelers_list: [...s.trip.travelers_list, newTraveler],
            },
          };
        }),

      removeTraveler: (id) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              travelers_list: s.trip.travelers_list.filter((t) => t.id !== id),
              splitAssignments: s.trip.splitAssignments.map((a) => ({
                ...a,
                splitBetween: a.splitBetween.filter((tid) => tid !== id),
              })),
            },
          };
        }),

      renameTraveler: (id, name) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              travelers_list: s.trip.travelers_list.map((t) =>
                t.id === id ? { ...t, name } : t
              ),
            },
          };
        }),

      setSplitAssignment: (assignment) =>
        set((s) => {
          if (!s.trip) return s;
          const existing = s.trip.splitAssignments.findIndex(
            (a) => a.itemId === assignment.itemId
          );
          const next =
            existing >= 0
              ? s.trip.splitAssignments.map((a, i) =>
                  i === existing ? assignment : a
                )
              : [...s.trip.splitAssignments, assignment];
          return { trip: { ...s.trip, splitAssignments: next } };
        }),

      removeSplitAssignment: (itemId) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              splitAssignments: s.trip.splitAssignments.filter(
                (a) => a.itemId !== itemId
              ),
            },
          };
        }),

      setSplitEqualBetweenAll: () =>
        set((s) => {
          if (!s.trip) return s;
          const allIds = s.trip.travelers_list.map((t) => t.id);
          // Default: first traveler pays everything, split between all
          const payerId = allIds[0] ?? "t-0";
          const categories = [
            { id: "transport", label: "✈️ Transporte", amount: s.trip.costs.transport },
            { id: "accommodation", label: "🏨 Alojamiento", amount: s.trip.costs.accommodation },
            { id: "food", label: "🍽️ Comida", amount: s.trip.costs.food },
            { id: "activities", label: "🎭 Actividades", amount: s.trip.costs.activities },
            { id: "localTransport", label: "🚇 Transporte local", amount: s.trip.costs.localTransport },
            { id: "extras", label: "🛍️ Extras", amount: s.trip.costs.extras },
          ];
          const assignments: SplitAssignment[] = categories.map((cat) => ({
            itemId: cat.id,
            label: cat.label,
            amountClp: cat.amount,
            paidBy: payerId,
            splitBetween: allIds,
          }));
          return { trip: { ...s.trip, splitAssignments: assignments } };
        }),
    }),
    {
      name: "tuviaje-trip",
      partialize: (s) => ({ trip: s.trip, planningInput: s.planningInput }),
    }
  )
);
