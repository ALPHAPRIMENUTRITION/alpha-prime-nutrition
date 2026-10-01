"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteExerciseAction } from "@/app/coach/rutinas/actions";
import { normalize } from "@/lib/nutrition/plan";
import { MUSCLE_GROUPS, type Exercise } from "@/lib/training/plan";
import { Button, Card, Input } from "@/components/ui";
import { ExerciseForm } from "@/components/training/exercise-form";
import { cn } from "@/lib/cn";

/** Catálogo de ejercicios: base (solo lectura) + propios del coach (crear, editar, borrar). */
export function ExerciseCatalog({ initial }: { initial: Exercise[] }) {
  const [list, setList] = useState(initial);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [editing, setEditing] = useState<null | "new" | string>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const t = normalize(q);
    return list
      .filter((e) => (!group || e.muscle_group === group) && (!onlyMine || e.coach_id) && (!t || normalize(e.name).includes(t) || normalize(e.equipment ?? "").includes(t)))
      .sort((a, b) => (a.muscle_group ?? "~").localeCompare(b.muscle_group ?? "~") || a.name.localeCompare(b.name));
  }, [list, q, group, onlyMine]);

  return (
    <div className="flex flex-col gap-4">
      {editing === "new" ? (
        <Card className="p-5">
          <p className="mb-3 font-semibold">Nuevo ejercicio</p>
          <ExerciseForm
            idPrefix="new"
            initial={{ name: q, muscle_group: group ?? "" }}
            onSaved={(ex) => { setList((l) => [...l, ex]); setEditing(null); setMsg({ text: `"${ex.name}" creado` }); }}
            onCancel={() => setEditing(null)}
          />
        </Card>
      ) : (
        <Button type="button" className="w-fit" onClick={() => setEditing("new")}><Plus size={16} /> Nuevo ejercicio</Button>
      )}
      {msg && <p role="status" className={cn("text-sm", msg.bad ? "text-bad" : "text-ok")}>{msg.text}</p>}

      <div className="flex flex-col gap-3">
        <label className="relative block max-w-md">
          <span className="sr-only">Buscar ejercicio</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio o equipo" className="pl-10" />
        </label>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Chip on={onlyMine} onClick={() => setOnlyMine((x) => !x)}>Solo míos</Chip>
          <Chip on={!group} onClick={() => setGroup(null)}>Todos</Chip>
          {MUSCLE_GROUPS.map((g) => <Chip key={g} on={group === g} onClick={() => setGroup(group === g ? null : g)}>{g}</Chip>)}
        </div>
      </div>

      <Card className="p-0">
        <ul>
          {filtered.map((e) => (
            <li key={e.id} className="border-b border-line px-4 py-3 last:border-0">
              {editing === e.id ? (
                <ExerciseForm
                  idPrefix={`ed_${e.id}`}
                  exerciseId={e.id}
                  initial={e}
                  onSaved={(ex) => { setList((l) => l.map((x) => (x.id === ex.id ? ex : x))); setEditing(null); setMsg({ text: "Cambios guardados" }); }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{e.name}</p>
                    <p className="text-xs text-muted">
                      {[e.muscle_group, e.equipment].filter(Boolean).join(" · ") || "Sin grupo"} · {e.coach_id ? <span className="text-red">propio</span> : "base"}
                    </p>
                    {e.notes && <p className="mt-0.5 text-xs text-faint">{e.notes}</p>}
                  </div>
                  {e.coach_id && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => setEditing(e.id)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg" aria-label={`Editar ${e.name}`}><Pencil size={15} /></button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`¿Borrar "${e.name}" del catálogo?`)) return;
                          start(async () => {
                            const res = await deleteExerciseAction(e.id);
                            if (!res.ok) return setMsg({ text: res.error, bad: true });
                            setList((l) => l.filter((x) => x.id !== e.id));
                            setMsg({ text: `"${e.name}" borrado` });
                          });
                        }}
                        className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-bad"
                        aria-label={`Borrar ${e.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
          {filtered.length === 0 && <li className="px-4 py-8 text-center text-sm text-faint">Sin resultados.</li>}
        </ul>
      </Card>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn("shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold", on ? "border-fg bg-fg text-ink" : "border-line text-muted hover:text-fg")}>
      {children}
    </button>
  );
}
