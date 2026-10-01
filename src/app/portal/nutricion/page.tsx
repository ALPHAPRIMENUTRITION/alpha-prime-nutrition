import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { getPortalContext } from "@/lib/data/portal";
import { currentPlanWeek, getActivePlanForClient, isoWeekday } from "@/lib/data/nutrition";
import { DAY_NAMES, DAY_SHORT, dayMacros, formatQty, itemMacros, optionMacros, type Food } from "@/lib/nutrition/plan";
import { todayISO } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { MembershipLocked } from "@/components/portal/membership-locked";
import { MembershipWarning } from "@/components/portal/membership-warning";
import { MacroSummary } from "@/components/nutrition/macro-summary";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Nutrición" };

const m0 = (n: number) => Math.round(n);

export default async function PortalNutrition({ searchParams }: { searchParams: Promise<{ dia?: string; semana?: string }> }) {
  const ctx = await getPortalContext();
  if (!ctx) return <Card><EmptyState title="Cuenta sin programa" /></Card>;
  if (!ctx.hasAccess) return <MembershipLocked suspended={ctx.membership === "suspended"} />;

  const data = await getActivePlanForClient(ctx.client.id);
  if (!data) {
    return (
      <div className="flex flex-col gap-5">
        <MembershipWarning status={ctx.membership} />
        <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">Nutrición</h1>
        <Card><EmptyState title="Tu plan está en preparación" description={`${ctx.coachName} te va a avisar cuando esté listo.`} /></Card>
      </div>
    );
  }

  const { tree, foods } = data;
  const foodMap = new Map<string, Food>(foods.map((f) => [f.id, { ...f, reference_amount: Number(f.reference_amount) }]));
  const today = todayISO();
  const todayWeek = currentPlanWeek(tree.start_date, tree.weeks, today);
  const todayDay = isoWeekday(today);
  const sp = await searchParams;
  const week = Math.min(Math.max(Number(sp.semana) || todayWeek, 1), tree.weeks);
  const day = Math.min(Math.max(Number(sp.dia) || todayDay, 1), 7);
  const current = tree.days.find((d) => d.week_number === week && d.day_number === day);
  const totals = dayMacros(current, foodMap);
  const recentlyUpdated = Date.now() - Date.parse(tree.updated_at) < 3 * 86_400_000;
  const href = (w: number, d: number) => `/portal/nutricion?semana=${w}&dia=${d}`;

  return (
    <div className="flex flex-col gap-5">
      <MembershipWarning status={ctx.membership} />
      <header>
        <p className="eyebrow">{tree.name}</p>
        <h1 className="mt-1 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">Nutrición</h1>
      </header>

      {recentlyUpdated && (
        <p role="status" className="flex items-center gap-2 rounded-card border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
          <RefreshCw size={16} aria-hidden="true" /> Tu plan fue actualizado.
        </p>
      )}

      {tree.weeks > 1 && (
        <nav aria-label="Semana" className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {Array.from({ length: tree.weeks }, (_, i) => (
            <Link
              key={i}
              href={href(i + 1, day)}
              scroll={false}
              aria-current={week === i + 1 ? "true" : undefined}
              className={cn("whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", week === i + 1 ? "border-fg bg-fg text-ink" : "border-line text-muted")}
            >
              Semana {i + 1}
            </Link>
          ))}
        </nav>
      )}
      <nav aria-label="Día" className="grid grid-cols-7 gap-1.5">
        {DAY_SHORT.map((d, i) => {
          const on = day === i + 1;
          const isToday = week === todayWeek && i + 1 === todayDay;
          return (
            <Link
              key={d}
              href={href(week, i + 1)}
              scroll={false}
              aria-current={on ? "date" : undefined}
              className={cn("flex flex-col items-center rounded-xl border py-2 text-xs font-semibold uppercase tracking-wider", on ? "border-red bg-red/10 text-fg" : "border-line text-muted")}
            >
              {d}
              <span className={cn("mt-1 h-1 w-1 rounded-full", isToday ? "bg-red" : "bg-transparent")} aria-hidden="true" />
            </Link>
          );
        })}
      </nav>

      <Card className="p-5">
        <p className="eyebrow mb-3">
          {DAY_NAMES[day - 1]}
          {current?.label ? ` · ${current.label}` : ""}
        </p>
        <MacroSummary
          actual={totals}
          targets={{ kcal: tree.target_kcal, protein: tree.target_protein_g, carbs: tree.target_carbs_g, fat: tree.target_fat_g }}
          compact
          caption="Total del día con la opción principal de cada comida."
        />
      </Card>

      {current?.meals.length ? (
        current.meals.map((meal) => (
          <article key={meal.id} className="overflow-hidden rounded-card border border-line bg-panel">
            <header className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">{meal.name}</h2>
              <span className="tnum text-sm text-muted">{m0(optionMacros(meal.options[0], foodMap).kcal)} kcal</span>
            </header>
            {meal.notes && <p className="border-b border-line px-4 py-2.5 text-sm text-muted">{meal.notes}</p>}
            {meal.options.map((opt, oi) => {
              const body = (
                <ul className="divide-y divide-line">
                  {opt.items.map((it) => {
                    const f = foodMap.get(it.food_id);
                    const mac = itemMacros(f, it.quantity);
                    return (
                      <li key={it.id} className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[15px] font-medium">{f?.name ?? "Alimento"}</p>
                          <p className="tnum shrink-0 text-[15px] font-semibold">{f ? formatQty(it.quantity, f.unit) : it.quantity}</p>
                        </div>
                        <p className="tnum text-xs text-faint">
                          {m0(mac.kcal)} kcal · P {m0(mac.protein)} g · C {m0(mac.carbs)} g · G {m0(mac.fat)} g
                        </p>
                        {it.subs.length > 0 && (
                          <div className="mt-2 rounded-lg bg-graphite px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Podés cambiarlo por</p>
                            <ul className="mt-1 flex flex-col gap-0.5">
                              {it.subs.map((s) => {
                                const sf = foodMap.get(s.food_id);
                                return (
                                  <li key={s.id} className="text-sm">
                                    {sf ? `${formatQty(s.quantity, sf.unit)} de ${sf.name}` : "Alimento"}
                                    {s.notes && <span className="text-faint"> · {s.notes}</span>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {opt.items.length === 0 && <li className="px-4 py-3 text-sm text-faint">Sin alimentos.</li>}
                </ul>
              );
              if (meal.options.length === 1) return <div key={opt.id}>{body}</div>;
              return (
                <details key={opt.id} open={oi === 0} className="group border-t border-line first:border-t-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-semibold">
                    <span>{opt.label}</span>
                    <span className="tnum text-xs font-normal text-muted">{m0(optionMacros(opt, foodMap).kcal)} kcal</span>
                  </summary>
                  {body}
                </details>
              );
            })}
          </article>
        ))
      ) : (
        <Card><EmptyState title="Día libre de plan" description="Este día no tiene comidas asignadas. Consultá con tu coach si tenés dudas." /></Card>
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
