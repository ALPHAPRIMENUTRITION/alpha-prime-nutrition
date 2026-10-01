import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonClass } from "@/components/ui";

/** Pantalla cuando la membresía venció o está suspendida. Los datos no se borran. */
export function MembershipLocked({ suspended = false }: { suspended?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-panel px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-red/15 text-red">
        <Lock size={26} strokeWidth={1.8} />
      </span>
      {suspended ? (
        <>
          <p className="font-display text-3xl font-extrabold uppercase leading-none">Cuenta en pausa</p>
          <p className="max-w-xs text-muted">Tu coach pausó tu acceso. Escribile para reactivarlo; tu progreso sigue guardado.</p>
        </>
      ) : (
        <>
          <p className="font-display text-3xl font-extrabold uppercase leading-none">Membresía vencida</p>
          <p className="max-w-xs text-muted">Tu membresía ha vencido. Renovala para recuperar el acceso a tu plan.</p>
          <Link href="/portal/membresia" className={buttonClass("primary", "lg", "mt-2 uppercase tracking-[0.12em]")}>
            Renovar ahora
          </Link>
        </>
      )}
    </div>
  );
}
