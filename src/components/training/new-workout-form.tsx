"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createWorkoutAction, type WorkoutFormState } from "@/app/coach/rutinas/actions";
import { Button, Field, Input, Select } from "@/components/ui";
import { todayISO } from "@/lib/format";

/** Crear una rutina para un cliente (o una plantilla), en blanco o desde una plantilla. */
export function NewWorkoutForm({ clientId, templates }: { clientId: string | null; templates: { id: string; name: string; weeks: number }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<WorkoutFormState, FormData>(createWorkoutAction.bind(null, clientId), {});
  const [templateId, setTemplateId] = useState("");
  const v = state.values ?? {};
  useEffect(() => {
    if (state.savedAt) setOpen(true);
  }, [state.savedAt]);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus size={16} /> {clientId ? "Nueva rutina" : "Nueva plantilla"}
      </Button>
    );
  }

  return (
    <form key={state.savedAt ?? "init"} action={action} className="flex flex-col gap-4 rounded-card border border-line bg-panel p-5" noValidate>
      <p className="font-semibold">{clientId ? "Nueva rutina de entrenamiento" : "Nueva plantilla de entrenamiento"}</p>
      {clientId && templates.length > 0 && (
        <Field label="Empezar desde" htmlFor="nw_tpl">
          <Select id="nw_tpl" name="template_id" value={templateId || v.template_id || ""} onChange={(e) => setTemplateId(e.target.value)} className="w-full">
            <option value="">Rutina en blanco</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>Plantilla: {t.name} ({t.weeks} sem.)</option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Field label="Nombre" htmlFor="nw_name" error={state.fields?.name}>
            <Input id="nw_name" name="name" defaultValue={v.name ?? (clientId ? "Rutina de entrenamiento" : "")} placeholder={clientId ? "" : "Ej. Torso-Pierna 4 días"} required maxLength={120} />
          </Field>
        </div>
        {!(templateId || v.template_id) && (
          <Field label="Semanas" htmlFor="nw_weeks" error={state.fields?.weeks}>
            <Select id="nw_weeks" name="weeks" defaultValue={v.weeks ?? "1"} className="w-full">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>{i + 1} {i === 0 ? "semana" : "semanas"}</option>
              ))}
            </Select>
          </Field>
        )}
        {(templateId || v.template_id) && <input type="hidden" name="weeks" value="1" />}
        {clientId && (
          <Field label="Inicio" htmlFor="nw_start" error={state.fields?.start_date}>
            <Input id="nw_start" name="start_date" type="date" defaultValue={v.start_date ?? todayISO()} />
          </Field>
        )}
      </div>
      <p className="text-xs text-faint">Se crea como borrador. El cliente la ve cuando la actives.</p>
      {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Creando…" : "Crear y abrir"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
