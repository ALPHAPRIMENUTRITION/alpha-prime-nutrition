import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getCoachCheckinSettings } from "@/lib/data/checkins";
import { parseCheckinConfig } from "@/lib/checkin";
import { CheckinConfigEditor } from "@/components/checkin/config-editor";

export const metadata: Metadata = { title: "Configurar check-in" };

export default async function CheckinConfigPage() {
  const coach = await requireRole("coach");
  const s = await getCoachCheckinSettings(coach.id);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/coach/checkins" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Check-ins
      </Link>
      <header>
        <p className="eyebrow">Check-in semanal</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Configurar</h1>
        <p className="mt-2 text-sm text-muted">Aplica a todos tus clientes.</p>
      </header>
      <CheckinConfigEditor weekday={s.weekday} config={parseCheckinConfig(s.config)} />
    </div>
  );
}
