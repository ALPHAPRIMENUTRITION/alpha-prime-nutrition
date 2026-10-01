import type { Macros } from "@/lib/nutrition/plan";
import { cn } from "@/lib/cn";

interface Targets {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

const ROWS = [
  { key: "protein" as const, label: "Proteína", unit: "g" },
  { key: "carbs" as const, label: "Carbohidratos", unit: "g" },
  { key: "fat" as const, label: "Grasas", unit: "g" },
];

/** Diferencia dentro de ±5 % se considera alineada; es solo informativo. */
function tone(actual: number, target: number | null) {
  if (!target) return "neutral";
  const r = actual / target;
  if (r >= 0.95 && r <= 1.05) return "ok";
  if (r >= 0.9 && r <= 1.1) return "warn";
  return "bad";
}

const toneText = { ok: "text-ok", warn: "text-warn", bad: "text-bad", neutral: "text-muted" } as const;
const toneBar = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", neutral: "bg-faint" } as const;

function diffText(actual: number, target: number | null, unit: string) {
  if (!target) return "Sin objetivo";
  const d = Math.round(actual - target);
  if (d === 0) return "Exacto";
  return `${d > 0 ? "+" : ""}${d.toLocaleString("es-SV")} ${unit}`;
}

/** Plan real vs objetivo: calorías y macros con su diferencia. */
export function MacroSummary({ actual, targets, compact = false, caption }: { actual: Macros; targets: Targets; compact?: boolean; caption?: string }) {
  const kTone = tone(actual.kcal, targets.kcal);
  return (
    <div className={cn("flex flex-col gap-4", compact && "gap-3")}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <span className="eyebrow">Calorías</span>
          <p className="tnum font-display text-4xl font-extrabold leading-none">
            {Math.round(actual.kcal).toLocaleString("es-SV")}
            <span className="ml-1 text-base text-muted">
              {targets.kcal ? `/ ${targets.kcal.toLocaleString("es-SV")}` : ""} kcal
            </span>
          </p>
        </div>
        <span className={cn("tnum text-sm font-semibold", toneText[kTone])}>{diffText(actual.kcal, targets.kcal, "kcal")}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {ROWS.map((r) => {
          const a = actual[r.key];
          const t = targets[r.key];
          const tn = tone(a, t);
          const pct = t ? Math.min(100, (a / t) * 100) : 0;
          return (
            <div key={r.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-xs text-muted">{r.label}</span>
              </div>
              <p className="tnum text-sm font-semibold">
                {Math.round(a)}
                <span className="font-normal text-faint">{t ? ` / ${t}` : ""} g</span>
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel-2" aria-hidden="true">
                <div className={cn("h-full rounded-full", toneBar[tn])} style={{ width: `${pct}%` }} />
              </div>
              {!compact && <p className={cn("tnum mt-1 text-xs", toneText[tn])}>{diffText(a, t, "g")}</p>}
            </div>
          );
        })}
      </div>
      {caption && <p className="text-xs text-faint">{caption}</p>}
    </div>
  );
}
