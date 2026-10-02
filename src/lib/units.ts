// Unidad del peso corporal en pantalla: libras.
// En la base se sigue guardando en kg (2 decimales), así las fórmulas de
// nutrición no cambian y la conversión ida y vuelta no pierde precisión.
export const BODY_WEIGHT_UNIT = "lb";
const LB_PER_KG = 2.20462262;

export const kgToLb = (kg: number) => Math.round(kg * LB_PER_KG * 10) / 10;
export const lbToKg = (lb: number) => Math.round((lb / LB_PER_KG) * 100) / 100;

export function formatLb(kg: number | string | null | undefined) {
  return kg == null || kg === "" ? "—" : `${kgToLb(Number(kg)).toFixed(1)} lb`;
}

/** Copia de filas de medición con el peso convertido a libras (solo para mostrar). */
export function withWeightInLb<T extends { weight_kg: number | null }>(rows: T[]): T[] {
  return rows.map((r) => ({ ...r, weight_kg: r.weight_kg == null ? null : kgToLb(Number(r.weight_kg)) }));
}
