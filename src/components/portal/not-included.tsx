import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, buttonClass } from "@/components/ui";

/** Sección que el cliente no tiene en su servicio. */
export function NotIncluded({ what, coachName }: { what: "nutrition" | "training"; coachName: string }) {
  const name = what === "nutrition" ? "plan de nutrición" : "plan de entrenamiento";
  return (
    <Card className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-panel-2 text-muted">
        <Lock size={20} aria-hidden="true" />
      </span>
      <div>
        <p className="font-display text-2xl font-extrabold uppercase">No incluido en tu servicio</p>
        <p className="mt-2 text-sm text-muted">Tu programa actual no incluye {name}. Si querés sumarlo, hablalo con {coachName}.</p>
      </div>
      <Link href="/portal" className={buttonClass("secondary", "md")}>Volver al inicio</Link>
    </Card>
  );
}
