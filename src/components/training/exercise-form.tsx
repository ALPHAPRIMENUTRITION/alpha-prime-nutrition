"use client";

import { useState, useTransition } from "react";
import { saveExerciseAction } from "@/app/coach/rutinas/actions";
import { EQUIPMENT, MUSCLE_GROUPS, type Exercise } from "@/lib/training/plan";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

/** Crear o editar un ejercicio propio del coach. */
export function ExerciseForm({
  idPrefix,
  exerciseId = null,
  initial,
  onSaved,
  onCancel,
}: {
  idPrefix: string;
  exerciseId?: string | null;
  initial: Partial<Pick<Exercise, "name" | "muscle_group" | "equipment" | "notes">>;
  onSaved: (ex: Exercise) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [v, setV] = useState({ name: initial.name ?? "", muscle_group: initial.muscle_group ?? "", equipment: initial.equipment ?? "", notes: initial.notes ?? "" });
  const [err, setErr] = useState<{ error?: string; fields?: Record<string, string> }>({});
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div className="flex flex-col gap-3">
      <Field label="Nombre" htmlFor={`${idPrefix}_name`} error={err.fields?.name}>
        <Input id={`${idPrefix}_name`} value={v.name} onChange={set("name")} maxLength={120} placeholder="Ej. Press inclinado en Smith" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Grupo muscular" htmlFor={`${idPrefix}_group`}>
          <Select id={`${idPrefix}_group`} value={v.muscle_group} onChange={set("muscle_group")} className="w-full">
            <option value="">—</option>
            {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </Field>
        <Field label="Equipo" htmlFor={`${idPrefix}_eq`}>
          <Select id={`${idPrefix}_eq`} value={v.equipment} onChange={set("equipment")} className="w-full">
            <option value="">—</option>
            {EQUIPMENT.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Indicaciones técnicas (opcional)" htmlFor={`${idPrefix}_notes`}>
        <Textarea id={`${idPrefix}_notes`} value={v.notes} onChange={set("notes")} maxLength={1000} rows={2} placeholder="Ej. Escápulas retraídas, bajar en 3 segundos." />
      </Field>
      {err.error && !err.fields && <p role="alert" className="text-sm text-bad">{err.error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || !v.name.trim()}
          onClick={() =>
            start(async () => {
              const res = await saveExerciseAction(exerciseId, v);
              if (!res.ok) return setErr({ error: res.error, fields: "fields" in res ? res.fields : undefined });
              setErr({});
              await onSaved(res.data!);
            })
          }
        >
          {pending ? "Guardando…" : exerciseId ? "Guardar cambios" : "Crear ejercicio"}
        </Button>
        {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>}
      </div>
    </div>
  );
}
