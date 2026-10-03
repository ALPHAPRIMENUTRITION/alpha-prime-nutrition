import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listIntakes, INTAKE_SERVICE_LABEL, INTAKE_STATUS_LABEL } from "@/lib/data/intakes";
import { formatDate, relativeDays } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ShareLink } from "@/components/intake/share-link";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Solicitudes" };

export default async function IntakesPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await requireRole("coach");
  const ver = (await searchParams).ver === "todas" ? "todas" : "abiertas";
  const items = await listIntakes(ver);
  const url = `${publicEnv().NEXT_PUBLIC_SITE_URL}/empezar`;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Cuestionario inicial</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">Solicitudes</h1>
        <p className="mt-2 max-w-2xl text-muted">Las respuestas de quienes llenan el cuestionario. Desde cada una podés crear al cliente con sus datos ya cargados.</p>
      </header>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="eyebrow">Tu link del cuestionario</h2>
        <p className="text-sm text-muted">Mandáselo a quien quiera empezar. Para un cliente que ya tenés, usá el link de su perfil (pestaña Cuestionario) y sus respuestas quedan en su expediente.</p>
        <ShareLink url={url} waText="¡Hola! Para armar tu plan, llená este cuestionario (te toma unos 5 minutos):" />
      </Card>

      <div className="flex gap-2">
        {(["abiertas", "todas"] as const).map((v) => (
          <Link
            key={v}
            href={v === "todas" ? "/coach/solicitudes?ver=todas" : "/coach/solicitudes"}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold", ver === v ? "border-fg bg-fg text-ink" : "border-line text-muted hover:text-fg")}
          >
            {v === "abiertas" ? "Pendientes" : "Todas"}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState title="Sin solicitudes" description="Cuando alguien llene el cuestionario te llega una notificación y aparece aquí." />
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id}>
                <Link href={`/coach/solicitudes/${i.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-panel-2">
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", i.status === "new" ? "bg-red/15 text-red" : "bg-panel-2 text-muted")}>
                    <ClipboardList size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{`${i.first_name} ${i.last_name}`.trim()}</p>
                    <p className="truncate text-sm text-muted">
                      {[i.goal, i.service ? INTAKE_SERVICE_LABEL[i.service] : null].filter(Boolean).join(" · ") || "Sin objetivo"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone={i.status === "new" ? "bad" : i.status === "converted" ? "ok" : "neutral"}>{INTAKE_STATUS_LABEL[i.status]}</Badge>
                    <span className="text-xs text-faint" title={formatDate(i.created_at)}>{relativeDays(i.created_at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
