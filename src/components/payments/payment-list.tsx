import Link from "next/link";
import { formatDate, formatMoney } from "@/lib/format";
import { METHOD_LABEL, PAYMENT_STATUS_LABEL, type PaymentRow } from "@/lib/payments";
import { cn } from "@/lib/cn";

/** Historial de pagos (coach o cliente). */
export function PaymentList({ items, names }: { items: PaymentRow[]; names?: Map<string, string> }) {
  return (
    <ul>
      {items.map((p) => {
        const name = names?.get(p.client_id);
        const detail = [name ? (p.method ? METHOD_LABEL[p.method] : p.description) : null, p.months > 1 ? `${p.months} meses` : null, p.reference ? `Ref. ${p.reference}` : null]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={p.id} className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 text-sm last:border-0">
            <div className="min-w-0">
              {name ? (
                <Link href={`/coach/clientes/${p.client_id}?tab=pagos`} className="block truncate font-medium hover:text-red">{name}</Link>
              ) : (
                <p className="truncate font-medium">{p.description ?? "Pago de membresía"}</p>
              )}
              <p className="truncate text-xs text-faint">{formatDate(p.paid_at ?? p.created_at)}{detail ? ` · ${detail}` : ""}</p>
              {p.status === "failed" && p.note && <p className="text-xs text-muted">«{p.note}»</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className="tnum font-semibold">{formatMoney(p.amount_cents)}</p>
              <p className={cn("text-xs", p.status === "succeeded" ? "text-ok" : p.status === "pending" ? "text-warn" : "text-faint")}>{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
