"use client";

import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CopyPlus, Dumbbell, Pencil, Plus, Power, Trash2 } from "lucide-react";
import * as A from "@/app/coach/rutinas/actions";
import type { WorkoutFormState } from "@/app/coach/rutinas/actions";
import { DAY_NAMES, DAY_SHORT } from "@/lib/nutrition/plan";
import { dayMuscles, WEEK_PHASES, weekInfo, type Exercise, type WorkoutTree } from "@/lib/training/plan";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Dialog } from "@/components/dialog";
import { DayTargets } from "@/components/nutrition/day-targets";
import { ExercisePicker } from "@/components/training/exercise-picker";
import { ExerciseRow, type RowHandlers } from "@/components/training/exercise-row";
import { cn } from "@/lib/cn";

type DialogState = null | "meta" | "dup" | "copyDay" | "copyWeek" | "week" | { swap: string };

export function WorkoutEditor({
  plan,
  exercises: initialExercises,
  client,
  clients,
  initialWeek,
  initialDay,
}: {
  plan: WorkoutTree;
  exercises: Exercise[];
  client: { id: string; name: string } | null;
  clients: { id: string; name: string }[];
  initialWeek: number;
  initialDay: number;
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [week, setWeek] = useState(Math.min(initialWeek, plan.weeks));
  const [day, setDay] = useState(initialDay);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, startBusy] = useTransition();

  useEffect(() => {
    if (week > plan.weeks) setWeek(plan.weeks);
  }, [plan.weeks, week]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.bad ? 5000 : 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const current = plan.days.find((d) => d.week_number === week && d.day_number === day);
  const isTemplate = !plan.client_id;
  const wi = weekInfo(plan, week);

  const run = useCallback(
    (fn: () => Promise<A.ActionResult<unknown>>, okText?: string) =>
      new Promise<boolean>((resolve) =>
        startBusy(async () => {
          const res = await fn();
          if (!res.ok) setToast({ text: res.error, bad: true });
          else if (okText) setToast({ text: okText });
          resolve(res.ok);
        }),
      ),
    [],
  );

  const h: RowHandlers = {
    save: async (rowId, patch) => {
      const res = await A.updatePrescriptionAction(plan.id, rowId, patch);
      if (!res.ok) setToast({ text: res.error, bad: true });
      return res.ok;
    },
    move: (rowId, dir) => run(() => A.moveWorkoutExerciseAction(plan.id, rowId, dir)),
    remove: async (rowId) => void (await run(() => A.deleteWorkoutExerciseAction(plan.id, rowId), "Ejercicio quitado")),
    swap: (rowId) => setDialog({ swap: rowId }),
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href={client ? `/coach/clientes/${client.id}?tab=entrenamiento` : "/coach/rutinas"} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> {client ? client.name : "Rutinas"}
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{isTemplate ? "Plantilla de entrenamiento" : `Rutina · ${client?.name}`}</p>
            <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight">{plan.name}</h1>
          </div>
          {isTemplate ? <Badge>Plantilla</Badge> : plan.is_active ? <Badge tone="ok">Activa</Badge> : <Badge tone="warn">Borrador</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isTemplate && (
            <ConfirmButton
              action={async () => void (await run(() => A.setWorkoutActiveAction(plan.id, !plan.is_active), plan.is_active ? "Rutina desactivada" : "Rutina activada: el cliente ya la ve"))}
              label={<><Power size={15} /> {plan.is_active ? "Desactivar" : "Activar rutina"}</>}
              confirmText={plan.is_active ? "El cliente dejará de ver esta rutina." : "El cliente verá esta rutina y se desactivará la anterior."}
              confirmLabel={plan.is_active ? "Sí, desactivar" : "Sí, activar"}
              tone="neutral"
            />
          )}
          <Button type="button" variant="secondary" size="sm" onClick={() => setDialog("meta")}>
            <Pencil size={15} /> Datos de la rutina
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setDialog("dup")}>
            <CopyPlus size={15} /> Duplicar
          </Button>
        </div>
      </header>

      {/* Semanas (periodización) */}
      <section aria-label="Semanas" className="flex flex-col gap-3">
        {plan.weeks > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
            {Array.from({ length: plan.weeks }, (_, i) => {
              const label = weekInfo(plan, i + 1).label;
              const on = week === i + 1;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setWeek(i + 1)}
                  aria-pressed={on}
                  className={cn("flex shrink-0 flex-col items-start rounded-xl border px-3.5 py-1.5 text-left", on ? "border-fg bg-fg text-ink" : "border-line text-muted hover:text-fg")}
                >
                  <span className="whitespace-nowrap text-[13px] font-semibold">Semana {i + 1}</span>
                  <span className={cn("whitespace-nowrap text-[11px]", on ? "text-ink/70" : "text-faint")}>{label || "—"}</span>
                </button>
              );
            })}
          </div>
        )}
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Semana {week}
              {wi.label ? <span className="text-red"> · {wi.label}</span> : null}
            </p>
            <p className="text-xs text-muted">{wi.notes || "Sin indicaciones para esta semana."}</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setDialog("week")}>
            <Pencil size={14} /> Editar semana
          </Button>
          {plan.weeks > 1 && (
            <Button type="button" variant="secondary" size="sm" disabled={!plan.days.some((d) => d.week_number === week && d.exercises.length)} onClick={() => setDialog("copyWeek")}>
              <CopyPlus size={14} /> Copiar semana a…
            </Button>
          )}
        </Card>
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_SHORT.map((d, i) => {
            const dd = plan.days.find((x) => x.week_number === week && x.day_number === i + 1);
            const n = dd?.exercises.length ?? 0;
            const on = day === i + 1;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDay(i + 1);
                  setAdding(false);
                }}
                aria-pressed={on}
                className={cn("flex min-w-0 flex-col items-center rounded-xl border px-1 py-2 text-xs transition-colors", on ? "border-red bg-red/10 text-fg" : "border-line text-muted hover:border-faint")}
              >
                <span className="font-semibold uppercase tracking-wider">{d}</span>
                <span className={cn("mt-0.5 w-full truncate text-center text-[11px]", n ? "text-fg" : "text-faint")}>{n ? dd?.name || `${n} ejerc.` : "Descanso"}</span>
                <span className="tnum hidden text-[10px] text-faint sm:block">{n ? `${n} ejercicio${n === 1 ? "" : "s"}` : ""}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Día */}
      <section aria-labelledby="wday-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="wday-title" className="font-display text-2xl font-extrabold uppercase tracking-tight">{DAY_NAMES[day - 1]}</h2>
            <label className="sr-only" htmlFor={`wname_${week}_${day}`}>Nombre del día</label>
            <input
              key={`n-${week}-${day}-${current?.name ?? ""}`}
              id={`wname_${week}_${day}`}
              defaultValue={current?.name ?? ""}
              placeholder="Nombre del día (ej. Torso A, Pierna, Empuje)"
              maxLength={80}
              onBlur={(e) => {
                const name = e.target.value;
                if (name !== (current?.name ?? "")) run(() => A.setDayInfoAction(plan.id, week, day, { name }), "Día guardado");
              }}
              className="mt-1 w-full max-w-md border-b border-transparent bg-transparent text-sm text-fg placeholder:text-faint focus:border-line focus:outline-none"
            />
            {current?.exercises.length ? (
              <p className="mt-1 text-xs text-muted">{dayMuscles(current, exMap).join(" · ")}</p>
            ) : null}
          </div>
          <Button type="button" variant="secondary" size="sm" disabled={!current?.exercises.length} onClick={() => setDialog("copyDay")}>
            <CopyPlus size={15} /> Copiar este día a…
          </Button>
        </div>

        <label className="sr-only" htmlFor={`wnotes_${week}_${day}`}>Indicaciones del día</label>
        <textarea
          key={`t-${week}-${day}-${current?.notes ?? ""}`}
          id={`wnotes_${week}_${day}`}
          defaultValue={current?.notes ?? ""}
          rows={1}
          maxLength={1000}
          placeholder="Indicaciones del día (calentamiento, cardio, enfoque)…"
          onBlur={(e) => {
            const notes = e.target.value;
            if (notes !== (current?.notes ?? "")) run(() => A.setDayInfoAction(plan.id, week, day, { notes }), "Indicaciones guardadas");
          }}
          className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-faint focus:outline-none"
        />

        {current?.exercises.length ? (
          <Card className="overflow-visible p-0">
            <ul className="divide-y divide-line">
              {current.exercises.map((row, i) => (
                <ExerciseRow key={row.id} row={row} exercise={exMap.get(row.exercise_id)} index={i} total={current.exercises.length} h={h} busy={busy} />
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="flex flex-col items-center gap-2 px-6 py-8 text-center text-sm text-muted">
            <Dumbbell size={22} className="text-faint" aria-hidden="true" />
            Día de descanso. Agregá ejercicios para convertirlo en día de entrenamiento, o copiá otro día ya armado.
          </Card>
        )}

        {adding ? (
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Agregar ejercicio a {DAY_NAMES[day - 1]}</p>
              <button type="button" onClick={() => setAdding(false)} className="text-xs text-muted hover:text-fg">Cerrar</button>
            </div>
            <ExercisePicker
              idPrefix={`add_${week}_${day}`}
              exercises={exercises}
              onCreated={(ex) => setExercises((l) => (l.some((x) => x.id === ex.id) ? l.map((x) => (x.id === ex.id ? ex : x)) : [...l, ex]))}
              onPick={(ex) => run(() => A.addWorkoutExerciseAction(plan.id, week, day, ex.id), `${ex.name} agregado`)}
            />
          </Card>
        ) : (
          <Button type="button" variant="secondary" className="w-fit" onClick={() => setAdding(true)}>
            <Plus size={16} /> Agregar ejercicio
          </Button>
        )}
      </section>

      {plan.notes && (
        <Card className="p-5">
          <h2 className="eyebrow mb-2">Notas de la rutina para el cliente</h2>
          <p className="whitespace-pre-wrap text-sm">{plan.notes}</p>
        </Card>
      )}

      {/* Diálogos */}
      <Dialog open={dialog === "meta"} onClose={() => setDialog(null)} title="Datos de la rutina">
        <MetaForm plan={plan} isTemplate={isTemplate} onDone={() => { setDialog(null); setToast({ text: "Cambios guardados" }); }} />
      </Dialog>

      <Dialog open={dialog === "dup"} onClose={() => setDialog(null)} title="Duplicar rutina">
        <DuplicateForm
          planName={plan.name}
          clients={clients}
          defaultTarget={client?.id ?? ""}
          onDuplicate={async (target, name) => {
            const res = await A.duplicateWorkoutAction(plan.id, target || null, name);
            if (!res.ok) return res.error;
            setDialog(null);
            router.push(`/coach/rutinas/${res.data}`);
            return null;
          }}
        />
      </Dialog>

      <Dialog open={dialog === "week"} onClose={() => setDialog(null)} title={`Semana ${week}`}>
        {dialog === "week" && (
          <WeekForm
            initial={wi}
            onSave={async (label, notes) => {
              const ok = await run(() => A.setWeekInfoAction(plan.id, week, { label, notes }), "Semana guardada");
              if (ok) setDialog(null);
            }}
          />
        )}
      </Dialog>

      <Dialog open={dialog === "copyWeek"} onClose={() => setDialog(null)} title={`Copiar semana ${week}`} wide>
        {dialog === "copyWeek" && (
          <CopyWeekForm
            weeks={plan.weeks}
            source={week}
            onConfirm={async (targets, prog) => {
              const ok = await run(() => A.copyWeekAction(plan.id, week, targets, prog), `Semana copiada a ${targets.length} semana(s)`);
              if (ok) setDialog(null);
            }}
          />
        )}
      </Dialog>

      <Dialog open={dialog === "copyDay"} onClose={() => setDialog(null)} title={`Copiar ${DAY_NAMES[day - 1]}`} wide>
        <DayTargets
          weeks={plan.weeks}
          source={{ week, day }}
          excludeSource
          confirmLabel="Copiar día"
          note="Los días elegidos se reemplazan por completo con los ejercicios de este día."
          onConfirm={async (targets) => {
            const ok = await run(() => A.copyWorkoutDayAction(plan.id, { week, day }, targets), `Día copiado a ${targets.length} día(s)`);
            if (ok) setDialog(null);
          }}
        />
      </Dialog>

      <Dialog open={typeof dialog === "object" && dialog !== null} onClose={() => setDialog(null)} title="Cambiar ejercicio">
        {typeof dialog === "object" && dialog !== null && (
          <>
            <p className="text-sm text-muted">Se conservan las series, repeticiones, cargas y notas.</p>
            <ExercisePicker
              idPrefix="swap"
              exercises={exercises}
              pickLabel="Elegir"
              onCreated={(ex) => setExercises((l) => (l.some((x) => x.id === ex.id) ? l.map((x) => (x.id === ex.id ? ex : x)) : [...l, ex]))}
              onPick={async (ex) => {
                const ok = await run(() => A.swapWorkoutExerciseAction(plan.id, dialog.swap, ex.id), "Ejercicio cambiado");
                if (ok) setDialog(null);
                return ok;
              }}
            />
          </>
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

function WeekForm({ initial, onSave }: { initial: { label?: string; notes?: string }; onSave: (label: string, notes: string) => Promise<void> }) {
  const [label, setLabel] = useState(initial.label ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); start(() => onSave(label, notes)); }}>
      <Field label="Fase de la periodización" htmlFor="wk_label">
        <Input id="wk_label" list="wk_phases" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="Ej. Acumulación, Descarga" />
        <datalist id="wk_phases">{WEEK_PHASES.map((p) => <option key={p} value={p} />)}</datalist>
      </Field>
      <Field label="Indicaciones de la semana" htmlFor="wk_notes">
        <Textarea id="wk_notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3} placeholder="Ej. Semana de descarga: bajá el peso y mantené la técnica." />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar semana"}</Button>
    </form>
  );
}

function CopyWeekForm({
  weeks,
  source,
  onConfirm,
}: {
  weeks: number;
  source: number;
  onConfirm: (targets: number[], prog: { weight_pct: number; weight_kg: number; rir_delta: number; rpe_delta: number }) => Promise<void>;
}) {
  const others = Array.from({ length: weeks }, (_, i) => i + 1).filter((w) => w !== source);
  const [sel, setSel] = useState<number[]>(others.filter((w) => w > source));
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-muted">Copiar a las semanas</legend>
        <div className="flex flex-wrap gap-2">
          {others.map((w) => {
            const on = sel.includes(w);
            return (
              <button key={w} type="button" aria-pressed={on} onClick={() => setSel((x) => (on ? x.filter((y) => y !== w) : [...x, w].sort((a, b) => a - b)))} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold", on ? "border-red bg-red/10 text-fg" : "border-line text-muted hover:border-faint")}>
                Semana {w}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-faint">Los días de esas semanas se reemplazan por completo con los de la semana {source} (ejercicios, series, repeticiones, pesos y notas).</p>
      </fieldset>
      <p className="rounded-xl border border-line bg-graphite px-4 py-3 text-sm text-muted">
        El avance de cargas lo registra el cliente semana a semana. La app le sugiere cuándo subir peso según lo que hizo la vez anterior.
      </p>
      <Button type="button" disabled={pending || sel.length === 0} onClick={() => start(() => onConfirm(sel, { weight_pct: 0, weight_kg: 0, rir_delta: 0, rpe_delta: 0 }))}>
        {pending ? "Copiando…" : `Copiar a ${sel.length} semana(s)`}
      </Button>
    </div>
  );
}

function MetaForm({ plan, isTemplate, onDone }: { plan: WorkoutTree; isTemplate: boolean; onDone: () => void }) {
  const [state, action, pending] = useActionState<WorkoutFormState, FormData>(A.updateWorkoutMetaAction.bind(null, plan.id), {});
  const [weeks, setWeeks] = useState(String(plan.weeks));
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, state.savedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = state.values;
  return (
    <form key={state.savedAt ?? "init"} action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Nombre" htmlFor="wm_name" error={state.fields?.name}>
        <Input id="wm_name" name="name" defaultValue={v?.name ?? plan.name} required maxLength={120} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Semanas" htmlFor="wm_weeks" error={state.fields?.weeks}>
          <Select id="wm_weeks" name="weeks" value={weeks} onChange={(e) => setWeeks(e.target.value)} className="w-full">
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1} {i === 0 ? "semana" : "semanas"}</option>)}
          </Select>
        </Field>
        {!isTemplate && (
          <Field label="Inicio" htmlFor="wm_start" error={state.fields?.start_date}>
            <Input id="wm_start" name="start_date" type="date" defaultValue={v?.start_date ?? plan.start_date ?? ""} />
          </Field>
        )}
      </div>
      {Number(weeks) < plan.weeks && (
        <p role="alert" className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          Se van a borrar las semanas {Number(weeks) + 1} a {plan.weeks} con sus ejercicios.
        </p>
      )}
      <Field label="Notas para el cliente" htmlFor="wm_notes" error={state.fields?.notes}>
        <Textarea id="wm_notes" name="notes" defaultValue={v?.notes ?? plan.notes ?? ""} placeholder="Calentamiento general, cómo registrar las cargas, a quién avisar si hay dolor…" maxLength={5000} />
      </Field>
      {state.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
      <DeleteWorkout planId={plan.id} planName={plan.name} />
    </form>
  );
}

/** Zona de peligro: borrar la rutina COMPLETA, escribiendo ELIMINAR. Los registros de cargas del cliente se conservan. */
function DeleteWorkout({ planId, planName }: { planId: string; planName: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 inline-flex items-center justify-center gap-1.5 border-t border-line pt-4 text-sm text-bad hover:underline">
        <Trash2 size={14} /> Eliminar esta rutina completa
      </button>
    );
  }
  return (
    <div className="mt-2 flex flex-col gap-3 rounded-xl border border-bad/40 bg-bad/10 p-4 text-sm">
      <p className="font-semibold text-bad">¿Eliminar &quot;{planName}&quot; por completo?</p>
      <p className="text-muted">Se borran todas sus semanas, días y ejercicios. Los registros de cargas que hizo el cliente se conservan. <strong className="text-fg">No se puede deshacer.</strong></p>
      <label htmlFor="wdel_confirm" className="text-muted">Escribí <strong className="text-fg">ELIMINAR</strong> para confirmar:</label>
      <Input id="wdel_confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending || text.trim().toUpperCase() !== "ELIMINAR"} onClick={() => start(async () => void (await A.deleteWorkoutAction(planId)))}>
          {pending ? "Eliminando…" : "Eliminar rutina"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => { setOpen(false); setText(""); }}>Cancelar</Button>
      </div>
    </div>
  );
}

function DuplicateForm({ planName, clients, defaultTarget, onDuplicate }: { planName: string; clients: { id: string; name: string }[]; defaultTarget: string; onDuplicate: (target: string, name: string) => Promise<string | null> }) {
  const [target, setTarget] = useState(defaultTarget);
  const [name, setName] = useState(`${planName} (copia)`);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); start(async () => setError(await onDuplicate(target, name))); }}>
      <Field label="Destino" htmlFor="wdup_target">
        <Select id="wdup_target" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full">
          <option value="">Guardar como plantilla</option>
          {clients.map((c) => <option key={c.id} value={c.id}>Cliente: {c.name}</option>)}
        </Select>
      </Field>
      <Field label="Nombre de la copia" htmlFor="wdup_name">
        <Input id="wdup_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
      </Field>
      <p className="text-xs text-faint">La copia queda como borrador: el cliente no la ve hasta que la actives.</p>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Copiando…" : "Duplicar"}</Button>
    </form>
  );
}
