import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, Check, MessageCircle, RotateCcw, Trash2, UserPlus, UserRound, X } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getIntake, getTemplates, INTAKE_SERVICE_LABEL, INTAKE_STATUS_LABEL } from "@/lib/data/intakes";
import { fillTemplate, templatesFor, templateVars, titleCase } from "@/lib/messages";
import { WaLink } from "@/components/whatsapp/wa-link";
import { QuickReplies } from "@/components/intake/quick-replies";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { formatLb } from "@/lib/units";
import { Badge, buttonClass } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { IntakeAnswersView } from "@/components/intake/intake-answers";
import { convertIntakeAction, deleteIntakeAction, markContactedAction, setIntakeStatusAction } from "../actions";
import { GrantAccess } from "@/components/intake/grant-access";

export const metadata: Metadata = { title: "Solicitud" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function age(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth + "T00:00:00");
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}

export default async function IntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const coach = await requireRole("coach");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const intake = await getIntake(id);
  if (!intake) notFound();

  // Al abrirla queda como vista
  if (intake.status === "new") {
    const supabase = await createClient();
    await supabase.from("intakes").update({ status: "reviewed" }).eq("id", id);
    intake.status = "reviewed";
  }

  const name = `${intake.first_name} ${intake.last_name}`.trim();
  const open = ["new", "reviewed", "contacted"].includes(intake.status);
  const years = age(intake.birth_date);
  const facts = [
    years != null ? `${years} años` : null,
    intake.sex === "male" ? "Hombre" : intake.sex === "female" ? "Mujer" : null,
    intake.weight_kg != null ? formatLb(intake.weight_kg) : null,
    intake.height_cm != null ? `${Number(intake.height_cm)} cm` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/coach/solicitudes" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> Solicitudes
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={intake.status === "converted" ? "ok" : intake.status === "contacted" ? "warn" : "neutral"}>{INTAKE_STATUS_LABEL[intake.status]}</Badge>
          <Badge tone="neutral">{intake.kind === "full" ? "Cuestionario completo" : "Solicitud"}</Badge>
          {intake.service && <Badge tone="neutral">{INTAKE_SERVICE_LABEL[intake.service]}</Badge>}
          <span className="text-sm text-faint">{formatDate(intake.created_at)}</span>
        </div>
        <h1 className="break-words font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">{name}</h1>
        <p className="text-lg text-muted">{intake.goal ?? "Sin objetivo"}{facts.length ? ` · ${facts.join(" · ")}` : ""}</p>

        <div className="flex flex-wrap gap-2">
          {intake.client_id ? (
            <Link href={`/coach/clientes/${intake.client_id}?tab=cuestionario`} className={buttonClass("primary", "sm")}>
              <UserRound size={16} /> Ver cliente
            </Link>
          ) : (
            <>
              <GrantAccess action={convertIntakeAction.bind(null, intake.id)} firstName={titleCase(intake.first_name)} defaultEmail={intake.email} />
              <Link href={`/coach/clientes/nuevo?solicitud=${intake.id}`} className={buttonClass("ghost", "sm")}>
                <UserPlus size={16} /> Crear manualmente
              </Link>
            </>
          )}
          {intake.phone && (
            <WaLink phone={intake.phone} text={`¡Hola ${titleCase(intake.first_name)}! `} onOpen={markContactedAction.bind(null, id)} className={buttonClass("secondary", "sm")}>
              <MessageCircle size={16} /> WhatsApp
            </WaLink>
          )}
          {intake.kind === "short" && open && intake.status !== "contacted" && (
            <form action={setIntakeStatusAction.bind(null, id, "contacted")}>
              <button className={buttonClass("secondary", "sm")}>
                <Check size={16} /> Ya le escribí
              </button>
            </form>
          )}
          {intake.kind === "short" && open && (
            <form action={setIntakeStatusAction.bind(null, id, "lost")}>
              <button className={buttonClass("secondary", "sm")}>
                <X size={16} /> No se concretó
              </button>
            </form>
          )}
          {intake.kind === "short" && open && (
            <form action={setIntakeStatusAction.bind(null, id, "archived")}>
              <button className={buttonClass("ghost", "sm")}>
                <Archive size={16} /> Archivar
              </button>
            </form>
          )}
          {(intake.status === "lost" || intake.status === "archived") && (
            <form action={setIntakeStatusAction.bind(null, id, "contacted")}>
              <button className={buttonClass("secondary", "sm")}>
                <RotateCcw size={16} /> Volver a pendientes
              </button>
            </form>
          )}
          <ConfirmButton action={deleteIntakeAction.bind(null, id)} label={<><Trash2 size={15} /> Eliminar</>} confirmText="¿Eliminar esta solicitud y sus respuestas?" confirmLabel="Sí, eliminar" />
        </div>
      </header>

      {intake.phone && intake.kind === "short" && (
        <QuickReplies
          intakeId={intake.id}
          phone={intake.phone}
          messages={templatesFor(await getTemplates(coach.id), intake.service).map((t) => ({
            idx: t.idx,
            title: t.title,
            text: fillTemplate(t.body, templateVars({ first_name: intake.first_name, goal: intake.goal, service: intake.service, answers: intake.answers })),
          }))}
        />
      )}

      <IntakeAnswersView answers={intake.answers} />
    </div>
  );
}
