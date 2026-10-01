"use client";

import { useState } from "react";
import { DAY_SHORT } from "@/lib/nutrition/plan";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

type Ref = { week: number; day: number };
const key = (r: Ref) => `${r.week}-${r.day}`;

/** Selector de días destino (semanas × días) con atajos. */
export function DayTargets({
  weeks,
  source,
  excludeSource,
  confirmLabel,
  note,
  onConfirm,
}: {
  weeks: number;
  source: Ref;
  excludeSource: boolean;
  confirmLabel: string;
  note?: string;
  onConfirm: (targets: Ref[]) => Promise<void>;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const all: Ref[] = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => ({ week: w + 1, day: d + 1 }))).flat();
  const allowed = all.filter((r) => !(excludeSource && r.week === source.week && r.day === source.day));

  const toggle = (r: Ref) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(key(r))) n.delete(key(r));
      else n.add(key(r));
      return n;
    });
  const pick = (list: Ref[]) => setSel(new Set(list.filter((r) => allowed.some((a) => key(a) === key(r))).map(key)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => pick(all.filter((r) => r.week === source.week))}>
          Toda la semana {source.week}
        </Button>
        {weeks > 1 && (
          <Button type="button" variant="secondary" size="sm" onClick={() => pick(all.filter((r) => r.day === source.day))}>
            Mismo día en todas las semanas
          </Button>
        )}
        {weeks > 1 && (
          <Button type="button" variant="secondary" size="sm" onClick={() => pick(all)}>
            Todo el plan
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={() => setSel(new Set())}>
          Limpiar
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr>
              <th className="w-20" />
              {DAY_SHORT.map((d) => (
                <th key={d} scope="col" className="pb-2 text-center text-xs font-semibold text-muted">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: weeks }, (_, w) => (
              <tr key={w}>
                <th scope="row" className="pr-2 text-left text-xs font-semibold text-muted">Semana {w + 1}</th>
                {Array.from({ length: 7 }, (_, d) => {
                  const r = { week: w + 1, day: d + 1 };
                  const isSrc = r.week === source.week && r.day === source.day;
                  const disabled = excludeSource && isSrc;
                  const on = sel.has(key(r));
                  return (
                    <td key={d} className="p-1 text-center">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => toggle(r)}
                        aria-pressed={on}
                        aria-label={`Semana ${r.week}, ${DAY_SHORT[d]}`}
                        className={cn(
                          "h-9 w-full rounded-lg border text-xs font-semibold transition-colors",
                          on ? "border-red bg-red text-white" : "border-line text-muted hover:border-faint",
                          disabled && "cursor-not-allowed border-dashed opacity-40",
                        )}
                      >
                        {isSrc ? "Origen" : on ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {note && <p className="text-xs text-warn">{note}</p>}
      <Button
        type="button"
        disabled={busy || sel.size === 0}
        onClick={async () => {
          setBusy(true);
          await onConfirm(allowed.filter((r) => sel.has(key(r))));
          setBusy(false);
        }}
      >
        {busy ? "Copiando…" : `${confirmLabel} (${sel.size})`}
      </Button>
    </div>
  );
}
