import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { invitesEnabled } from "@/lib/invite";
import { todayISO, addDaysISO } from "@/lib/format";
import { createClientAction } from "../actions";
import { ClientForm } from "@/components/coach/client-form";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NewClientPage() {
  await requireRole("coach");
  const today = todayISO();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/coach#clientes" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Clientes
      </Link>
      <header>
        <p className="eyebrow">Alta de cliente</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight">Nuevo cliente</h1>
      </header>
      <ClientForm
        mode="new"
        action={createClientAction}
        defaults={{ start_date: today, renewal_date: addDaysISO(today, 30) }}
        invitesEnabled={invitesEnabled()}
        cancelHref="/coach#clientes"
      />
    </div>
  );
}
