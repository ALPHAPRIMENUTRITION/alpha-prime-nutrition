"use client";

import { useState, useTransition } from "react";
import { Check, History, Lightbulb, MessageSquare, Plus, Trash2, X } from "lucide-react";
import { deleteSetAction, saveSetAction } from "@/app/portal/entrenamiento/actions";
import { cardioLine, isCardio, LOAD_UNIT, prescriptionLine, suggestNext, type Exercise, type LogRow, type Suggestion, type WExercise } from "@/lib/training/plan";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const fmt = (n: number | null) => (n == null ? "" : Number.isInteger(n) ? String(n) : String(n));

/** Registro de una sesión: por cada ejercicio, sus series con peso, reps, RIR/RPE y comentario. */
export function SessionLogger({
  rows,
  exercises,
  logs,
  previous,
  date,
  canLog,
}: {
  rows: WExercise[];
  exercises: Exercise[];
  /** Registros de ESTA fecha */
  logs: LogRow[];
  /** Última sesión anterior por ejercicio (exercise_id) */
  previous: Record<string, { date: string; sets: LogRow[] }>;
  date: string;
  canLog: boolean;
}) {
  const exMap = new Map(exercises.map((e) => [e.id, e]));
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, i) => (
        <ExerciseLog
          key={row.id}
          index={i}
          row={row}
          exercise={exMap.get(row.exercise_id)}
          logs={logs.filter((l) => l.workout_exercise_id === row.id).sort((a, b) => a.set_number - b.set_number)}
          prev={previous[row.exercise_id]}
          date={date}
          canLog={canLog}
        />
      ))}
    </div>
  );
}

function ExerciseLog(props: { index: number; row: WExercise; exercise: Exercise | undefined; logs: LogRow[]; prev?: { date: string; sets: LogRow[] }; date: string; canLog: boolean }) {
  return isCardio(props.exercise) ? <CardioLog {...props} /> : <StrengthLog {...props} />;
}

/** Cardio: un solo registro con los minutos que hizo (y comentario opcional). */
function CardioLog({ index, row, exercise, logs, prev, date, canLog }: { index: number; row: WExercise; exercise: Exercise | undefined; logs: LogRow[]; prev?: { date: string; sets: LogRow[] }; date: string; canLog: boolean }) {
  const log = logs[0];
  const [min, setMin] = useState(fmt(log?.duration_min ?? null));
  const [comment, setComment] = useState(log?.comment ?? "");
  const [saved, setSaved] = useState<string | null>(log?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ph = fmt(row.duration_min);
  const prevMin = prev?.sets.reduce((s, x) => s + (x.duration_min ?? 0), 0) ?? 0;
  const isDone = Boolean(saved) && !dirty;
  const name = exercise?.name ?? "cardio";

  function save() {
    setErr(null);
    const value = min || ph;
    start(async () => {
      const res = await saveSetAction(row.id, date, 1, { duration_min: value, comment, weight_kg: "", reps: "", rir: "", rpe: "" });
      if (!res.ok) return setErr(res.error);
      setMin(value);
      setSaved(res.id);
      setDirty(false);
    });
  }

  function unmark() {
    if (!saved) return;
    setErr(null);
    // Sin confirmación: se borra el registro pero quedan los datos escritos para volver a marcar.
    start(async () => {
      const res = await deleteSetAction(saved);
      if (!res.ok) return setErr(res.error ?? "No se pudo desmarcar.");
      setSaved(null);
    });
  }

  const input = "tnum h-10 w-full min-w-0 rounded-lg border border-line bg-ink px-2 text-center text-base text-fg placeholder:text-faint focus:border-faint focus:outline-none disabled:opacity-60";
  return (
    <article className="overflow-hidden rounded-card border border-line bg-panel">
      <header className="flex items-start gap-3 border-b border-line px-4 py-3">
        <span className="tnum mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-panel-2 text-xs font-bold text-muted">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight">{name}</h3>
          <p className="tnum mt-0.5 text-sm text-muted">{cardioLine(row) || "Sin prescripción"}</p>
          {row.notes && <p className="mt-1 text-xs text-faint">{row.notes}</p>}
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", isDone ? "bg-ok/15 text-ok" : "bg-panel-2 text-muted")}>{isDone ? "Hecho" : "Pendiente"}</span>
      </header>
      {prev && prevMin > 0 && (
        <p className="flex items-start gap-1.5 border-b border-line bg-graphite px-4 py-2 text-xs text-muted">
          <History size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>La vez pasada ({formatDate(prev.date)}): <span className="tnum text-fg">{fmt(prevMin)} min</span></span>
        </p>
      )}
      <div className={cn("flex flex-col gap-2 px-4 py-3", isDone && "bg-ok/5")}>
        <div className="grid grid-cols-[6rem_1fr_2.5rem] items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">Minutos</span>
            <input aria-label={`Minutos de ${name}`} inputMode="decimal" value={min} onChange={(e) => { setMin(e.target.value); setDirty(true); }} placeholder={ph || "min"} disabled={!canLog} className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">Comentario</span>
            <input aria-label={`Comentario de ${name}`} value={comment} onChange={(e) => { setComment(e.target.value); setDirty(true); }} maxLength={500} placeholder="Ej. velocidad, inclinación, cómo te sentiste" disabled={!canLog} className={cn(input, "px-3 text-left text-sm")} />
          </label>
          <button
            type="button"
            onClick={isDone ? unmark : save}
            disabled={!canLog || pending}
            aria-label={isDone ? `Desmarcar ${name}` : `Guardar ${name}`}
            title={isDone ? "Tocá para desmarcar" : "Marcar como hecho"}
            className={cn("grid h-10 w-10 place-items-center rounded-lg border", isDone ? "border-ok/40 bg-ok/15 text-ok" : "border-red bg-red text-white hover:bg-red-hover", "disabled:cursor-default")}
          >
            <Check size={18} strokeWidth={2.5} />
          </button>
        </div>
        {err && <p role="alert" className="text-xs text-bad">{err}</p>}
      </div>
    </article>
  );
}

function StrengthLog({ index, row, exercise, logs, prev, date, canLog }: { index: number; row: WExercise; exercise: Exercise | undefined; logs: LogRow[]; prev?: { date: string; sets: LogRow[] }; date: string; canLog: boolean }) {
  const planned = Math.max(row.sets ?? 3, logs.reduce((m, l) => Math.max(m, l.set_number), 0));
  const [count, setCount] = useState(planned);
  const useRpe = row.rpe != null && row.rir == null;
  const done = logs.length;
  const suggestion = suggestNext(row, prev?.sets ?? []);

  return (
    <article className="overflow-hidden rounded-card border border-line bg-panel">
      <header className="flex items-start gap-3 border-b border-line px-4 py-3">
        <span className="tnum mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-panel-2 text-xs font-bold text-muted">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight">{exercise?.name ?? "Ejercicio"}</h3>
          <p className="tnum mt-0.5 text-sm text-muted">{prescriptionLine(row) || "Sin prescripción"}</p>
          {row.notes && <p className="mt-1 text-xs text-faint">{row.notes}</p>}
          {exercise?.notes && <p className="mt-1 text-xs text-faint">Técnica: {exercise.notes}</p>}
        </div>
        <span className={cn("tnum shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", done >= (row.sets ?? 1) ? "bg-ok/15 text-ok" : "bg-panel-2 text-muted")}>
          {done}/{row.sets ?? "–"}
        </span>
      </header>

      {prev && (
        <p className="flex items-start gap-1.5 border-b border-line bg-graphite px-4 py-2 text-xs text-muted">
          <History size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            La vez pasada ({formatDate(prev.date)}):{" "}
            <span className="tnum text-fg">{prev.sets.map((s) => `${fmt(s.weight_kg) || "–"}×${s.reps ?? "–"}`).join(" · ")}</span>
          </span>
        </p>
      )}
      {suggestion && (
        <p className="flex items-start gap-1.5 border-b border-line px-4 py-2 text-xs text-muted">
          <Lightbulb size={13} className={cn("mt-0.5 shrink-0", suggestion.kind === "up" ? "text-ok" : "text-warn")} aria-hidden="true" />
          <span>
            <span className="font-semibold text-fg">Sugerencia: </span>
            {suggestion.note}
          </span>
        </p>
      )}

      <div className="flex flex-col divide-y divide-line">
        <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem_2.5rem] items-center gap-2 px-4 pt-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
          <span>Serie</span>
          <span>{LOAD_UNIT === "lb" ? "Lb" : "Kg"}</span>
          <span>Reps</span>
          <span>{useRpe ? "RPE" : "RIR"}</span>
          <span className="sr-only">Comentario</span>
          <span className="sr-only">Guardar</span>
        </div>
        {Array.from({ length: count }, (_, k) => (
          <SetRow
            key={k}
            n={k + 1}
            row={row}
            exerciseName={exercise?.name ?? "ejercicio"}
            log={logs.find((l) => l.set_number === k + 1)}
            prevSet={prev?.sets.find((s) => s.set_number === k + 1)}
            suggestion={suggestion}
            useRpe={useRpe}
            date={date}
            canLog={canLog}
            onRemove={canLog && k + 1 === count && k + 1 > (row.sets ?? 3) ? () => setCount((c) => c - 1) : undefined}
          />
        ))}
      </div>
      {canLog && count < 20 && (
        <button type="button" onClick={() => setCount((c) => c + 1)} className="flex w-full items-center justify-center gap-1.5 border-t border-line py-2.5 text-sm font-semibold text-muted hover:text-fg">
          <Plus size={15} /> Serie extra
        </button>
      )}
    </article>
  );
}

function SetRow({ n, row, exerciseName, log, prevSet, suggestion, useRpe, date, canLog, onRemove }: { n: number; row: WExercise; exerciseName: string; log?: LogRow; prevSet?: LogRow; suggestion: Suggestion | null; useRpe: boolean; date: string; canLog: boolean; onRemove?: () => void }) {
  const [v, setV] = useState({
    weight_kg: fmt(log?.weight_kg ?? null),
    reps: log?.reps != null ? String(log.reps) : "",
    effort: fmt((useRpe ? log?.rpe : log?.rir) ?? null),
    comment: log?.comment ?? "",
  });
  const [showComment, setShowComment] = useState(Boolean(log?.comment));
  const [saved, setSaved] = useState<string | null>(log?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
    setDirty(true);
  };
  // Sugerencias en gris: lo que sugiere la app según la vez pasada, o lo indicado por el coach
  const phWeight = suggestion?.weight != null ? fmt(suggestion.weight) : row.weight_kg != null ? fmt(row.weight_kg) : fmt(prevSet?.weight_kg ?? null);
  const phReps = row.reps ?? (prevSet?.reps != null ? String(prevSet.reps) : "");
  const phEffort = fmt((useRpe ? row.rpe : row.rir) ?? null);

  /** Lo que se ve es lo que se guarda: si un campo está vacío, se usa la sugerencia (gris). */
  function save() {
    setErr(null);
    const final = {
      weight_kg: v.weight_kg || phWeight,
      reps: v.reps || (/^\d+$/.test(phReps) ? phReps : ""),
      effort: v.effort || phEffort,
      comment: v.comment,
    };
    start(async () => {
      const res = await saveSetAction(row.id, date, n, {
        weight_kg: final.weight_kg,
        reps: final.reps,
        rir: useRpe ? "" : final.effort,
        rpe: useRpe ? final.effort : "",
        comment: final.comment,
      });
      if (!res.ok) return setErr(res.error);
      setV(final);
      setSaved(res.id);
      setDirty(false);
    });
  }

  /** Desmarca una serie ya guardada (por si la marcó por error). */
  function unmark() {
    if (!saved) return;
    setErr(null);
    // Sin confirmación: se borra el registro pero quedan los datos escritos para volver a marcar.
    start(async () => {
      const res = await deleteSetAction(saved);
      if (!res.ok) return setErr(res.error ?? "No se pudo desmarcar.");
      setSaved(null);
      setDirty(false);
    });
  }

  const input = "tnum h-10 w-full min-w-0 rounded-lg border border-line bg-ink px-2 text-center text-base text-fg placeholder:text-faint focus:border-faint focus:outline-none disabled:opacity-60";
  const isDone = Boolean(saved) && !dirty;

  return (
    <div className={cn("px-4 py-2", isDone && "bg-ok/5")}>
      <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem_2.5rem] items-center gap-2">
        {onRemove && !saved ? (
          <button type="button" onClick={onRemove} aria-label={`Quitar serie extra ${n}`} title="Quitar esta serie" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-panel-2 hover:text-bad">
            <X size={15} />
          </button>
        ) : (
          <span className={cn("tnum text-sm font-bold", isDone ? "text-ok" : "text-muted")}>{n}</span>
        )}
        <input aria-label={`Lb serie ${n} de ${exerciseName}`} inputMode="decimal" value={v.weight_kg} onChange={set("weight_kg")} placeholder={phWeight || LOAD_UNIT} disabled={!canLog} className={input} />
        <input aria-label={`Repeticiones serie ${n} de ${exerciseName}`} inputMode="numeric" value={v.reps} onChange={set("reps")} placeholder={phReps || "reps"} disabled={!canLog} className={input} />
        <input aria-label={`${useRpe ? "RPE" : "RIR"} serie ${n} de ${exerciseName}`} inputMode="decimal" value={v.effort} onChange={set("effort")} placeholder={phEffort || "–"} disabled={!canLog} className={input} />
        <button type="button" onClick={() => setShowComment((x) => !x)} disabled={!canLog} aria-label={`Comentario serie ${n}`} aria-expanded={showComment} className={cn("grid h-10 w-10 place-items-center rounded-lg", v.comment ? "text-fg" : "text-faint hover:text-fg")}>
          <MessageSquare size={16} />
        </button>
        <button
          type="button"
          onClick={isDone ? unmark : save}
          disabled={!canLog || pending}
          aria-label={isDone ? `Desmarcar serie ${n} de ${exerciseName}` : `Guardar serie ${n} de ${exerciseName}`}
          title={isDone ? "Tocá para desmarcar" : "Marcar como hecha"}
          className={cn("grid h-10 w-10 place-items-center rounded-lg border", isDone ? "border-ok/40 bg-ok/15 text-ok" : "border-red bg-red text-white hover:bg-red-hover", "disabled:cursor-default")}
        >
          <Check size={18} strokeWidth={2.5} />
        </button>
      </div>
      {showComment && (
        <div className="mt-2 flex items-center gap-2 pl-10">
          <input aria-label={`Comentario serie ${n} de ${exerciseName}`} value={v.comment} onChange={set("comment")} maxLength={500} placeholder="Ej. molestia en el hombro, subir peso…" className="h-9 w-full rounded-lg border border-line bg-ink px-3 text-sm text-fg placeholder:text-faint focus:border-faint focus:outline-none" />
          {saved && (
            <button
              type="button"
              aria-label={`Borrar serie ${n}`}
              onClick={() => {
                if (!confirm(`¿Borrar el registro de la serie ${n}?`)) return;
                start(async () => {
                  const res = await deleteSetAction(saved);
                  if (!res.ok) return setErr(res.error ?? "No se pudo borrar.");
                  setSaved(null);
                  setV({ weight_kg: "", reps: "", effort: "", comment: "" });
                  setShowComment(false);
                });
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-faint hover:text-bad"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
      {err && <p role="alert" className="mt-1 pl-10 text-xs text-bad">{err}</p>}
    </div>
  );
}
