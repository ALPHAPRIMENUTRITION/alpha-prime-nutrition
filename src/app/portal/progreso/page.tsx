import type { Metadata } from "next";
import { getPortalContext } from "@/lib/data/portal";
import { getProgressData } from "@/lib/data/progress";
import { firstLast } from "@/lib/anthropometry";
import { Card, EmptyState } from "@/components/ui";
import { MembershipLocked } from "@/components/portal/membership-locked";
import { MembershipWarning } from "@/components/portal/membership-warning";
import { ProgressView } from "@/components/progress/progress-view";
import { withWeightInLb } from "@/lib/units";

export const metadata: Metadata = { title: "Progreso" };

export default async function PortalProgress() {
  const ctx = await getPortalContext();
  if (!ctx) return <Card><EmptyState title="Cuenta sin programa" /></Card>;
  if (!ctx.hasAccess) return <MembershipLocked suspended={ctx.membership === "suspended"} />;

  const { rows, photos, heightCm } = await getProgressData(ctx.client.id);
  const w = firstLast(withWeightInLb(rows), "weight_kg");

  return (
    <div className="flex flex-col gap-5">
      <MembershipWarning status={ctx.membership} />
      <header>
        <p className="eyebrow">Tu evolución</p>
        <h1 className="mt-1 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">Progreso</h1>
        {w && rows.length > 1 && (
          <p className="mt-3 text-[15px] text-muted">
            Desde tu primera medición {w.diff === 0 ? "mantuviste tu peso" : `tu peso cambió ${w.diff > 0 ? "+" : ""}${w.diff} lb`}. Seguí registrando para ver tu tendencia.
          </p>
        )}
      </header>
      {rows.length || photos.length ? (
        <ProgressView rows={rows} photos={photos} clientId={ctx.client.id} heightCm={heightCm} />
      ) : (
        <Card><EmptyState title="Aún sin mediciones" description="Cuando tu coach registre tus medidas, vas a ver acá tu evolución." /></Card>
      )}
    </div>
  );
}
