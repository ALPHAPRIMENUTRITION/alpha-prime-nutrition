"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveCheckinConfigAction } from "@/app/coach/checkins/actions";
import { QUESTION_TYPES, STANDARD_FIELDS, WEEKDAYS, type CheckinConfig, type CustomQuestion, type QuestionType, type StandardKey } from "@/lib/checkin";
import { Button, Card, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";

const rid = () => Math.random().toString(36).slice(2, 10);

export function CheckinConfigEditor({ weekday: w0, config }: { weekday: number; config: CheckinConfig }) {
  const router = useRouter();
  const [weekday, setWeekday] = useState(w0);
  const [hidden, setHidden] = useState<StandardKey[]>(config.hidden);
  const [questions, setQuestions] = useState<CustomQuestion[]>(config.questions);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [pending, start] = useTransition();

  const toggle = (k: StandardKey) => setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]));
  const upd = (id: string, patch: Partial<CustomQuestion>) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-3 p-5">
        <p className="font-semibold">Día del check-in</p>
        <p className="text-sm text-muted">Ese día, si el cliente todavía no lo envió, recibe un aviso en la app. Puede enviarlo en cualquier momento de la semana.</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button key={d} type="button" aria-pressed={weekday === d} onClick={() => setWeekday(d)} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold", weekday === d ? "border-red bg-red/10 text-fg" : "border-line text-muted hover:border-faint")}>
              {WEEKDAYS[d]}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <p className="font-semibold">Campos del formulario</p>
        <p className="text-sm text-muted">Desmarcá los que no quieras pedir.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {STANDARD_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-sm">
              <input type="checkbox" checked={!hidden.includes(f.key)} onChange={() => toggle(f.key)} className="h-4 w-4 accent-[var(--color-red)]" />
              <span className="min-w-0">
                <span className="font-medium">{f.label}</span>
                {f.hint && <span className="block text-xs text-faint">{f.hint}</span>}
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <p className="font-semibold">Preguntas propias</p>
        <p className="text-sm text-muted">Ej. "¿Cumpliste los 10.000 pasos?", "¿Cuántos litros de agua tomaste por día?".</p>
        {questions.map((q, i) => (
          <div key={q.id} className="flex flex-wrap items-center gap-2">
            <span className="tnum w-5 text-sm text-faint">{i + 1}.</span>
            <Input aria-label={`Pregunta ${i + 1}`} value={q.label} onChange={(e) => upd(q.id, { label: e.target.value })} maxLength={120} placeholder="Escribí la pregunta" className="min-w-0 flex-1" />
            <Select aria-label={`Tipo de respuesta ${i + 1}`} value={q.type} onChange={(e) => upd(q.id, { type: e.target.value as QuestionType })}>
              {QUESTION_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
            <button type="button" onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-bad" aria-label={`Quitar pregunta ${i + 1}`}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {questions.length < 15 && (
          <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setQuestions((qs) => [...qs, { id: rid(), label: "", type: "text" }])}>
            <Plus size={15} /> Agregar pregunta
          </Button>
        )}
      </Card>

      {msg && <p role="status" className={msg.bad ? "text-sm text-bad" : "text-sm text-ok"}>{msg.text}</p>}
      <Button
        type="button"
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await saveCheckinConfigAction({ weekday, hidden, questions: questions.filter((q) => q.label.trim()) });
            if (!res.ok) return setMsg({ text: res.error, bad: true });
            setMsg({ text: "Configuración guardada" });
            router.refresh();
          })
        }
      >
        {pending ? "Guardando…" : "Guardar configuración"}
      </Button>
    </div>
  );
}
