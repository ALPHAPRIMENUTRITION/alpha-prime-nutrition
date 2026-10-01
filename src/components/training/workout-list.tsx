import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { WorkoutMeta } from "@/lib/training/plan";
import { formatDate } from "@/lib/format";
import { Badge, Card } from "@/components/ui";

/** Lista de rutinas (de un cliente o plantillas). */
export function WorkoutList({ plans, empty }: { plans: WorkoutMeta[]; empty: string }) {
  if (!plans.length) return <Card className="px-6 py-8 text-center text-sm text-muted">{empty}</Card>;
  return (
    <Card className="p-0">
      <ul>
        {plans.map((p) => (
          <li key={p.id} className="border-b border-line last:border-0">
            <Link href={`/coach/rutinas/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-panel-2/50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{p.name}</p>
                  {p.client_id && (p.is_active ? <Badge tone="ok">Activa</Badge> : <Badge tone="warn">Borrador</Badge>)}
                </div>
                <p className="tnum mt-0.5 text-xs text-muted">
                  {p.weeks} {p.weeks === 1 ? "semana" : "semanas"} · actualizada {formatDate(p.updated_at)}
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
