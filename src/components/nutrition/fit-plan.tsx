"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Lock, LockOpen, Wand2 } from "lucide-react";
import { fitDay, type FitTargets } from "@/lib/nutrition/autofit";
import { DAY_NAMES, dayMacros, targetsForDay, type Food, type PlanTree } from "@/lib/nutrition/plan";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

const LABEL: Record<keyof FitTargets, string> = { kcal: "Calorías", protein: "Proteína", carbs: "Carbohidratos", fat: "Grasas" };
const fmt = (n: number) => Math.round(n).toLocaleString("es-SV");

/**
 * Ajusta las cantidades de TODOS los días del plan a sus objetivos
 * (el general o el de su tipo de día). Sirve para reutilizar la dieta de otro cliente.
 */
export function FitPlan({
  tree,
  foodMap,
  clientName,
  onApply,
}: {
  tree: PlanTree;
  foodMap: Map<string, Food>;
  clientName?: string | null;
  onApply: (updates: { id: string; quantity: number }[]) => Promise<boolean>;
}) {
  const [priority, setPriority] = useState<Record<keyof FitTargets, boolean>>({ kcal: true, protein: true, carbs: false, fat: false });
  const [pending, start] = useTransition();

  const rows = useMemo(
    () =>
      [...tree.days]
        .filter((d) => d.meals.some((m) => m.options.some((o) => o.items.length)))
        .sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number)
        .map((d) => {
          const info = targetsForDay(tree, d);
          const t = info.targets;
          if (!t.kcal) return { d, info, skip: true as const };
          const targets = { kcal: t.kcal ?? 0, protein: t.protein ?? 0, carbs: t.carbs ?? 0, fat: t.fat ?? 0 };
          const r = fitDay(d, foodMap, targets, { priority });
          return { d, info, targets, before: dayMacros(d, foodMap), after: r.fit.totals, gaps: r.fit.gaps, updates: r.updates, skip: false as const };
        }),
    [tree, foodMap, priority],
  );

  const updates = rows.flatMap((r) => (r.skip ? [] : r.updates));
  const skipped = rows.filter((r) => r.skip).length;
  const withGaps = rows.filter((r) => !r.skip && r.gaps.length).length;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        Cambia las cantidades de cada alimento para que cada día cumpla{" "}
        <strong className="text-fg">{clientName ? `los objetivos de ${clientName}` : "los objetivos del plan"}</strong>. Los alimentos y las comidas se quedan igual; solo
        cambian los gramos.
      </p>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Cumplir primero:</p>
        <div className="flex flex-wrap gap-2">
          {(["protein", "kcal", "carbs", "fat"] as (keyof FitTargets)[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={priority[k]}
              onClick={() => setPriority((x) => ({ ...x, [k]: !x[k] }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                priority[k] ? "border-red bg-red/10 text-fg" : "border-line text-muted hover:border-faint",
              )}
            >
              {priority[k] ? <Lock size={13} /> : <LockOpen size={13} />} {LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-line">
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
              <span className="w-28 shrink-0 font-semibold">
                {DAY_NAMES[r.d.day_number - 1]}
                {tree.weeks > 1 && <span className="text-faint"> · S{r.d.week_number}</span>}
              </span>
              {r.skip ? (
                <span className="text-warn">Sin objetivo{r.info.type ? ` en “${r.info.type.name}”` : ""}: no se toca</span>
              ) : (
                <span className="tnum flex flex-1 flex-wrap items-center gap-x-2 text-muted">
                  <span>{fmt(r.before.kcal)}</span>
                  <ArrowRight size={13} className="text-faint" aria-hidden="true" />
                  <span className={cn("font-semibold", r.gaps.length ? "text-warn" : "text-fg")}>{fmt(r.after.kcal)} kcal</span>
                  <span className="text-xs text-faint">
                    P{fmt(r.after.protein)}/{fmt(r.targets.protein)} · C{fmt(r.after.carbs)}/{fmt(r.targets.carbs)} · G{fmt(r.after.fat)}/{fmt(r.targets.fat)}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {withGaps > 0 && (
        <p role="alert" className="rounded-card border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          En {withGaps} día(s) los alimentos no alcanzan para llegar exacto (en amarillo). Después de ajustar, abrí ese día y usá <strong>Auto-ajustar</strong> para ver qué agregar.
        </p>
      )}
      {skipped > 0 && <p className="text-xs text-faint">Los días sin objetivo se quedan igual. Definí el objetivo de su tipo de día para ajustarlos.</p>}

      <div className="sticky bottom-0 -mx-5 border-t border-line bg-graphite px-5 py-3 sm:-mx-6 sm:px-6">
        <Button type="button" className="w-full" disabled={pending || !updates.length} onClick={() => start(async () => void (await onApply(updates)))}>
          <Wand2 size={16} /> {pending ? "Ajustando…" : updates.length ? `Ajustar todo el plan (${updates.length} cantidades)` : "Ya está ajustado"}
        </Button>
      </div>
    </div>
  );
}
