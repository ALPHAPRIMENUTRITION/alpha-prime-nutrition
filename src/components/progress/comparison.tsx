"use client";

import { useState } from "react";
import { METRICS, tone, type Snapshot } from "@/lib/comparison";
import { formatDate } from "@/lib/format";
import { Card, Select } from "@/components/ui";
import { cn } from "@/lib/cn";

const SECTIONS = [
  { id: "comp", label: "Composición corporal" },
  { id: "fold", label: "Pliegues cutáneos" },
  { id: "circ", label: "Circunferencias" },
] as const;

const fmt = (n: number | null | undefined) => (n == null ? "—" : String(Math.round(n * 100) / 100));

/** Tabla Anterior / Actual / Diferencia entre dos mediciones a elección. */
export function Comparison({ snapshots }: { snapshots: Snapshot[] }) {
  const n = snapshots.length;
  const [a, setA] = useState(Math.max(0, n - 2));
  const [b, setB] = useState(n - 1);
  if (n < 2) {
    return (
      <Card className="p-5 text-sm text-muted">
        La comparativa aparece cuando haya al menos dos mediciones en fechas distintas.
      </Card>
    );
  }
  const A = snapshots[a]!, B = snapshots[b]!;

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">Comparativa</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="sr-only" htmlFor="cmp_a">Medición anterior</label>
          <Select id="cmp_a" value={a} onChange={(e) => setA(Number(e.target.value))} className="h-9 w-auto">
            {snapshots.map((s, i) => <option key={s.date} value={i}>{formatDate(s.date)}</option>)}
          </Select>
          <span className="text-faint">vs</span>
          <label className="sr-only" htmlFor="cmp_b">Medición actual</label>
          <Select id="cmp_b" value={b} onChange={(e) => setB(Number(e.target.value))} className="h-9 w-auto">
            {snapshots.map((s, i) => <option key={s.date} value={i}>{formatDate(s.date)}</option>)}
          </Select>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto">
        <table className="tnum w-full min-w-[320px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-faint">
              <th scope="col" className="px-1 py-2 font-semibold">Medición</th>
              <th scope="col" className="px-1 py-2 text-right font-semibold">Anterior</th>
              <th scope="col" className="px-1 py-2 text-right font-semibold">Actual</th>
              <th scope="col" className="px-1 py-2 text-right font-semibold">Diferencia</th>
            </tr>
          </thead>
          {SECTIONS.map((sec) => {
            const rows = METRICS.filter((m) => m.section === sec.id && (A.values[m.key] != null || B.values[m.key] != null));
            if (!rows.length) return null;
            return (
              <tbody key={sec.id}>
                <tr>
                  <th colSpan={4} scope="colgroup" className="px-1 pb-1 pt-4 text-left text-xs font-semibold text-red">{sec.label}</th>
                </tr>
                {rows.map((m) => {
                  const va = A.values[m.key], vb = B.values[m.key];
                  const diff = va != null && vb != null ? Math.round((vb - va) * 100) / 100 : null;
                  const t = diff == null ? "neutral" : tone(diff, m.better);
                  return (
                    <tr key={m.key} className="border-t border-line">
                      <th scope="row" className="px-1 py-2 text-left font-medium">
                        {m.label} {m.unit && <span className="text-xs font-normal text-faint">({m.unit})</span>}
                      </th>
                      <td className="px-1 py-2 text-right text-muted">{fmt(va)}</td>
                      <td className="px-1 py-2 text-right font-semibold">{fmt(vb)}</td>
                      <td className="px-1 py-1.5 text-right">
                        {diff == null ? (
                          <span className="text-faint">—</span>
                        ) : (
                          <span
                            className={cn(
                              "inline-block min-w-[3.5rem] rounded-md px-2 py-0.5 font-semibold",
                              t === "good" && "bg-ok/15 text-ok",
                              t === "bad" && "bg-bad/15 text-bad",
                              t === "neutral" && "text-fg",
                            )}
                          >
                            {diff > 0 ? "+" : ""}
                            {fmt(diff)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
      <p className="text-xs text-faint">
        Verde: cambio favorable · Rojo: desfavorable · Sin color: depende del objetivo. Lb de grasa = peso × % grasa; MCM = peso − grasa. Son cálculos de apoyo.
      </p>
    </Card>
  );
}
