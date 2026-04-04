/**
 * Multi-currency display utilities.
 * All internal amounts are stored in CLP (implementation detail, not exposed to users).
 * Conversion rates are approximate (updated periodically).
 */

export type DisplayCurrency = "CLP" | "USD" | "EUR" | "GBP" | "ARS" | "BRL" | "MXN" | "PEN" | "COP" | "CAD" | "AUD";

// Approximate rates: 1 CLP = X of target currency
// (these are rough; we don't hit an exchange API to keep it fast)
const CLP_RATES: Record<DisplayCurrency, number> = {
  CLP: 1,
  USD: 1 / 960,
  EUR: 1 / 1050,
  GBP: 1 / 1230,
  CAD: 1 / 710,
  AUD: 1 / 620,
  ARS: 1.05,     // 1 CLP ≈ 1.05 ARS
  BRL: 1 / 185,
  MXN: 1 / 55,
  PEN: 1 / 250,
  COP: 4.0,      // 1 CLP ≈ 4 COP
};

const SYMBOLS: Record<DisplayCurrency, string> = {
  CLP: "$",
  USD: "US$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  ARS: "AR$",
  BRL: "R$",
  MXN: "MX$",
  PEN: "S/",
  COP: "CO$",
};

const LOCALES: Record<DisplayCurrency, string> = {
  CLP: "en-US",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  CAD: "en-CA",
  AUD: "en-AU",
  ARS: "es-AR",
  BRL: "pt-BR",
  MXN: "es-MX",
  PEN: "es-PE",
  COP: "es-CO",
};

const DECIMALS: Record<DisplayCurrency, number> = {
  CLP: 0,
  USD: 0,
  EUR: 0,
  GBP: 0,
  CAD: 0,
  AUD: 0,
  ARS: 0,
  BRL: 0,
  MXN: 0,
  PEN: 0,
  COP: 0,
};

// CLP is intentionally excluded from UI options — it's an internal unit only
export const CURRENCY_OPTIONS: { value: DisplayCurrency; label: string; flag: string }[] = [
  { value: "USD", label: "US Dollar",        flag: "🇺🇸" },
  { value: "EUR", label: "Euro",             flag: "🇪🇺" },
  { value: "GBP", label: "British Pound",    flag: "🇬🇧" },
  { value: "CAD", label: "Canadian Dollar",  flag: "🇨🇦" },
  { value: "AUD", label: "Australian Dollar",flag: "🇦🇺" },
  { value: "BRL", label: "Real brasileño",   flag: "🇧🇷" },
  { value: "MXN", label: "Peso mexicano",    flag: "🇲🇽" },
  { value: "ARS", label: "Peso argentino",   flag: "🇦🇷" },
  { value: "PEN", label: "Sol peruano",      flag: "🇵🇪" },
  { value: "COP", label: "Peso colombiano",  flag: "🇨🇴" },
];

/** Convert a CLP amount to display currency */
export function convertFromClp(clpAmount: number, to: DisplayCurrency): number {
  return clpAmount * CLP_RATES[to];
}

/** Format a CLP amount in the target display currency */
export function fmtCurrency(clpAmount: number, currency: DisplayCurrency = "CLP"): string {
  const converted = Math.round(convertFromClp(Math.abs(clpAmount), currency));
  const symbol = SYMBOLS[currency];
  const locale = LOCALES[currency];
  const decimals = DECIMALS[currency];
  const formatted = converted.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol}${formatted}`;
}
