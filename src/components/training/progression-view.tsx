"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { e1rm, isCardio, LOAD_UNIT, weekStart, type Exercise, type LogRow } from "@/lib/training/plan";
import { formatDate } from "@/lib/format";
import { LineChart } from "@/components/charts/line-chart";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";

type Metric = "top" | "e1rm" | "volume";
const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: "top", label: "Peso máximo", unit: LOAD_UNIT },
  { id: "e1rm", label: "1RM estimado", unit: LOAD_UNIT },
  { id: "volume", label: "Volumen", unit: LOAD_UNIT },
];

const r1 = (n: number) => Math.round(n * 10) / 10;
const fmtN = (n: number | null) => (n == null ? "–" : Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Historial de progresión por ejercicio: gráfica + sesiones. */
export function ProgressionView({ logs, exercises, empty }: { logs: LogRow[]; exercises: Exercise[]; empty: string }) {
  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const byExercise = useMemo(() => {
    const m = new Map<string, LogRow[]>();
    for (const l of logs) m.set(l.exercise_id, [...(m.get(l.exercise_id) ?? []), l]);
    return [...m.entries()]
      .map(([id, rows]) => ({ id, rows, last: rows.reduce((a, r) => (r.performed_at > a ? r.performed_at : a), ""), dates: new Set(rows.map((r) => r.performed_at)).size }))
      .sort((a, b) => b.last.localeCompare(a.last));
  }, [logs]);
  const [sel, setSel] = useState<string | null>(byExercise[0]?.id ?? null);
  const [metric, setMetric] = useState<Metric>("e1rm");

  const sessions = useMemo(() => {
    const rows = byExercise.find((x) => x.id === sel)?.rows ?? [];
    const m = new Map<string, LogRow[]>();
    for (const r of rows) m.set(r.performed_at, [...(m.get(r.performed_at) ?? []), r]);
    return [...m.entries()]
      .map(([date, sets]) => {
        const s = [...sets].sort((a, b) => a.set_number - b.set_number);
        const top = Math.max(0, ...s.map((x) => x.weight_kg ?? 0));
        const best = Math.max(0, ...s.map((x) => e1rm(x.weight_kg ?? 0, x.reps ?? 0)));
        const volume = s.reduce((acc, x) => acc + (x.weight_kg ?? 0) * (x.reps ?? 0), 0);
        return { date, sets: s, top, best, volume };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [byExercise, sel]);

  // Resumen por semana (lunes a domingo): con qué peso empezó y su mejor marca.
  const weeks = useMemo(() => {
    const m = new Map<string, typeof sessions>();
    for (const ss of sessions) {
      const k = weekStart(ss.date);
      m.set(k, [...(m.get(k) ?? []), ss]);
    }
    const list = [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([start, ss]) => {
        const first = ss[0]!;
        const firstSet = first.sets.find((x) => x.weight_kg != null);
        const best = ss.reduce((a, x) => (x.best > a.best ? x : a), ss[0]!);
        const bestSet = best.sets.reduce((a, x) => (e1rm(x.weight_kg ?? 0, x.reps ?? 0) > e1rm(a.weight_kg ?? 0, a.reps ?? 0) ? x : a), best.sets[0]!);
        return { start, sessions: ss.length, startW: firstSet?.weight_kg ?? null, startReps: firstSet?.reps ?? null, top: Math.max(...ss.map((x) => x.top)), bestSet, best: best.best };
      });
    return list.map((w, i) => ({ ...w, diff: i ? r1(w.top - list[i - 1]!.top) : null }));
  }, [sessions]);

  if (!byExercise.length) return <Card className="px-6 py-8 text-center text-sm text-muted">{empty}</Card>;

  const cardio = isCardio(exMap.get(sel ?? ""));
  const m = METRICS.find((x) => x.id === metric)!;
  const series = sessions.map((s) => ({ date: s.date, value: r1(metric === "top" ? s.top : metric === "e1rm" ? s.best : s.volume) })).filter((p) => p.value > 0);
  const first = series[0]?.value;
  const last = series[series.length - 1]?.value;
  const change = first && last ? r1(last - first) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="prog_ex" className="text-sm font-medium text-muted">Ejercicio</label>
        <select
          id="prog_ex"
          value={sel ?? ""}
          onChange={(e) => setSel(e.target.value)}
          className="h-11 w-full max-w-md rounded-xl border border-line bg-panel px-3 text-sm text-fg"
        >
          {byExercise.map((x) => (
            <option key={x.id} value={x.id}>
              {exMap.get(x.id)?.name ?? "Ejercicio"} · {x.dates} {x.dates === 1 ? "sesión" : "sesiones"}
            </option>
          ))}
        </select>
      </div>

      {cardio ? (
        <Card className="flex flex-col gap-4 p-5">
          <p className="text-sm font-semibold">Minutos por sesión</p>
          <LineChart
            data={sessions.map((s) => ({ date: s.date, value: r1(s.sets.reduce((acc, x) => acc + (x.duration_min ?? 0), 0)) })).filter((p) => p.value > 0)}
            unit="min"
            label={`Minutos de ${exMap.get(sel ?? "")?.name ?? "cardio"}`}
          />
        </Card>
      ) : (
      <>
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-line p-1" role="group" aria-label="Métrica">
            {METRICS.map((x) => (
              <button key={x.id} type="button" aria-pressed={metric === x.id} onClick={() => setMetric(x.id)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", metric === x.id ? "bg-fg text-ink" : "text-muted hover:text-fg")}>
                {x.label}
              </button>
            ))}
          </div>
          {change != null && series.length > 1 && (
            <p className={cn("tnum text-sm font-semibold", change > 0 ? "text-ok" : "text-muted")}>
              {change > 0 ? "+" : ""}{change.toLocaleString("es-SV")} {m.unit} desde {formatDate(series[0]!.date)}
            </p>
          )}
        </div>
        <LineChart data={series} unit={m.unit} label={`${m.label} de ${exMap.get(sel ?? "")?.name ?? "ejercicio"}`} />
        {metric === "e1rm" && <p className="text-xs text-faint">1RM estimado con la fórmula de Epley a partir de la mejor serie. Es orientativo.</p>}
      </Card>

      {weeks.length > 0 && (
        <Card className="p-0">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Avance por semana</p>
            <p className="text-xs text-faint">Subir o bajar entre semanas es normal (fatiga, descarga, técnica). Lo importante es la tendencia.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                  <th scope="col" className="px-4 py-2">Semana</th>
                  <th scope="col" className="px-2 py-2">Empezó con</th>
                  <th scope="col" className="px-2 py-2">Mejor serie</th>
                  <th scope="col" className="px-2 py-2">Peso máx.</th>
                  <th scope="col" className="px-4 py-2 text-right">vs. anterior</th>
                </tr>
              </thead>
              <tbody>
                {[...weeks].reverse().map((w) => (
                  <tr key={w.start} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{formatDate(w.start)}</span>
                      <span className="block text-xs text-faint">{w.sessions} {w.sessions === 1 ? "sesión" : "sesiones"}</span>
                    </td>
                    <td className="tnum px-2 py-2.5">{w.startW != null ? `${fmtN(w.startW)} ${LOAD_UNIT} × ${w.startReps ?? "–"}` : "–"}</td>
                    <td className="tnum px-2 py-2.5">{w.bestSet ? `${fmtN(w.bestSet.weight_kg)} × ${w.bestSet.reps ?? "–"}` : "–"}</td>
                    <td className="tnum px-2 py-2.5 font-semibold">{fmtN(w.top)} {LOAD_UNIT}</td>
                    <td className="tnum px-4 py-2.5 text-right">
                      {w.diff == null ? (
                        <span className="text-faint">inicio</span>
                      ) : w.diff > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-ok"><ArrowUp size={13} aria-hidden="true" />+{fmtN(w.diff)}</span>
                      ) : w.diff < 0 ? (
                        <span className="inline-flex items-center gap-1 text-muted"><ArrowDown size={13} aria-hidden="true" />{fmtN(w.diff)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted"><ArrowRight size={13} aria-hidden="true" />igual</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      </>
      )}

      <Card className="p-0">
        <ul>
          {[...sessions].reverse().map((s) => (
            <li key={s.date} className="border-b border-line px-4 py-3 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{formatDate(s.date)}</p>
                {!cardio && <p className="tnum text-xs text-muted">Máx {fmtN(s.top)} {LOAD_UNIT} · 1RM est. {fmtN(r1(s.best))} {LOAD_UNIT} · Vol {Math.round(s.volume).toLocaleString("es-SV")} {LOAD_UNIT}</p>}
              </div>
              <p className="tnum mt-1 text-sm">
                {cardio
                  ? `${fmtN(r1(s.sets.reduce((acc, x) => acc + (x.duration_min ?? 0), 0)))} min`
                  : s.sets.map((x) => `${fmtN(x.weight_kg)}×${x.reps ?? "–"}${x.rir != null ? ` (RIR ${fmtN(x.rir)})` : x.rpe != null ? ` (RPE ${fmtN(x.rpe)})` : ""}`).join(" · ")}
              </p>
              {s.sets.some((x) => x.comment) && (
                <p className="mt-1 text-xs text-muted">{s.sets.filter((x) => x.comment).map((x) => `S${x.set_number}: ${x.comment}`).join(" · ")}</p>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
