// Pagos con link (Cubo u otro proveedor). La app no procesa tarjetas:
// el cliente paga en la página del proveedor y el coach confirma.
import { z } from "zod";

export type PaymentMethod = "link" | "cash" | "transfer" | "other";

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  link: "Link de pago",
  cash: "Efectivo",
  transfer: "Transferencia",
  other: "Otro",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  succeeded: "Pagado",
  pending: "Por confirmar",
  failed: "No confirmado",
  refunded: "Reembolsado",
};

export interface PaymentRow {
  id: string;
  client_id: string;
  amount_cents: number;
  status: "succeeded" | "pending" | "failed" | "refunded";
  method: PaymentMethod | null;
  description: string | null;
  reference: string | null;
  months: number;
  note: string | null;
  paid_at: string | null;
  created_at: string;
}

export const PAYMENT_COLS = "id, client_id, amount_cents, status, method, description, reference, months, note, paid_at, created_at";

/** "40", "40.5", "$40,50" → 4050 centavos. Vacío → null. */
export function dollarsToCents(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[$\s]/g, "").replace(",", ".");
  if (s === "") return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

export const centsToInput = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(/\.00$/, ""));

/** Texto del botón según el proveedor del link. */
export function payButtonLabel(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("cubo")) return "Pagar con Cubo";
    if (host.includes("paypal")) return "Pagar con PayPal";
    if (host.includes("wompi")) return "Pagar con Wompi";
    if (host.includes("n1co")) return "Pagar con N1co";
  } catch {
    /* link inválido: texto genérico */
  }
  return "Ir a pagar";
}

const blank = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

export const linkSchema = z.preprocess(
  (v) => (blank(v) ? null : String(v).trim()),
  z.union([
    z.null(),
    z
      .string()
      .max(500, "El link es demasiado largo")
      .regex(/^https:\/\/\S+$/i, "Pegá el link completo, empezando con https://")
      .refine((s) => {
        try {
          return Boolean(new URL(s).hostname.includes("."));
        } catch {
          return false;
        }
      }, "Ese link no es válido"),
  ]),
);

const amountSchema = (label: string) =>
  z.preprocess(
    (v) => dollarsToCents(v),
    z.number({ message: `${label}: escribí un monto como 40 o 40.50` }).int().min(0).max(10_000_000, `${label}: demasiado alto`).nullable(),
  );

export const settingsSchema = z.object({
  payment_link: linkSchema,
  payment_plan_name: z.preprocess((v) => (blank(v) ? null : String(v).trim()), z.union([z.null(), z.string().max(80, "Nombre: máximo 80 caracteres")])),
  payment_amount_cents: amountSchema("Monto"),
  payment_instructions: z.preprocess((v) => (blank(v) ? null : String(v).trim()), z.union([z.null(), z.string().max(1000, "Instrucciones: máximo 1000 caracteres")])),
});

export const clientPaymentSchema = z.object({
  payment_link: linkSchema,
  payment_amount_cents: amountSchema("Monto"),
});

export const registerSchema = z.object({
  amount_cents: z.preprocess((v) => dollarsToCents(v), z.number({ message: "Escribí el monto, por ejemplo 40" }).int().min(0).max(10_000_000, "Monto demasiado alto")),
  months: z.coerce.number().int().min(1).max(12),
  method: z.enum(["link", "cash", "transfer", "other"]),
  reference: z.preprocess((v) => (blank(v) ? null : String(v).trim()), z.union([z.null(), z.string().max(120, "Referencia: máximo 120 caracteres")])),
});

export const reportSchema = z.object({
  amount_cents: z.preprocess((v) => dollarsToCents(v), z.number({ message: "Escribí el monto que pagaste, por ejemplo 40" }).int().min(1, "Escribí el monto que pagaste").max(10_000_000, "Monto demasiado alto")),
  reference: z.preprocess((v) => (blank(v) ? null : String(v).trim()), z.union([z.null(), z.string().max(120, "Referencia: máximo 120 caracteres")])),
});
