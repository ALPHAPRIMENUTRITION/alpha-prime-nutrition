import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCoachPaymentSettings, listPendingPayments, listRecentPayments } from "@/lib/data/payments";
import { formatDate, formatMoney, relativeDays } from "@/lib/format";
import { MEMBERSHIP_LABEL, MEMBERSHIP_TONE } from "@/lib/membership";
import type { MembershipStatus } from "@/lib/types";
import { Badge, Card, EmptyState } from "@/components/ui";
import { PaymentSettingsForm, PendingPaymentActions } from "@/components/payments/coach-forms";
import { PaymentList } from "@/components/payments/payment-list";

export const metadata: Metadata = { title: "Pagos" };

export default async function CoachPayments() {
  const coach = await requireRole("coach");
  const supabase = await createClient();
  const [settings, pending, recent, { data: due }] = await Promise.all([
    getCoachPaymentSettings(coach.id),
    listPendingPayments(),
    listRecentPayments(30),
    supabase
      .from("coach_client_overview")
      .select("id, first_name, last_name, renewal_date, days_to_renewal, membership_status")
      .eq("coach_id", coach.id)
      .neq("membership_status", "suspended")
      .lte("days_to_renewal", 7)
      .order("days_to_renewal")
      .limit(100),
  ]);

  const since = Date.now() - 30 * 86_400_000;
  const income30 = recent.filter((p) => p.status === "succeeded" && p.paid_at && new Date(p.paid_at).getTime() >= since).reduce((s, p) => s + p.amount_cents, 0);
  const names = new Map(recent.map((p) => [p.client_id, p.client_name]));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Membresías</p>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Pagos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Tus clientes pagan con tu link (Cubo u otro). Cuando avisan que pagaron, lo verificás en tu cuenta del proveedor y lo confirmás acá: la renovación se corre sola.
        </p>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="h-pend">
        <h2 id="h-pend" className="eyebrow">Por confirmar {pending.length > 0 && <span className="text-red">· {pending.length}</span>}</h2>
        {pending.length === 0 ? (
          <Card><EmptyState title="Nada por confirmar" description="Cuando un cliente toque «Ya pagué», aparece acá." /></Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((p) => (
              <Card key={p.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/coach/clientes/${p.client_id}?tab=pagos`} className="font-semibold hover:text-red">{p.client_name}</Link>
                    <p className="text-xs text-faint">Avisó {relativeDays(p.created_at).toLowerCase()}{p.reference ? ` · Ref. ${p.reference}` : ""}</p>
                  </div>
                  <p className="tnum text-lg font-bold">{formatMoney(p.amount_cents)}</p>
                </div>
                <PendingPaymentActions paymentId={p.id} clientId={p.client_id} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3" aria-labelledby="h-due">
          <h2 id="h-due" className="eyebrow">Vencidos y por vencer (7 días)</h2>
          <Card>
            {due?.length ? (
              <ul>
                {due.map((c) => (
                  <li key={c.id} className="border-b border-line last:border-0">
                    <Link href={`/coach/clientes/${c.id}?tab=pagos`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-panel-2/50">
                      <span className="min-w-0 truncate font-medium">{`${c.first_name} ${c.last_name}`.trim()}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="tnum text-xs text-muted">
                          {c.days_to_renewal == null ? "Sin fecha" : c.days_to_renewal < 0 ? `venció hace ${-c.days_to_renewal} d` : c.days_to_renewal === 0 ? "vence hoy" : `${formatDate(c.renewal_date, true)} · ${c.days_to_renewal} d`}
                        </span>
                        <Badge tone={MEMBERSHIP_TONE[c.membership_status as MembershipStatus]}>{MEMBERSHIP_LABEL[c.membership_status as MembershipStatus]}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Todos al día" />
            )}
          </Card>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="h-rec">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="h-rec" className="eyebrow">Últimos pagos</h2>
            <p className="text-xs text-muted">Cobrado en 30 días: <span className="tnum font-semibold text-fg">{formatMoney(income30)}</span></p>
          </div>
          <Card>
            {recent.length ? <PaymentList items={recent} names={names} /> : <EmptyState title="Sin pagos todavía" />}
          </Card>
        </section>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="h-cfg">
        <h2 id="h-cfg" className="eyebrow">Tu link de pago</h2>
        <Card className="p-5">
          <PaymentSettingsForm initial={settings} />
          <p className="mt-4 border-t border-line pt-3 text-xs text-faint">
            En Cubo creá un «Link de suscripción» con cobro mensual y pegalo acá. Si un cliente paga otro monto, ponele su propio link en su perfil → Pagos. La app no ve ni guarda datos de tarjetas.
          </p>
        </Card>
      </section>
    </div>
  );
}
