export const CLIENT_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "activos", label: "Activos" },
  { value: "por-vencer", label: "Por vencer" },
  { value: "vencidos", label: "Vencidos" },
  { value: "checkin", label: "Check-in pendiente" },
  { value: "baja-adherencia", label: "Baja adherencia" },
  { value: "suspendidos", label: "Suspendidos" },
] as const;

export type ClientFilter = (typeof CLIENT_FILTERS)[number]["value"];

export function isClientFilter(v: string | undefined): v is ClientFilter {
  return CLIENT_FILTERS.some((f) => f.value === v);
}
