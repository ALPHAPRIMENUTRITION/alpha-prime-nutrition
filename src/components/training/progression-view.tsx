"use client";

import { useMemo, useState } from "react";
import { e1rm, type Exercise, type LogRow } from "@/lib/training/plan";
import { formatDate } from "@/lib/format";
import { LineChart } from "@/components/charts/line-chart";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";

type Metric = "top" | "e1rm" | "volume";
const METRICS: { id: Metric; label: string; unit: string }[] = [
  { id: "top", label: "Peso máximo", unit: "kg" },
  { id: "e1rm", label: "1RM estimado", unit: "kg" },
  { id: "volume", label: "Volumen", unit: "kg" },
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

  if (!byExercise.length) return <Card className="px-6 py-8 text-center text-sm text-muted">{empty}</Card>;

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
              {exMap.get(x.id)?.name ?? "Ejercicio"} · {x.dates} sesión{x.dates === 1 ? "" : "es"}
            </option>
          ))}
        </select>
      </div>

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
            <p className={cn("tnum text-sm font-semibold", change > 0 ? "text-ok" : change < 0 ? "text-bad" : "text-muted")}>
              {change > 0 ? "+" : ""}{change.toLocaleString("es-SV")} {m.unit} desde {formatDate(series[0]!.date)}
            </p>
          )}
        </div>
        <LineChart data={series} unit={m.unit} label={`${m.label} de ${exMap.get(sel ?? "")?.name ?? "ejercicio"}`} />
        {metric === "e1rm" && <p className="text-xs text-faint">1RM estimado con la fórmula de Epley a partir de la mejor serie. Es orientativo.</p>}
      </Card>

      <Card className="p-0">
        <ul>
          {[...sessions].reverse().map((s) => (
            <li key={s.date} className="border-b border-line px-4 py-3 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{formatDate(s.date)}</p>
                <p className="tnum text-xs text-muted">Máx {fmtN(s.top)} kg · 1RM est. {fmtN(r1(s.best))} kg · Vol {Math.round(s.volume).toLocaleString("es-SV")} kg</p>
              </div>
              <p className="tnum mt-1 text-sm">
                {s.sets.map((x) => `${fmtN(x.weight_kg)}×${x.reps ?? "–"}${x.rir != null ? ` (RIR ${fmtN(x.rir)})` : x.rpe != null ? ` (RPE ${fmtN(x.rpe)})` : ""}`).join(" · ")}
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
