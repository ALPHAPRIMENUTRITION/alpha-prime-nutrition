// Servicio contratado por el cliente: define qué secciones ve en su app.
export type ServiceKey = "both" | "nutrition" | "training";

export const SERVICE_OPTIONS: { id: ServiceKey; label: string; short: string }[] = [
  { id: "both", label: "Nutrición y entrenamiento", short: "Nutrición + entreno" },
  { id: "nutrition", label: "Solo nutrición", short: "Solo nutrición" },
  { id: "training", label: "Solo entrenamiento", short: "Solo entreno" },
];

export function serviceFrom(c: { has_nutrition?: boolean | null; has_training?: boolean | null }): ServiceKey {
  const n = c.has_nutrition !== false;
  const t = c.has_training !== false;
  return n && t ? "both" : n ? "nutrition" : "training";
}

export function serviceFlags(s: ServiceKey) {
  return { has_nutrition: s !== "training", has_training: s !== "nutrition" };
}

export const serviceLabel = (c: { has_nutrition?: boolean | null; has_training?: boolean | null }) =>
  SERVICE_OPTIONS.find((o) => o.id === serviceFrom(c))!.label;
