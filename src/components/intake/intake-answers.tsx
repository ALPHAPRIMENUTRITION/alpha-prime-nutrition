import { HeartPulse } from "lucide-react";
import { INTAKE_SECTIONS, answerText, type IntakeAnswers } from "@/lib/intake";
import { cn } from "@/lib/cn";

/** Respuestas del cuestionario agrupadas por sección (vista del coach). */
export function IntakeAnswersView({ answers }: { answers: IntakeAnswers }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {INTAKE_SECTIONS.map((s) => {
        const rows = s.questions
          .map((q) => {
            const raw = answerText(answers[q.key]);
            // Fechas en formato local (10/04/1995)
            const v = q.type === "date" && raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw.split("-").reverse().join("/") : raw;
            return { q, v };
          })
          .filter((r) => r.v);
        if (!rows.length) return null;
        const health = s.id === "salud";
        return (
          <section key={s.id} className={cn("rounded-card border bg-panel p-5", health ? "border-warn/40" : "border-line")}>
            <h3 className="flex items-center gap-2 font-display text-2xl font-extrabold uppercase">
              {health && <HeartPulse size={20} className="text-warn" />} {s.title}
            </h3>
            <dl className="mt-3 flex flex-col divide-y divide-line">
              {rows.map(({ q, v }) => (
                <div key={q.key} className="grid gap-0.5 py-2.5 sm:grid-cols-[13rem_1fr] sm:gap-4">
                  <dt className="text-sm text-muted">{q.label}</dt>
                  <dd className="whitespace-pre-wrap break-words text-sm font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
