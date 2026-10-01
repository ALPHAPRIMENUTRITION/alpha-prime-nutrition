import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ClientOverviewRow } from "@/lib/types";
import { MEMBERSHIP_LABEL, MEMBERSHIP_TONE, LOW_ADHERENCE_PCT } from "@/lib/membership";
import { formatDate, formatKg, formatPct, relativeDays } from "@/lib/format";
import { Avatar, Badge, buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";

function AdherenceBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-faint">—</span>;
  const low = value < LOW_ADHERENCE_PCT;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-panel-2" aria-hidden="true">
        <div className={cn("h-full rounded-full", low ? "bg-warn" : "bg-ok")} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className={cn("tnum text-sm", low && "text-warn")}>{formatPct(value)}</span>
    </div>
  );
}

function fullName(c: ClientOverviewRow) {
  return `${c.first_name} ${c.last_name}`.trim();
}

function renewalText(c: ClientOverviewRow) {
  if (!c.renewal_date) return "Sin fecha";
  const d = c.days_to_renewal ?? 0;
  if (d < 0) return `${formatDate(c.renewal_date, true)} · hace ${-d} d`;
  if (d === 0) return "Hoy";
  return `${formatDate(c.renewal_date, true)} · en ${d} d`;
}

export function ClientTable({ clients }: { clients: ClientOverviewRow[] }) {
  return (
    <>
      {/* Escritorio / tablet horizontal */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-panel md:block">
        <table className="w-full min-w-[900px] whitespace-nowrap text-left text-sm">
          <thead>
            <tr className="border-b border-line text-faint">
              {["Cliente", "Peso actual", "% grasa", "Adherencia", "Último check-in", "Membresía", "Renovación", ""].map((h) => (
                <th key={h} scope="col" className="px-2.5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-panel-2/50">
                <td className="px-2.5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={fullName(c)} src={c.avatar_url} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{fullName(c)}</p>
                      <p className="max-w-[11rem] truncate text-xs text-muted">{c.goal || "Sin objetivo definido"}</p>
                    </div>
                  </div>
                </td>
                <td className="tnum px-2.5 py-3">{formatKg(c.current_weight_kg)}</td>
                <td className="tnum px-2.5 py-3">{formatPct(c.current_body_fat_pct)}</td>
                <td className="px-2.5 py-3">
                  <AdherenceBar value={c.adherence_pct} />
                </td>
                <td className={cn("px-2.5 py-3", c.checkin_pending ? "text-warn" : "text-muted")}>{relativeDays(c.last_checkin_at)}</td>
                <td className="px-2.5 py-3">
                  <Badge tone={MEMBERSHIP_TONE[c.membership_status]}>{MEMBERSHIP_LABEL[c.membership_status]}</Badge>
                </td>
                <td className="tnum px-2.5 py-3 text-muted">{renewalText(c)}</td>
                <td className="px-2.5 py-3 text-right">
                  <Link href={`/coach/clientes/${c.id}`} className={buttonClass("secondary", "sm")}>
                    Ver perfil
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil */}
      <ul className="flex flex-col overflow-hidden rounded-card border border-line bg-panel md:hidden">
        {clients.map((c) => (
          <li key={c.id} className="border-b border-line last:border-0">
            <Link href={`/coach/clientes/${c.id}`} className="flex items-center gap-3 px-2.5 py-3.5 active:bg-panel-2">
              <Avatar name={fullName(c)} src={c.avatar_url} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">{fullName(c)}</p>
                  <Badge tone={MEMBERSHIP_TONE[c.membership_status]}>{MEMBERSHIP_LABEL[c.membership_status]}</Badge>
                </div>
                <p className="tnum mt-0.5 truncate text-xs text-muted">
                  {formatKg(c.current_weight_kg)} · Adh. {formatPct(c.adherence_pct)} ·{" "}
                  <span className={c.checkin_pending ? "text-warn" : undefined}>Check-in {relativeDays(c.last_checkin_at).toLowerCase()}</span>
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
