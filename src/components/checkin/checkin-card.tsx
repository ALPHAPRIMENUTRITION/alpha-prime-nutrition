import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";
import { kgToLb, type CheckinConfig, type CheckinRow } from "@/lib/checkin";
import type { CheckinPhoto } from "@/lib/data/checkins";
import { formatDate, relativeDays } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/cn";

const POSE = { front: "Frente", side: "Perfil", back: "Espalda", other: "Otra" } as Record<string, string>;
const n1 = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function Delta({ cur, prev, unit, goodWhenDown }: { cur: number | null; prev: number | null | undefined; unit: string; goodWhenDown?: boolean }) {
  if (cur == null || prev == null) return null;
  const d = Math.round((cur - prev) * 10) / 10;
  if (d === 0) return <span className="text-xs text-faint">= igual</span>;
  // Color suave: no se marca en rojo; solo verde si va en la dirección habitual del objetivo.
  const good = goodWhenDown ? d < 0 : d > 0;
  return <span className={cn("tnum text-xs font-semibold", good ? "text-ok" : "text-muted")}>{d > 0 ? "+" : ""}{n1(d)} {unit}</span>;
}

/** Resumen de un check-in con comparación contra el anterior, fotos y devolución. */
export function CheckinCard({
  c,
  previous,
  photos = [],
  config,
  title,
  titleHref,
  children,
}: {
  c: CheckinRow;
  previous?: CheckinRow | null;
  photos?: CheckinPhoto[];
  config?: CheckinConfig;
  title?: string;
  titleHref?: string;
  children?: React.ReactNode;
}) {
  const adherence = c.coach_adherence_override ?? c.adherence_score;
  const stats: { label: string; value: React.ReactNode; delta?: React.ReactNode }[] = [];
  if (c.weight_kg != null) stats.push({ label: "Peso", value: <>{n1(c.weight_kg)} kg <span className="text-xs font-normal text-faint">({kgToLb(c.weight_kg)} lb)</span></>, delta: <Delta cur={c.weight_kg} prev={previous?.weight_kg} unit="kg" goodWhenDown /> });
  if (c.waist_cm != null) stats.push({ label: "Cintura", value: `${n1(c.waist_cm)} cm`, delta: <Delta cur={c.waist_cm} prev={previous?.waist_cm} unit="cm" goodWhenDown /> });
  if (c.nutrition_adherence_pct != null) stats.push({ label: "Plan nutricional", value: `${c.nutrition_adherence_pct} %` });
  if (c.workouts_completed != null) stats.push({ label: "Entrenamientos", value: `${c.workouts_completed}${c.workouts_planned ? ` de ${c.workouts_planned}` : ""}` });
  if (c.cardio_minutes != null) stats.push({ label: "Cardio", value: `${c.cardio_minutes} min` });
  if (c.sleep_hours != null) stats.push({ label: "Sueño", value: `${n1(c.sleep_hours)} h`, delta: <Delta cur={c.sleep_hours} prev={previous?.sleep_hours} unit="h" /> });
  if (c.energy != null) stats.push({ label: "Energía", value: `${c.energy}/10`, delta: <Delta cur={c.energy} prev={previous?.energy} unit="" /> });
  if (c.hunger != null) stats.push({ label: "Hambre", value: `${c.hunger}/10` });
  if (c.stress != null) stats.push({ label: "Estrés", value: `${c.stress}/10` });

  const answers = (config?.questions ?? []).filter((q) => c.extra_answers[q.id] !== undefined);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {title && (titleHref ? <Link href={titleHref} className="font-display text-xl font-extrabold uppercase tracking-tight hover:text-red">{title}</Link> : <p className="font-display text-xl font-extrabold uppercase tracking-tight">{title}</p>)}
          <p className="text-sm text-muted">Semana del {formatDate(c.week_start)} · enviado {relativeDays(c.submitted_at).toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          {adherence != null && (
            <span className={cn("tnum rounded-full px-2.5 py-1 text-xs font-bold", adherence >= 85 ? "bg-ok/15 text-ok" : adherence >= 70 ? "bg-warn/15 text-warn" : "bg-panel-2 text-muted")} title={c.coach_adherence_override != null ? "Adherencia revisada por el coach" : "Adherencia calculada (60 % nutrición + 40 % entrenamiento)"}>
              Adherencia {adherence} %
            </span>
          )}
          {c.status === "reviewed" ? <Badge tone="ok">Revisado</Badge> : <Badge tone="warn">Por revisar</Badge>}
        </div>
      </div>

      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">{s.label}</dt>
              <dd className="tnum flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold">
                {s.value}
                {s.delta}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {previous && <p className="-mt-2 text-[11px] text-faint">Comparado con la semana del {formatDate(previous.week_start)}.</p>}

      {answers.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
          {answers.map((q) => {
            const a = c.extra_answers[q.id];
            return (
              <li key={q.id}>
                <span className="text-muted">{q.label}: </span>
                <span className="font-medium">{typeof a === "boolean" ? (a ? "Sí" : "No") : q.type === "scale" ? `${a}/10` : String(a)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {c.comments && (
        <div className="rounded-xl bg-graphite px-4 py-3 text-sm">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Comentarios del cliente</p>
          <p className="whitespace-pre-wrap">{c.comments}</p>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Foto ${POSE[p.pose] ?? ""}`} className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-105" />
              <span className="absolute bottom-1 left-1 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold">{POSE[p.pose] ?? "Foto"}</span>
            </a>
          ))}
        </div>
      )}

      {c.coach_feedback && (
        <div className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-red">
            <MessageSquareQuote size={13} aria-hidden="true" /> Devolución del coach{c.reviewed_at ? ` · ${formatDate(c.reviewed_at.slice(0, 10))}` : ""}
          </p>
          <p className="whitespace-pre-wrap">{c.coach_feedback}</p>
        </div>
      )}

      {children}
    </Card>
  );
}
