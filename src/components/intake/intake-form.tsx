"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, FileText, Lock, MessageCircle, Send, Upload, X } from "lucide-react";
import type { IntakeState } from "@/app/empezar/actions";
import { isVisible, sectionsFor, type IntakeAnswers, type IntakeKind, type IntakeQuestion } from "@/lib/intake";
import { cn } from "@/lib/cn";

type Action = (prev: IntakeState, fd: FormData) => Promise<IntakeState>;

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-ink px-3.5 text-base text-fg placeholder:text-faint focus:border-faint focus:outline-none aria-[invalid=true]:border-bad";

/** Lee el formulario para saber qué preguntas condicionales mostrar. */
function snapshot(form: HTMLFormElement): IntakeAnswers {
  const fd = new FormData(form);
  const out: IntakeAnswers = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    const prev = out[k];
    out[k] = prev == null ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

const MAX_FILES = 3;
const MAX_PDF = 1.5 * 1024 * 1024;

/** Reduce fotos a 1600 px en WebP para que suban rápido (los PDF se mandan tal cual). */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.82));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

/** Selector de archivos: fotos o PDF, hasta 3. */
function FilePicker({ name, photosOnly = false, max = MAX_FILES }: { name: string; photosOnly?: boolean; max?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sync = (list: File[]) => {
    const dt = new DataTransfer();
    list.forEach((f) => dt.items.add(f));
    if (ref.current) ref.current.files = dt.files;
    setFiles(list);
  };

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setMsg(null);
    const ok = picked.filter((f) => f.type.startsWith("image/") || (!photosOnly && f.type === "application/pdf"));
    if (ok.length < picked.length) setMsg(photosOnly ? "Solo fotos." : "Solo fotos o PDF.");
    if (ok.some((f) => f.type === "application/pdf" && f.size > MAX_PDF)) setMsg("Cada PDF puede pesar hasta 1.5 MB. Si es más pesado, subí una foto de cada página.");
    setBusy(true);
    const shrunk = await Promise.all(ok.filter((f) => !(f.type === "application/pdf" && f.size > MAX_PDF)).map(shrink));
    setBusy(false);
    const next = max === 1 ? shrunk.slice(0, 1) : [...files, ...shrunk].slice(0, max);
    if (max > 1 && files.length + shrunk.length > max) setMsg(`Máximo ${max} archivos.`);
    sync(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={ref} type="file" name={name} multiple={max > 1} accept={photosOnly ? "image/*" : "image/*,application/pdf"} className="hidden" onChange={onPick} />
      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li key={f.name + i} className="flex items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2 text-sm">
              {f.type === "application/pdf" ? (
                <FileText size={16} className="text-red" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(f)} alt="" className="h-12 w-12 rounded-lg object-cover" />
              )}
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <button type="button" aria-label={`Quitar ${f.name}`} onClick={() => sync(files.filter((_, k) => k !== i))} className="text-faint hover:text-bad">
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < max && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (ref.current) ref.current.value = "";
            // Al reabrir el selector se pierde la selección anterior: se guarda y se vuelve a sumar
            const keep = files;
            ref.current?.addEventListener("cancel", () => sync(keep), { once: true });
            ref.current?.click();
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-semibold text-muted hover:text-fg disabled:opacity-60"
        >
          <Upload size={17} /> {busy ? "Preparando…" : files.length ? "Agregar otro" : photosOnly ? "Subir foto" : "Subir foto o PDF"}
        </button>
      )}
      {msg && <span className="text-sm text-warn">{msg}</span>}
    </div>
  );
}

function Question({ q, value, error }: { q: IntakeQuestion; value: IntakeAnswers[string] | undefined; error?: string }) {
  const id = `q_${q.key}`;
  const label = (
    <span className="text-sm font-semibold">
      {q.label}
      {q.required && <span className="text-red"> *</span>}
    </span>
  );
  const hint = q.hint && <span className="text-xs text-faint">{q.hint}</span>;
  const err = error && <span className="text-sm text-bad">{error}</span>;
  const str = typeof value === "string" ? value : "";

  if (q.type === "file") {
    return (
      <div className={cn("flex flex-col gap-1.5", q.wide && "sm:col-span-2")}>
        <span>{label}</span>
        <FilePicker name={q.key} photosOnly={q.photosOnly} max={q.maxFiles ?? MAX_FILES} />
        {hint}
        {err}
      </div>
    );
  }

  if (q.type === "radio" || q.type === "checkbox") {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <fieldset className={cn("flex flex-col gap-2", q.wide && "sm:col-span-2")} aria-invalid={Boolean(error)}>
        <legend className="mb-2">{label}</legend>
        <div className="flex flex-wrap gap-2">
          {q.options!.map((o) => (
            <label key={o} className="cursor-pointer">
              <input type={q.type} name={q.key} value={o} defaultChecked={list.includes(o)} className="peer sr-only" />
              <span className="inline-flex min-h-11 items-center rounded-xl border border-line bg-ink px-3.5 py-2 text-sm text-muted transition-colors peer-checked:border-red peer-checked:bg-red/15 peer-checked:text-fg peer-focus-visible:outline-2 peer-focus-visible:outline-red">
                {o}
              </span>
            </label>
          ))}
        </div>
        {hint}
        {err}
      </fieldset>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", q.wide && "sm:col-span-2")}>
      <label htmlFor={id}>{label}</label>
      {q.type === "textarea" ? (
        <textarea id={id} name={q.key} defaultValue={str} maxLength={q.max} placeholder={q.placeholder} rows={3} aria-invalid={Boolean(error)} className={cn(inputCls, "h-auto min-h-24 py-3")} />
      ) : q.type === "select" ? (
        <select id={id} name={q.key} defaultValue={str} aria-invalid={Boolean(error)} className={inputCls}>
          <option value="">Elegí…</option>
          {q.options!.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={q.key}
          type={q.type}
          defaultValue={str}
          maxLength={q.max && q.type !== "number" ? q.max : undefined}
          min={q.type === "number" ? q.min : undefined}
          max={q.type === "number" ? q.max : undefined}
          step={q.type === "number" ? "any" : undefined}
          inputMode={q.type === "number" ? "decimal" : q.type === "tel" ? "tel" : q.type === "email" ? "email" : undefined}
          autoComplete={q.key === "first_name" ? "given-name" : q.key === "last_name" ? "family-name" : q.type === "email" ? "email" : q.type === "tel" ? "tel" : "off"}
          placeholder={q.placeholder}
          aria-invalid={Boolean(error)}
          className={inputCls}
        />
      )}
      {hint}
      {err}
    </div>
  );
}

export function IntakeForm({ action, greetingName, whatsappHref, kind }: { action: Action; greetingName?: string | null; whatsappHref: string | null; kind: IntakeKind }) {
  const [state, formAction, pending] = useActionState<IntakeState, FormData>(action, {});
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const shown = { ...(state.answers ?? {}), ...answers };

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-panel px-6 py-12 text-center">
        <CheckCircle2 size={52} className="text-ok" />
        <h2 className="font-display text-4xl font-extrabold uppercase leading-none">¡Gracias{state.firstName ? `, ${state.firstName}` : ""}!</h2>
        <p className="max-w-md text-muted">
          {greetingName
            ? "Tu coach ya recibió tus respuestas. Con esto arma tu plan a tu medida."
            : "Ya recibí tu solicitud. Te escribo por WhatsApp para contarte los detalles y coordinar tu evaluación (online o presencial)."}
        </p>
        {whatsappHref && !greetingName && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex h-12 items-center gap-2 rounded-xl bg-red px-6 font-semibold text-white hover:bg-red-hover">
            <MessageCircle size={19} /> Escribime ahora por WhatsApp
          </a>
        )}
      </div>
    );
  }

  const sections = sectionsFor(kind).map((s) => ({ ...s, questions: s.questions.filter((q) => isVisible(q, shown)) }));

  return (
    <form
      key={state.savedAt ?? "init"}
      action={formAction}
      noValidate
      onChange={(e) => setAnswers(snapshot(e.currentTarget))}
      className="flex flex-col gap-5"
    >
      {state.error && (
        <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
          {state.error}
        </p>
      )}

      {sections.map((s, i) => (
        <section key={s.id} className="rounded-card border border-line bg-panel p-5 sm:p-6" aria-labelledby={`sec_${s.id}`}>
          {sections.length > 1 && (
            <p className="eyebrow text-red">
              {i + 1} / {sections.length}
            </p>
          )}
          <h2 id={`sec_${s.id}`} className="mt-1 font-display text-3xl font-extrabold uppercase leading-none">
            {s.title}
          </h2>
          {s.intro && (
            <p className="mt-2 flex items-start gap-2 text-sm text-muted">
              <Lock size={15} className="mt-0.5 shrink-0 text-red" /> {s.intro}
            </p>
          )}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {s.questions.map((q) => (
              <Question key={q.key} q={q} value={shown[q.key]} error={answers[q.key] ? undefined : state.errors?.[q.key]} />
            ))}
          </div>
        </section>
      ))}

      {/* Trampa para robots: invisible para personas */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No llenar <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-card border border-line bg-panel p-5">
        <input type="checkbox" name="consent" value="1" className="mt-0.5 h-5 w-5 shrink-0 accent-[#e3242f]" />
        <span className="text-sm">
          Autorizo que Alpha Prime use estos datos solo para armar y dar seguimiento a mi plan.
          {state.errors?.consent && !answers.consent && <span className="mt-1 block text-bad">{state.errors.consent}</span>}
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-red px-6 text-lg font-semibold text-white transition-colors hover:bg-red-hover disabled:opacity-60"
      >
        <Send size={19} /> {pending ? "Enviando…" : kind === "short" ? "Enviar solicitud" : "Enviar cuestionario"}
      </button>
      <p className="text-center text-xs text-faint">{kind === "short" ? "Te toma 1 minuto. Te respondo por WhatsApp." : "Te toma unos 5 minutos. Solo tu coach ve tus respuestas."}</p>
    </form>
  );
}
