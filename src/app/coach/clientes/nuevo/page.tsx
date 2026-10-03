import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { invitesEnabled } from "@/lib/invite";
import { todayISO, addDaysISO } from "@/lib/format";
import { createClientAction } from "../actions";
import { ClientForm, type ClientFormDefaults } from "@/components/coach/client-form";
import { getIntake } from "@/lib/data/intakes";
import { kgToLb } from "@/lib/units";

export const metadata: Metadata = { title: "Nuevo cliente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ solicitud?: string }> }) {
  await requireRole("coach");
  const today = todayISO();
  const sid = (await searchParams).solicitud ?? "";
  // Alta desde una solicitud del cuestionario: datos ya cargados
  const intake = UUID.test(sid) ? await getIntake(sid) : null;
  const fromIntake: ClientFormDefaults = intake
    ? {
        first_name: intake.first_name,
        last_name: intake.last_name,
        email: intake.email ?? "",
        phone: intake.phone,
        birth_date: intake.birth_date,
        sex: intake.sex,
        height_cm: intake.height_cm != null ? Number(intake.height_cm) : null,
        goal: intake.goal,
        service: intake.service === "nutrition" ? "nutrition" : intake.service === "both" ? "both" : intake.service ? "training" : undefined,
        weight_lb: intake.weight_kg != null ? String(kgToLb(Number(intake.weight_kg))) : undefined,
      }
    : {};

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/coach#clientes" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Clientes
      </Link>
      <header>
        <p className="eyebrow">Alta de cliente</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Nuevo cliente</h1>
        {intake && <p className="mt-2 text-sm text-muted">Datos cargados del cuestionario de {intake.first_name}. Revisalos y completá lo que falte (el correo es obligatorio).</p>}
      </header>
      <ClientForm
        mode="new"
        action={createClientAction}
        defaults={{ start_date: today, renewal_date: addDaysISO(today, 30), ...fromIntake }}
        hidden={intake && !intake.client_id ? { intake_id: intake.id } : undefined}
        invitesEnabled={invitesEnabled()}
        cancelHref="/coach#clientes"
      />
    </div>
  );
}
