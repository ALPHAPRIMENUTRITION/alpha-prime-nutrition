"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { normalize } from "@/lib/nutrition/plan";
import { MUSCLE_GROUPS, type Exercise } from "@/lib/training/plan";
import { Button, Input } from "@/components/ui";
import { ExerciseForm } from "@/components/training/exercise-form";
import { cn } from "@/lib/cn";

/** Buscar un ejercicio (por nombre o grupo muscular) y elegirlo. Permite crear uno nuevo sin salir. */
export function ExercisePicker({
  exercises,
  onPick,
  onCreated,
  idPrefix,
  pickLabel = "Agregar",
}: {
  exercises: Exercise[];
  onPick: (ex: Exercise) => Promise<boolean>;
  onCreated: (ex: Exercise) => void;
  idPrefix: string;
  pickLabel?: string;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const groups = useMemo(() => MUSCLE_GROUPS.filter((g) => exercises.some((e) => e.muscle_group === g)), [exercises]);
  const results = useMemo(() => {
    const term = normalize(q);
    return exercises
      .filter((e) => (!group || e.muscle_group === group) && (!term || normalize(e.name).includes(term) || normalize(e.muscle_group ?? "").includes(term) || normalize(e.equipment ?? "").includes(term)))
      .sort((a, b) => Number(Boolean(b.coach_id)) - Number(Boolean(a.coach_id)) || a.name.localeCompare(b.name))
      .slice(0, 40);
  }, [q, group, exercises]);

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold">Editar ejercicio</p>
        <ExerciseForm
          idPrefix={`${idPrefix}_ed`}
          exerciseId={editing.id}
          initial={editing}
          onSaved={(ex) => {
            onCreated(ex); // actualiza la lista (reemplaza por id)
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
        <p className="text-xs text-faint">El cambio se aplica en todas las rutinas que usan este ejercicio.</p>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold">Nuevo ejercicio</p>
        <ExerciseForm
          idPrefix={`${idPrefix}_new`}
          initial={{ name: q, muscle_group: group ?? "" }}
          onSaved={async (ex) => {
            onCreated(ex);
            setCreating(false);
            setBusy(ex.id);
            await onPick(ex);
            setBusy(null);
          }}
          onCancel={() => setCreating(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">Buscar ejercicio</span>
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
        <Input id={`${idPrefix}_q`} aria-label="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: press, sentadilla, polea…" className="pl-10" autoComplete="off" />
      </label>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <Chip on={!group} onClick={() => setGroup(null)}>Todos</Chip>
        {groups.map((g) => (
          <Chip key={g} on={group === g} onClick={() => setGroup(group === g ? null : g)}>{g}</Chip>
        ))}
      </div>
      <ul className="max-h-72 overflow-y-auto rounded-xl border border-line">
        {results.map((e) => (
          <li key={e.id} className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-0">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{e.name}</span>
              <span className="block text-xs text-muted">
                {[e.muscle_group, e.equipment].filter(Boolean).join(" · ") || "Sin grupo"}
                {e.coach_id ? " · propio" : ""}
              </span>
            </span>
            {e.coach_id && (
              <button type="button" onClick={() => setEditing(e)} aria-label={`Editar ${e.name}`} title="Editar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg">
                <Pencil size={14} />
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null}
              onClick={async () => {
                setBusy(e.id);
                await onPick(e);
                setBusy(null);
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold hover:border-faint disabled:opacity-50"
            >
              <Plus size={13} /> {busy === e.id ? "…" : pickLabel}
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="px-3 py-4 text-center text-sm text-faint">Sin resultados.</li>}
      </ul>
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setCreating(true)}>
        <Plus size={15} /> Crear ejercicio propio{q ? ` "${q}"` : ""}
      </Button>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn("shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold", on ? "border-fg bg-fg text-ink" : "border-line text-muted hover:text-fg")}
    >
      {children}
    </button>
  );
}
