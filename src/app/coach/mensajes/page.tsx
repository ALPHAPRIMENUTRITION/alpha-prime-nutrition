import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getTemplates } from "@/lib/data/intakes";
import { TemplatesEditor } from "@/components/intake/templates-editor";

export const metadata: Metadata = { title: "Mensajes rápidos" };

export default async function TemplatesPage() {
  const coach = await requireRole("coach");
  const templates = await getTemplates(coach.id);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/coach/solicitudes" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Solicitudes
      </Link>
      <header>
        <p className="eyebrow">WhatsApp</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">Mensajes rápidos</h1>
        <p className="mt-2 text-muted">Tus respuestas listas para cada solicitud. Escribilas una vez y después las mandás con un toque.</p>
      </header>
      <TemplatesEditor initial={templates} />
    </div>
  );
}
