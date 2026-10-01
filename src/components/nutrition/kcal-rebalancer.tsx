"use client";

import { useState } from "react";
import { Lock, LockOpen, SlidersHorizontal } from "lucide-react";
import { rebalanceMacros, type MacroKey } from "@/lib/nutrition/calc";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

const LABEL: Record<MacroKey, string> = { protein: "Proteína", carbs: "Carbohidratos", fat: "Grasas" };
const QUICK = [-20, -15, -10, -5, 5, 10];

/**
 * "Subir o bajar calorías": el coach elige qué macros quedan fijos y cuáles
 * absorben el cambio. Solo propone; los valores se aplican al formulario.
 */
export function KcalRebalancer({
  idPrefix,
  current,
  onApply,
}: {
  idPrefix: string;
  current: { kcal: number; protein: number; carbs: number; fat: number };
  onApply: (v: { kcal: number; protein: number; carbs: number; fat: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [keep, setKeep] = useState<Record<MacroKey, boolean>>({ protein: true, carbs: false, fat: false });

  const base = current.kcal || Math.round(4 * current.protein + 4 * current.carbs + 9 * current.fat);
  const newKcal = Number(target);
  const res = newKcal > 0 ? rebalanceMacros({ protein: current.protein, carbs: current.carbs, fat: current.fat }, newKcal, keep) : null;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-red hover:underline">
        <SlidersHorizontal size={14} /> Subir o bajar calorías eligiendo qué macros mantener
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-graphite p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Subir o bajar calorías</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-fg">Cerrar</button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}_rb_kcal`} className="text-xs text-muted">Calorías nuevas (hoy {base.toLocaleString("es-SV")})</label>
          <Input id={`${idPrefix}_rb_kcal`} type="number" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} className="w-32" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTarget(String(Math.round(base * (1 + p / 100))))}
              className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted hover:border-faint hover:text-fg"
            >
              {p > 0 ? "+" : ""}{p}%
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted">Mantener fijo (candado cerrado) · los abiertos absorben el cambio:</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LABEL) as MacroKey[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={keep[k]}
              onClick={() => setKeep((x) => ({ ...x, [k]: !x[k] }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                keep[k] ? "border-red bg-red/10 text-fg" : "border-line text-muted hover:border-faint",
              )}
            >
              {keep[k] ? <Lock size={13} /> : <LockOpen size={13} />} {LABEL[k]} {current[k]} g
            </button>
          ))}
        </div>
      </div>

      {res && !res.ok && <p role="alert" className="text-sm text-warn">{res.error}</p>}
      {res?.ok && (
        <div className="flex flex-col gap-2">
          <p className="tnum text-sm">
            Resultado: <strong>{newKcal.toLocaleString("es-SV")} kcal</strong> · P {res.macros.protein} g · C {res.macros.carbs} g · G {res.macros.fat} g
          </p>
          <Button
            type="button"
            size="sm"
            className="w-fit"
            onClick={() => {
              onApply({ kcal: Math.round(newKcal), ...res.macros });
              setOpen(false);
              setTarget("");
            }}
          >
            Usar estos valores
          </Button>
        </div>
      )}
    </div>
  );
}
