"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calculator, CopyPlus, Pencil, Plus, Power, Trash2, Wand2 } from "lucide-react";
import * as A from "@/app/coach/planes/actions";
import type { PlanFormState } from "@/app/coach/planes/actions";
import { DAY_NAMES, DAY_SHORT, dayMacros, targetsForDay, typeColor, type Food, type PlanTree } from "@/lib/nutrition/plan";
import type { CalculationSnapshot } from "@/lib/nutrition/calc";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Dialog } from "@/components/dialog";
import { MacroSummary } from "@/components/nutrition/macro-summary";
import { MealCard, type MealHandlers } from "@/components/nutrition/meal-card";
import { NutritionCalculator, describeCalculation, type CalcDefaults } from "@/components/nutrition/calculator";
import { DayTargets } from "@/components/nutrition/day-targets";
import { AutoFit } from "@/components/nutrition/auto-fit";
import { DayTypesCard, type DayTypeHandlers } from "@/components/nutrition/day-types";
import { SupplementsEditor, type SupplementHandlers } from "@/components/nutrition/supplements-editor";
import { cn } from "@/lib/cn";

const QUICK_MEALS = ["Desayuno", "Merienda AM", "Almuerzo", "Merienda PM", "Cena", "Pre-entreno", "Post-entreno"];

/** Aplica cantidades aún no guardadas sobre los datos del servidor. */
function withPending(plan: PlanTree, pending: Map<string, number>): PlanTree {
  if (!pending.size) return plan;
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      meals: d.meals.map((m) => ({
        ...m,
        options: m.options.map((o) => ({ ...o, items: o.items.map((i) => (pending.has(i.id) ? { ...i, quantity: pending.get(i.id)! } : i)) })),
      })),
    })),
  };
}

export function PlanEditor({
  plan,
  foods: initialFoods,
  client,
  clients,
  calcDefaults,
  initialWeek,
  initialDay,
}: {
  plan: PlanTree;
  foods: Food[];
  client: { id: string; name: string } | null;
  clients: { id: string; name: string }[];
  calcDefaults: CalcDefaults;
  initialWeek: number;
  initialDay: number;
}) {
  const router = useRouter();
  const pendingQty = useRef(new Map<string, number>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [tree, setTree] = useState(plan);
  const [foods, setFoods] = useState(initialFoods);
  const [week, setWeek] = useState(Math.min(initialWeek, plan.weeks));
  const [day, setDay] = useState(initialDay);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, startBusy] = useTransition();
  const [dialog, setDialog] = useState<null | "calc" | "meta" | "dup" | "copyDay" | "fit" | { copyMeal: string }>(null);

  useEffect(() => setTree(withPending(plan, pendingQty.current)), [plan]);
  useEffect(() => {
    if (week > plan.weeks) setWeek(plan.weeks);
  }, [plan.weeks, week]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.bad ? 5000 : 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const current = tree.days.find((d) => d.week_number === week && d.day_number === day);
  const totals = dayMacros(current, foodMap);
  const dayInfo = targetsForDay(tree, current);
  const targets = dayInfo.targets;
  const calc = (tree.calculation ?? null) as CalculationSnapshot | null;
  const isTemplate = !tree.client_id;

  // ------------------------------------------------ guardado
  const saveQty = useCallback(async (itemId: string) => {
    const qty = pendingQty.current.get(itemId);
    timers.current.delete(itemId);
    if (qty === undefined) return;
    const res = await A.updateQuantityAction(plan.id, itemId, qty);
    if (pendingQty.current.get(itemId) === qty) pendingQty.current.delete(itemId);
    if (!res.ok) setToast({ text: res.error, bad: true });
  }, [plan.id]);

  const flush = useCallback(async () => {
    const ids = [...timers.current.keys()];
    ids.forEach((id) => clearTimeout(timers.current.get(id)));
    await Promise.all(ids.map(saveQty));
  }, [saveQty]);

  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (timers.current.size) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [flush]);

  /** Ejecuta una acción estructural: guarda cantidades pendientes primero. */
  const run = useCallback(
    async (fn: () => Promise<A.ActionResult<unknown>>, okText?: string) => {
      await flush();
      return new Promise<boolean>((resolve) =>
        startBusy(async () => {
          const res = await fn();
          if (!res.ok) setToast({ text: res.error, bad: true });
          else if (okText) setToast({ text: okText });
          resolve(res.ok);
        }),
      );
    },
    [flush],
  );

  // ------------------------------------------------ manejadores de comidas
  const h: MealHandlers = {
    rename: (id, name) => run(() => A.updateMealAction(plan.id, id, { name })),
    setNotes: (id, notes) => run(() => A.updateMealAction(plan.id, id, { notes }), "Nota guardada"),
    move: (id, dir) => run(() => A.moveMealAction(plan.id, id, dir)),
    remove: async (id) => void (await run(() => A.deleteMealAction(plan.id, id), "Comida eliminada")),
    copy: (id) => setDialog({ copyMeal: id }),
    addOption: (id, from) => run(() => A.addOptionAction(plan.id, id, from), "Opción agregada"),
    renameOption: (id, label) => run(() => A.renameOptionAction(plan.id, id, label)),
    removeOption: async (id) => void (await run(() => A.deleteOptionAction(plan.id, id))),
    addItem: (optionId, food, qty) => run(() => A.addItemAction(plan.id, optionId, food.id, qty)),
    setQty: (itemId, qty) => {
      pendingQty.current.set(itemId, qty);
      // Recalcula en vivo
      setTree((t) => withPending(t, new Map([[itemId, qty]])));
      clearTimeout(timers.current.get(itemId));
      timers.current.set(itemId, setTimeout(() => saveQty(itemId), 700));
    },
    removeItem: async (id) => void (await run(() => A.deleteItemAction(plan.id, id))),
    addSub: (itemId, food, qty, notes) => run(() => A.addSubstitutionAction(plan.id, itemId, food.id, qty, notes), "Sustitución agregada"),
    removeSub: async (id) => void (await run(() => A.deleteSubstitutionAction(plan.id, id))),
    foodCreated: (f) => setFoods((list) => [...list, f]),
  };

  const sh: SupplementHandlers = {
    save: async (id, input) => {
      await flush();
      const res = await A.saveSupplementAction(plan.id, id, input);
      if (res.ok) setToast({ text: id ? "Suplemento actualizado" : "Suplemento agregado" });
      return res.ok ? { ok: true } : { ok: false, error: res.error, fields: res.fields };
    },
    move: (id, dir) => run(() => A.moveSupplementAction(plan.id, id, dir)),
    remove: (id) => run(() => A.deleteSupplementAction(plan.id, id), "Suplemento eliminado"),
  };

  const dth: DayTypeHandlers = {
    save: async (id, input, applyTo) => {
      await flush();
      const res = await A.saveDayTypeAction(plan.id, id, input, applyTo);
      if (res.ok) setToast({ text: id ? "Tipo de día actualizado" : "Tipo de día creado" });
      return res.ok ? { ok: true } : { ok: false, error: res.error, fields: res.fields };
    },
    remove: (id) => run(() => A.deleteDayTypeAction(plan.id, id), "Tipo de día eliminado"),
  };

  const dayHasMeals = (w: number, d: number) => (tree.days.find((x) => x.week_number === w && x.day_number === d)?.meals.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={client ? `/coach/clientes/${client.id}?tab=nutricion` : "/coach/planes"}
        onClick={() => flush()}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={16} /> {client ? client.name : "Plantillas"}
      </Link>

      {/* Encabezado */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{isTemplate ? "Plantilla de nutrición" : `Plan nutricional · ${client?.name}`}</p>
            <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight">{tree.name}</h1>
          </div>
          {isTemplate ? <Badge>Plantilla</Badge> : tree.is_active ? <Badge tone="ok">Activo</Badge> : <Badge tone="warn">Borrador</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isTemplate && (
            <ConfirmButton
              action={async () => void (await run(() => A.setActiveAction(plan.id, !tree.is_active), tree.is_active ? "Plan desactivado" : "Plan activado: el cliente ya lo ve"))}
              label={<><Power size={15} /> {tree.is_active ? "Desactivar" : "Activar plan"}</>}
              confirmText={tree.is_active ? "El cliente dejará de ver este plan." : "El cliente verá este plan y se desactivará el anterior."}
              confirmLabel={tree.is_active ? "Sí, desactivar" : "Sí, activar"}
              tone="neutral"
            />
          )}
          <Button type="button" variant="secondary" size="sm" onClick={() => setDialog("meta")}>
            <Pencil size={15} /> Datos del plan
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setDialog("dup")}>
            <CopyPlus size={15} /> Duplicar
          </Button>
          <ConfirmButton action={async () => void (await A.deletePlanAction(plan.id))} label={<><Trash2 size={15} /> Eliminar</>} confirmText="Se borra el plan completo." confirmLabel="Sí, eliminar" />
        </div>
      </header>

      {/* Objetivos vs plan real */}
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="eyebrow">
            {DAY_NAMES[day - 1]}
            {tree.weeks > 1 ? ` · semana ${week}` : ""} · {dayInfo.type ? dayInfo.type.name : "objetivo general"}
          </h2>
          <Button type="button" size="sm" variant={dayInfo.type ? "secondary" : "primary"} onClick={() => setDialog("calc")}>
            <Calculator size={15} /> {tree.target_kcal ? "Calculadora · objetivo general" : "Definir objetivos"}
          </Button>
        </div>
        <MacroSummary actual={totals} targets={targets} caption="Total del día con la primera opción de cada comida." />
        {dayInfo.type ? (
          <p className="border-t border-line pt-3 text-xs text-faint">
            Este día usa el objetivo de <strong className="text-muted">{dayInfo.type.name}</strong>. Lo editás en Tipos de día.
          </p>
        ) : (
          calc && <p className="border-t border-line pt-3 text-xs text-faint">Objetivo general · Cálculo: {describeCalculation(calc)}</p>
        )}
      </Card>

      <DayTypesCard plan={tree} days={tree.days} weeks={tree.weeks} h={dth} disabled={busy} />

      {/* Semanas y días */}
      <nav aria-label="Semana y día" className="flex flex-col gap-3">
        {tree.weeks > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {Array.from({ length: tree.weeks }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setWeek(i + 1)}
                aria-pressed={week === i + 1}
                className={cn("whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", week === i + 1 ? "border-fg bg-fg text-ink" : "border-line text-muted hover:text-fg")}
              >
                Semana {i + 1}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_SHORT.map((d, i) => {
            const on = day === i + 1;
            const has = dayHasMeals(week, i + 1);
            const dd = tree.days.find((x) => x.week_number === week && x.day_number === i + 1);
            const kcal = Math.round(dayMacros(dd, foodMap).kcal);
            const color = typeColor(tree.day_types, dd?.day_type_id);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDay(i + 1)}
                aria-pressed={on}
                className={cn("flex flex-col items-center rounded-xl border py-2 text-xs transition-colors", on ? "border-red bg-red/10 text-fg" : "border-line text-muted hover:border-faint")}
              >
                <span className="font-semibold uppercase tracking-wider">{d}</span>
                <span className="tnum mt-0.5 text-[11px] text-faint">{has ? `${kcal}` : "—"}</span>
                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ background: color ?? "transparent" }} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Día */}
      <section aria-labelledby="day-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="day-title" className="font-display text-2xl font-extrabold uppercase tracking-tight">{DAY_NAMES[day - 1]}</h2>
            <label className="sr-only" htmlFor={`label_${week}_${day}`}>Nombre del día</label>
            <input
              key={`${week}-${day}-${current?.label ?? ""}`}
              id={`label_${week}_${day}`}
              defaultValue={current?.label ?? ""}
              placeholder="Etiqueta opcional (ej. Día de entrenamiento)"
              maxLength={60}
              onBlur={(e) => {
                const label = e.target.value;
                if (label !== (current?.label ?? "")) run(() => A.setDayLabelAction(plan.id, week, day, label));
              }}
              className="mt-1 w-full max-w-sm border-b border-transparent bg-transparent text-sm text-muted placeholder:text-faint focus:border-line focus:outline-none"
            />
          </div>
          <label className="sr-only" htmlFor="day_type">Tipo de día</label>
          <select
            id="day_type"
            value={current?.day_type_id ?? ""}
            disabled={busy}
            onChange={(e) => {
              const typeId = e.target.value || null;
              run(() => A.setDayTypeAction(plan.id, week, day, typeId), "Tipo de día cambiado");
            }}
            className="h-9 rounded-full border border-line bg-panel-2 px-3 text-sm font-semibold text-fg"
          >
            <option value="">General</option>
            {tree.day_types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={!current?.meals.some((m) => m.options.some((o) => o.items.length))}
            onClick={async () => {
              if (!targets.kcal) {
                setToast({ text: "Primero definí los objetivos de este día", bad: true });
                return;
              }
              await flush();
              setDialog("fit");
            }}
          >
            <Wand2 size={15} /> Auto-ajustar
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={!current?.meals.length} onClick={() => setDialog("copyDay")}>
            <CopyPlus size={15} /> Copiar este día a…
          </Button>
        </div>

        {current?.meals.map((m, i) => (
          <MealCard key={m.id} meal={m} index={i} total={current.meals.length} foods={foods} foodMap={foodMap} h={h} />
        ))}
        {!current?.meals.length && (
          <Card className="px-6 py-8 text-center text-sm text-muted">
            Este día no tiene comidas. Agregá la primera o copiá otro día ya armado.
          </Card>
        )}

        <AddMeal disabled={busy} onAdd={(name) => run(() => A.addMealAction(plan.id, week, day, name))} />
      </section>

      <SupplementsEditor items={tree.supplements} h={sh} disabled={busy} />

      {tree.notes && (
        <Card className="p-5">
          <h2 className="eyebrow mb-2">Notas del plan para el cliente</h2>
          <p className="whitespace-pre-wrap text-sm">{tree.notes}</p>
        </Card>
      )}

      {/* Diálogos */}
      <Dialog open={dialog === "calc"} onClose={() => setDialog(null)} title="Objetivos nutricionales" wide>
        <NutritionCalculator
          defaults={calcDefaults}
          current={{ target_kcal: tree.target_kcal, target_protein_g: tree.target_protein_g, target_carbs_g: tree.target_carbs_g, target_fat_g: tree.target_fat_g }}
          previous={calc}
          onApply={async (payload) => {
            const res = await A.setTargetsAction(plan.id, payload);
            if (!res.ok) return res.error;
            setDialog(null);
            setToast({ text: "Objetivos actualizados" });
            return null;
          }}
        />
      </Dialog>

      <Dialog open={dialog === "meta"} onClose={() => setDialog(null)} title="Datos del plan">
        <MetaForm plan={tree} isTemplate={isTemplate} onDone={() => { setDialog(null); setToast({ text: "Cambios guardados" }); }} />
      </Dialog>

      <Dialog open={dialog === "dup"} onClose={() => setDialog(null)} title="Duplicar plan">
        <DuplicateForm
          planName={tree.name}
          clients={clients}
          defaultTarget={client?.id ?? ""}
          onDuplicate={async (target, name) => {
            await flush();
            const res = await A.duplicatePlanAction(plan.id, target || null, name);
            if (!res.ok) return res.error;
            setDialog(null);
            router.push(`/coach/planes/${res.data}`);
            return null;
          }}
        />
      </Dialog>

      <Dialog open={dialog === "fit"} onClose={() => setDialog(null)} title={`Auto-ajustar ${DAY_NAMES[day - 1]}${dayInfo.type ? ` · ${dayInfo.type.name}` : ""}`} wide>
        {dialog === "fit" && current && (
          <AutoFit
            day={current}
            foodMap={foodMap}
            targets={{ kcal: targets.kcal ?? 0, protein: targets.protein ?? 0, carbs: targets.carbs ?? 0, fat: targets.fat ?? 0 }}
            onApply={async (updates) => {
              const ok = await run(() => A.applyQuantitiesAction(plan.id, updates), "Cantidades ajustadas");
              if (ok) setDialog(null);
              return ok;
            }}
          />
        )}
      </Dialog>

      <Dialog open={dialog === "copyDay"} onClose={() => setDialog(null)} title={`Copiar ${DAY_NAMES[day - 1]}`} wide>
        <DayTargets
          weeks={tree.weeks}
          source={{ week, day }}
          excludeSource
          confirmLabel="Copiar día"
          note="Los días elegidos se reemplazan por completo con las comidas de este día."
          onConfirm={async (targets) => {
            const ok = await run(() => A.copyDayAction(plan.id, { week, day }, targets), `Día copiado a ${targets.length} día(s)`);
            if (ok) setDialog(null);
          }}
        />
      </Dialog>

      <Dialog open={typeof dialog === "object" && dialog !== null} onClose={() => setDialog(null)} title="Copiar comida" wide>
        {typeof dialog === "object" && dialog !== null && (
          <DayTargets
            weeks={tree.weeks}
            source={{ week, day }}
            excludeSource={false}
            confirmLabel="Copiar comida"
            note="La comida se agrega al final de cada día elegido (no reemplaza lo que ya tenga)."
            onConfirm={async (targets) => {
              const ok = await run(() => A.copyMealAction(plan.id, dialog.copyMeal, targets), `Comida copiada a ${targets.length} día(s)`);
              if (ok) setDialog(null);
            }}
          />
        )}
      </Dialog>

      {toast && (
        <div
          role="status"
          className={cn(
            "fixed bottom-[calc(env(safe-area-inset-bottom,0px)+84px)] left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-xl lg:bottom-8",
            toast.bad ? "bg-bad text-white" : "bg-fg text-ink",
          )}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function AddMeal({ onAdd, disabled }: { onAdd: (name: string) => Promise<boolean>; disabled: boolean }) {
  const [custom, setCustom] = useState("");
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold">Agregar comida</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_MEALS.map((m) => (
          <button key={m} type="button" disabled={disabled} onClick={() => onAdd(m)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold text-muted hover:border-faint hover:text-fg disabled:opacity-50">
            <Plus size={13} /> {m}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!custom.trim()) return;
          if (await onAdd(custom)) setCustom("");
        }}
      >
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Otro nombre…" maxLength={80} aria-label="Nombre de la comida" className="max-w-xs" />
        <Button type="submit" variant="secondary" disabled={disabled || !custom.trim()}>Agregar</Button>
      </form>
    </Card>
  );
}

function MetaForm({ plan, isTemplate, onDone }: { plan: PlanTree; isTemplate: boolean; onDone: () => void }) {
  const [state, action, pending] = useActionState<PlanFormState, FormData>(A.updatePlanMetaAction.bind(null, plan.id), {});
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, state.savedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = state.values;
  return (
    <form key={state.savedAt ?? "init"} action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Nombre" htmlFor="pm_name" error={state.fields?.name}>
        <Input id="pm_name" name="name" defaultValue={v?.name ?? plan.name} required maxLength={120} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Semanas" htmlFor="pm_weeks" error={state.fields?.weeks}>
          <Select id="pm_weeks" name="weeks" defaultValue={v?.weeks ?? String(plan.weeks)} className="w-full">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>{i + 1} {i === 0 ? "semana" : "semanas"}</option>
            ))}
          </Select>
        </Field>
        {!isTemplate && (
          <Field label="Inicio" htmlFor="pm_start" error={state.fields?.start_date}>
            <Input id="pm_start" name="start_date" type="date" defaultValue={v?.start_date ?? plan.start_date ?? ""} />
          </Field>
        )}
      </div>
      <Field label="Notas para el cliente" htmlFor="pm_notes" error={state.fields?.notes}>
        <Textarea id="pm_notes" name="notes" defaultValue={v?.notes ?? plan.notes ?? ""} placeholder="Hidratación, horarios, indicaciones generales…" maxLength={5000} />
      </Field>
      {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
    </form>
  );
}

function DuplicateForm({
  planName,
  clients,
  defaultTarget,
  onDuplicate,
}: {
  planName: string;
  clients: { id: string; name: string }[];
  defaultTarget: string;
  onDuplicate: (target: string, name: string) => Promise<string | null>;
}) {
  const [target, setTarget] = useState(defaultTarget);
  const [name, setName] = useState(`${planName} (copia)`);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setError(await onDuplicate(target, name)));
      }}
    >
      <Field label="Destino" htmlFor="dup_target">
        <Select id="dup_target" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full">
          <option value="">Guardar como plantilla</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>Cliente: {c.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Nombre de la copia" htmlFor="dup_name">
        <Input id="dup_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
      </Field>
      <p className="text-xs text-faint">La copia queda como borrador: el cliente no la ve hasta que la actives.</p>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Copiando…" : "Duplicar"}</Button>
    </form>
  );
}
