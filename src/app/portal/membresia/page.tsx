import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/data/portal";
import { formatDate, formatMoney } from "@/lib/format";
import { MEMBERSHIP_LABEL, MEMBERSHIP_TONE } from "@/lib/membership";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { MembershipWarning } from "@/components/portal/membership-warning";

export const metadata: Metadata = { title: "Membresía" };

const PAYMENT_STATUS: Record<string, string> = {
  succeeded: "Pagado",
  failed: "Fallido",
  pending: "Pendiente",
  refunded: "Reembolsado",
};

// Esta página siempre es accesible, aunque la membresía haya vencido.
export default async function MembershipPage() {
  const ctx = await getPortalContext();
  if (!ctx) return <Card><EmptyState title="Cuenta sin programa" /></Card>;

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount_cents, currency, status, description, paid_at, created_at")
    .eq("client_id", ctx.client.id)
    .order("created_at", { ascending: false })
    .limit(24);

  const sub = ctx.subscription;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Membresía</h1>
      <MembershipWarning status={ctx.membership} />

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow">Estado</span>
          <Badge tone={MEMBERSHIP_TONE[ctx.membership]}>{MEMBERSHIP_LABEL[ctx.membership]}</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-faint">Plan</dt>
            <dd className="font-semibold">{sub?.plan_name ?? "Coaching mensual"}</dd>
          </div>
          <div>
            <dt className="text-faint">Próximo pago</dt>
            <dd className="font-semibold">{formatDate(ctx.client.renewal_date)}</dd>
          </div>
          {sub?.amount_cents != null && (
            <div>
              <dt className="text-faint">Monto</dt>
              <dd className="tnum font-semibold">{formatMoney(sub.amount_cents)}</dd>
            </div>
          )}
        </dl>
        {/* El pago en línea se habilita en la fase de pagos (Stripe Checkout). */}
        <Button size="lg" disabled className="w-full uppercase tracking-[0.12em]" aria-describedby="renew-note">
          Renovar ahora
        </Button>
        <p id="renew-note" className="text-center text-xs text-faint">
          El pago en línea estará disponible pronto. Mientras tanto, coordiná tu renovación con {ctx.coachName}.
        </p>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Historial de pagos</h2>
        <Card>
          {payments?.length ? (
            <ul>
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-sm last:border-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.description ?? "Pago de membresía"}</p>
                    <p className="text-xs text-faint">{formatDate((p.paid_at ?? p.created_at) as string)}</p>
                  </div>
                  <div className="text-right">
                    <p className="tnum font-semibold">{formatMoney(p.amount_cents)}</p>
                    <p className={p.status === "failed" ? "text-xs text-bad" : "text-xs text-faint"}>{PAYMENT_STATUS[p.status] ?? p.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin pagos" description="Tus pagos van a aparecer acá." />
          )}
        </Card>
      </section>
    </div>
  );
}
