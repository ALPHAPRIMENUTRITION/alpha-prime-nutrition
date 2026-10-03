import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoHorizontal } from "@/components/brand/logo";
import { IntakeForm } from "@/components/intake/intake-form";
import type { IntakeState } from "@/app/empezar/actions";

/** Marco común del cuestionario (público y por link de cliente). */
export function IntakePage({
  action,
  greetingName,
  whatsappHref,
  initial,
}: {
  action: (prev: IntakeState, fd: FormData) => Promise<IntakeState>;
  greetingName?: string | null;
  whatsappHref: string | null;
  initial?: Record<string, string>;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line/60">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Inicio">
            <LogoHorizontal className="-ml-2 h-10" />
          </Link>
          {!greetingName && (
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
              <ArrowLeft size={15} /> Volver
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        <p className="eyebrow text-red">{greetingName ? "Cuestionario inicial" : "Solicitud"}</p>
        <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-[0.95] sm:text-6xl">
          {greetingName ? <>Hola, <span className="text-red">{greetingName}</span></> : <>Empecemos <span className="text-red">tu plan</span></>}
        </h1>
        <p className="mt-4 text-lg text-muted">
          {greetingName
            ? "Contame de vos: tus gustos, tu rutina, tu salud y tu objetivo. Con esto armo tu plan a tu medida."
            : "Dejame tus datos y lo que buscás. Te escribo por WhatsApp con los detalles. La evaluación puede ser 100 % online o presencial."}
        </p>
        <div className="mt-8">
          <IntakeForm action={action} greetingName={greetingName} whatsappHref={whatsappHref} kind={greetingName ? "full" : "short"} initial={initial} />
        </div>
      </main>
    </div>
  );
}
