import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { MembershipStatus } from "@/lib/types";

/** Aviso cuando hay un problema de pago pero el acceso sigue activo. */
export function MembershipWarning({ status }: { status: MembershipStatus }) {
  if (status !== "past_due" && status !== "grace") return null;
  const text =
    status === "past_due"
      ? "No pudimos procesar tu último pago. Actualizá tu método de pago para no perder el acceso."
      : "Tu membresía venció. Tenés unos días de gracia para renovar sin perder el acceso.";
  return (
    <Link
      href="/portal/membresia"
      className="flex items-start gap-3 rounded-card border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn"
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </Link>
  );
}
