import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Dumbbell, RefreshCw } from "lucide-react";
import { getPortalContext } from "@/lib/data/portal";
import { currentPlanWeek, isoWeekday } from "@/lib/data/nutrition";
import { exercisesByIds, getActiveWorkoutForClient, getClientLogs } from "@/lib/data/training";
import { DAY_NAMES, DAY_SHORT } from "@/lib/nutrition/plan";
import { dayMuscles, weekInfo, type LogRow } from "@/lib/training/plan";
import { addDaysISO, formatDate, todayISO } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { MembershipLocked } from "@/components/portal/membership-locked";
import { MembershipWarning } from "@/components/portal/membership-warning";
import { SessionLogger } from "@/components/training/session-logger";
import { ProgressionView } from "@/components/training/progression-view";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Entrenamiento" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function PortalTraining({ searchParams }: { searchParams: Promise<{ dia?: string; semana?: string; vista?: string; fecha?: string }> }) {
  const ctx = await getPortalContext();
  if (!ctx) return <Card><EmptyState title="Cuenta sin programa" /></Card>;
  if (!ctx.hasAccess) return <MembershipLocked suspended={ctx.membership === "suspended"} />;

  const sp = await searchParams;
  const history = sp.vista === "historial";
  const [data, logs] = await Promise.all([getActiveWorkoutForClient(ctx.client.id), getClientLogs(ctx.client.id)]);

  const tabs = (
    <nav aria-label="Vista" className="inline-flex w-fit rounded-full border border-line bg-panel p-1">
      <Link href="/portal/entrenamiento" aria-current={!history ? "page" : undefined} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", !history ? "bg-fg text-ink" : "text-muted")}>Rutina</Link>
      <Link href="/portal/entrenamiento?vista=historial" aria-current={history ? "page" : undefined} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", history ? "bg-fg text-ink" : "text-muted")}>Mi progreso</Link>
    </nav>
  );

  if (history) {
    const exercises = await exercisesByIds([...new Set(logs.map((l) => l.exercise_id))]);
    return (
      <div className="flex flex-col gap-5">
        <MembershipWarning status={ctx.membership} />
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">Entreno</h1>
          {tabs}
        </header>
        <ProgressionView logs={logs} exercises={exercises} empty="Todavía no registraste cargas. Registrá tu primera sesión en la pestaña Rutina." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-5">
        <MembershipWarning status={ctx.membership} />
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">Entreno</h1>
          {tabs}
        </header>
        <Card><EmptyState title="Tu rutina está en preparación" description={`${ctx.coachName} te va a avisar cuando esté lista.`} /></Card>
      </div>
    );
  }

  const { tree, exercises } = data;
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  const today = todayISO();
  const todayWeek = currentPlanWeek(tree.start_date, tree.weeks, today);
  const todayDay = isoWeekday(today);
  const week = Math.min(Math.max(Number(sp.semana) || todayWeek, 1), tree.weeks);
  const day = Math.min(Math.max(Number(sp.dia) || todayDay, 1), 7);
  const current = tree.days.find((d) => d.week_number === week && d.day_number === day);
  const rows = current?.exercises ?? [];
  const wi = weekInfo(tree, week);
  const recentlyUpdated = Date.now() - Date.parse(tree.updated_at) < 3 * 86_400_000;

  // Fecha del registro: hoy por defecto; se puede elegir hasta 14 días atrás.
  const minDate = addDaysISO(today, -14);
  const date = sp.fecha && ISO.test(sp.fecha) && sp.fecha <= today && sp.fecha >= minDate ? sp.fecha : today;
  const dayLogs = logs.filter((l) => l.performed_at === date);
  const previous: Record<string, { date: string; sets: LogRow[] }> = {};
  for (const r of rows) {
    const prior = logs.filter((l) => l.exercise_id === r.exercise_id && l.performed_at < date);
    const last = prior[0]?.performed_at; // logs vienen ordenados por fecha desc
    if (last) previous[r.exercise_id] = { date: last, sets: prior.filter((l) => l.performed_at === last).sort((a, b) => a.set_number - b.set_number) };
  }
  const href = (w: number, d: number, extra = "") => `/portal/entrenamiento?semana=${w}&dia=${d}${extra}`;

  return (
    <div className="flex flex-col gap-5">
      <MembershipWarning status={ctx.membership} />
      <header className="flex flex-col gap-3">
        <div>
          <p className="eyebrow">{tree.name}</p>
          <h1 className="mt-1 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">Entreno</h1>
        </div>
        {tabs}
      </header>

      {recentlyUpdated && (
        <p role="status" className="flex items-center gap-2 rounded-card border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
          <RefreshCw size={16} aria-hidden="true" /> Tu rutina fue actualizada.
        </p>
      )}

      {tree.weeks > 1 && (
        <nav aria-label="Semana" className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {Array.from({ length: tree.weeks }, (_, i) => {
            const label = weekInfo(tree, i + 1).label;
            const on = week === i + 1;
            return (
              <Link key={i} href={href(i + 1, day)} scroll={false} aria-current={on ? "true" : undefined} className={cn("flex shrink-0 flex-col rounded-xl border px-3.5 py-1.5", on ? "border-fg bg-fg text-ink" : "border-line text-muted")}>
                <span className="whitespace-nowrap text-[13px] font-semibold">Semana {i + 1}{i + 1 === todayWeek ? " · actual" : ""}</span>
                {label && <span className={cn("whitespace-nowrap text-[11px]", on ? "text-ink/70" : "text-faint")}>{label}</span>}
              </Link>
            );
          })}
        </nav>
      )}
      {wi.notes && <p className="rounded-card border border-line bg-panel px-4 py-3 text-sm text-muted">{wi.notes}</p>}

      <nav aria-label="Día" className="grid grid-cols-7 gap-1.5">
        {DAY_SHORT.map((d, i) => {
          const on = day === i + 1;
          const isToday = week === todayWeek && i + 1 === todayDay;
          const n = tree.days.find((x) => x.week_number === week && x.day_number === i + 1)?.exercises.length ?? 0;
          return (
            <Link key={d} href={href(week, i + 1)} scroll={false} aria-current={on ? "date" : undefined} className={cn("flex flex-col items-center rounded-xl border py-2 text-xs font-semibold uppercase tracking-wider", on ? "border-red bg-red/10 text-fg" : "border-line text-muted")}>
              {d}
              <Dumbbell size={12} className={cn("mt-1", n ? "text-fg" : "text-transparent")} aria-label={n ? "Entrenamiento" : "Descanso"} />
              <span className={cn("mt-0.5 h-1 w-1 rounded-full", isToday ? "bg-red" : "bg-transparent")} aria-hidden="true" />
            </Link>
          );
        })}
      </nav>

      <Card className="p-5">
        <p className="eyebrow">{DAY_NAMES[day - 1]}{week !== todayWeek || day !== todayDay ? "" : " · hoy"}</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold uppercase leading-none tracking-tight">{rows.length ? current?.name || "Entrenamiento" : "Descanso"}</h2>
        {rows.length > 0 && <p className="mt-1 text-sm text-muted">{dayMuscles(current, exMap).join(" · ")} · {rows.length} ejercicio{rows.length === 1 ? "" : "s"}</p>}
        {current?.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{current.notes}</p>}
      </Card>

      {rows.length > 0 ? (
        <>
          <form action="/portal/entrenamiento" className="flex flex-wrap items-center gap-2 text-sm">
            <input type="hidden" name="semana" value={week} />
            <input type="hidden" name="dia" value={day} />
            <CalendarDays size={16} className="text-muted" aria-hidden="true" />
            <label htmlFor="log_date" className="text-muted">Registrando el</label>
            <input id="log_date" type="date" name="fecha" defaultValue={date} min={minDate} max={today} className="h-9 rounded-lg border border-line bg-panel px-2 text-sm text-fg" />
            <button type="submit" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:text-fg">Cambiar</button>
            {date !== today && <span className="text-xs text-warn">({formatDate(date)}, no es hoy)</span>}
          </form>
          <p className="-mt-2 text-xs text-faint">Tocá ✓ en cada serie al terminarla. Si dejás un campo vacío se guarda lo sugerido en gris.</p>
          <SessionLogger key={`${current?.id}-${date}`} rows={rows} exercises={exercises} logs={dayLogs} previous={previous} date={date} canLog />
        </>
      ) : (
        <Card><EmptyState title="Día de descanso" description="Recuperá bien: dormí, hidratate y cumplí tu plan de nutrición." /></Card>
      )}

      {tree.notes && (
        <Card className="p-5">
          <p className="eyebrow mb-2">Notas de {ctx.coachName}</p>
          <p className="whitespace-pre-wrap text-sm">{tree.notes}</p>
        </Card>
      )}
    </div>
  );
}
