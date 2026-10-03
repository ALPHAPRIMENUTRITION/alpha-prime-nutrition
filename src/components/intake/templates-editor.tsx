"use client";

import { useState, useTransition } from "react";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { DEFAULT_TEMPLATES, TEMPLATE_SERVICES, TEMPLATE_VARS, type MessageTemplate, type TemplateService } from "@/lib/messages";
import { saveTemplatesAction } from "@/app/coach/mensajes/actions";

const field = "w-full rounded-xl border border-line bg-ink px-3.5 text-base text-fg placeholder:text-faint focus:border-faint focus:outline-none";

export function TemplatesEditor({ initial }: { initial: MessageTemplate[] }) {
  const [list, setList] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (i: number, patch: Partial<MessageTemplate>) => {
    setList((l) => l.map((t, k) => (k === i ? { ...t, ...patch } : t)));
    setMsg(null);
  };
  const save = (value: MessageTemplate[] | null) =>
    start(async () => {
      const r = await saveTemplatesAction(value);
      setMsg(r.ok ? { ok: true, text: "Guardado." } : { ok: false, text: r.error ?? "Error" });
      if (r.ok && value === null) setList(DEFAULT_TEMPLATES);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-line bg-panel p-4 text-sm text-muted">
        Se reemplazan solos con los datos de cada persona:{" "}
        {TEMPLATE_VARS.map((v) => (
          <span key={v.key} className="mr-2 inline-block">
            <code className="rounded bg-panel-2 px-1.5 py-0.5 text-fg">{v.key}</code> <span className="text-faint">→ {v.hint}</span>
          </span>
        ))}
      </div>

      {list.map((t, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-card border border-line bg-panel p-4">
          <div className="flex items-center gap-2">
            <input aria-label="Título" value={t.title} maxLength={60} onChange={(e) => set(i, { title: e.target.value })} className={`${field} h-11 font-semibold`} />
            <button type="button" aria-label={`Eliminar ${t.title}`} onClick={() => setList((l) => l.filter((_, k) => k !== i))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-faint hover:bg-bad/10 hover:text-bad">
              <Trash2 size={17} />
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            Se muestra en:
            <select
              value={t.service ?? ""}
              onChange={(e) => set(i, { service: (e.target.value || undefined) as TemplateService | undefined })}
              className="h-9 rounded-lg border border-line bg-ink px-2 text-sm text-fg"
            >
              {TEMPLATE_SERVICES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <textarea aria-label={`Texto de ${t.title}`} value={t.body} maxLength={1500} rows={6} onChange={(e) => set(i, { body: e.target.value })} className={`${field} py-3 leading-relaxed`} />
        </div>
      ))}

      {list.length < 20 && (
        <button type="button" onClick={() => setList((l) => [...l, { title: "Nuevo mensaje", body: "¡Hola {nombre}! " }])} className="flex h-12 items-center justify-center gap-2 rounded-card border border-dashed border-line text-sm font-semibold text-muted hover:text-fg">
          <Plus size={17} /> Agregar mensaje
        </button>
      )}

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-card border border-line bg-graphite/95 p-3 backdrop-blur lg:bottom-4">
        <Button type="button" onClick={() => save(list)} disabled={pending}>
          <Save size={17} /> {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => save(null)} disabled={pending}>
          <RotateCcw size={16} /> Volver a los de fábrica
        </Button>
        {msg && <span role="status" className={msg.ok ? "text-sm text-ok" : "text-sm text-bad"}>{msg.text}</span>}
      </div>
    </div>
  );
}
