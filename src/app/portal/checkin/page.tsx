import type { Metadata } from "next";
import { CalendarCheck, Clock } from "lucide-react";
import { getPortalContext } from "@/lib/data/portal";
import { getCheckinPhotos, getClientCheckins } from "@/lib/data/checkins";
import { getActiveWorkoutForClient } from "@/lib/data/training";
import { currentPlanWeek } from "@/lib/data/nutrition";
import { createClient } from "@/lib/supabase/server";
import { dueDateOfWeek, mondayOf, WEEKDAYS } from "@/lib/checkin";
import { formatDate, todayISO } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { MembershipLocked } from "@/components/portal/membership-locked";
import { MembershipWarning } from "@/components/portal/membership-warning";
import { CheckinForm } from "@/components/checkin/checkin-form";
import { CheckinCard } from "@/components/checkin/checkin-card";

export const metadata: Metadata = { title: "Check-in" };

export default async function PortalCheckin() {
  const ctx = await getPortalContext();
  if (!ctx) return <Card><EmptyState title="Cuenta sin programa" /></Card>;
  if (!ctx.hasAccess) return <MembershipLocked suspended={ctx.membership === "suspended"} />;

  const today = todayISO();
  const monday = mondayOf(today);
  const due = dueDateOfWeek(monday, ctx.checkinWeekday);
  const supabase = await createClient();
  const [checkins, workout, { data: weekLogs }] = await Promise.all([
    getClientCheckins(ctx.client.id),
    getActiveWorkoutForClient(ctx.client.id),
    supabase.from("workout_logs").select("performed_at").eq("client_id", ctx.client.id).gte("performed_at", monday).lte("performed_at", today),
  ]);
  const current = checkins.find((c) => c.week_start === monday) ?? null;
  const history = checkins.filter((c) => c.week_start !== monday);
  const photos = await getCheckinPhotos(checkins.slice(0, 12).map((c) => c.id));

  // Sugerencias para "entrenamientos": días con ejercicios en la semana actual de la rutina y días con registros esta semana.
  let planned: number | null = null;
  if (workout) {
    const w = currentPlanWeek(workout.tree.start_date, workout.tree.weeks, today);
    planned = workout.tree.days.filter((d) => d.week_number === w && d.exercises.length).length || null;
  }
  const completed = weekLogs ? new Set(weekLogs.map((l) => l.performed_at)).size : null;
  const prevOf = (i: number, list = checkins) => list[i + 1] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <MembershipWarning status={ctx.membership} />
      <header>
        <p className="eyebrow">Semana del {formatDate(monday)}</p>
        <h1 className="mt-1 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">Check-in</h1>
      </header>

      {current?.status === "reviewed" ? (
        <>
          <p className="flex items-center gap-2 rounded-card border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
            <CalendarCheck size={16} aria-hidden="true" /> Check-in de esta semana enviado y revisado por {ctx.coachName}.
          </p>
          <CheckinCard c={current} previous={prevOf(0)} photos={photos.get(current.id)} config={ctx.checkinConfig} />
        </>
      ) : (
        <>
          <p className="flex items-start gap-2 rounded-card border border-line bg-panel px-4 py-3 text-sm text-muted">
            <Clock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {current
              ? `Ya lo enviaste. Podés corregirlo hasta que ${ctx.coachName} lo revise.`
              : today >= due
                ? `Te toca hoy${today > due ? ` (era el ${WEEKDAYS[ctx.checkinWeekday]!.toLowerCase()})` : ""}. Toma 2 minutos.`
                : `Tu check-in es el ${WEEKDAYS[ctx.checkinWeekday]!.toLowerCase()} ${formatDate(due)}. Podés enviarlo antes si querés.`}
          </p>
          <Card className="p-5">
            <CheckinForm
              key={current?.id ?? "new"}
              clientId={ctx.client.id}
              config={ctx.checkinConfig}
              existing={current}
              suggestedPlanned={planned}
              suggestedCompleted={completed}
              hasPhotos={Boolean(current && photos.get(current.id)?.length)}
            />
          </Card>
        </>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="hist-title">
          <h2 id="hist-title" className="font-display text-2xl font-extrabold uppercase tracking-tight">Anteriores</h2>
          {history.slice(0, 12).map((c) => (
            <CheckinCard key={c.id} c={c} previous={prevOf(checkins.indexOf(c))} photos={photos.get(c.id)} config={ctx.checkinConfig} />
          ))}
        </section>
      )}
    </div>
  );
}
