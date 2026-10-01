"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check } from "lucide-react";
import { submitCheckinAction } from "@/app/portal/checkin/actions";
import { createClient } from "@/lib/supabase/client";
import { kgToLb, type CheckinConfig, type CheckinRow, type StandardKey } from "@/lib/checkin";
import { todayISO } from "@/lib/format";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";

const POSES = [
  { id: "front", label: "Frente" },
  { id: "side", label: "Perfil" },
  { id: "back", label: "Espalda" },
] as const;

/** Reduce la foto a 1600px (JPEG) antes de subirla. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85));
}

const str = (v: number | string | null | undefined) => (v == null ? "" : String(v));

export function CheckinForm({
  clientId,
  config,
  existing,
  suggestedPlanned,
  suggestedCompleted,
  hasPhotos,
}: {
  clientId: string;
  config: CheckinConfig;
  existing: CheckinRow | null;
  suggestedPlanned: number | null;
  suggestedCompleted: number | null;
  hasPhotos: boolean;
}) {
  const router = useRouter();
  const show = (k: StandardKey) => !config.hidden.includes(k);
  const [v, setV] = useState({
    weight_kg: str(existing?.weight_kg),
    waist_cm: str(existing?.waist_cm),
    nutrition_adherence_pct: str(existing?.nutrition_adherence_pct ?? 80),
    workouts_completed: str(existing?.workouts_completed ?? suggestedCompleted),
    workouts_planned: str(existing?.workouts_planned ?? suggestedPlanned),
    cardio_minutes: str(existing?.cardio_minutes),
    sleep_hours: str(existing?.sleep_hours),
    energy: str(existing?.energy),
    hunger: str(existing?.hunger),
    stress: str(existing?.stress),
    comments: str(existing?.comments),
  });
  const [answers, setAnswers] = useState<Record<string, unknown>>(existing?.extra_answers ?? {});
  const files = useRef<Record<string, File | null>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<{ error?: string; fields?: Record<string, string> }>({});
  const [pending, start] = useTransition();
  const [stage, setStage] = useState<string | null>(null);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const lb = Number(v.weight_kg.replace(",", ".")) > 0 ? kgToLb(Number(v.weight_kg.replace(",", "."))) : null;

  function submit() {
    setErrors({});
    start(async () => {
      setStage("Enviando check-in…");
      const res = await submitCheckinAction(v, answers);
      if (!res.ok) {
        setStage(null);
        return setErrors({ error: res.error, fields: res.fields });
      }
      const chosen = Object.entries(files.current).filter(([, f]) => f);
      if (chosen.length) {
        setStage("Subiendo fotos…");
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        for (const [pose, file] of chosen) {
          try {
            const blob = await shrink(file!);
            const path = `${clientId}/${crypto.randomUUID()}.jpg`;
            const up = await supabase.storage.from("progress-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
            if (up.error) throw up.error;
            const ins = await supabase.from("progress_photos").insert({ client_id: clientId, checkin_id: res.id, storage_path: path, pose, taken_at: todayISO(), uploaded_by: auth.user!.id });
            if (ins.error) {
              await supabase.storage.from("progress-photos").remove([path]);
              throw ins.error;
            }
          } catch {
            setErrors({ error: "El check-in se envió, pero una foto no se pudo subir. Probá de nuevo desde Progreso." });
          }
        }
      }
      setStage(null);
      router.refresh();
    });
  }

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {(show("weight_kg") || show("waist_cm")) && (
        <div className="grid grid-cols-2 gap-3">
          {show("weight_kg") && (
            <Field label="Peso (kg)" htmlFor="ck_w" error={errors.fields?.weight_kg}>
              <Input id="ck_w" inputMode="decimal" value={v.weight_kg} onChange={set("weight_kg")} placeholder="En ayunas" />
              {lb != null && <span className="tnum text-xs text-faint">≈ {lb} lb</span>}
            </Field>
          )}
          {show("waist_cm") && (
            <Field label="Cintura (cm)" htmlFor="ck_waist" error={errors.fields?.waist_cm}>
              <Input id="ck_waist" inputMode="decimal" value={v.waist_cm} onChange={set("waist_cm")} placeholder="A la altura del ombligo" />
            </Field>
          )}
        </div>
      )}

      {show("nutrition_adherence_pct") && (
        <Field label={`Cumplimiento del plan nutricional: ${v.nutrition_adherence_pct || 0} %`} htmlFor="ck_adh" error={errors.fields?.nutrition_adherence_pct}>
          <input id="ck_adh" type="range" min={0} max={100} step={5} value={v.nutrition_adherence_pct || 0} onChange={set("nutrition_adherence_pct")} className="w-full accent-[var(--color-red)]" />
          <span className="flex justify-between text-[11px] text-faint"><span>0 %</span><span>Sé honesto: sirve para ajustar tu plan</span><span>100 %</span></span>
        </Field>
      )}

      {show("workouts") && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entrenamientos hechos" htmlFor="ck_wc" error={errors.fields?.workouts_completed}>
            <Input id="ck_wc" inputMode="numeric" value={v.workouts_completed} onChange={set("workouts_completed")} />
          </Field>
          <Field label="de los planificados" htmlFor="ck_wp" error={errors.fields?.workouts_planned}>
            <Input id="ck_wp" inputMode="numeric" value={v.workouts_planned} onChange={set("workouts_planned")} />
          </Field>
        </div>
      )}

      {(show("cardio_minutes") || show("sleep_hours")) && (
        <div className="grid grid-cols-2 gap-3">
          {show("cardio_minutes") && (
            <Field label="Cardio (min/semana)" htmlFor="ck_cardio" error={errors.fields?.cardio_minutes}>
              <Input id="ck_cardio" inputMode="numeric" value={v.cardio_minutes} onChange={set("cardio_minutes")} />
            </Field>
          )}
          {show("sleep_hours") && (
            <Field label="Sueño (h/noche)" htmlFor="ck_sleep" error={errors.fields?.sleep_hours}>
              <Input id="ck_sleep" inputMode="decimal" value={v.sleep_hours} onChange={set("sleep_hours")} placeholder="Promedio" />
            </Field>
          )}
        </div>
      )}

      {(["energy", "hunger", "stress"] as const).filter(show).map((k) => (
        <Scale
          key={k}
          id={`ck_${k}`}
          label={k === "energy" ? "Energía" : k === "hunger" ? "Hambre" : "Estrés"}
          hint={k === "energy" ? "1 muy baja · 10 excelente" : k === "hunger" ? "1 nada · 10 mucha" : "1 nada · 10 mucho"}
          value={v[k]}
          onChange={(n) => setV((x) => ({ ...x, [k]: String(n) }))}
          error={errors.fields?.[k]}
        />
      ))}

      {config.questions.map((q) => (
        <div key={q.id}>
          {q.type === "scale" ? (
            <Scale id={`ck_q_${q.id}`} label={q.label} hint="1 a 10" value={str(answers[q.id] as number)} onChange={(n) => setAnswers((a) => ({ ...a, [q.id]: n }))} />
          ) : q.type === "yesno" ? (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium text-muted">{q.label}</legend>
              <div className="flex gap-2">
                {[
                  { v: true, l: "Sí" },
                  { v: false, l: "No" },
                ].map((o) => (
                  <button key={o.l} type="button" aria-pressed={answers[q.id] === o.v} onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.v }))} className={cn("h-10 flex-1 rounded-xl border text-sm font-semibold", answers[q.id] === o.v ? "border-red bg-red/10 text-fg" : "border-line text-muted")}>
                    {o.l}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <Field label={q.label} htmlFor={`ck_q_${q.id}`}>
              {q.type === "number" ? (
                <Input id={`ck_q_${q.id}`} inputMode="decimal" value={str(answers[q.id] as number)} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
              ) : (
                <Textarea id={`ck_q_${q.id}`} rows={2} maxLength={1000} value={str(answers[q.id] as string)} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
              )}
            </Field>
          )}
        </div>
      ))}

      {show("comments") && (
        <Field label="Comentarios para tu coach" htmlFor="ck_comments" error={errors.fields?.comments}>
          <Textarea id="ck_comments" rows={3} maxLength={3000} value={v.comments} onChange={set("comments")} placeholder="¿Cómo te sentiste? ¿Algo que haya que ajustar?" />
        </Field>
      )}

      {show("photos") && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium text-muted">Fotos de progreso (opcional){hasPhotos ? " · ya subiste fotos esta semana" : ""}</legend>
          <div className="grid grid-cols-3 gap-2">
            {POSES.map((p) => (
              <label key={p.id} className={cn("flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-2 py-3 text-center text-xs", fileNames[p.id] ? "border-ok/50 text-ok" : "border-line text-muted hover:border-faint")}>
                {fileNames[p.id] ? <Check size={18} /> : <Camera size={18} />}
                <span className="font-semibold">{p.label}</span>
                <span className="w-full truncate text-[10px] text-faint">{fileNames[p.id] ?? "Tocar para elegir"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label={`Foto de ${p.label}`}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 15 * 1024 * 1024)) {
                      setErrors({ error: "Foto no válida: usá JPG, PNG o WEBP de hasta 15 MB." });
                      return;
                    }
                    files.current[p.id] = f;
                    setFileNames((x) => ({ ...x, [p.id]: f?.name ?? "" }));
                  }}
                />
              </label>
            ))}
          </div>
          <p className="text-[11px] text-faint">Solo las ven vos y tu coach.</p>
        </fieldset>
      )}

      {errors.error && <p role="alert" className="text-sm text-bad">{errors.error}</p>}
      <Button type="submit" size="lg" disabled={pending} className="uppercase tracking-[0.1em]">
        {pending ? stage ?? "Enviando…" : existing ? "Guardar cambios" : "Enviar check-in"}
      </Button>
    </form>
  );
}

function Scale({ id, label, hint, value, onChange, error }: { id: string; label: string; hint: string; value: string; onChange: (n: number) => void; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-sm font-medium text-muted">
        <span>{label}</span>
        <span className="text-[11px] font-normal text-faint">{hint}</span>
      </legend>
      <div className="grid grid-cols-10 gap-1" id={id}>
        {Array.from({ length: 10 }, (_, i) => {
          const n = i + 1;
          const on = Number(value) === n;
          return (
            <button key={n} type="button" aria-pressed={on} aria-label={`${label} ${n}`} onClick={() => onChange(n)} className={cn("tnum h-10 rounded-lg border text-sm font-semibold", on ? "border-red bg-red text-white" : "border-line text-muted hover:border-faint")}>
              {n}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </fieldset>
  );
}
