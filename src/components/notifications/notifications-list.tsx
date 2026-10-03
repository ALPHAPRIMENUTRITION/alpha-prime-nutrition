import Link from "next/link";
import { Bell, CalendarCheck, ClipboardCheck, ClipboardList, CreditCard, Dumbbell, RefreshCw, Utensils } from "lucide-react";
import { formatDate, relativeDays } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { MarkAllRead } from "@/components/notifications/mark-all-read";
import { cn } from "@/lib/cn";

export interface NotificationRow { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }

const ICON: Record<string, typeof Bell> = {
  checkin_pending: CalendarCheck,
  checkin_submitted: ClipboardCheck,
  checkin_reviewed: ClipboardCheck,
  plan_new: Utensils,
  plan_updated: RefreshCw,
  payment_upcoming: CreditCard,
  payment_failed: CreditCard,
  membership_expired: CreditCard,
  renewal_success: CreditCard,
  payment_reported: CreditCard,
  intake_submitted: ClipboardList,
};

export function NotificationsList({ items }: { items: NotificationRow[] }) {
  const unread = items.some((n) => !n.read_at);
  return (
    <div className="flex flex-col gap-4">
      {unread && <MarkAllRead />}
      {items.length === 0 ? (
        <Card><EmptyState title="Sin notificaciones" description="Acá vas a ver avisos de check-ins, planes y membresía." /></Card>
      ) : (
        <Card className="p-0">
          <ul>
            {items.map((n) => {
              const Icon = n.link?.includes("entrenamiento") ? Dumbbell : (ICON[n.type] ?? Bell);
              const inner = (
                <div className="flex gap-3 px-4 py-3.5">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", n.read_at ? "bg-panel-2 text-muted" : "bg-red/15 text-red")}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", n.read_at ? "font-medium text-muted" : "font-semibold")}>{n.title}</p>
                    {n.body && <p className="text-sm text-muted">{n.body}</p>}
                    <p className="mt-0.5 text-xs text-faint" title={formatDate(n.created_at)}>{relativeDays(n.created_at)}</p>
                  </div>
                  {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red" aria-label="Sin leer" />}
                </div>
              );
              return (
                <li key={n.id} className="border-b border-line last:border-0">
                  {n.link ? <Link href={n.link} className="block hover:bg-panel-2/50">{inner}</Link> : inner}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
