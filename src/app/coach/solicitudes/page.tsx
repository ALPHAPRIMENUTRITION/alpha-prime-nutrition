import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, ClipboardList, MessageCircle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listIntakes, newFullIntakes, INTAKE_SERVICE_LABEL, INTAKE_STATUS_LABEL, type IntakeFilter } from "@/lib/data/intakes";
import { formatDate, relativeDays } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ShareLink } from "@/components/intake/share-link";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Solicitudes" };

const FILTERS: { id: IntakeFilter; label: string }[] = [
  { id: "pendientes", label: "Pendientes" },
  { id: "clientes", label: "Ya son clientes" },
  { id: "cerradas", label: "Cerradas" },
  { id: "todas", label: "Todas" },
];
const SERVICES = [
  { id: "", label: "Todos los servicios" },
  { id: "personal", label: "Personal 1 a 1" },
  { id: "both", label: "Completo" },
  { id: "nutrition", label: "Alimentación" },
  { id: "training", label: "Entreno online" },
];

export default async function IntakesPage({ searchParams }: { searchParams: Promise<{ ver?: string; servicio?: string }> }) {
  await requireRole("coach");
  const sp = await searchParams;
  const ver = (FILTERS.find((f) => f.id === sp.ver)?.id ?? "pendientes") as IntakeFilter;
  const servicio = SERVICES.find((s) => s.id === sp.servicio)?.id ?? "";
  const [items, fulls] = await Promise.all([listIntakes(ver, servicio || undefined), newFullIntakes()]);
  const url = `${publicEnv().NEXT_PUBLIC_SITE_URL}/empezar`;
  const href = (v: string, s: string) => {
    const q = new URLSearchParams();
    if (v !== "pendientes") q.set("ver", v);
    if (s) q.set("servicio", s);
    return `/coach/solicitudes${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Personas interesadas</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">Solicitudes</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Lo que dejan en tu página: nombre, WhatsApp, objetivo y servicio. Escribiles, y cuando alguien pague, crealo como cliente y mandale el cuestionario completo desde su perfil.
        </p>
      </header>

      {fulls.length > 0 && (
        <Card className="flex flex-col gap-2 border-red/40 p-5">
          <h2 className="eyebrow text-red">Cuestionarios completos nuevos</h2>
          <ul className="flex flex-col divide-y divide-line">
            {fulls.map((f) => (
              <li key={f.id}>
                <Link href={`/coach/solicitudes/${f.id}`} className="flex items-center gap-3 py-2.5 hover:text-fg">
                  <ClipboardCheck size={18} className="text-red" />
                  <span className="flex-1 font-semibold">{`${f.first_name} ${f.last_name}`.trim()}</span>
                  <span className="text-xs text-faint">{relativeDays(f.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={href(f.id, servicio)}
              className={cn("whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold", ver === f.id ? "border-fg bg-fg text-ink" : "border-line text-muted hover:text-fg")}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {SERVICES.map((s) => (
            <Link
              key={s.id}
              href={href(ver, s.id)}
              className={cn("whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold", servicio === s.id ? "bg-red/15 text-red" : "text-muted hover:text-fg")}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin solicitudes"
            description={ver === "pendientes" ? "Cuando alguien deje su solicitud en tu página te llega una notificación y aparece aquí." : "No hay solicitudes en esta lista."}
          />
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-2 pr-3">
                <Link href={`/coach/solicitudes/${i.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 hover:bg-panel-2">
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", i.status === "new" ? "bg-red/15 text-red" : "bg-panel-2 text-muted")}>
                    <ClipboardList size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{`${i.first_name} ${i.last_name}`.trim()}</p>
                    <p className="truncate text-sm text-muted">{[i.goal, i.service ? INTAKE_SERVICE_LABEL[i.service] : null].filter(Boolean).join(" · ") || "Sin objetivo"}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-faint">
                      <Badge tone={i.status === "new" ? "bad" : i.status === "converted" ? "ok" : i.status === "contacted" ? "warn" : "neutral"}>{INTAKE_STATUS_LABEL[i.status]}</Badge>
                      <span title={formatDate(i.created_at)}>{relativeDays(i.created_at)}</span>
                    </p>
                  </div>
                </Link>
                {i.phone && !["converted", "lost", "archived"].includes(i.status) && (
                  <a
                    href={`/coach/solicitudes/${i.id}/whatsapp`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Escribirle a ${i.first_name} por WhatsApp`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ok/15 text-ok hover:bg-ok/25"
                  >
                    <MessageCircle size={18} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="eyebrow">Tu link de solicitud</h2>
        <p className="text-sm text-muted">Para Instagram, estados o quien te pregunte. Es corto: nombre, WhatsApp, objetivo y servicio.</p>
        <ShareLink url={url} waText="¡Hola! Dejame tus datos aquí y te cuento cómo funciona:" />
      </Card>
    </div>
  );
}
