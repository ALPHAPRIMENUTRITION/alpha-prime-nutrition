import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getCheckinPhotos, getCoachCheckinSettings, listCoachCheckins, listPendingCheckins } from "@/lib/data/checkins";
import { dueDateOfWeek, mondayOf, parseCheckinConfig, WEEKDAYS } from "@/lib/checkin";
import { formatDate, relativeDays, todayISO } from "@/lib/format";
import { buttonClass, Card, EmptyState } from "@/components/ui";
import { CheckinCard } from "@/components/checkin/checkin-card";
import { ReviewForm } from "@/components/checkin/review-form";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Check-ins" };

type View = "revisar" | "revisados" | "pendientes";

export default async function CoachCheckins({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const coach = await requireRole("coach");
  const sp = await searchParams;
  const view: View = sp.vista === "revisados" || sp.vista === "pendientes" ? sp.vista : "revisar";
  const today = todayISO();
  const monday = mondayOf(today);
  const settings = await getCoachCheckinSettings(coach.id);
  const config = parseCheckinConfig(settings.config);
  const due = dueDateOfWeek(monday, settings.weekday);

  const [toReview, pending] = await Promise.all([listCoachCheckins("submitted"), listPendingCheckins(monday)]);
  const list = view === "revisar" ? toReview : view === "revisados" ? await listCoachCheckins("reviewed", 30) : [];
  const photos = await getCheckinPhotos(list.map((c) => c.id));

  const tabs: { id: View; label: string; n?: number }[] = [
    { id: "revisar", label: "Por revisar", n: toReview.length },
    { id: "pendientes", label: "Sin enviar", n: pending.length },
    { id: "revisados", label: "Revisados" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Semana del {formatDate(monday)} · día de check-in: {WEEKDAYS[settings.weekday]}</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">Check-ins</h1>
        </div>
        <Link href="/coach/checkins/configurar" className={buttonClass("secondary")}>
          <Settings size={17} /> Configurar
        </Link>
      </header>

      <nav aria-label="Vista" className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {tabs.map((t) => (
          <Link key={t.id} href={`/coach/checkins?vista=${t.id}`} aria-current={view === t.id ? "page" : undefined} className={cn("flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold", view === t.id ? "border-fg bg-fg text-ink" : "border-line text-muted hover:text-fg")}>
            {t.label}
            {t.n != null && <span className={cn("tnum rounded-full px-1.5 text-xs", view === t.id ? "bg-ink/15" : t.n ? "bg-red text-white" : "bg-panel-2")}>{t.n}</span>}
          </Link>
        ))}
      </nav>

      {view === "pendientes" ? (
        pending.length ? (
          <Card className="p-0">
            <ul>
              {pending.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
                  <Link href={`/coach/clientes/${p.id}?tab=checkins`} className="font-medium hover:text-red">{p.name}</Link>
                  <span className="text-xs text-muted">Último: {relativeDays(p.last_checkin_at)}{today >= due ? " · ya le tocaba" : ` · le toca el ${formatDate(due, true)}`}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card><EmptyState title="Todos enviaron su check-in" description="Ningún cliente con acceso tiene el check-in de esta semana pendiente." /></Card>
        )
      ) : list.length ? (
        <div className="flex flex-col gap-4">
          {list.map((c) => (
            <CheckinCard key={c.id} c={c} previous={c.previous} photos={photos.get(c.id)} config={config} title={c.client_name} titleHref={`/coach/clientes/${c.client_id}?tab=checkins`}>
              <ReviewForm checkinId={c.id} initialFeedback={c.coach_feedback} adherence={c.adherence_score} override={c.coach_adherence_override} reviewed={c.status === "reviewed"} />
            </CheckinCard>
          ))}
        </div>
      ) : (
        <Card><EmptyState title={view === "revisar" ? "Nada por revisar" : "Sin check-ins revisados"} description={view === "revisar" ? "Cuando un cliente envíe su check-in te llega una notificación y aparece acá." : undefined} /></Card>
      )}
    </div>
  );
}
