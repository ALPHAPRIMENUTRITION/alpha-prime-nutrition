"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Pill, Plus, Trash2 } from "lucide-react";
import { SUPPLEMENT_FREQUENCIES, SUPPLEMENT_SUGGESTIONS, SUPPLEMENT_TIMINGS, supplementLine, type PlanSupplement } from "@/lib/nutrition/plan";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { Dialog } from "@/components/dialog";

export interface SupplementHandlers {
  save: (id: string | null, input: Record<string, string>) => Promise<{ ok: boolean; error?: string; fields?: Record<string, string> }>;
  move: (id: string, dir: -1 | 1) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export function SupplementsEditor({ items, h, disabled }: { items: PlanSupplement[]; h: SupplementHandlers; disabled: boolean }) {
  const [editing, setEditing] = useState<null | "new" | PlanSupplement>(null);

  return (
    <section aria-labelledby="supp-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="supp-title" className="font-display text-2xl font-extrabold uppercase tracking-tight">Suplementación</h2>
          <p className="text-sm text-muted">Aplica a todo el plan. El cliente la ve en su sección Nutrición.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => setEditing("new")}>
          <Plus size={15} /> Agregar suplemento
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="px-6 py-6 text-center text-sm text-muted">Sin suplementación pautada.</Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-line">
            {items.map((s, i) => (
              <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                <Pill size={18} className="mt-0.5 shrink-0 text-red" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  {supplementLine(s) && <p className="text-sm text-muted">{supplementLine(s)}</p>}
                  {s.notes && <p className="mt-0.5 whitespace-pre-wrap text-xs text-faint">{s.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center">
                  <IconBtn label={`Subir ${s.name}`} disabled={disabled || i === 0} onClick={() => h.move(s.id, -1)}><ArrowUp size={15} /></IconBtn>
                  <IconBtn label={`Bajar ${s.name}`} disabled={disabled || i === items.length - 1} onClick={() => h.move(s.id, 1)}><ArrowDown size={15} /></IconBtn>
                  <IconBtn label={`Editar ${s.name}`} disabled={disabled} onClick={() => setEditing(s)}><Pencil size={15} /></IconBtn>
                  <IconBtn label={`Eliminar ${s.name}`} disabled={disabled} onClick={() => confirm(`¿Eliminar ${s.name}?`) && h.remove(s.id)}><Trash2 size={15} /></IconBtn>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Agregar suplemento" : "Editar suplemento"}>
        {editing !== null && (
          <SupplementForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            onSave={async (input) => {
              const res = await h.save(editing === "new" ? null : editing.id, input);
              if (res.ok) setEditing(null);
              return res;
            }}
          />
        )}
      </Dialog>
    </section>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}

function SupplementForm({
  initial,
  onSave,
}: {
  initial: PlanSupplement | null;
  onSave: (input: Record<string, string>) => Promise<{ ok: boolean; error?: string; fields?: Record<string, string> }>;
}) {
  const [v, setV] = useState({
    name: initial?.name ?? "",
    dose: initial?.dose ?? "",
    timing: initial?.timing ?? "",
    frequency: initial?.frequency ?? "",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<{ error?: string; fields?: Record<string, string> }>({});
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await onSave(v);
          if (!res.ok) setErrors({ error: res.error, fields: res.fields });
        });
      }}
    >
      <Field label="Suplemento" htmlFor="sup_name" error={errors.fields?.name}>
        <Input id="sup_name" list="sup_names" value={v.name} onChange={set("name")} placeholder="Ej. Creatina monohidratada" maxLength={120} required autoFocus />
        <datalist id="sup_names">{SUPPLEMENT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Dosis" htmlFor="sup_dose" error={errors.fields?.dose}>
          <Input id="sup_dose" value={v.dose} onChange={set("dose")} placeholder="Ej. 5 g" maxLength={60} />
        </Field>
        <Field label="Momento" htmlFor="sup_timing" error={errors.fields?.timing}>
          <Input id="sup_timing" list="sup_timings" value={v.timing} onChange={set("timing")} placeholder="Ej. Post-entreno" maxLength={60} />
          <datalist id="sup_timings">{SUPPLEMENT_TIMINGS.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Frecuencia" htmlFor="sup_freq" error={errors.fields?.frequency}>
          <Input id="sup_freq" list="sup_freqs" value={v.frequency} onChange={set("frequency")} placeholder="Ej. Diario" maxLength={60} />
          <datalist id="sup_freqs">{SUPPLEMENT_FREQUENCIES.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
      </div>
      <Field label="Indicaciones" htmlFor="sup_notes" error={errors.fields?.notes}>
        <Textarea id="sup_notes" value={v.notes} onChange={set("notes")} placeholder="Ej. Disolver en agua. Marca sugerida…" maxLength={500} rows={3} />
      </Field>
      {errors.error && !errors.fields && <p role="alert" className="text-sm text-bad">{errors.error}</p>}
      <Button type="submit" disabled={pending || !v.name.trim()}>{pending ? "Guardando…" : initial ? "Guardar cambios" : "Agregar suplemento"}</Button>
    </form>
  );
}
