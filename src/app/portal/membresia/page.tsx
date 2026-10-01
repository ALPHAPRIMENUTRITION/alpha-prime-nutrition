import type { Metadata } from "next";
import { Clock, ExternalLink, Lock } from "lucide-react";
import { getPortalContext } from "@/lib/data/portal";
import { getClientPayments, getMyPaymentInfo } from "@/lib/data/payments";
import { formatDate, formatMoney } from "@/lib/format";
import { MEMBERSHIP_LABEL, MEMBERSHIP_TONE } from "@/lib/membership";
import { payButtonLabel } from "@/lib/payments";
import { Badge, Card, EmptyState, buttonClass } from "@/components/ui";
import { MembershipWarning } from "@/components/portal/membership-warning";
import { PaymentList } from "@/components/payments/payment-list";
import { ReportPayment } from "@/components/payments/report-payment";

export const metadata: Metadata = { title: "Membresía" };

// Esta página siempre es accesible, aunque la membresía haya vencido.
export default async function MembershipPage() {
  const ctx = await getPortalContext();
  if (!ctx) return <Card><EmptyState title="Cuenta sin programa" /></Card>;

  const [info, payments] = await Promise.all([getMyPaymentInfo(), getClientPayments(ctx.client.id, 24)]);
  const suspended = ctx.membership === "suspended";
  const lastFailed = payments[0];

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
            <dd className="font-semibold">{info.plan_name ?? "Coaching mensual"}</dd>
          </div>
          <div>
            <dt className="text-faint">{ctx.membership === "expired" || ctx.membership === "grace" ? "Venció el" : "Activa hasta"}</dt>
            <dd className="font-semibold">{formatDate(ctx.client.renewal_date)}</dd>
          </div>
          {info.amount_cents != null && (
            <div>
              <dt className="text-faint">Mensualidad</dt>
              <dd className="tnum font-semibold">{formatMoney(info.amount_cents)}</dd>
            </div>
          )}
        </dl>

        {suspended ? (
          <p className="text-center text-sm text-muted">Tu cuenta está suspendida. Hablá con {ctx.coachName} para reactivarla.</p>
        ) : info.pending ? (
          <div className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
            <Clock size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            <p>Avisaste que pagaste. {ctx.coachName} lo está verificando; cuando lo confirme, tu membresía se renueva y te llega una notificación.</p>
          </div>
        ) : info.link ? (
          <div className="flex flex-col gap-2">
            <a href={info.link} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", "w-full uppercase tracking-[0.12em]")}>
              {payButtonLabel(info.link)} <ExternalLink size={17} aria-hidden="true" />
            </a>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-faint">
              <Lock size={12} aria-hidden="true" /> Se abre la página de pago segura. La app no ve los datos de tu tarjeta.
            </p>
            {info.instructions && <p className="whitespace-pre-wrap rounded-xl bg-graphite px-4 py-3 text-sm text-muted">{info.instructions}</p>}
            <ReportPayment amountCents={info.amount_cents} />
          </div>
        ) : (
          <p className="text-center text-sm text-muted">Coordiná tu pago con {ctx.coachName}. Cuando lo registre, tu membresía se renueva.</p>
        )}
        {!info.pending && lastFailed?.status === "failed" && (
          <p className="text-sm text-muted">
            Tu último aviso de pago no se confirmó{lastFailed.note ? `: «${lastFailed.note}»` : "."}
          </p>
        )}
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Historial de pagos</h2>
        <Card>
          {payments.length ? <PaymentList items={payments} /> : <EmptyState title="Sin pagos" description="Tus pagos van a aparecer acá." />}
        </Card>
      </section>
    </div>
  );
}
