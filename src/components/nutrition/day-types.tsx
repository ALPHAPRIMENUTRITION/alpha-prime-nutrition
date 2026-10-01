"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DAY_SHORT, TYPE_COLORS, type PlanDay, type PlanDayType } from "@/lib/nutrition/plan";
import { Button, Card, Field, Input } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { KcalRebalancer } from "@/components/nutrition/kcal-rebalancer";
import { cn } from "@/lib/cn";


type Targets = { target_kcal: number | null; target_protein_g: number | null; target_carbs_g: number | null; target_fat_g: number | null };
export interface DayTypeHandlers {
  save: (id: string | null, input: Record<string, string>, applyTo: number[]) => Promise<{ ok: boolean; error?: string; fields?: Record<string, string> }>;
  remove: (id: string) => Promise<boolean>;
}

const fmt = (t: Targets) =>
  t.target_kcal ? `${t.target_kcal.toLocaleString("es-SV")} kcal · P${t.target_protein_g ?? "–"} C${t.target_carbs_g ?? "–"} G${t.target_fat_g ?? "–"}` : "Sin objetivos";

/** Días de la semana que tienen este tipo en TODAS las semanas del plan. */
function weekdaysWithType(days: PlanDay[], weeks: number, typeId: string) {
  return [1, 2, 3, 4, 5, 6, 7].filter((d) =>
    Array.from({ length: weeks }, (_, w) => days.find((x) => x.week_number === w + 1 && x.day_number === d)).every((x) => x?.day_type_id === typeId),
  );
}

export function DayTypesCard({ plan, days, weeks, h, disabled }: { plan: Targets & { day_types: PlanDayType[] }; days: PlanDay[]; weeks: number; h: DayTypeHandlers; disabled: boolean }) {
  const [editing, setEditing] = useState<null | "new" | PlanDayType>(null);
  const types = plan.day_types;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="eyebrow">Tipos de día</h2>
          <p className="mt-1 text-sm text-muted">Objetivos distintos según el día: tren superior, tren inferior, descanso…</p>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={disabled || types.length >= 7} onClick={() => setEditing("new")}>
          <Plus size={15} /> Nuevo tipo
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        <li className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-faint" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">General <span className="font-normal text-faint">(días sin tipo)</span></p>
            <p className="tnum text-xs text-muted">{fmt(plan)}</p>
          </div>
        </li>
        {types.map((t, i) => {
          const wd = weekdaysWithType(days, weeks, t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setEditing(t)}
                className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:border-faint disabled:opacity-60"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="tnum text-xs text-muted">{fmt(t)}</p>
                </div>
                {wd.length > 0 && <span className="shrink-0 text-xs text-faint">{wd.map((d) => DAY_SHORT[d - 1]).join(" · ")}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo tipo de día" : "Editar tipo de día"}>
        {editing !== null && (
          <DayTypeForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            defaults={plan}
            initialDays={editing === "new" ? [] : weekdaysWithType(days, weeks, editing.id)}
            weeks={weeks}
            onSave={async (input, applyTo) => {
              const res = await h.save(editing === "new" ? null : editing.id, input, applyTo);
              if (res.ok) setEditing(null);
              return res;
            }}
            onDelete={editing === "new" ? undefined : async () => { if (await h.remove(editing.id)) setEditing(null); }}
          />
        )}
      </Dialog>
    </Card>
  );
}

function DayTypeForm({
  initial,
  defaults,
  initialDays,
  weeks,
  onSave,
  onDelete,
}: {
  initial: PlanDayType | null;
  defaults: Targets;
  initialDays: number[];
  weeks: number;
  onSave: (input: Record<string, string>, applyTo: number[]) => Promise<{ ok: boolean; error?: string; fields?: Record<string, string> }>;
  onDelete?: () => Promise<void>;
}) {
  const src = initial ?? defaults;
  const [v, setV] = useState({
    name: initial?.name ?? "",
    target_kcal: String(src.target_kcal ?? ""),
    target_protein_g: String(src.target_protein_g ?? ""),
    target_carbs_g: String(src.target_carbs_g ?? ""),
    target_fat_g: String(src.target_fat_g ?? ""),
  });
  const [days, setDays] = useState<number[]>(initialDays);
  const [errors, setErrors] = useState<{ error?: string; fields?: Record<string, string> }>({});
  const [pending, start] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const fromMacros = Math.round(4 * (Number(v.target_protein_g) || 0) + 4 * (Number(v.target_carbs_g) || 0) + 9 * (Number(v.target_fat_g) || 0));
  const newDays = days.filter((d) => !initialDays.includes(d));

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await onSave(v, newDays);
          if (!res.ok) setErrors({ error: res.error, fields: res.fields });
        });
      }}
    >
      <Field label="Nombre" htmlFor="dt_name" error={errors.fields?.name}>
        <Input id="dt_name" list="dt_names" value={v.name} onChange={set("name")} placeholder="Ej. Tren superior" maxLength={40} required autoFocus />
        <datalist id="dt_names">
          {["Tren superior", "Tren inferior", "Descanso", "Pierna", "Empuje", "Tracción", "Cardio", "Alto en carbohidratos", "Bajo en carbohidratos"].map((n) => <option key={n} value={n} />)}
        </datalist>
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Calorías" htmlFor="dt_kcal" error={errors.fields?.target_kcal}>
          <Input id="dt_kcal" inputMode="numeric" value={v.target_kcal} onChange={set("target_kcal")} />
        </Field>
        <Field label="Proteína (g)" htmlFor="dt_p" error={errors.fields?.target_protein_g}>
          <Input id="dt_p" inputMode="numeric" value={v.target_protein_g} onChange={set("target_protein_g")} />
        </Field>
        <Field label="Carbos (g)" htmlFor="dt_c" error={errors.fields?.target_carbs_g}>
          <Input id="dt_c" inputMode="numeric" value={v.target_carbs_g} onChange={set("target_carbs_g")} />
        </Field>
        <Field label="Grasas (g)" htmlFor="dt_f" error={errors.fields?.target_fat_g}>
          <Input id="dt_f" inputMode="numeric" value={v.target_fat_g} onChange={set("target_fat_g")} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
        <span className="tnum">Según los macros: {fromMacros.toLocaleString("es-SV")} kcal</span>
        {fromMacros > 0 && String(fromMacros) !== v.target_kcal && (
          <button type="button" className="font-semibold text-red hover:underline" onClick={() => setV((x) => ({ ...x, target_kcal: String(fromMacros) }))}>
            Usar {fromMacros.toLocaleString("es-SV")} kcal
          </button>
        )}
      </div>
      <KcalRebalancer
        idPrefix="dt"
        current={{ kcal: Number(v.target_kcal) || 0, protein: Number(v.target_protein_g) || 0, carbs: Number(v.target_carbs_g) || 0, fat: Number(v.target_fat_g) || 0 }}
        onApply={(x) => setV((y) => ({ ...y, target_kcal: String(x.kcal), target_protein_g: String(x.protein), target_carbs_g: String(x.carbs), target_fat_g: String(x.fat) }))}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-muted">Asignar a{weeks > 1 ? " (en todas las semanas)" : ""}</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_SHORT.map((d, i) => {
            const on = days.includes(i + 1);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => setDays((x) => (on ? x.filter((y) => y !== i + 1) : [...x, i + 1]))}
                className={cn("rounded-xl border py-2 text-xs font-semibold uppercase tracking-wider", on ? "border-red bg-red/10 text-fg" : "border-line text-muted hover:border-faint")}
              >
                {d}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-faint">Las comidas de cada día no cambian; solo su objetivo. Para quitar el tipo de un día, cambialo desde el día.</p>
      </fieldset>

      {errors.error && !errors.fields && <p role="alert" className="text-sm text-bad">{errors.error}</p>}
      <Button type="submit" disabled={pending || !v.name.trim()}>{pending ? "Guardando…" : initial ? "Guardar cambios" : "Crear tipo de día"}</Button>
      {onDelete && (
        confirmDel ? (
          <div className="flex flex-col gap-2 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm">
            <p>Los días con este tipo vuelven a los objetivos generales. Sus comidas no se borran.</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={pending} onClick={() => start(onDelete)}>Sí, eliminar</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmDel(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDel(true)} className="inline-flex items-center justify-center gap-1.5 text-sm text-bad hover:underline">
            <Trash2 size={14} /> Eliminar tipo de día
          </button>
        )
      )}
    </form>
  );
}
