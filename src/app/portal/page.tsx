import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck, Scale, Target } from "lucide-react";
import { dueDateOfWeek, mondayOf } from "@/lib/checkin";
import { cn } from "@/lib/cn";
import { getPortalContext, getPortalHome, nextCheckinDate, programWeek } from "@/lib/data/portal";
import { diffDaysISO, formatDate, todayISO } from "@/lib/format";
import { kgToLb } from "@/lib/units";
import { MEMBERSHIP_LABEL, MEMBERSHIP_TONE } from "@/lib/membership";
import { Badge, Card, EmptyState } from "@/components/ui";
import { MembershipLocked } from "@/components/portal/membership-locked";
import { MembershipWarning } from "@/components/portal/membership-warning";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export const metadata: Metadata = { title: "Inicio" };

/** Mensaje basado solo en datos reales del último check-in revisado/enviado. */
function weeklyMessage(adherence: number | null | undefined) {
  if (adherence == null) return "Completá tu primer check-in para empezar a medir tu avance semana a semana.";
  if (adherence >= 90) return `Excelente trabajo esta semana. Completaste el ${adherence} % de tu objetivo.`;
  if (adherence >= 70) return `Vas por buen camino: completaste el ${adherence} % de tu objetivo la última semana.`;
  return `La última semana completaste el ${adherence} % de tu objetivo. Tu coach te va a ayudar a ajustar lo necesario.`;
}

export default async function PortalHome() {
  const ctx = await getPortalContext();
  if (!ctx) {
    return (
      <Card>
        <EmptyState title="Cuenta sin programa" description="Tu cuenta todavía no está vinculada a un programa. Escribile a tu coach." />
      </Card>
    );
  }

  const { client, membership } = ctx;
  if (!ctx.hasAccess) return <MembershipLocked suspended={membership === "suspended"} />;

  const { checkins, measurements } = await getPortalHome(client.id);
  const last = checkins[0];
  const lastAdherence = last ? (last.coach_adherence_override ?? last.adherence_score) : null;

  // Peso: el registro más reciente entre mediciones y check-ins
  const weights = [
    ...measurements.map((m) => ({ at: m.measured_at, lb: kgToLb(Number(m.weight_kg)) })),
    ...checkins.filter((c) => c.weight_kg != null).map((c) => ({ at: c.submitted_at.slice(0, 10), lb: kgToLb(Number(c.weight_kg)) })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const startWeight = weights[0]?.lb ?? null;
  const currentWeight = weights.at(-1)?.lb ?? null;
  const delta = startWeight != null && currentWeight != null ? currentWeight - startWeight : null;

  const nextCheckin = nextCheckinDate(ctx.checkinWeekday, last?.submitted_at ?? null);
  const monday = mondayOf(todayISO());
  const thisWeek = checkins.find((c) => c.week_start === monday);
  const checkinState: "sent" | "pending" | "upcoming" = thisWeek ? "sent" : todayISO() >= dueDateOfWeek(monday, ctx.checkinWeekday) ? "pending" : "upcoming";
  const daysToCheckin = diffDaysISO(nextCheckin, todayISO());

  return (
    <div className="flex flex-col gap-5">
      <MembershipWarning status={membership} />
      <InstallPrompt />

      <section>
        <p className="eyebrow">Semana {programWeek(client.start_date)} del programa</p>
        <h1 className="mt-1 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">
          Hola, <span className="text-red">{client.first_name}</span>
        </h1>
        <p className="mt-3 text-[15px] text-muted">{weeklyMessage(lastAdherence)}</p>
      </section>

      <Card className="flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red/15 text-red">
          <Target size={20} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Objetivo</p>
          <p className="font-semibold">{client.goal || "Tu coach lo va a definir con vos"}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-1.5 p-4">
          <span className="eyebrow flex items-center gap-1.5">
            <Scale size={13} /> Peso
          </span>
          <span className="tnum font-display text-4xl font-extrabold leading-none">
            {currentWeight != null ? currentWeight.toFixed(1) : "—"}
            <span className="ml-1 text-base text-muted">lb</span>
          </span>
          <span className="tnum text-xs text-muted">
            {delta != null && weights.length > 1
              ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} lb desde el inicio (${startWeight!.toFixed(1)} lb)`
              : "Sin historial todavía"}
          </span>
        </Card>

        <Card className="flex flex-col gap-1.5 p-4">
          <span className="eyebrow">Adherencia</span>
          <span className="tnum font-display text-4xl font-extrabold leading-none">
            {lastAdherence != null ? lastAdherence : "—"}
            <span className="ml-1 text-base text-muted">%</span>
          </span>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel-2" aria-hidden="true">
            <div className="h-full rounded-full bg-red" style={{ width: `${Math.min(100, lastAdherence ?? 0)}%` }} />
          </div>
          <span className="text-xs text-muted">Último check-in</span>
        </Card>
      </div>

      <Link
        href="/portal/checkin"
        className={cn(
          "flex items-center justify-between gap-3 rounded-card border p-4 transition-colors hover:border-faint",
          checkinState === "pending" ? "border-red/50 bg-red/10" : "border-line bg-panel",
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", checkinState === "pending" ? "bg-red text-white" : "bg-panel-2 text-fg")}>
            <CalendarCheck size={20} strokeWidth={1.8} />
          </span>
          <div>
            <p className="eyebrow">{checkinState === "sent" ? "Check-in de esta semana" : "Próximo check-in"}</p>
            <p className="font-semibold">
              {checkinState === "sent" ? (thisWeek?.status === "reviewed" ? "Enviado y revisado" : "Enviado · esperando revisión") : checkinState === "pending" ? "Pendiente: completalo ahora" : formatDate(nextCheckin)}
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-red">
          {checkinState === "sent" ? "Ver" : checkinState === "pending" ? "Completar" : daysToCheckin === 0 ? "Hoy" : daysToCheckin === 1 ? "Mañana" : `En ${daysToCheckin} días`}
        </span>
      </Link>

      <Card className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="eyebrow">Membresía</p>
          <p className="text-sm text-muted">
            {client.renewal_date ? `Renueva el ${formatDate(client.renewal_date)}` : "Sin fecha de renovación"}
          </p>
        </div>
        <Badge tone={MEMBERSHIP_TONE[membership]}>{MEMBERSHIP_LABEL[membership]}</Badge>
      </Card>

      <p className="text-center text-xs text-faint">Coach: {ctx.coachName}</p>
    </div>
  );
}
