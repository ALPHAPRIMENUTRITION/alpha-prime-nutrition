"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { FormState } from "@/app/coach/clientes/actions";
import { MEASUREMENT_FIELDS } from "@/lib/validation/client";
import { todayISO } from "@/lib/format";
import { Button, Field, Input } from "@/components/ui";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function MeasurementForm({ action }: { action: Action }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const f = state.fields ?? {};
  const v = state.ok ? {} : (state.values ?? {});

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok, state.savedAt]);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus size={16} /> Registrar medición
        </Button>
        {state.ok && <span role="status" className="text-sm text-ok">Medición guardada.</span>}
      </div>
    );
  }

  return (
    <form key={state.savedAt ?? "init"} action={formAction} className="flex flex-col gap-5 rounded-card border border-line bg-panel p-5" noValidate>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-44">
          <Field label="Fecha" htmlFor="measured_at" error={f.measured_at}>
            <Input id="measured_at" name="measured_at" type="date" defaultValue={v.measured_at ?? todayISO()} required />
          </Field>
        </div>
        <p className="pb-3 text-xs text-faint">Completá solo las medidas que tomaste.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {MEASUREMENT_FIELDS.map((m) => (
          <Field key={m.key} label={`${m.label} (${m.unit})`} htmlFor={`m_${m.key}`} error={f[m.key]}>
            <Input id={`m_${m.key}`} name={m.key} type="number" inputMode="decimal" step="0.1" defaultValue={v[m.key] ?? ""} />
          </Field>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Método del % grasa" htmlFor="fat_method" error={f.fat_method}>
          <Input id="fat_method" name="fat_method" placeholder="Ej. pliegues, bioimpedancia" defaultValue={v.fat_method ?? ""} />
        </Field>
        <Field label="Notas" htmlFor="m_notes" error={f.notes}>
          <Input id="m_notes" name="notes" placeholder="Condiciones de la toma, observaciones" defaultValue={v.notes ?? ""} />
        </Field>
      </div>

      <details className="rounded-xl border border-line px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold">Otros campos</summary>
        <div className="mt-3 flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="grid grid-cols-[1fr_8rem] gap-2">
                <Input name={`extra_name_${i}`} aria-label={`Nombre del campo ${i + 1}`} placeholder="Nombre (ej. Antebrazo cm)" defaultValue={v[`extra_name_${i}`] ?? ""} />
                <Input name={`extra_value_${i}`} aria-label={`Valor del campo ${i + 1}`} placeholder="Valor" inputMode="decimal" defaultValue={v[`extra_value_${i}`] ?? ""} />
              </div>
              {f[`extra_${i}`] && <p className="text-sm text-bad">{f[`extra_${i}`]}</p>}
            </div>
          ))}
        </div>
      </details>

      {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar medición"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
