"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Lock, LockOpen } from "lucide-react";
import { fitQuantities, type FitItem, type FitTargets } from "@/lib/nutrition/autofit";
import { formatQty, optionMacros, type Food, type PlanDay } from "@/lib/nutrition/plan";
import { Button } from "@/components/ui";
import { MacroSummary } from "@/components/nutrition/macro-summary";
import { cn } from "@/lib/cn";

const LABEL: Record<keyof FitTargets, string> = { kcal: "calorías", protein: "proteína", carbs: "carbohidratos", fat: "grasas" };
const HINT: Record<keyof FitTargets, string> = {
  kcal: "agregá o liberá algún alimento",
  protein: "agregá una fuente de proteína (pollo, atún, claras, whey…)",
  carbs: "agregá una fuente de carbohidratos (arroz, avena, tortilla, fruta…)",
  fat: "agregá una fuente de grasa (aguacate, aceite, nueces…)",
};

/**
 * Propone cantidades para el día:
 *  1) Opción A de cada comida → objetivos del día.
 *  2) Opciones B, C… → igualan los macros de la opción A de su comida.
 */
export function AutoFit({
  day,
  foodMap,
  targets,
  sameType,
  onApply,
}: {
  day: PlanDay;
  foodMap: Map<string, Food>;
  targets: FitTargets;
  /** Otros días del plan con el mismo tipo de día (para copiar el resultado). */
  sameType: { label: string; days: { week: number; day: number }[] };
  onApply: (updates: { id: string; quantity: number }[], copyTo: { week: number; day: number }[]) => Promise<boolean>;
}) {
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [alsoAlternatives, setAlsoAlternatives] = useState(true);
  const [pending, start] = useTransition();
  const [copyAll, setCopyAll] = useState(sameType.days.length > 0);

  const result = useMemo(() => {
    const toItems = (opt: PlanDay["meals"][number]["options"][number]): FitItem[] =>
      opt.items.flatMap((it) => {
        const food = foodMap.get(it.food_id);
        return food ? [{ id: it.id, food, quantity: it.quantity, locked: locked.has(it.id) }] : [];
      });

    const main = day.meals.flatMap((m) => (m.options[0] ? toItems(m.options[0]) : []));
    const fit = fitQuantities(main, targets);
    const q = new Map(fit.quantities);

    if (alsoAlternatives) {
      for (const m of day.meals) {
        const a = m.options[0];
        if (!a || m.options.length < 2) continue;
        const aMac = optionMacros({ ...a, items: a.items.map((i) => ({ ...i, quantity: q.get(i.id) ?? i.quantity })) }, foodMap);
        for (const opt of m.options.slice(1)) {
          const r = fitQuantities(toItems(opt), { kcal: aMac.kcal, protein: aMac.protein, carbs: aMac.carbs, fat: aMac.fat });
          r.quantities.forEach((v, k) => q.set(k, v));
        }
      }
    }
    return { q, fit };
  }, [day, foodMap, targets, locked, alsoAlternatives]);

  const updates = useMemo(() => {
    const list: { id: string; quantity: number }[] = [];
    for (const m of day.meals) for (const o of m.options) for (const i of o.items) {
      const nq = result.q.get(i.id);
      if (nq !== undefined && Math.abs(nq - i.quantity) > 1e-9) list.push({ id: i.id, quantity: nq });
    }
    return list;
  }, [day, result]);

  const toggle = (id: string) => setLocked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const hasAlternatives = day.meals.some((m) => m.options.length > 1);
  const t = result.fit.totals;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        Propuesta de cantidades para acercarse a los objetivos del día con los alimentos que elegiste.
        <strong className="text-fg"> No se guarda nada hasta que la apliques.</strong> Fijá con el candado lo que no querés que cambie.
      </p>

      <div className="rounded-card border border-line bg-panel p-4">
        <p className="eyebrow mb-3">Resultado propuesto · opción A de cada comida</p>
        <MacroSummary actual={{ kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat, fiber: 0 }} targets={targets} compact />
      </div>

      {result.fit.gaps.length > 0 && (
        <div role="alert" className="rounded-card border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <p className="font-semibold">Con estos alimentos no se llega al objetivo:</p>
          <ul className="mt-1 list-disc pl-5">
            {result.fit.gaps.map((g) => (
              <li key={g.key}>
                {LABEL[g.key]} {g.diff > 0 ? "sobran" : "faltan"} {Math.round(Math.abs(g.diff))} {g.key === "kcal" ? "kcal" : "g"}
                {g.diff < 0 ? ` → ${HINT[g.key]}` : " → quitá o fijá en menos algún alimento que la aporte"}.
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasAlternatives && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={alsoAlternatives} onChange={(e) => setAlsoAlternatives(e.target.checked)} className="h-4 w-4 accent-[var(--color-red)]" />
          Ajustar también las opciones B, C… para que igualen a la opción A
        </label>
      )}

      <div className="flex flex-col gap-4">
        {day.meals.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-card border border-line">
            <p className="border-b border-line bg-panel px-4 py-2 font-display text-lg font-extrabold uppercase tracking-tight">{m.name}</p>
            {m.options.map((o, oi) => (
              <div key={o.id}>
                {m.options.length > 1 && (
                  <p className={cn("px-4 pt-2 text-xs font-semibold uppercase tracking-wider", oi === 0 ? "text-fg" : "text-muted")}>
                    {o.label}{oi > 0 && !alsoAlternatives ? " · sin cambios" : ""}
                  </p>
                )}
                <ul className="divide-y divide-line">
                  {o.items.map((it) => {
                    const f = foodMap.get(it.food_id);
                    if (!f) return null;
                    const nq = result.q.get(it.id) ?? it.quantity;
                    const changed = Math.abs(nq - it.quantity) > 1e-9;
                    const isLocked = locked.has(it.id);
                    const lockable = oi === 0 || alsoAlternatives;
                    return (
                      <li key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                          <span className="block text-sm sm:min-w-0 sm:flex-1 sm:truncate">{f.name}</span>
                          <span className="tnum mt-0.5 flex shrink-0 items-center gap-2 text-sm sm:mt-0">
                            <span className="text-faint">{formatQty(it.quantity, f.unit)}</span>
                            <ArrowRight size={14} className="text-faint" aria-hidden="true" />
                            <span className={cn("font-semibold sm:w-24 sm:text-right", changed ? "text-fg" : "text-muted")}>{formatQty(nq, f.unit)}</span>
                          </span>
                        </div>
                        {lockable && (
                          <button
                            type="button"
                            onClick={() => toggle(it.id)}
                            aria-pressed={isLocked}
                            aria-label={isLocked ? `Liberar ${f.name}` : `Fijar ${f.name}`}
                            title={isLocked ? "Fijado: no cambia" : "Fijar cantidad actual"}
                            className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", isLocked ? "bg-red/15 text-red" : "text-faint hover:bg-panel-2 hover:text-fg")}
                          >
                            {isLocked ? <Lock size={15} /> : <LockOpen size={15} />}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-5 flex flex-col gap-2 border-t border-line bg-graphite px-5 py-3 sm:-mx-6 sm:px-6">
        {sameType.days.length > 0 && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={copyAll} onChange={(e) => setCopyAll(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-red)]" />
            <span>
              Copiar este día ya ajustado a los otros {sameType.days.length} día(s) <strong>{sameType.label}</strong> del plan
              <span className="block text-xs text-faint">Esos días quedan con las mismas comidas y cantidades que este.</span>
            </span>
          </label>
        )}
        <Button
          type="button"
          disabled={pending || (updates.length === 0 && !(copyAll && sameType.days.length))}
          onClick={() => start(async () => void (await onApply(updates, copyAll ? sameType.days : [])))}
        >
          {pending
            ? "Aplicando…"
            : updates.length
              ? `Aplicar ${updates.length} cambio(s)${copyAll && sameType.days.length ? ` y copiar a ${sameType.days.length} día(s)` : ""}`
              : copyAll && sameType.days.length
                ? `Copiar a ${sameType.days.length} día(s) ${sameType.label}`
                : "Sin cambios para aplicar"}
        </Button>
        <p className="text-center text-xs text-faint">Es una sugerencia de apoyo: después podés editar cualquier cantidad a mano.</p>
      </div>
    </div>
  );
}
