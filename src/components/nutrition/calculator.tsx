"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import {
  ACTIVITY_LEVELS,
  FORMULAS,
  calculate,
  kcalFromMacros,
  type CalcInput,
  type CalculationSnapshot,
  type FormulaId,
  type Sex,
} from "@/lib/nutrition/calc";
import { Button, Field, Input, Select } from "@/components/ui";
import { KcalRebalancer } from "@/components/nutrition/kcal-rebalancer";
import { cn } from "@/lib/cn";
import { kgToLb, lbToKg } from "@/lib/units";

export interface CalcDefaults {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  bodyFatPct: number | null;
}

interface Targets {
  target_kcal: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
}

type Payload = Targets & { calculation: CalculationSnapshot };

const n = (s: string) => {
  const v = Number(String(s).replace(",", "."));
  return Number.isFinite(v) ? v : NaN;
};

/**
 * Calculadora de apoyo. Muestra fórmula, datos, resultado y el ajuste del
 * coach; nada se aplica al plan hasta que el coach toca "Aplicar al plan".
 */
export function NutritionCalculator({
  defaults,
  current,
  previous,
  onApply,
}: {
  defaults: CalcDefaults;
  current: Targets;
  previous: CalculationSnapshot | null;
  onApply: (p: Payload) => Promise<string | null>;
}) {
  const prevIn = previous?.method === "calculator" ? previous.inputs : undefined;
  const [mode, setMode] = useState<"calculator" | "manual">(previous?.method ?? "calculator");
  const [formula, setFormula] = useState<FormulaId>(previous?.formula ?? "mifflin");
  const [v, setV] = useState({
    sex: (prevIn?.sex ?? (defaults.sex === "female" ? "female" : "male")) as Sex,
    // el coach escribe libras; las fórmulas usan kg
    weight: (() => { const kg = defaults.weightKg ?? prevIn?.weightKg; return kg ? String(kgToLb(kg)) : ""; })(),
    height: String(defaults.heightCm ?? prevIn?.heightCm ?? ""),
    age: String(defaults.age ?? prevIn?.age ?? ""),
    fat: String(defaults.bodyFatPct ?? prevIn?.bodyFatPct ?? ""),
    activity: String(prevIn?.activityFactor ?? 1.55),
    adjustMode: (prevIn?.adjustMode ?? "pct") as "pct" | "kcal",
    adjust: String(prevIn?.adjustValue ?? 0),
    protein: String(prevIn?.proteinPerKg ?? 2),
    fatMode: (prevIn?.fatMode ?? "pct") as "pct" | "per_kg",
    fatValue: String(prevIn?.fatValue ?? 25),
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  const input: CalcInput = {
    formula,
    sex: v.sex,
    weightKg: lbToKg(n(v.weight)),
    heightCm: n(v.height),
    age: n(v.age),
    bodyFatPct: v.fat.trim() === "" ? null : n(v.fat),
    activityFactor: n(v.activity),
    adjustMode: v.adjustMode,
    adjustValue: n(v.adjust) || 0,
    proteinPerKg: n(v.protein) || 0,
    fatMode: v.fatMode,
    fatValue: n(v.fatValue) || 0,
  };
  const result = useMemo(() => (mode === "calculator" ? calculate(input) : null), [mode, JSON.stringify(input)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Valores finales: siguen al cálculo hasta que el coach los edita.
  const [manual, setManual] = useState<{ kcal: string; p: string; c: string; f: string } | null>(
    previous?.overridden || previous?.method === "manual" || (!previous && current.target_kcal)
      ? { kcal: String(current.target_kcal ?? ""), p: String(current.target_protein_g ?? ""), c: String(current.target_carbs_g ?? ""), f: String(current.target_fat_g ?? "") }
      : null,
  );
  const final = manual ?? {
    kcal: String(result?.targetKcal ?? ""),
    p: String(result?.proteinG ?? ""),
    c: String(result?.carbsG ?? ""),
    f: String(result?.fatG ?? ""),
  };
  const editFinal = (k: keyof typeof final) => (e: React.ChangeEvent<HTMLInputElement>) => setManual({ ...final, [k]: e.target.value });
  const overridden =
    mode === "manual" ||
    (manual !== null &&
      (!result ||
        n(manual.kcal) !== result.targetKcal ||
        n(manual.p) !== result.proteinG ||
        n(manual.c) !== result.carbsG ||
        n(manual.f) !== result.fatG));

  const macroKcal = kcalFromMacros(n(final.p) || 0, n(final.c) || 0, n(final.f) || 0);
  const kcalGap = n(final.kcal) ? macroKcal - n(final.kcal) : 0;

  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function apply() {
    const kcal = Math.round(n(final.kcal));
    const p = Math.round(n(final.p));
    const c = Math.round(n(final.c));
    const f = Math.round(n(final.f));
    if (![kcal, p, c, f].every((x) => Number.isFinite(x) && x >= 0)) return setError("Completá calorías y macros con números válidos.");
    if (kcal < 500) return setError("Las calorías deben ser al menos 500.");
    const { formula: _formula, ...inputsWithoutFormula } = input;
    const calculation: CalculationSnapshot =
      mode === "calculator" && result
        ? {
            method: "calculator",
            formula,
            formula_name: FORMULAS[formula].name,
            inputs: inputsWithoutFormula,
            results: {
              bmr: result.bmr,
              tdee: result.tdee,
              targetKcal: result.targetKcal,
              proteinG: result.proteinG,
              fatG: result.fatG,
              carbsG: result.carbsG,
              leanMassKg: result.leanMassKg,
            },
            final: { kcal, protein_g: p, carbs_g: c, fat_g: f },
            overridden,
            calculated_at: new Date().toISOString(),
          }
        : { method: "manual", final: { kcal, protein_g: p, carbs_g: c, fat_g: f }, overridden: true, calculated_at: new Date().toISOString() };
    setError(null);
    start(async () => {
      const err = await onApply({ target_kcal: kcal, target_protein_g: p, target_carbs_g: c, target_fat_g: f, calculation });
      if (err) setError(err);
    });
  }

  const meta = FORMULAS[formula];
  const lbmMissing = meta.needs === "lean_mass" && (input.bodyFatPct == null || !(input.bodyFatPct > 0));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-full bg-panel-2 p-1" role="tablist" aria-label="Modo">
        {(["calculator", "manual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("flex-1 rounded-full py-2 text-sm font-semibold", mode === m ? "bg-panel text-fg" : "text-muted")}
          >
            {m === "calculator" ? "Calculadora" : "Ingresar manualmente"}
          </button>
        ))}
      </div>

      {mode === "calculator" && (
        <>
          <Field label="Fórmula para la TMB" htmlFor="calc_formula">
            <Select id="calc_formula" value={formula} onChange={(e) => setFormula(e.target.value as FormulaId)} className="w-full">
              {(Object.keys(FORMULAS) as FormulaId[]).map((f) => (
                <option key={f} value={f}>
                  {FORMULAS[f].name} ({FORMULAS[f].reference})
                </option>
              ))}
            </Select>
          </Field>
          <p className="-mt-3 text-xs text-faint">{meta.description}</p>

          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <legend className="eyebrow mb-2">Datos del cliente</legend>
            <Field label="Peso (lb)" htmlFor="calc_w">
              <Input id="calc_w" type="number" inputMode="decimal" step="0.1" value={v.weight} onChange={set("weight")} />
              {n(v.weight) > 0 && <span className="tnum text-xs text-faint">= {lbToKg(n(v.weight)).toFixed(1)} kg</span>}
            </Field>
            {meta.needs === "sex" ? (
              <>
                <Field label="Altura (cm)" htmlFor="calc_h">
                  <Input id="calc_h" type="number" inputMode="decimal" step="0.1" value={v.height} onChange={set("height")} />
                </Field>
                <Field label="Edad" htmlFor="calc_a">
                  <Input id="calc_a" type="number" inputMode="numeric" value={v.age} onChange={set("age")} />
                </Field>
                <Field label="Ecuación" htmlFor="calc_s">
                  <Select id="calc_s" value={v.sex} onChange={set("sex")} className="w-full">
                    <option value="male">Hombre</option>
                    <option value="female">Mujer</option>
                  </Select>
                </Field>
              </>
            ) : null}
            <Field label="% grasa" htmlFor="calc_bf">
              <Input id="calc_bf" type="number" inputMode="decimal" step="0.1" value={v.fat} onChange={set("fat")} placeholder={meta.needs === "lean_mass" ? "Requerido" : "Opcional"} />
            </Field>
          </fieldset>
          {defaults.sex === "other" && meta.needs === "sex" && (
            <p className="-mt-3 text-xs text-warn">El perfil indica sexo "otro": elegí qué ecuación usar según tu criterio.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Factor de actividad" htmlFor="calc_act">
              <Select id="calc_act" value={ACTIVITY_LEVELS.some((a) => String(a.value) === v.activity) ? v.activity : "custom"} onChange={(e) => setV((s) => ({ ...s, activity: e.target.value === "custom" ? s.activity : e.target.value }))} className="w-full">
                {ACTIVITY_LEVELS.map((a) => (
                  <option key={a.value} value={String(a.value)}>
                    {a.label} · ×{a.value} — {a.hint}
                  </option>
                ))}
                <option value="custom">Personalizado</option>
              </Select>
            </Field>
            <Field label="Factor (editable)" htmlFor="calc_actv">
              <Input id="calc_actv" type="number" inputMode="decimal" step="0.01" value={v.activity} onChange={set("activity")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Ajuste" htmlFor="calc_adjm">
              <Select id="calc_adjm" value={v.adjustMode} onChange={set("adjustMode")} className="w-full">
                <option value="pct">% del gasto</option>
                <option value="kcal">kcal</option>
              </Select>
            </Field>
            <Field label={v.adjustMode === "pct" ? "Valor (%)" : "Valor (kcal)"} htmlFor="calc_adj">
              <Input id="calc_adj" type="number" inputMode="numeric" value={v.adjust} onChange={set("adjust")} placeholder="-15" />
            </Field>
            <Field label="Proteína (g/kg)" htmlFor="calc_p">
              <Input id="calc_p" type="number" inputMode="decimal" step="0.1" value={v.protein} onChange={set("protein")} />
            </Field>
            <Field label={v.fatMode === "pct" ? "Grasa (% kcal)" : "Grasa (g/kg)"} htmlFor="calc_f">
              <div className="flex gap-1.5">
                <Input id="calc_f" type="number" inputMode="decimal" step="0.1" value={v.fatValue} onChange={set("fatValue")} className="min-w-0" />
                <Select aria-label="Modo grasa" value={v.fatMode} onChange={set("fatMode")} className="w-20 shrink-0 px-2">
                  <option value="pct">%</option>
                  <option value="per_kg">g/kg</option>
                </Select>
              </div>
            </Field>
          </div>
          <p className="-mt-3 text-xs text-faint">Ajuste negativo = déficit, positivo = superávit. Los carbohidratos completan las calorías restantes.</p>

          <section aria-label="Resultado" className="rounded-xl border border-line bg-panel p-4">
            {result ? (
              <dl className="tnum grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-xs text-faint">TMB</dt><dd className="font-semibold">{result.bmr.toLocaleString("es-SV")} kcal</dd></div>
                <div><dt className="text-xs text-faint">Gasto total (TDEE)</dt><dd className="font-semibold">{result.tdee.toLocaleString("es-SV")} kcal</dd></div>
                <div><dt className="text-xs text-faint">Objetivo</dt><dd className="font-semibold text-red">{result.targetKcal.toLocaleString("es-SV")} kcal</dd></div>
                <div><dt className="text-xs text-faint">Proteína</dt><dd>{result.proteinG} g</dd></div>
                <div><dt className="text-xs text-faint">Carbohidratos</dt><dd>{result.carbsG} g</dd></div>
                <div><dt className="text-xs text-faint">Grasas</dt><dd>{result.fatG} g</dd></div>
                {result.leanMassKg != null && (
                  <div className="col-span-3 text-xs text-faint">Masa libre de grasa estimada: {kgToLb(result.leanMassKg)} lb ({result.leanMassKg} kg)</div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted">
                {lbmMissing ? "Esta fórmula necesita el % de grasa." : "Completá peso, altura, edad y factor de actividad para calcular."}
              </p>
            )}
            {result?.warnings.map((w) => (
              <p key={w} className="mt-3 flex gap-2 text-xs text-warn">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {w}
              </p>
            ))}
          </section>
        </>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow mb-2">{mode === "calculator" ? "Valores finales del plan (podés ajustarlos)" : "Objetivos del plan"}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Calorías" htmlFor="fin_kcal">
            <Input id="fin_kcal" type="number" inputMode="numeric" value={final.kcal} onChange={editFinal("kcal")} />
          </Field>
          <Field label="Proteína (g)" htmlFor="fin_p">
            <Input id="fin_p" type="number" inputMode="numeric" value={final.p} onChange={editFinal("p")} />
          </Field>
          <Field label="Carbohidratos (g)" htmlFor="fin_c">
            <Input id="fin_c" type="number" inputMode="numeric" value={final.c} onChange={editFinal("c")} />
          </Field>
          <Field label="Grasas (g)" htmlFor="fin_f">
            <Input id="fin_f" type="number" inputMode="numeric" value={final.f} onChange={editFinal("f")} />
          </Field>
        </div>
        <p className={cn("tnum text-xs", Math.abs(kcalGap) > 50 ? "text-warn" : "text-faint")}>
          Los macros suman {macroKcal.toLocaleString("es-SV")} kcal
          {n(final.kcal) ? ` (${kcalGap > 0 ? "+" : ""}${kcalGap} respecto a las calorías indicadas)` : ""}.
        </p>
        <KcalRebalancer
          idPrefix="calc"
          current={{ kcal: n(final.kcal) || 0, protein: n(final.p) || 0, carbs: n(final.c) || 0, fat: n(final.f) || 0 }}
          onApply={(x) => setManual({ kcal: String(x.kcal), p: String(x.protein), c: String(x.carbs), f: String(x.fat) })}
        />
        {mode === "calculator" && manual && result && overridden && (
          <button type="button" onClick={() => setManual(null)} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted underline hover:text-fg">
            <RotateCcw size={14} /> Usar los valores calculados
          </button>
        )}
        {mode === "calculator" && overridden && <p className="text-xs text-faint">Se guardará como ajuste manual del coach sobre el cálculo.</p>}
      </fieldset>

      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <Button type="button" size="lg" onClick={apply} disabled={pending} className="uppercase tracking-[0.1em]">
        {pending ? "Guardando…" : "Aplicar al plan"}
      </Button>
    </div>
  );
}

/** Texto corto con el cálculo guardado, para mostrar junto a los objetivos. */
export function describeCalculation(c: CalculationSnapshot | null) {
  if (!c) return null;
  const date = new Date(c.calculated_at).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" });
  if (c.method === "manual") return `Ingresado manualmente · ${date}`;
  const i = c.inputs;
  const parts = [
    c.formula_name,
    i ? `${kgToLb(i.weightKg)} lb${i.heightCm ? ` · ${i.heightCm} cm` : ""}${i.age ? ` · ${i.age} años` : ""}${i.bodyFatPct ? ` · ${i.bodyFatPct}% grasa` : ""}` : null,
    i ? `actividad ×${i.activityFactor}` : null,
    c.results ? `TMB ${c.results.bmr} · TDEE ${c.results.tdee}` : null,
    i ? `ajuste ${i.adjustValue > 0 ? "+" : ""}${i.adjustValue}${i.adjustMode === "pct" ? " %" : " kcal"}` : null,
    c.overridden ? "con ajuste manual del coach" : null,
  ].filter(Boolean);
  return `${parts.join(" · ")} · ${date}`;
}
