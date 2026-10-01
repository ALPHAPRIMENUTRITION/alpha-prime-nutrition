import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatKg, formatPct, relativeDays } from "@/lib/format";
import { MEMBERSHIP_LABEL, MEMBERSHIP_TONE } from "@/lib/membership";
import type { ClientOverviewRow, ClientRecord } from "@/lib/types";
import { Avatar, Badge, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Perfil del cliente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("coach");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  // RLS: si el cliente no es de este coach, no hay fila → 404 (no se revela que existe).
  const [{ data: client }, { data: overview }, { data: measurements }] = await Promise.all([
    supabase.from("clients").select("id, coach_id, first_name, last_name, email, phone, goal, status, start_date, renewal_date").eq("id", id).maybeSingle(),
    supabase.from("coach_client_overview").select("*").eq("id", id).maybeSingle(),
    supabase.from("measurements").select("id, measured_at, weight_kg, waist_cm").eq("client_id", id).order("measured_at", { ascending: false }).limit(5),
  ]);

  if (!client || !overview) notFound();
  const c = client as ClientRecord;
  const o = overview as ClientOverviewRow;
  const name = `${c.first_name} ${c.last_name}`.trim();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/coach#clientes" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Clientes
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={name} src={o.avatar_url} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tight">{name}</h1>
          <p className="mt-1 text-muted">{c.goal || "Sin objetivo definido"}</p>
        </div>
        <Badge tone={MEMBERSHIP_TONE[o.membership_status]}>{MEMBERSHIP_LABEL[o.membership_status]}</Badge>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h2 className="eyebrow mb-3">Contacto</h2>
          <dl className="grid gap-2 text-sm">
            <div><dt className="text-faint">Correo</dt><dd className="break-all">{c.email}</dd></div>
            <div><dt className="text-faint">Teléfono</dt><dd>{c.phone || "—"}</dd></div>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="eyebrow mb-3">Membresía</h2>
          <dl className="grid gap-2 text-sm">
            <div><dt className="text-faint">Inicio</dt><dd>{formatDate(c.start_date)}</dd></div>
            <div><dt className="text-faint">Renovación</dt><dd>{formatDate(c.renewal_date)}</dd></div>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="eyebrow mb-3">Seguimiento</h2>
          <dl className="grid gap-2 text-sm">
            <div><dt className="text-faint">Peso actual</dt><dd className="tnum">{formatKg(o.current_weight_kg)}</dd></div>
            <div><dt className="text-faint">Adherencia (últimos 4)</dt><dd className="tnum">{formatPct(o.adherence_pct)}</dd></div>
            <div><dt className="text-faint">Último check-in</dt><dd>{relativeDays(o.last_checkin_at)}</dd></div>
          </dl>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="eyebrow mb-3">Últimas mediciones</h2>
        {measurements?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="text-left text-faint">
                  <th className="py-2 font-medium">Fecha</th>
                  <th className="py-2 font-medium">Peso</th>
                  <th className="py-2 font-medium">Cintura</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {measurements.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="py-2">{formatDate(m.measured_at)}</td>
                    <td className="py-2">{formatKg(m.weight_kg)}</td>
                    <td className="py-2">{m.waist_cm ? `${m.waist_cm} cm` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Todavía no hay mediciones registradas.</p>
        )}
      </Card>
    </div>
  );
}
