import type { MembershipStatus } from "@/lib/types";

// Solo presentación. La decisión de acceso real la toma la base de datos
// (función membership_status + RLS); esto únicamente elige textos y colores.

export const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = {
  active: "Activa",
  past_due: "Pago fallido",
  grace: "En gracia",
  expired: "Vencida",
  suspended: "Suspendida",
};

export type Tone = "ok" | "warn" | "bad" | "neutral";

export const MEMBERSHIP_TONE: Record<MembershipStatus, Tone> = {
  active: "ok",
  past_due: "warn",
  grace: "warn",
  expired: "bad",
  suspended: "neutral",
};

export function hasContentAccess(status: MembershipStatus | null | undefined) {
  return status === "active" || status === "past_due" || status === "grace";
}

export const EXPIRING_SOON_DAYS = 7;
export const LOW_ADHERENCE_PCT = 70;
