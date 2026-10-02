import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { invitesEnabled } from "@/lib/invite";
import { createClient } from "@/lib/supabase/server";
import { updateClientAction } from "../../actions";
import { ClientForm } from "@/components/coach/client-form";
import { serviceFrom } from "@/lib/services";

export const metadata: Metadata = { title: "Editar cliente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("coach");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: c }, { data: p }] = await Promise.all([
    supabase.from("clients").select("first_name, last_name, email, phone, goal, start_date, renewal_date, user_id, has_nutrition, has_training").eq("id", id).maybeSingle(),
    supabase.from("client_profiles").select("birth_date, sex, height_cm").eq("client_id", id).maybeSingle(),
  ]);
  if (!c) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href={`/coach/clientes/${id}`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Perfil
      </Link>
      <header>
        <p className="eyebrow">Editar</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight">
          {c.first_name} {c.last_name}
        </h1>
      </header>
      <ClientForm
        mode="edit"
        action={updateClientAction.bind(null, id)}
        defaults={{ ...c, service: serviceFrom(c), birth_date: p?.birth_date, sex: p?.sex, height_cm: p?.height_cm != null ? Number(p.height_cm) : null }}
        emailLocked={Boolean(c.user_id)}
        invitesEnabled={invitesEnabled()}
        cancelHref={`/coach/clientes/${id}`}
      />
    </div>
  );
}
