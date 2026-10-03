import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardList, Plus } from "lucide-react";
import { newIntakesCount } from "@/lib/data/intakes";
import { requireRole } from "@/lib/auth";
import { getDashboardStats, listClients, overdueClients, recentNotifications, upcomingRenewals } from "@/lib/data/coach";
import { isClientFilter, CLIENT_FILTERS } from "@/lib/client-filters";
import { formatDate, formatMoney, relativeDays } from "@/lib/format";
import { MEMBERSHIP_LABEL, MEMBERSHIP_TONE } from "@/lib/membership";
import type { MembershipStatus } from "@/lib/types";
import { StatCard } from "@/components/ui/stat-card";
import { Badge, Card, EmptyState, buttonClass } from "@/components/ui";
import { ClientFilters } from "@/components/coach/client-filters";
import { ClientTable } from "@/components/coach/client-table";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PushPrompt } from "@/components/pwa/push-prompt";

export const metadata: Metadata = { title: "Panel del coach" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/El_Salvador" }).format(new Date()));
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function CoachDashboard({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string }> }) {
  const profile = await requireRole("coach");
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const filtro = isClientFilter(sp.filtro) ? sp.filtro : "todos";

  const [stats, clients, renewals, overdue, alerts, newIntakes] = await Promise.all([
    getDashboardStats(),
    listClients(profile.id, { q, filtro }),
    upcomingRenewals(profile.id),
    overdueClients(profile.id),
    recentNotifications(),
    newIntakesCount(),
  ]);

  const firstName = profile.full_name.split(" ")[0] || "Coach";
  const filterLabel = CLIENT_FILTERS.find((f) => f.value === filtro)?.label ?? "Todos";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{greeting()}, {firstName}</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
            Panel del coach
          </h1>
        </div>
        <Link href="/coach/clientes/nuevo" className={buttonClass("primary", "md", "uppercase tracking-[0.08em]")}>
          <Plus size={18} /> Nuevo cliente
        </Link>
      </header>

      <InstallPrompt audience="coach" />
      <PushPrompt audience="coach" />

      <Link
        href="/coach/solicitudes"
        className={`flex items-center gap-3 rounded-card border p-4 transition-colors hover:bg-panel-2 ${newIntakes.short + newIntakes.full ? "border-red/50 bg-red/10" : "border-line bg-panel"}`}
      >
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${newIntakes.short + newIntakes.full ? "bg-red text-white" : "bg-panel-2 text-muted"}`}>
          <ClipboardList size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {newIntakes.short ? `${newIntakes.short} ${newIntakes.short === 1 ? "solicitud nueva" : "solicitudes nuevas"}` : "Solicitudes"}
          </span>
          <span className="block text-sm text-muted">
            {newIntakes.full
              ? `${newIntakes.full} ${newIntakes.full === 1 ? "cuestionario completo nuevo" : "cuestionarios completos nuevos"}`
              : newIntakes.short
                ? "Personas interesadas desde tu página"
                : "Interesados y tu link para compartir"}
          </span>
        </span>
        <ChevronRight size={18} className="text-faint" />
      </Link>

      {/* Métricas */}
      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total clientes" value={stats.total} href="/coach?filtro=todos#clientes" />
        <StatCard label="Activos" value={stats.active} tone="ok" href="/coach?filtro=activos#clientes" />
        <StatCard label="Por vencer" value={stats.expiring_soon} hint="Próximos 7 días" tone={stats.expiring_soon ? "warn" : "default"} href="/coach?filtro=por-vencer#clientes" />
        <StatCard label="Vencidos" value={stats.overdue} hint={`${stats.expired} sin acceso`} tone={stats.overdue ? "bad" : "default"} href="/coach?filtro=vencidos#clientes" />
        <StatCard label="Check-ins pendientes" value={stats.checkins_pending} hint="Más de 7 días sin enviar" tone={stats.checkins_pending ? "warn" : "default"} href="/coach/checkins?vista=pendientes" />
        <StatCard label="Baja adherencia" value={stats.low_adherence} hint="Menos de 70 %" tone={stats.low_adherence ? "warn" : "default"} href="/coach?filtro=baja-adherencia#clientes" />
        <StatCard label="Suspendidos" value={stats.suspended} href="/coach?filtro=suspendidos#clientes" />
        <StatCard
          label="Ingresos 30 días"
          value={formatMoney(stats.revenue_30d_cents)}
          hint={stats.revenue_30d_cents ? "Pagos confirmados" : "Sin pagos registrados aún"}
        />
      </section>

      {/* Alertas y renovaciones */}
      <section id="alertas" aria-label="Alertas" className="grid scroll-mt-20 items-start gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="eyebrow mb-3">Renovaciones próximas</h2>
          {renewals.length ? (
            <ul className="flex flex-col gap-2.5">
              {renewals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/coach/clientes/${r.id}`} className="truncate font-medium hover:text-red">
                    {r.first_name} {r.last_name}
                  </Link>
                  <span className="tnum shrink-0 text-muted">
                    {r.days_to_renewal === 0 ? "Hoy" : `${formatDate(r.renewal_date, true)} · ${r.days_to_renewal} d`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nadie renueva en los próximos 14 días.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="eyebrow mb-3">Pagos vencidos</h2>
          {overdue.length ? (
            <ul className="flex flex-col gap-2.5">
              {overdue.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/coach/clientes/${o.id}`} className="truncate font-medium hover:text-red">
                    {o.first_name} {o.last_name}
                  </Link>
                  <Badge tone={MEMBERSHIP_TONE[o.membership_status as MembershipStatus]}>
                    {MEMBERSHIP_LABEL[o.membership_status as MembershipStatus]}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Todos los pagos están al día.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="eyebrow mb-3">Actividad reciente</h2>
          {alerts.length ? (
            <ul className="flex flex-col gap-3">
              {alerts.map((a) => (
                <li key={a.id} className="flex gap-2.5 text-sm">
                  <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.read_at ? "bg-line" : "bg-red"}`} />
                  <div className="min-w-0">
                    {a.link ? (
                      <Link href={a.link} className="font-medium hover:text-red">
                        {a.body ?? a.title}
                      </Link>
                    ) : (
                      <p className="font-medium">{a.body ?? a.title}</p>
                    )}
                    <p className="text-xs text-faint">{relativeDays(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Acá vas a ver cuando un cliente complete su check-in.</p>
          )}
        </Card>
      </section>

      {/* Clientes */}
      <section id="clientes" aria-labelledby="clientes-title" className="flex scroll-mt-20 flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="clientes-title" className="font-display text-2xl font-extrabold uppercase tracking-tight">
            Clientes
          </h2>
          <span className="tnum text-sm text-muted">
            {clients.length} {clients.length === 1 ? "resultado" : "resultados"}
            {filtro !== "todos" && ` · ${filterLabel}`}
          </span>
        </div>
        <ClientFilters q={q} filtro={filtro} />
        {clients.length ? (
          <ClientTable clients={clients} />
        ) : (
          <Card>
            <EmptyState
              title={stats.total ? "Sin resultados" : "Aún no tenés clientes"}
              description={
                stats.total
                  ? "Ningún cliente coincide con la búsqueda o el filtro."
                  : "Cuando agregués clientes van a aparecer acá con su progreso y membresía."
              }
              action={
                stats.total ? (
                  <Link href="/coach#clientes" className={buttonClass("secondary", "sm")}>
                    Quitar filtros
                  </Link>
                ) : (
                  <Link href="/coach/clientes/nuevo" className={buttonClass("primary", "sm")}>
                    Agregar el primero
                  </Link>
                )
              }
            />
          </Card>
        )}
      </section>
    </div>
  );
}
