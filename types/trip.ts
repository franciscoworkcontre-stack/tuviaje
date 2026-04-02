// ─── Core trip types ───────────────────────────────────────────

export type TravelStyle = "mochilero" | "comfort" | "premium";
export type TransportType = "flight" | "bus" | "train" | "car";
export type ActivityCategory =
  | "culture"
  | "food"
  | "nature"
  | "nightlife"
  | "shopping"
  | "wellness"
  | "adventure"
  | "photography";

export interface City {
  name: string;
  country: string;
  iata?: string; // airport code
  lat?: number;
  lng?: number;
  days: number;
  firstTime: boolean;
  interests: ActivityCategory[];
}

export interface TransportOption {
  type: TransportType;
  provider: string;
  departureTime?: string;
  arrivalTime?: string;
  durationMinutes: number;
  pricePerPerson: number; // CLP
  priceTotal: number;
  bookingUrl?: string;
  flightNumber?: string;
  stops?: number;
  isCheapest?: boolean;
}

export interface TransportLeg {
  fromCity: string;
  toCity: string;
  fromIata?: string;
  toIata?: string;
  date?: string; // ISO date of travel
  flightSearchUrl?: string; // pre-built Google Flights URL
  selected?: TransportOption;
  options: TransportOption[];
  selectedFlightIndex?: number;      // index into FlightOption[] shown in UI
  selectedFlightPriceClp?: number;   // real price from Google Flights
}

// ─── Activity / itinerary ──────────────────────────────────────

export interface Activity {
  time: string;
  durationMin: number;
  name: string;
  category: ActivityCategory;
  description: string;
  costClp: number;
  address?: string;
  lat?: number;
  lng?: number;
  tip?: string;
  bookingUrl?: string;
  rating?: number;
  emoji?: string;
}

export interface MealOption {
  name: string;
  cuisine: string;
  priceTier: "$" | "$$" | "$$$";
  costClp: number;
  rating?: number;
  address?: string;
  bookingUrl?: string;
}

export interface DayPlan {
  dayNumber: number;
  city: string;
  date: string; // ISO
  theme: string;
  isTravelDay: boolean;
  morning: Activity[];
  lunch: { options: MealOption[]; recommended: string };
  afternoon: Activity[];
  dinner: { options: MealOption[]; recommended: string };
  eveningActivity?: Activity;
  localTransportCostClp: number;
  dayTotalClp: number;
}

// ─── Accommodation ─────────────────────────────────────────────

export interface Accommodation {
  city: string;
  name: string;
  stars?: number;
  rating?: number;
  pricePerNight: number; // CLP
  nights: number;
  totalCost: number;
  address?: string;
  bookingUrl?: string;
  neighborhood?: string;
}

// ─── Cost breakdown ────────────────────────────────────────────

export interface CostBreakdown {
  transport: number;
  accommodation: number;
  food: number;
  activities: number;
  localTransport: number;
  extras: number;
  total: number;
  perPerson: number;
  perDayPerPerson: number;
  byCityClp: Record<string, number>;
}

// ─── Flight recommendations ────────────────────────────────────

export interface FlightOption {
  airline: string;
  flightNumber?: string;
  departure: string;   // "HH:MM"
  arrival: string;     // "HH:MM"
  durationMin: number;
  stops: number;       // 0 = direct
  priceClp: number;    // per person
  pros: string[];
  cons: string[];
  bookingSearchUrl: string;
}

// ─── Hotel recommendations ─────────────────────────────────────

export interface HotelRecommendation {
  name: string;
  neighborhood: string;
  stars: number;
  pricePerNightClp: number;
  rating?: number;
  style?: string; // "boutique" | "business" | "hostal" | "apart-hotel"
  pros: string[];
  cons: string[];
  bookingSearchUrl: string;
}

// ─── Cost splitting ────────────────────────────────────────────

export type SplitMode = "equal" | "custom" | "itemized";

export interface Traveler {
  id: string;
  name: string;
  emoji: string; // avatar emoji
  color: string; // hex for UI
}

export interface SplitAssignment {
  itemId: string; // day-number + activity name, or category key
  label: string;
  amountClp: number;
  paidBy: string; // traveler id
  splitBetween: string[]; // traveler ids
}

export interface TravelerBalance {
  travelerId: string;
  name: string;
  emoji: string;
  color: string;
  totalPays: number;
  totalOwes: number;
  netBalance: number; // positive = others owe them, negative = they owe others
  owesTo: { travelerId: string; name: string; amount: number }[];
}

// ─── Full trip ─────────────────────────────────────────────────

export interface Trip {
  id: string;
  title: string;
  originCity: string;
  cities: City[];
  startDate: string; // ISO
  endDate: string;
  totalDays: number;
  travelers: {
    adults: number;
    children: number;
  };
  travelStyle: TravelStyle;
  budgetMaxClp?: number;
  transportLegs: TransportLeg[];
  accommodations: Accommodation[];
  hotelRecommendations: Record<string, HotelRecommendation[]>; // keyed by city name
  flightOptions?: Record<string, FlightOption[]>; // keyed by "fromCity-toCity"
  days: DayPlan[];
  costs: CostBreakdown;
  travelers_list: Traveler[]; // for cost splitting
  splitAssignments: SplitAssignment[];
  currency: "CLP" | "USD" | "EUR";
  createdAt: string;
}

// ─── Planning flow state ────────────────────────────────────────

export interface PlanningInput {
  rawText: string;
  originCity: string;
  destinationCities: string[];
  daysPerCity: number[]; // days to spend in each destination city
  firstTimeCities?: Record<string, boolean>; // true = first visit (default)
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  travelStyle: TravelStyle;
  budgetMaxClp?: number;
  flexibleDates: boolean;
  roundTrip: boolean;
  confirmed: boolean;
}
