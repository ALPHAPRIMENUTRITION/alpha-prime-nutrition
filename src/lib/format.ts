const TZ = "America/El_Salvador";

const dateFmt = new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDateFmt = new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", timeZone: "UTC" });
const moneyFmt = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const moneyFmtCents = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Fechas tipo 'YYYY-MM-DD' (sin hora) → se interpretan sin zona para no correr el día. */
export function formatDate(value: string | null | undefined, short = false) {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? value + "T00:00:00Z" : value);
  if (Number.isNaN(d.getTime())) return "—";
  if (value.length > 10) {
    // timestamp: mostrar en la zona del negocio
    return new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", timeZone: TZ }).format(d);
  }
  return (short ? shortDateFmt : dateFmt).format(d);
}

export function relativeDays(value: string | null | undefined) {
  if (!value) return "Nunca";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

export function formatMoney(cents: number) {
  return (cents % 100 === 0 ? moneyFmt : moneyFmtCents).format(cents / 100);
}

export function formatKg(v: number | null | undefined) {
  return v == null ? "—" : `${Number(v).toFixed(1)} kg`;
}

export function formatPct(v: number | null | undefined) {
  return v == null ? "—" : `${Math.round(Number(v))} %`;
}

export function initials(first: string, last?: string) {
  return ((first?.[0] ?? "") + (last?.[0] ?? "")).toUpperCase() || "?";
}

/** Hoy en la zona del negocio, como 'YYYY-MM-DD'. */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDaysISO(a: string, b: string) {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86_400_000);
}
