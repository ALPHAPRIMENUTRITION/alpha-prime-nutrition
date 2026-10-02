"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, MoreHorizontal, Repeat, StickyNote, Trash2 } from "lucide-react";
import { isCardio, type Exercise, type WExercise } from "@/lib/training/plan";
import { cn } from "@/lib/cn";

export interface RowHandlers {
  save: (rowId: string, patch: Record<string, unknown>) => Promise<boolean>;
  move: (rowId: string, dir: -1 | 1) => Promise<boolean>;
  remove: (rowId: string) => Promise<void>;
  swap: (rowId: string) => void;
}

/** "90" → 90 · "1:30" → 90 · "" → null */
export function parseRest(v: string): number | null | "invalid" {
  const s = v.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):([0-5]\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  if (/^\d{1,4}$/.test(s)) return Number(s);
  return "invalid";
}
export const restText = (sec: number | null) => (sec == null ? "" : sec >= 60 && sec % 60 !== 0 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : sec >= 60 ? `${sec / 60}:00` : String(sec));

const str = (v: number | string | null) => (v == null ? "" : String(v));

type FieldKey = "sets" | "reps" | "weight_kg" | "rir" | "rpe" | "rest_seconds" | "tempo" | "duration_min" | "intensity";
const FIELDS: { k: FieldKey; label: string; hint: string; mode: "numeric" | "decimal" | "text"; w: string }[] = [
  { k: "sets", label: "Series", hint: "—", mode: "numeric", w: "w-14" },
  { k: "reps", label: "Reps", hint: "—", mode: "text", w: "w-16" },
  { k: "weight_kg", label: "Lb", hint: "—", mode: "decimal", w: "w-16" },
  { k: "rir", label: "RIR", hint: "—", mode: "decimal", w: "w-12" },
  { k: "rpe", label: "RPE", hint: "—", mode: "decimal", w: "w-12" },
  { k: "rest_seconds", label: "Descanso", hint: "seg", mode: "text", w: "w-16" },
  { k: "tempo", label: "Tempo", hint: "—", mode: "text", w: "w-16" },
];
// Cardio: se pauta por tiempo
const CARDIO_FIELDS: typeof FIELDS = [
  { k: "duration_min", label: "Minutos", hint: "30", mode: "decimal", w: "w-20" },
  { k: "intensity", label: "Intensidad", hint: "Ej. zona 2 · 5.5 km/h · 10 %", mode: "text", w: "w-64 max-w-full" },
  { k: "rpe", label: "RPE", hint: "—", mode: "decimal", w: "w-12" },
];

export function ExerciseRow({ row, exercise, index, total, h, busy }: { row: WExercise; exercise: Exercise | undefined; index: number; total: number; h: RowHandlers; busy: boolean }) {
  const init = () => ({
    sets: str(row.sets),
    reps: str(row.reps),
    weight_kg: str(row.weight_kg),
    rir: str(row.rir),
    rpe: str(row.rpe),
    rest_seconds: restText(row.rest_seconds),
    tempo: str(row.tempo),
    notes: str(row.notes),
    duration_min: str(row.duration_min),
    intensity: str(row.intensity),
  });
  const [v, setV] = useState(init);
  const [err, setErr] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(Boolean(row.notes));
  // Si llegan datos nuevos del servidor (copiar semana, etc.), actualizar.
  const sig = JSON.stringify([row.sets, row.reps, row.weight_kg, row.rir, row.rpe, row.rest_seconds, row.tempo, row.notes, row.duration_min, row.intensity]);
  const fields = isCardio(exercise) ? CARDIO_FIELDS : FIELDS;
  useEffect(() => setV(init()), [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  async function commit(k: FieldKey | "notes") {
    const raw = v[k];
    const before = k === "rest_seconds" ? restText(row.rest_seconds) : str(row[k as keyof WExercise] as number | string | null);
    if (raw.trim() === before) return;
    let value: unknown = raw;
    if (k === "rest_seconds") {
      const r = parseRest(raw);
      if (r === "invalid") return setErr("Descanso: escribí segundos (90) o minutos (1:30).");
      value = r;
    }
    const ok = await h.save(row.id, { [k]: value });
    setErr(ok ? null : "No se pudo guardar.");
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="tnum mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-panel-2 text-xs font-bold text-muted">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{exercise?.name ?? "Ejercicio no disponible"}</p>
          <p className="text-xs text-muted">{[exercise?.muscle_group, exercise?.equipment].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="relative flex shrink-0 items-center">
          <button type="button" onClick={() => setShowNotes((x) => !x)} className={cn("grid h-8 w-8 place-items-center rounded-full hover:bg-panel-2", row.notes ? "text-fg" : "text-muted")} aria-label="Notas del ejercicio" title="Notas">
            <StickyNote size={15} />
          </button>
          <button type="button" onClick={() => setMenu((x) => !x)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg" aria-label={`Más acciones de ${exercise?.name ?? "ejercicio"}`} aria-expanded={menu}>
            <MoreHorizontal size={16} />
          </button>
          {menu && (
            <div className="absolute right-0 top-9 z-20 flex w-52 flex-col rounded-xl border border-line bg-panel-2 p-1 shadow-xl" onMouseLeave={() => setMenu(false)}>
              <MenuBtn icon={ArrowUp} label="Subir" disabled={busy || index === 0} onClick={() => { setMenu(false); h.move(row.id, -1); }} />
              <MenuBtn icon={ArrowDown} label="Bajar" disabled={busy || index === total - 1} onClick={() => { setMenu(false); h.move(row.id, 1); }} />
              <MenuBtn icon={Repeat} label="Cambiar ejercicio" disabled={busy} onClick={() => { setMenu(false); h.swap(row.id); }} />
              <MenuBtn
                icon={Trash2}
                label="Quitar del día"
                danger
                disabled={busy}
                onClick={() => {
                  setMenu(false);
                  if (confirm(`¿Quitar "${exercise?.name ?? "este ejercicio"}" de este día?`)) h.remove(row.id);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-2 pl-9">
        {fields.map((f) => (
          <label key={f.k} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">{f.label}</span>
            <input
              aria-label={`${f.label} de ${exercise?.name ?? "ejercicio"}`}
              inputMode={f.mode === "text" ? undefined : f.mode}
              value={v[f.k]}
              placeholder={f.hint}
              maxLength={f.k === "reps" ? 20 : f.k === "tempo" ? 12 : f.k === "intensity" ? 60 : 8}
              onChange={(e) => setV((x) => ({ ...x, [f.k]: e.target.value }))}
              onBlur={() => commit(f.k)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className={cn("tnum h-9 rounded-lg border border-line bg-ink px-2 text-center text-sm text-fg placeholder:text-faint focus:border-faint focus:outline-none", f.w, f.k === "intensity" && "px-3 text-left")}
            />
          </label>
        ))}
      </div>
      {showNotes && (
        <div className="mt-2 pl-9">
          <label className="sr-only" htmlFor={`wn_${row.id}`}>Notas</label>
          <textarea
            id={`wn_${row.id}`}
            value={v.notes}
            maxLength={500}
            rows={2}
            onChange={(e) => setV((x) => ({ ...x, notes: e.target.value }))}
            onBlur={() => commit("notes")}
            placeholder="Indicaciones para el cliente: técnica, variante, superserie…"
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-faint focus:outline-none"
          />
        </div>
      )}
      {err && <p role="alert" className="mt-1 pl-9 text-xs text-bad">{err}</p>}
    </li>
  );
}

function MenuBtn({ icon: Icon, label, onClick, disabled, danger }: { icon: typeof ArrowUp; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-panel disabled:opacity-40", danger && "text-bad")}>
      <Icon size={15} /> {label}
    </button>
  );
}
