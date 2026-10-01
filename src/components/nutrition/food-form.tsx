"use client";

import { useState, useTransition } from "react";
import type { Food } from "@/lib/nutrition/plan";
import { saveFoodAction } from "@/app/coach/planes/actions";
import { kcalFromMacros } from "@/lib/nutrition/calc";
import { Button, Field, Input, Select } from "@/components/ui";

export const FOOD_CATEGORIES = ["Proteínas", "Lácteos", "Carbohidratos", "Leguminosas", "Frutas", "Verduras", "Grasas", "Suplementos", "Otros"];

/** Crear o editar un alimento propio. */
export function FoodForm({ food, onSaved, onCancel }: { food?: Food; onSaved: (f: Food) => void; onCancel?: () => void }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [unit, setUnit] = useState<Food["unit"]>(food?.unit ?? "g");
  const [macros, setMacros] = useState({ p: food?.protein_g ?? 0, c: food?.carbs_g ?? 0, f: food?.fat_g ?? 0 });
  const prefix = food?.id ?? "new";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = Object.fromEntries([...new FormData(e.currentTarget).entries()].map(([k, v]) => [k, String(v)]));
    start(async () => {
      const res = await saveFoodAction(food?.id ?? null, input);
      if (!res.ok) {
        setError(res.error);
        setFields(("fields" in res && res.fields) || {});
        return;
      }
      setError(null);
      setFields({});
      if (res.data) onSaved(res.data);
    });
  }

  const id = (k: string) => `${prefix}_${k}`;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Nombre *" htmlFor={id("name")} error={fields.name}>
        <Input id={id("name")} name="name" defaultValue={food?.name} placeholder="Ej. Pan pita integral marca X" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría" htmlFor={id("category")} error={fields.category}>
          <Select id={id("category")} name="category" defaultValue={food?.category ?? "Otros"} className="w-full">
            {FOOD_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Unidad" htmlFor={id("unit")} error={fields.unit}>
          <Select id={id("unit")} name="unit" value={unit} onChange={(e) => setUnit(e.target.value as Food["unit"])} className="w-full">
            <option value="g">Gramos (g)</option>
            <option value="ml">Mililitros (ml)</option>
            <option value="unidad">Unidades</option>
          </Select>
        </Field>
      </div>
      <Field label={`Porción de referencia (${unit === "unidad" ? "unidades" : unit})`} htmlFor={id("ref")} error={fields.reference_amount}>
        <Input id={id("ref")} name="reference_amount" type="number" inputMode="decimal" step="0.1" defaultValue={food?.reference_amount ?? (unit === "unidad" ? 1 : 100)} required />
      </Field>
      <p className="-mt-2 text-xs text-faint">Los valores de abajo corresponden a esta porción (como en la etiqueta).</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field label="Calorías" htmlFor={id("kcal")} error={fields.kcal}>
          <Input id={id("kcal")} name="kcal" type="number" inputMode="decimal" step="0.1" defaultValue={food?.kcal} required />
        </Field>
        <Field label="Proteína g" htmlFor={id("p")} error={fields.protein_g}>
          <Input id={id("p")} name="protein_g" type="number" inputMode="decimal" step="0.1" defaultValue={food?.protein_g} onChange={(e) => setMacros((m) => ({ ...m, p: Number(e.target.value) || 0 }))} required />
        </Field>
        <Field label="Carbos g" htmlFor={id("c")} error={fields.carbs_g}>
          <Input id={id("c")} name="carbs_g" type="number" inputMode="decimal" step="0.1" defaultValue={food?.carbs_g} onChange={(e) => setMacros((m) => ({ ...m, c: Number(e.target.value) || 0 }))} required />
        </Field>
        <Field label="Grasas g" htmlFor={id("f")} error={fields.fat_g}>
          <Input id={id("f")} name="fat_g" type="number" inputMode="decimal" step="0.1" defaultValue={food?.fat_g} onChange={(e) => setMacros((m) => ({ ...m, f: Number(e.target.value) || 0 }))} required />
        </Field>
        <Field label="Fibra g" htmlFor={id("fib")} error={fields.fiber_g}>
          <Input id={id("fib")} name="fiber_g" type="number" inputMode="decimal" step="0.1" defaultValue={food?.fiber_g ?? 0} />
        </Field>
      </div>
      <p className="text-xs text-faint">
        Según los macros: <span className="tnum">{kcalFromMacros(macros.p, macros.c, macros.f)} kcal</span> (4/4/9). Si difiere mucho de la etiqueta, revisá los datos.
      </p>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : food ? "Guardar cambios" : "Crear alimento"}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  );
}
