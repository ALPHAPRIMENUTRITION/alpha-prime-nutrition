"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { itemMacros, normalize, unitLabel, type Food } from "@/lib/nutrition/plan";
import { Button, Input } from "@/components/ui";
import { FoodForm } from "@/components/nutrition/food-form";
import { cn } from "@/lib/cn";

/** Buscar un alimento, indicar la cantidad y agregarlo. Permite crear uno nuevo sin salir. */
export function FoodPicker({
  foods,
  onPick,
  onFoodCreated,
  submitLabel = "Agregar",
  withNotes = false,
  idPrefix,
}: {
  foods: Food[];
  onPick: (food: Food, quantity: number, notes: string) => Promise<boolean>;
  onFoodCreated: (food: Food) => void;
  submitLabel?: string;
  withNotes?: boolean;
  idPrefix: string;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    const term = normalize(q);
    const list = term ? foods.filter((f) => normalize(f.name).includes(term) || normalize(f.category ?? "").includes(term)) : foods;
    // Propios primero, luego por nombre
    return [...list].sort((a, b) => Number(Boolean(b.coach_id)) - Number(Boolean(a.coach_id)) || a.name.localeCompare(b.name)).slice(0, 30);
  }, [q, foods]);

  function choose(f: Food) {
    setSelected(f);
    setQty(String(f.reference_amount));
    setError(null);
  }

  async function submit() {
    if (!selected) return;
    const n = Number(qty.replace(",", "."));
    if (!(n > 0)) return setError("Escribí una cantidad mayor a 0.");
    setBusy(true);
    const ok = await onPick(selected, n, notes);
    setBusy(false);
    if (ok) {
      setSelected(null);
      setQ("");
      setQty("");
      setNotes("");
    }
  }

  if (creating) {
    return (
      <div className="rounded-xl border border-line bg-panel p-4">
        <p className="mb-3 text-sm font-semibold">Nuevo alimento</p>
        <FoodForm
          onSaved={(f) => {
            onFoodCreated(f);
            setCreating(false);
            choose(f);
          }}
          onCancel={() => setCreating(false)}
        />
      </div>
    );
  }

  const preview = selected ? itemMacros(selected, Number(qty.replace(",", ".")) || 0) : null;

  return (
    <div className="flex flex-col gap-3">
      {!selected ? (
        <>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
            <Input
              id={`${idPrefix}_search`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar alimento (ej. pollo, arroz, avena)"
              className="pl-10"
              autoComplete="off"
              aria-label="Buscar alimento"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto rounded-xl border border-line" role="listbox" aria-label="Resultados">
            {results.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => choose(f)}
                  className="flex w-full items-center justify-between gap-3 border-b border-line px-3.5 py-2.5 text-left text-sm last:border-0 hover:bg-panel-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{f.name}</span>
                    <span className="block text-xs text-faint">
                      {f.category ?? "Sin categoría"}
                      {f.coach_id ? " · propio" : ""}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-right text-xs text-muted">
                    {Math.round(f.kcal)} kcal
                    <span className="block text-faint">por {f.reference_amount} {unitLabel(f.unit, f.reference_amount)}</span>
                  </span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-3.5 py-4 text-sm text-muted">No hay coincidencias.</li>}
          </ul>
          <button type="button" onClick={() => setCreating(true)} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-red hover:underline">
            <Plus size={15} /> Crear alimento nuevo
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{selected.name}</p>
              <p className="text-xs text-faint">
                {selected.kcal} kcal · P {selected.protein_g} · C {selected.carbs_g} · G {selected.fat_g} por {selected.reference_amount} {unitLabel(selected.unit, selected.reference_amount)}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="shrink-0 text-sm text-muted underline hover:text-fg">
              Cambiar
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm text-muted" htmlFor={`${idPrefix}_qty`}>
              Cantidad ({unitLabel(selected.unit, 2)})
              <Input
                id={`${idPrefix}_qty`}
                type="number"
                inputMode="decimal"
                step={selected.unit === "unidad" ? 0.5 : 1}
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-32"
                autoFocus
              />
            </label>
            {preview && (
              <p className={cn("tnum pb-3 text-sm text-muted")}>
                = <span className="font-semibold text-fg">{Math.round(preview.kcal)} kcal</span> · P {preview.protein.toFixed(1)} · C {preview.carbs.toFixed(1)} · G {preview.fat.toFixed(1)}
              </p>
            )}
          </div>
          {withNotes && (
            <Input id={`${idPrefix}_notes`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nota opcional (ej. solo días de descanso)" maxLength={300} aria-label="Nota" />
          )}
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          <div>
            <Button type="button" onClick={submit} disabled={busy}>{busy ? "Guardando…" : submitLabel}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
